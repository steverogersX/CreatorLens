import type { Request, Response, NextFunction } from "express";
import { fromZodError } from "zod-validation-error";
import { analyzeVideosSchema } from "@/schemas/video.schema";
import { BadRequestError } from "@/errors/app-error";
import { analyzeYouTubeVideo, type VideoAnalysis } from "@/services/youtube.service";

function resolveService(url: string): (url: string) => Promise<VideoAnalysis> {
  const { hostname } = new URL(url);

  if (hostname === "youtu.be" || hostname === "youtube.com" || hostname.endsWith(".youtube.com")) {
    return analyzeYouTubeVideo;
  }

  if (hostname === "facebook.com" || hostname.endsWith(".facebook.com") || hostname === "fb.watch") {
    throw new BadRequestError(`Facebook support is not yet implemented`);
  }

  if (hostname === "tiktok.com" || hostname.endsWith(".tiktok.com")) {
    throw new BadRequestError(`TikTok support is not yet implemented`);
  }

  if (hostname === "instagram.com" || hostname.endsWith(".instagram.com")) {
    throw new BadRequestError(`Instagram support is not yet implemented`);
  }

  throw new BadRequestError(`Unsupported platform: ${hostname}`);
}

export async function analyzeVideos(req: Request, res: Response, next: NextFunction): Promise<void> {
  const result = analyzeVideosSchema.safeParse(req.body);

  if (!result.success) {
    throw new BadRequestError(fromZodError(result.error).message);
  }

  const [url1, url2] = result.data.urls;

  await Promise.all([
    resolveService(url1)(url1),
    resolveService(url2)(url2),
  ]);
}
