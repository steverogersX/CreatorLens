import { BadRequestError } from "@/errors/app-error";
import type { IVideoMeta } from "@/types/video-meta";
import type { ITranscript } from "@/types/transcript";
import { fetchYouTubeVideoData } from "@/services/youtube.service";

export type VideoDataFetcher = (url: string) => Promise<{ meta: IVideoMeta; transcript: ITranscript }>;

export function resolveService(url: string): VideoDataFetcher {
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
