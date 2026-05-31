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

      const analysis = await analyzeVideo(url);

      bus.publish({ type: "video_meta", position, meta: analysis.meta });

      bus.publish({ type: "agent_step", platform: hostname, label: `Analyzing video ${hostname}`, stepStatus: "running" });
      await persistVideoAnalysis(threadId, position, analysis);
      bus.publish({ type: "agent_step", platform: hostname, label: `Analyzing video ${hostname}`, stepStatus: "done" });

      bus.publish({ type: "video_ready", position });
    }),
  );

  return threadId;
}
