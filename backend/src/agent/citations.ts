import { and, asc, eq } from "drizzle-orm";
import { db } from "@/db/client";
import { videoMeta, transcripts, chunks } from "@/db/schema";
import type { RequestEventBus } from "@/lib/event-bus";
import type { CitationPayload } from "@shared/events";
import { logger } from "@/lib/logger";

const log = logger.child({ module: "citations" });

// Inline citation markers the model emits, e.g. "[A:1:23]" / "[B:12:05]".
const CITATION_RE = /\[([AB]):(\d+:\d+)\]/g;

interface ChunkRow {
  startTime: number;
  endTime: number;
  text: string;
}

/** position → chunks sorted by start time. Video A is position 1, Video B is position 2. */
export type ThreadChunks = Map<number, ChunkRow[]>;

/** Cheap pre-check so callers can skip the chunk query when there's nothing to resolve. */
export function containsCitationMarker(content: string): boolean {
  return /\[[AB]:\d+:\d+\]/.test(content);
}

function labelToSecs(label: string): number {
  const [m, s] = label.split(":").map(Number);
  return (m ?? 0) * 60 + (s ?? 0);
}

function secsToLabel(secs: number): string {
  const total = Math.round(secs);
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${m}:${String(s).padStart(2, "0")}`;
}

/** Loads every transcript chunk for a thread, grouped by video position. */
export async function fetchThreadChunks(threadId: string): Promise<ThreadChunks> {
  const rows = await db
    .select({
      position: videoMeta.position,
      startTime: chunks.startTime,
      endTime: chunks.endTime,
      text: chunks.text,
    })
    .from(videoMeta)
    .innerJoin(
      transcripts,
      and(eq(transcripts.videoId, videoMeta.videoId), eq(transcripts.threadId, videoMeta.threadId)),
    )
    .innerJoin(chunks, eq(chunks.transcriptId, transcripts.id))
    .where(eq(videoMeta.threadId, threadId))
    .orderBy(asc(videoMeta.position), asc(chunks.startTime));

  const byPosition: ThreadChunks = new Map();
  for (const row of rows) {
    const arr = byPosition.get(row.position) ?? [];
    arr.push({ startTime: row.startTime, endTime: row.endTime, text: row.text });
    byPosition.set(row.position, arr);
  }
  return byPosition;
}

/**
 * Maps each inline `[A:MM:SS]` marker to the transcript chunk it refers to,
 * returning one payload per distinct (video, timestamp) marker. Markers that
 * can't be matched to a chunk are dropped.
 */
export function resolveCitationsFromChunks(content: string, byPosition: ThreadChunks): CitationPayload[] {
  const seen = new Set<string>();
  const citations: CitationPayload[] = [];

  for (const match of content.matchAll(CITATION_RE)) {
    const video = match[1] as "A" | "B";
    const label = match[2]!;
    const key = `${video}:${label}`;
    if (seen.has(key)) continue;
    seen.add(key);

    const chunkList = byPosition.get(video === "A" ? 1 : 2);
    if (!chunkList || chunkList.length === 0) continue;

    const secs = labelToSecs(label);
    // Prefer the chunk whose span contains the cited time; otherwise the nearest by start.
    const chunk =
      chunkList.find((c) => secs >= c.startTime && secs <= c.endTime) ??
      chunkList.reduce((best, c) =>
        Math.abs(c.startTime - secs) < Math.abs(best.startTime - secs) ? c : best,
      );

    citations.push({
      video,
      timestampLabel: label, // keep the literal marker so the UI lookup key matches
      timestampSecs: secs,
      endTimestampLabel: secsToLabel(chunk.endTime),
      endSecs: chunk.endTime,
      snippet: chunk.text.trim(),
    });
  }

  return citations;
}

/**
 * Resolves the citation markers in a freshly streamed response and publishes
 * them to the client as a single `citations` event.
 */
export async function resolveCitations(
  threadId: string,
  content: string,
  bus: RequestEventBus,
): Promise<void> {
  if (!containsCitationMarker(content)) return;

  const byPosition = await fetchThreadChunks(threadId);
  const citations = resolveCitationsFromChunks(content, byPosition);
  if (citations.length === 0) return;

  log.info({ threadId, count: citations.length }, "[citations] resolved");
  bus.publish({ type: "citations", citations });
}
