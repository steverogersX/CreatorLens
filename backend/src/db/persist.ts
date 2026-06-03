import { and, asc, desc, eq, inArray } from "drizzle-orm";
import { db } from "./client";
import {
  threads,
  videos,
  videoMeta,
  transcripts,
  chunks as chunksTable,
  chatMessages,
} from "./schema";
import type { VideoAnalysis } from "@/services/video.service";

export interface ThreadVideoRow {
  position: number;
  url: string;
  provider: string;
  externalId: string;
  title: string;
  views: number;
  likes: number;
  commentCount: number;
  creatorName: string;
  creatorHandle: string;
  creatorFollowerCount: number;
  duration: number;
}

export type ThreadStatus = "streaming" | "completed" | "error";

export interface ThreadData {
  threadId: string;
  status: ThreadStatus;
  videos: ThreadVideoRow[];
  messages: Array<{ role: string; content: string; createdAt: Date }>;
}

export async function createThread(): Promise<string> {
  const [thread] = await db.insert(threads).values({ status: "streaming" }).returning({ id: threads.id });
  return thread!.id;
}

export async function updateThreadStatus(threadId: string, status: ThreadStatus): Promise<void> {
  await db.update(threads).set({ status }).where(eq(threads.id, threadId));
}

export async function persistVideoAnalysis(
  threadId: string,
  position: number,
  analysis: VideoAnalysis,
): Promise<void> {
  const { meta, transcript, chunks } = analysis;

  await db.transaction(async (tx) => {
    const [video] = await tx
      .insert(videos)
      .values({ provider: meta.provider, externalId: meta.videoId, url: meta.url })
      .onConflictDoUpdate({
        target: [videos.provider, videos.externalId],
        set: { url: meta.url },
      })
      .returning({ id: videos.id });

    await tx.insert(videoMeta).values({
      threadId,
      videoId: video!.id,
      position,
      title: meta.title,
      description: meta.description ?? null,
      thumbnailUrl: meta.thumbnailUrl ?? null,
      views: meta.views,
      likes: meta.likes,
      commentCount: meta.commentCount,
      retweets: meta.retweets ?? null,
      creatorId: meta.creator.id,
      creatorName: meta.creator.name,
      creatorHandle: meta.creator.handle,
      creatorFollowerCount: meta.creator.followerCount,
      creatorAvatarUrl: meta.creator.avatarUrl ?? null,
      creatorProfileUrl: meta.creator.profileUrl ?? null,
      hashtags: meta.hashtags,
      uploadDate: meta.uploadDate,
      duration: meta.duration,
      fetchedAt: meta.fetchedAt,
    });

    const [dbTranscript] = await tx
      .insert(transcripts)
      .values({
        threadId,
        videoId: video!.id,
        provider: transcript.provider,
        language: transcript.language,
        duration: transcript.duration,
      })
      .returning({ id: transcripts.id });

    if (chunks.length > 0) {
      await tx.insert(chunksTable).values(
        chunks.map((c) => ({
          transcriptId: dbTranscript!.id,
          chunkIndex: c.chunkIndex,
          text: c.text,
          startTime: c.startTime,
          endTime: c.endTime,
          embedding: c.embedding,
        })),
      );
    }
  });
}

export async function saveMessages(
  threadId: string,
  messages: Array<{ role: string; content: string }>,
): Promise<void> {
  if (messages.length === 0) return;
  // A single INSERT shares one statement timestamp, so relying on the column
  // default would give every row in the turn an identical created_at and make
  // ordering (history replay + UI render) non-deterministic. Stamp each row
  // with a strictly increasing time to preserve turn order.
  const base = Date.now();
  await db.insert(chatMessages).values(
    messages.map((m, i) => ({ threadId, ...m, createdAt: new Date(base + i) })),
  );
}

/**
 * Drops every chat message past the first `keepCount` (chronological order),
 * so an edited/regenerated turn can replace everything from that point on.
 */
export async function truncateThreadMessages(threadId: string, keepCount: number): Promise<void> {
  const rows = await db
    .select({ id: chatMessages.id })
    .from(chatMessages)
    .where(eq(chatMessages.threadId, threadId))
    .orderBy(asc(chatMessages.createdAt));

  const toDelete = rows.slice(keepCount).map((r) => r.id);
  if (toDelete.length === 0) return;

  await db.delete(chatMessages).where(inArray(chatMessages.id, toDelete));
}

export async function getThreadData(threadId: string): Promise<ThreadData | null> {
  const threadRows = await db
    .select({ id: threads.id, status: threads.status })
    .from(threads)
    .where(eq(threads.id, threadId))
    .limit(1);

  if (threadRows.length === 0) return null;

  const [videoRows, messageRows] = await Promise.all([
    db
      .select({
        position: videoMeta.position,
        url: videos.url,
        provider: videos.provider,
        externalId: videos.externalId,
        title: videoMeta.title,
        views: videoMeta.views,
        likes: videoMeta.likes,
        commentCount: videoMeta.commentCount,
        creatorName: videoMeta.creatorName,
        creatorHandle: videoMeta.creatorHandle,
        creatorFollowerCount: videoMeta.creatorFollowerCount,
        thumbnailUrl: videoMeta.thumbnailUrl,
        retweets: videoMeta.retweets,
        duration: videoMeta.duration,
      })
      .from(videoMeta)
      .innerJoin(videos, eq(videoMeta.videoId, videos.id))
      .where(eq(videoMeta.threadId, threadId))
      .orderBy(asc(videoMeta.position)),
    db
      .select({ role: chatMessages.role, content: chatMessages.content, createdAt: chatMessages.createdAt })
      .from(chatMessages)
      .where(eq(chatMessages.threadId, threadId))
      .orderBy(asc(chatMessages.createdAt)),
  ]);

  return {
    threadId,
    status: threadRows[0]!.status as ThreadStatus,
    videos: videoRows,
    messages: messageRows,
  };
}

