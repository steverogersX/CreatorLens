import { YtDlp } from "ytdlp-nodejs";
import { YouTubeTranscriptAdapter, type YouTubeJson3 } from "@/adapters/transcript/youtube.adapter";
import { YtDlpVideoMetaAdapter } from "@/adapters/video-meta/ytdlp.adapter";
import { TranscriptSchema } from "@/types/transcript";
import type { IVideoMeta } from "@/types/video-meta";
import type { ITranscript } from "@/types/transcript";
import { fetchCaptionJson3 } from "@/utils/captions";

const ytdlp = new YtDlp();
const transcriptAdapter = new YouTubeTranscriptAdapter();
const metaAdapter = new YtDlpVideoMetaAdapter();

export async function getYouTubeTranscript(url: string): Promise<ITranscript> {
  const info = await ytdlp.getInfoAsync<"video">(url);
  const captions = await fetchCaptionJson3(info);

  if (captions) {
    const raw: YouTubeJson3 = { ...(JSON.parse(captions.content) as YouTubeJson3), language: captions.lang };
    return TranscriptSchema.parse(transcriptAdapter.adapt(raw));
  } else {
    // TODO: fall back to audio download + Whisper transcription
    throw new Error("No captions available for this video");
  }
}

export async function getYouTubeMetadata(url: string): Promise<IVideoMeta> {
  const info = await ytdlp.getInfoAsync<"video">(url);
  return metaAdapter.adapt(info);
}

export async function fetchYouTubeVideoData(url: string): Promise<{ meta: IVideoMeta; transcript: ITranscript }> {
  // Single yt-dlp call — `info` carries both the metadata and the caption
  // tracks. Fetching meta and transcript separately would spawn yt-dlp twice
  // (the slowest step) and risk YouTube throttling concurrent scrapes.
  const info = await ytdlp.getInfoAsync<"video">(url);

  const meta = metaAdapter.adapt(info);

  const captions = await fetchCaptionJson3(info);
  if (!captions) {
    // TODO: fall back to audio download + Whisper transcription
    throw new Error("No captions available for this video");
  }

  const raw: YouTubeJson3 = { ...(JSON.parse(captions.content) as YouTubeJson3), language: captions.lang };
  const transcript = TranscriptSchema.parse(transcriptAdapter.adapt(raw));

  return { meta, transcript };
}
