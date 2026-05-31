import { z } from "zod";

const EnvSchema = z.object({
  NODE_ENV: z.enum(["development", "production", "test"]).default("development"),
  PORT: z.coerce.number().int().positive().default(5000),
  LOG_LEVEL: z.enum(["trace", "debug", "info", "warn", "error", "fatal"]).default("debug"),
  DATABASE_URL: z.string().min(1),
  JINA_API_KEY: z.string().min(1),
  // LLM provider selection
  LLM_PROVIDER: z.enum(["gemini", "openai", "anthropic", "deepseek", "mistral"]).default("mistral"),
  LLM_MODEL: z.string().optional(),
  // Gemini is always required (used for embeddings regardless of LLM_PROVIDER)
  GEMINI_API_KEY: z.string().min(1),
  // LLM API keys — only the one matching LLM_PROVIDER is required at runtime
  OPENAI_API_KEY: z.string().optional(),
  ANTHROPIC_API_KEY: z.string().optional(),
  DEEPSEEK_API_KEY: z.string().optional(),
  MISTRAL_API_KEY: z.string().optional(),
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
