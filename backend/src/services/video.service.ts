import { BadRequestError } from "@/errors/app-error";
import type { IVideoMeta } from "@/types/video-meta";
import type { ITranscript } from "@/types/transcript";
import { chunkTranscript, type TranscriptChunk } from "@/services/chunker";
import { getEmbedder } from "@/embeddings";
import { fetchYouTubeVideoData } from "./youtube.service";

export interface VideoAnalysis {
  meta: IVideoMeta;
  transcript: ITranscript;
  chunks: TranscriptChunk[];
}

type VideoDataFetcher = (url: string) => Promise<{ meta: IVideoMeta; transcript: ITranscript }>;

function resolveService(url: string): VideoDataFetcher {
  const { hostname } = new URL(url);

  if (hostname === "youtu.be" || hostname === "youtube.com" || hostname.endsWith(".youtube.com")) {
    return fetchYouTubeVideoData;
  }

  if (hostname === "facebook.com" || hostname.endsWith(".facebook.com") || hostname === "fb.watch") {
    throw new BadRequestError("Facebook support is not yet implemented");
  }

  if (hostname === "tiktok.com" || hostname.endsWith(".tiktok.com")) {
    throw new BadRequestError("TikTok support is not yet implemented");
  }

  if (hostname === "instagram.com" || hostname.endsWith(".instagram.com")) {
    throw new BadRequestError("Instagram support is not yet implemented");
  }

  throw new BadRequestError(`Unsupported platform: ${hostname}`);
}

async function analyzeVideo(url: string): Promise<VideoAnalysis> {
  const fetcher = resolveService(url);
  const { meta, transcript } = await fetcher(url);
  const chunks = await chunkTranscript(transcript, getEmbedder());
  return { meta, transcript, chunks };
}



export async function analyzeVideos(urls: string[]): Promise<VideoAnalysis[]> {
  const analyses = await Promise.all(urls.map(analyzeVideo));
  return analyses;
}