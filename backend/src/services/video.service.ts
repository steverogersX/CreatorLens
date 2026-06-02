import type { IVideoMeta } from "@/types/video-meta";
import type { ITranscript } from "@/types/transcript";
import { chunkTranscript, type TranscriptChunk } from "@/utils/chunker";
import { resolveService } from "@/utils/platform";
import { getEmbedder } from "@/embeddings";
import { createThread, persistThread, persistVideoAnalysis } from "@/db/persist";
import type { RequestEventBus } from "@/lib/event-bus";

export interface VideoAnalysis {
  meta: IVideoMeta;
  transcript: ITranscript;
  chunks: TranscriptChunk[];
}

export interface ThreadResult {
  threadId: string;
  analyses: VideoAnalysis[];
}

async function analyzeVideo(url: string): Promise<VideoAnalysis> {
  const fetcher = resolveService(url);
  const { meta, transcript } = await fetcher(url);
  const chunks = await chunkTranscript(transcript, getEmbedder());
  return { meta, transcript, chunks };
}

export async function analyzeVideos(urls: string[]): Promise<ThreadResult> {
  const analyses = await Promise.all(urls.map(analyzeVideo));
  const threadId = await persistThread(analyses);
  return { threadId, analyses };
}

function platformName(hostname: string): string {
  if (hostname.includes("youtube") || hostname.includes("youtu.be")) return "YouTube";
  if (hostname.includes("instagram")) return "Instagram";
  if (hostname.includes("twitter") || hostname === "x.com") return "X";
  if (hostname.includes("tiktok")) return "TikTok";
  return hostname;
}

export async function analyzeVideosStreaming(
  urls: string[],
  bus: RequestEventBus,
): Promise<string> {
  const threadId = await createThread();
  bus.publish({ type: "thread_created", threadId });

  await Promise.all(
    urls.map(async (url, i) => {
      const position = i + 1;
      const { hostname } = new URL(url);
      const label = `Analyzing ${platformName(hostname)} video`;

      bus.publish({ type: "agent_step", platform: hostname, tool: null, label, stepStatus: "running" });

      // Fetch metadata + transcript first, then push the video card to the UI
      // immediately — the slower embed + persist runs afterwards.
      const fetcher = resolveService(url);
      const { meta, transcript } = await fetcher(url);
      bus.publish({ type: "video_meta", position, meta });
      bus.publish({ type: "video_ready", position });

      // Chunk + embed + persist — required before the agent can read transcripts.
      const chunks = await chunkTranscript(transcript, getEmbedder());
      await persistVideoAnalysis(threadId, position, { meta, transcript, chunks });

      bus.publish({ type: "agent_step", platform: hostname, tool: null, label, stepStatus: "done" });
    }),
  );

  return threadId;
}
