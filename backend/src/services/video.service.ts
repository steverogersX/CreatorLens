import type { IVideoMeta } from "@/types/video-meta";
import type { ITranscript } from "@/types/transcript";
import { chunkTranscript, type TranscriptChunk } from "@/utils/chunker";
import { resolveService } from "@/utils/platform";
import { getEmbedder } from "@/embeddings";
import { createThread, persistThread, persistVideoAnalysis } from "@/db/persist";

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

export interface StreamingCallbacks {
  onThreadCreated: (threadId: string) => void;
  onVideoMeta: (position: number, meta: IVideoMeta) => void;
  onVideoReady: (position: number) => void;
}

/**
 * Creates a thread immediately, then fetches both videos in parallel.
 * Fires callbacks as soon as each video's metadata and transcript are ready,
 * so the UI can update progressively rather than waiting for both to finish.
 */
export async function analyzeVideosStreaming(
  urls: string[],
  callbacks: StreamingCallbacks,
): Promise<string> {
  const threadId = await createThread();
  callbacks.onThreadCreated(threadId);

  await Promise.all(
    urls.map(async (url, i) => {
      const position = i + 1;
      const analysis = await analyzeVideo(url);
      callbacks.onVideoMeta(position, analysis.meta);
      await persistVideoAnalysis(threadId, position, analysis);
      callbacks.onVideoReady(position);
    }),
  );

  return threadId;
}