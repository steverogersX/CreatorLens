import { YoutubeTranscript } from "youtube-transcript";
import { YouTubeTranscriptAdapter } from "@/adapters/transcript/youtube.adapter";
import { TranscriptSchema } from "@/types/transcript";
import type { IVideoMeta } from "@/types/video-meta";
import type { ITranscript } from "@/types/transcript";
import { BadRequestError } from "@/errors/app-error";

export interface VideoAnalysis {
  meta: IVideoMeta;
  transcript: ITranscript;
}

function extractVideoId(url: string): string {
  const match = url.match(/(?:v=|youtu\.be\/)([^&?/]+)/);
  if (!match) throw new BadRequestError("Invalid YouTube URL");
  return match[1];
}

const adapter = new YouTubeTranscriptAdapter();

export async function analyzeYouTubeVideo(url: string): Promise<VideoAnalysis> {
  const videoId = extractVideoId(url);

  const raw = await YoutubeTranscript.fetchTranscript(videoId);

  if (raw && raw.length > 0) {
    console.log(`[transcript] found ${raw.length} segment(s) for ${videoId}`);
  }

  const transcript = TranscriptSchema.parse(adapter.adapt(raw));

  console.log(`[transcript] validated — provider: ${transcript.provider}, language: ${transcript.language}, duration: ${transcript.duration}s, segments: ${transcript.segments.length}`);

  throw new Error("Not implemented: meta");
}
