import { z } from "zod";

const EnvSchema = z.object({
  NODE_ENV: z.enum(["development", "production", "test"]).default("development"),
  PORT: z.coerce.number().int().positive().default(3000),
  DATABASE_URL: z.string().min(1),
  JINA_API_KEY: z.string().min(1),
  GEMINI_API_KEY: z.string().min(1),
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
