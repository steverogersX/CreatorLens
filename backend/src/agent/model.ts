import { ChatGoogleGenerativeAI } from "@langchain/google-genai";
import { ChatOpenAI } from "@langchain/openai";
import { ChatAnthropic } from "@langchain/anthropic";
import { ChatMistralAI } from "@langchain/mistralai";
import type { StructuredToolInterface } from "@langchain/core/tools";
import { config } from "@/config";

const SDK_TIMEOUT_MS = 120_000;

const DEFAULTS: Record<string, string> = {
  gemini: "gemini-2.0-flash",
  openai: "gpt-4o",
  anthropic: "claude-3-5-sonnet-20241022",
  deepseek: "deepseek-chat",
  mistral: "mistral-large-latest",
};

function requireKey(provider: string, key: string | undefined): string {
  if (!key) {
    throw new Error(`${provider.toUpperCase()}_API_KEY is required when LLM_PROVIDER=${provider}`);
  }
  return key;
}

function createBaseModel() {
  const provider = config.LLM_PROVIDER;
  const model = config.LLM_MODEL ?? DEFAULTS[provider];

  switch (provider) {
    case "gemini":
      return new ChatGoogleGenerativeAI({
        model,
        apiKey: config.GEMINI_API_KEY,
        maxRetries: 0,
      });

    case "openai":
      return new ChatOpenAI({
        model,
        apiKey: requireKey("openai", config.OPENAI_API_KEY),
        maxRetries: 0,
        timeout: SDK_TIMEOUT_MS,
      });

    case "anthropic":
      return new ChatAnthropic({
        model,
        apiKey: requireKey("anthropic", config.ANTHROPIC_API_KEY),
        maxRetries: 0,
      });

    case "deepseek":
      return new ChatOpenAI({
        model,
        apiKey: requireKey("deepseek", config.DEEPSEEK_API_KEY),
        configuration: { baseURL: "https://api.deepseek.com/v1" },
        maxRetries: 0,
        timeout: SDK_TIMEOUT_MS,
      });

    case "mistral":
      return new ChatMistralAI({
        model,
        apiKey: requireKey("mistral", config.MISTRAL_API_KEY),
        maxRetries: 0,
      });

    default:
      throw new Error(`Unsupported LLM provider: ${provider}`);
  }
}

export function createModel(tools: StructuredToolInterface[]) {
  return createBaseModel().bindTools(tools);
}
