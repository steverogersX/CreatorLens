import { AssemblyAI } from "assemblyai";
import { YtDlp } from "ytdlp-nodejs";
import { YouTubeTranscriptAdapter, type YouTubeJson3 } from "@/adapters/transcript/youtube.adapter";
import { AssemblyAIAdapter } from "@/adapters/transcript/assemblyai.adapter";
import { YtDlpVideoMetaAdapter } from "@/adapters/video-meta/ytdlp.adapter";
import { TranscriptSchema } from "@/types/transcript";
import type { IVideoMeta } from "@/types/video-meta";
import type { ITranscript } from "@/types/transcript";
import { fetchCaptionJson3 } from "@/utils/captions";
import { config } from "@/config";
import { logger } from "@/lib/logger";

const log = logger.child({ module: "social.service" });
const ytdlp = new YtDlp();
const youtubeTranscriptAdapter = new YouTubeTranscriptAdapter();
const assemblyAIAdapter = new AssemblyAIAdapter();

// yt-dlp uses legacy extractor names internally; normalise to our provider tokens.
function cookiesOptionsForProvider(provider: string): { cookiesFromBrowser: string } | { cookies: string } | undefined {
  // Prefer reading directly from an installed browser — no manual export needed.
  if (config.COOKIES_FROM_BROWSER) {
    return { cookiesFromBrowser: config.COOKIES_FROM_BROWSER };
  }
  // Fall back to per-platform Netscape cookie files.
  const file =
    provider === "instagram" ? config.INSTAGRAM_COOKIES_PATH :
    provider === "x"         ? config.X_COOKIES_PATH         :
    provider === "facebook"  ? config.FACEBOOK_COOKIES_PATH  :
    undefined;
  return file ? { cookies: file } : undefined;
}

function normalizeExtractor(extractor?: string): string {
  switch (extractor?.toLowerCase()) {
    case "twitter":
      return "x";
    case "instagram":
      return "instagram";
    case "facebook":
      return "facebook";
    default:
      return extractor ?? "unknown";
  }
}

function emptyTranscript(provider: string, duration: number): ITranscript {
  return TranscriptSchema.parse({
    provider,
    language: "unknown",
    text: "",
    duration,
    segments: [],
    createdAt: new Date(),
  });
}

async function transcribeWithAssemblyAI(audioUrl: string, provider: string): Promise<ITranscript> {
  if (!config.ASSEMBLYAI_API_KEY) {
    log.warn({ provider }, "[social] ASSEMBLYAI_API_KEY not set — skipping transcription");
    return emptyTranscript(provider, 0);
  }

  const client = new AssemblyAI({ apiKey: config.ASSEMBLYAI_API_KEY });

  log.info({ provider, audioUrl: audioUrl.slice(0, 80) }, "[social] submitting to AssemblyAI");

  const raw = await client.transcripts.transcribe({
    audio_url: audioUrl,
    language_detection: true,
  });

  if (raw.status === "error") {
    throw new Error(`AssemblyAI transcription failed: ${raw.error ?? "unknown error"}`);
  }

  const transcript = TranscriptSchema.parse(assemblyAIAdapter.adapt(raw));
  log.info(
    { provider, segments: transcript.segments.length, duration: transcript.duration },
    "[social] AssemblyAI transcription complete",
  );
  return transcript;
}

export async function fetchSocialVideoData(url: string): Promise<{ meta: IVideoMeta; transcript: ITranscript }> {
  // Resolve provider early so we can look up the cookies path before the fetch.
  // yt-dlp's extractor name is in the info JSON, but we can infer it from the URL.
  const earlyProvider = normalizeExtractor(
    url.includes("instagram") ? "instagram" :
    url.includes("x.com") || url.includes("twitter") ? "twitter" :
    url.includes("facebook") || url.includes("fb.watch") ? "facebook" : undefined,
  );
  const cookiesOpts = cookiesOptionsForProvider(earlyProvider);

  let info;
  try {
    info = await ytdlp.getInfoAsync<"video">(url, cookiesOpts ?? undefined);
    log.info(
      { url, provider: earlyProvider, authenticated: !!cookiesOpts },
      "[social] yt-dlp fetch complete",
    );
    log.debug({
      view_count: info.view_count,
      like_count: info.like_count,
      comment_count: info.comment_count,
      channel_follower_count: info.channel_follower_count,
      repost_count: (info as unknown as Record<string, unknown>).repost_count,
      extractor: info.extractor,
    }, "[social] raw yt-dlp stats");
  } catch (err) {
    log.error({ url, err }, "[social] yt-dlp failed to fetch video info");
    throw new Error(
      `Could not fetch video info for the provided URL. The video may be unavailable, private, or the URL is invalid.`,
    );
  }

  const provider = normalizeExtractor(info.extractor);
  const meta = new YtDlpVideoMetaAdapter(provider).adapt(info);

  // 1. Try caption tracks first — fastest path, same JSON3 format as YouTube.
  try {
    const captions = await fetchCaptionJson3(info);
    if (captions) {
      const raw: YouTubeJson3 = {
        ...(JSON.parse(captions.content) as YouTubeJson3),
        language: captions.lang,
      };
      const transcript = TranscriptSchema.parse(youtubeTranscriptAdapter.adapt(raw));
      log.info({ url, provider, lang: captions.lang }, "[social] using caption track");
      return { meta, transcript };
    }
  } catch (err) {
    log.warn({ url, provider, err }, "[social] caption fetch failed — falling back to AssemblyAI");
  }

  // 2. No caption track — send the direct stream URL to AssemblyAI.
  // info.url is the best-format direct CDN URL from yt-dlp (signed, short-lived).
  try {
    const transcript = await transcribeWithAssemblyAI(info.url, provider);
    return { meta, transcript };
  } catch (err) {
    // 3. AssemblyAI failed — log and continue with empty transcript so the video
    //    card and metadata are still persisted and visible to the user.
    log.error({ url, provider, err }, "[social] AssemblyAI transcription failed — using empty transcript");
    return { meta, transcript: emptyTranscript(provider, meta.duration) };
  }
}
