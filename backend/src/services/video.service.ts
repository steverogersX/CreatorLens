import type { IVideoMeta } from "@/types/video-meta";
import type { ITranscript } from "@/types/transcript";
import { chunkTranscript, type TranscriptChunk } from "@/utils/chunker";
import { resolveService } from "@/utils/platform";
import { getEmbedder } from "@/embeddings";
import { persistThread } from "@/db/persist";

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