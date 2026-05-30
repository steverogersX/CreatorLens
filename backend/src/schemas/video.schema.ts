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

export const newThreadSchema = z.object({
  urls: z.tuple([socialMediaUrl, socialMediaUrl]),
});

export const followUpSchema = z.object({
  threadId: z.string().uuid("threadId must be a valid UUID"),
});

export const analyzeVideosSchema = z.discriminatedUnion("type", [
  newThreadSchema.extend({ type: z.literal("new") }),
  followUpSchema.extend({ type: z.literal("followup") }),
]);

export type AnalyzeVideosInput = z.infer<typeof analyzeVideosSchema>;
