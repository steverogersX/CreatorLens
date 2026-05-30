export type EmbeddingTask = "passage" | "query" | "similarity";

export interface EmbeddingProvider {
  readonly name: string;
  embed(texts: string[], task?: EmbeddingTask): Promise<number[][]>;
}
