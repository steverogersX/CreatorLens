import { GoogleGenAI } from "@google/genai";
import type { EmbeddingProvider, EmbeddingTask } from "./base";

const TASK_MAP: Record<EmbeddingTask, string> = {
  passage: "RETRIEVAL_DOCUMENT",
  query: "RETRIEVAL_QUERY",
  similarity: "SEMANTIC_SIMILARITY",
};

export class GeminiEmbeddingProvider implements EmbeddingProvider {
  readonly name = "gemini";
  private readonly ai: GoogleGenAI;

  constructor(apiKey: string) {
    this.ai = new GoogleGenAI({ apiKey });
  }

  async embed(texts: string[], task: EmbeddingTask = "similarity"): Promise<number[][]> {
    // Gemini has no batch endpoint in the SDK — parallelise instead
    const results = await Promise.all(
      texts.map((text) =>
        this.ai.models.embedContent({
          model: "text-embedding-004",
          contents: text,
          config: {
            taskType: TASK_MAP[task],
            outputDimensionality: 768,
          },
        }),
      ),
    );

    return results.map((r, i) => {
      const values = r.embeddings?.[0]?.values;
      if (!values?.length) throw new Error(`Gemini returned empty embedding at index ${i}`);
      return values;
    });
  }
}
