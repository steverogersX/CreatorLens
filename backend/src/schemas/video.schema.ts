import { z } from "zod";

const SUPPORTED_HOSTS = [
  "youtube.com",
  "youtu.be",
  "tiktok.com",
  "facebook.com",
  "fb.watch",
  "instagram.com",
  "twitter.com",
  "x.com",
];

const socialMediaUrl = z
  .string()
  .url("Must be a valid URL")
  .refine(
    (url) => {
      try {
        const { hostname } = new URL(url);
        return SUPPORTED_HOSTS.some((host) => hostname === host || hostname.endsWith(`.${host}`));
      } catch {
        return false;
      }
    },
    { message: "Must be a URL from a supported platform (YouTube, TikTok, Facebook, Instagram, Twitter)" }
  );

export const analyzeVideosSchema = z.object({
  urls: z.tuple([socialMediaUrl, socialMediaUrl]),
});

export type AnalyzeVideosInput = z.infer<typeof analyzeVideosSchema>;
