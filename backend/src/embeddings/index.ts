import { config } from "@/config";
import { JinaEmbeddingProvider } from "./providers/jina";
import { GeminiEmbeddingProvider } from "./providers/gemini";
import { FallbackEmbeddingProvider } from "./providers/fallback";

export type { EmbeddingProvider, EmbeddingTask } from "./providers/base";

let _instance: FallbackEmbeddingProvider | undefined;

export function getEmbedder(): FallbackEmbeddingProvider {
  if (!_instance) {
    _instance = new FallbackEmbeddingProvider(
      new JinaEmbeddingProvider(config.JINA_API_KEY, config.EMBEDDING_DIMENSIONS),
      new GeminiEmbeddingProvider(config.GEMINI_API_KEY),
    );
  }
  return _instance;
}