export interface ThreadSummary {
  threadId: string;
  title: string;
  videoTitles: string[];
  status: ThreadStatus;
  createdAt: Date;
}

/** Recent threads for the history sidebar, newest first. */
export async function listThreads(limit = 50): Promise<ThreadSummary[]> {
  const threadRows = await db
    .select({ id: threads.id, status: threads.status, createdAt: threads.createdAt })
    .from(threads)
    .orderBy(desc(threads.createdAt))
    .limit(limit);

  if (threadRows.length === 0) return [];

  const ids = threadRows.map((t) => t.id);

  const [messageRows, videoRows] = await Promise.all([
    db
      .select({ threadId: chatMessages.threadId, content: chatMessages.content, createdAt: chatMessages.createdAt })
      .from(chatMessages)
      .where(and(inArray(chatMessages.threadId, ids), eq(chatMessages.role, "user")))
      .orderBy(asc(chatMessages.createdAt)),
    db
      .select({ threadId: videoMeta.threadId, title: videoMeta.title, position: videoMeta.position })
      .from(videoMeta)
      .where(inArray(videoMeta.threadId, ids))
      .orderBy(asc(videoMeta.position)),
  ]);

  // First user message per thread → conversation title.
  const firstUserMessage = new Map<string, string>();
  for (const row of messageRows) {
    if (!firstUserMessage.has(row.threadId)) firstUserMessage.set(row.threadId, row.content);
  }

  const titlesByThread = new Map<string, string[]>();
  for (const row of videoRows) {
    const arr = titlesByThread.get(row.threadId) ?? [];
    arr.push(row.title);
    titlesByThread.set(row.threadId, arr);
  }

  return threadRows.map((t) => {
    const videoTitles = titlesByThread.get(t.id) ?? [];
    const title =
      firstUserMessage.get(t.id) ??
      (videoTitles.length > 0 ? videoTitles.join("  vs  ") : "New comparison");
    return {
      threadId: t.id,
      title,
      videoTitles,
      status: t.status as ThreadStatus,
      createdAt: t.createdAt,
    };
  });
}

export async function threadExists(threadId: string): Promise<boolean> {
  const rows = await db
    .select({ id: threads.id })
    .from(threads)
    .where(eq(threads.id, threadId))
    .limit(1);
  return rows.length > 0;
}

export async function persistThread(analyses: VideoAnalysis[]): Promise<string> {
  return await db.transaction(async (tx) => {
    const [thread] = await tx
      .insert(threads)
      .values({})
      .returning({ id: threads.id });

    for (let i = 0; i < analyses.length; i++) {
      const { meta, transcript, chunks } = analyses[i]!;
      const position = i + 1;

      const [video] = await tx
        .insert(videos)
        .values({ provider: meta.provider, externalId: meta.videoId, url: meta.url })
        .onConflictDoUpdate({
          target: [videos.provider, videos.externalId],
          set: { url: meta.url },
        })
        .returning({ id: videos.id });

      await tx.insert(videoMeta).values({
        threadId: thread!.id,
        videoId: video!.id,
        position,
        title: meta.title,
        description: meta.description ?? null,
        thumbnailUrl: meta.thumbnailUrl ?? null,
        views: meta.views,
        likes: meta.likes,
        commentCount: meta.commentCount,
        creatorId: meta.creator.id,
        creatorName: meta.creator.name,
        creatorHandle: meta.creator.handle,
        creatorFollowerCount: meta.creator.followerCount,
        creatorAvatarUrl: meta.creator.avatarUrl ?? null,
        creatorProfileUrl: meta.creator.profileUrl ?? null,
        hashtags: meta.hashtags,
        uploadDate: meta.uploadDate,
        duration: meta.duration,
        fetchedAt: meta.fetchedAt,
      });

      const [dbTranscript] = await tx
        .insert(transcripts)
        .values({
          threadId: thread!.id,
          videoId: video!.id,
          provider: transcript.provider,
          language: transcript.language,
          duration: transcript.duration,
        })
        .returning({ id: transcripts.id });

      if (chunks.length > 0) {
        await tx.insert(chunksTable).values(
          chunks.map((c) => ({
            transcriptId: dbTranscript!.id,
            chunkIndex: c.chunkIndex,
            text: c.text,
            startTime: c.startTime,
            endTime: c.endTime,
            embedding: c.embedding,
          })),
        );
      }
    }

    return thread!.id;
  });
}
