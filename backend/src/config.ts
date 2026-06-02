import { z } from "zod";

const EnvSchema = z.object({
  NODE_ENV: z.enum(["development", "production", "test"]).default("development"),
  PORT: z.coerce.number().int().positive().default(5000),
  LOG_LEVEL: z.enum(["trace", "debug", "info", "warn", "error", "fatal"]).default("debug"),
  DATABASE_URL: z.string().min(1),
  JINA_API_KEY: z.string().min(1),
  // Primary LLM: Gemini. Secondary/fallback LLM: Mistral.
  GEMINI_API_KEY: z.string().min(1),
  MISTRAL_API_KEY: z.string().optional(),
  ASSEMBLYAI_API_KEY: z.string().optional(),
  // Optional: read cookies directly from an installed browser (chrome, firefox, edge, brave…).
  // yt-dlp reads the browser's on-disk cookie store — no manual export needed.
  // Enables accurate view counts, follower counts, and engagement stats on social platforms.
  COOKIES_FROM_BROWSER: z.string().optional(),
  // Fallback: per-platform Netscape cookie files if browser-based auth isn't available.
  INSTAGRAM_COOKIES_PATH: z.string().optional(),
  X_COOKIES_PATH: z.string().optional(),
  FACEBOOK_COOKIES_PATH: z.string().optional(),
  EMBEDDING_DIMENSIONS: z.coerce.number().default(768),
  CHUNK_SIMILARITY_THRESHOLD: z.coerce.number().default(0.75),
  CHUNK_MIN_DURATION_SECS: z.coerce.number().default(15),
});

const parsed = EnvSchema.safeParse(process.env);

if (!parsed.success) {
  console.error("Invalid environment variables:");
  console.error(z.prettifyError(parsed.error));
  process.exit(1);
}

export const config = parsed.data;
