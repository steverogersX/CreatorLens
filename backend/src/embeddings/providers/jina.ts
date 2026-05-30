import type { EmbeddingProvider, EmbeddingTask } from "./base";

const TASK_MAP: Record<EmbeddingTask, string> = {
  passage: "retrieval.passage",
  query: "retrieval.query",
  similarity: "text-matching",
};

interface JinaResponse {
  data: { index: number; embedding: number[] }[];
}

export class JinaEmbeddingProvider implements EmbeddingProvider {
  readonly name = "jina";

  constructor(
    private readonly apiKey: string,
    private readonly dimensions: number,
  ) {}

  async embed(texts: string[], task: EmbeddingTask = "similarity"): Promise<number[][]> {
    const res = await fetch("https://api.jina.ai/v1/embeddings", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${this.apiKey}`,
      },
      body: JSON.stringify({
        model: "jina-embeddings-v3",
        input: texts,
        task: TASK_MAP[task],
        dimensions: this.dimensions,
      }),
    });

    if (!res.ok) {
      throw new Error(`Jina ${res.status}: ${await res.text()}`);
    }

    const json = (await res.json()) as JinaResponse;

    // Jina does not guarantee order — sort by index before returning
    return json.data
      .sort((a, b) => a.index - b.index)
      .map((d) => d.embedding);
  }
}
