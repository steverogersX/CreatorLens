import { ChatGoogleGenerativeAI } from "@langchain/google-genai";
import { ChatMistralAI } from "@langchain/mistralai";
import type { StructuredToolInterface } from "@langchain/core/tools";
import { config } from "@/config";
import { logger } from "@/lib/logger";

const log = logger.child({ module: "model" });

const MODEL_NAMES = {
  gemini: "gemini-2.0-flash",
  mistral: "mistral-large-latest",
};

function createGeminiModel() {
  return new ChatGoogleGenerativeAI({
    model: MODEL_NAMES.gemini,
    apiKey: config.GEMINI_API_KEY,
    maxRetries: 0,
  });
}

function createMistralModel() {
  return new ChatMistralAI({
    model: MODEL_NAMES.mistral,
    apiKey: config.MISTRAL_API_KEY!,
    maxRetries: 0,
  });
}

export function createModel(tools: StructuredToolInterface[]) {
  const primary = createGeminiModel().bindTools(tools);

  if (!config.MISTRAL_API_KEY) {
    log.warn("[model] MISTRAL_API_KEY not set — running without fallback model");
    return primary;
  }

  const secondary = createMistralModel().bindTools(tools);
  log.info("[model] gemini (primary) → mistral (secondary) fallback enabled");
  return primary.withFallbacks([secondary]);
}
