import type { EmbeddingProvider, EmbeddingTask } from "./base";

export class FallbackEmbeddingProvider implements EmbeddingProvider {
  readonly name: string;

  constructor(
    private readonly primary: EmbeddingProvider,
    private readonly secondary: EmbeddingProvider,
  ) {
    this.name = `${primary.name}→${secondary.name}`;
  }

  async embed(texts: string[], task?: EmbeddingTask): Promise<number[][]> {
    try {
      return await this.primary.embed(texts, task);
    } catch (err) {
      console.warn(
        `[embeddings] ${this.primary.name} failed, switching to ${this.secondary.name}:`,
        err instanceof Error ? err.message : String(err),
      );
      return await this.secondary.embed(texts, task);
    }
  }
}
