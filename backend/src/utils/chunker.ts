import type { ITranscript, TranscriptSegment } from "@/types/transcript";
import type { EmbeddingProvider } from "@/embeddings";
import { config } from "@/config";

export interface TranscriptChunk {
  chunkIndex: number;
  text: string;
  startTime: number;
  endTime: number;
  embedding: number[];
}

function cosineSimilarity(a: number[], b: number[]): number {
  let dot = 0, normA = 0, normB = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }
  const denom = Math.sqrt(normA) * Math.sqrt(normB);
  return denom === 0 ? 0 : dot / denom;
}

function median(values: number[]): number {
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 !== 0 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
}

function stdDev(values: number[]): number {
  const mean = values.reduce((sum, v) => sum + v, 0) / values.length;
  const variance = values.reduce((sum, v) => sum + (v - mean) ** 2, 0) / values.length;
  return Math.sqrt(variance);
}

type RawChunk = Omit<TranscriptChunk, "embedding">;

function buildChunk(index: number, segments: TranscriptSegment[]): RawChunk {
  return {
    chunkIndex: index,
    text: segments.map((s) => s.text).join(" ").trim(),
    startTime: segments[0].start,
    endTime: segments[segments.length - 1].end,
  };
}

function mergeTinyChunks(chunks: RawChunk[], minDuration: number): RawChunk[] {
  const result: RawChunk[] = [];
  for (const chunk of chunks) {
    const duration = chunk.endTime - chunk.startTime;
    if (duration < minDuration && result.length > 0) {
      const prev = result[result.length - 1];
      result[result.length - 1] = {
        chunkIndex: prev.chunkIndex,
        text: `${prev.text} ${chunk.text}`.trim(),
        startTime: prev.startTime,
        endTime: chunk.endTime,
      };
    } else {
      result.push({ ...chunk, chunkIndex: result.length });
    }
  }
  return result;
}

async function embedChunks(chunks: RawChunk[], embedder: EmbeddingProvider): Promise<TranscriptChunk[]> {
  const embeddings = await embedder.embed(chunks.map((c) => c.text), "passage");
  return chunks.map((c, i) => ({ ...c, embedding: embeddings[i]! }));
}

export async function chunkTranscript(
  transcript: ITranscript,
  embedder: EmbeddingProvider,
): Promise<TranscriptChunk[]> {
  const segments = transcript.segments.filter((s) => s.text.trim().length > 0);

  if (segments.length === 0) return [];

  if (segments.length === 1) {
    return embedChunks([buildChunk(0, segments)], embedder);
  }

  const allEmbeddings = await embedder.embed(
    segments.map((s) => s.text),
    "similarity",
  );

  const similarities: number[] = [];
  for (let i = 0; i < allEmbeddings.length - 1; i++) {
    similarities.push(cosineSimilarity(allEmbeddings[i]!, allEmbeddings[i + 1]!));
  }

  const threshold = median(similarities) - 1.5 * stdDev(similarities);

  const rawChunks: RawChunk[] = [];
  let currentSegments: TranscriptSegment[] = [segments[0]!];

  for (let i = 1; i < segments.length; i++) {
    if (similarities[i - 1]! >= threshold) {
      currentSegments.push(segments[i]!);
    } else {
      rawChunks.push(buildChunk(rawChunks.length, currentSegments));
      currentSegments = [segments[i]!];
    }
  }
  rawChunks.push(buildChunk(rawChunks.length, currentSegments));

  const merged = mergeTinyChunks(rawChunks, config.CHUNK_MIN_DURATION_SECS);
  return embedChunks(merged, embedder);
}
