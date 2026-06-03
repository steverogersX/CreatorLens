import { BadRequestError } from "@/errors/app-error";
import type { IVideoMeta } from "@/types/video-meta";
import type { ITranscript } from "@/types/transcript";
import { fetchYouTubeVideoData } from "@/services/youtube.service";
import { fetchSocialVideoData } from "@/services/social.service";

export type VideoDataFetcher = (url: string) => Promise<{ meta: IVideoMeta; transcript: ITranscript }>;

export function resolveService(url: string): VideoDataFetcher {
  const { hostname } = new URL(url);

  if (hostname === "youtu.be" || hostname === "youtube.com" || hostname.endsWith(".youtube.com")) {
    return fetchYouTubeVideoData;
  }

  if (
    hostname === "instagram.com" ||
    hostname.endsWith(".instagram.com") ||
    hostname === "instagr.am"
  ) {
    return fetchSocialVideoData;
  }

  if (
    hostname === "facebook.com" ||
    hostname.endsWith(".facebook.com") ||
    hostname === "fb.watch" ||
    hostname === "fb.com"
  ) {
    return fetchSocialVideoData;
  }

  if (hostname === "x.com" || hostname === "twitter.com" || hostname.endsWith(".twitter.com")) {
    return fetchSocialVideoData;
  }

  if (hostname === "tiktok.com" || hostname.endsWith(".tiktok.com")) {
    throw new BadRequestError("TikTok support is not yet implemented");
  }

  throw new BadRequestError(`Unsupported platform: ${hostname}`);
}
