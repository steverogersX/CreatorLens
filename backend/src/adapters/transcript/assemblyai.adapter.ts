import type { TranscriptWord } from "assemblyai";
import type { ITranscript, TranscriptSegment } from "@/types/transcript";
import { TranscriptAdapter } from "./base";

// Subset of the AssemblyAI Transcript object that the adapter needs.
export interface AssemblyAIRaw {
  text?: string | null;
  words?: TranscriptWord[] | null;
  audio_duration?: number | null;
  language_code?: string | null;
}

// Words separated by a pause longer than this are split into a new segment.
const PAUSE_THRESHOLD_MS = 1500;
// Hard cap so no single segment becomes too long for the chunker.
const MAX_SEGMENT_WORDS = 30;

export class AssemblyAIAdapter extends TranscriptAdapter<AssemblyAIRaw> {
  readonly provider = "assemblyai";

  adapt(raw: AssemblyAIRaw): ITranscript {
    const words = (raw.words ?? []).filter((w) => w.text?.trim());
    const segments = this.groupIntoSegments(words);

    const duration =
      raw.audio_duration ??
      (words.length > 0 ? (words[words.length - 1]!.end ?? 0) / 1000 : 0);

    return {
      provider: this.provider,
      language: raw.language_code ?? "unknown",
      text: raw.text ?? segments.map((s) => s.text).join(" "),
      duration,
      segments,
      createdAt: this.timestamp(),
    };
  }

  private groupIntoSegments(words: TranscriptWord[]): TranscriptSegment[] {
    if (words.length === 0) return [];

    const segments: TranscriptSegment[] = [];
    let group: TranscriptWord[] = [words[0]!];

    for (let i = 1; i < words.length; i++) {
      const prev = words[i - 1]!;
      const curr = words[i]!;
      const gap = (curr.start ?? 0) - (prev.end ?? 0);

      if (gap > PAUSE_THRESHOLD_MS || group.length >= MAX_SEGMENT_WORDS) {
        segments.push(this.buildSegment(segments.length, group));
        group = [];
      }
      group.push(curr);
    }

    if (group.length > 0) {
      segments.push(this.buildSegment(segments.length, group));
    }

    return segments;
  }

  private buildSegment(id: number, words: TranscriptWord[]): TranscriptSegment {
    const confidences = words.map((w) => w.confidence ?? 1).filter((c) => c >= 0);
    const avgConfidence =
      confidences.length > 0
        ? confidences.reduce((sum, c) => sum + c, 0) / confidences.length
        : 1;

    return {
      id,
      start: (words[0]!.start ?? 0) / 1000, // ms → seconds
      end: (words[words.length - 1]!.end ?? 0) / 1000,
      text: words.map((w) => w.text ?? "").join(" ").trim(),
      confidence: Math.min(1, Math.max(0, avgConfidence)),
    };
  }
}
