import type { ITranscript, TranscriptSegment, TranscriptWord } from "@/types/transcript";
import { TranscriptAdapter } from "./base";

export interface WhisperWord {
  word: string;
  start: number;
  end: number;
  probability: number;
}

export interface WhisperSegment {
  id: number;
  start: number;
  end: number;
  text: string;
  words: WhisperWord[];
  avg_logprob: number;
}

export interface WhisperRawResult {
  text: string;
  language: string;
  duration: number;
  segments: WhisperSegment[];
}

export class WhisperAdapter extends TranscriptAdapter<WhisperRawResult> {
  readonly provider = "whisper";

  adapt(raw: WhisperRawResult): ITranscript {
    const segments: TranscriptSegment[] = raw.segments.map((seg) => ({
      id: seg.id,
      start: seg.start,
      end: seg.end,
      text: seg.text.trim(),
      words: this.mapWords(seg.words),
      confidence: Math.exp(seg.avg_logprob),
    }));

    const words: TranscriptWord[] = raw.segments.flatMap((seg) =>
      this.mapWords(seg.words)
    );

    return {
      provider: this.provider,
      language: raw.language,
      text: raw.text.trim(),
      duration: raw.duration,
      segments,
      words,
      createdAt: this.timestamp(),
    };
  }

  private mapWords(words: WhisperWord[]): TranscriptWord[] {
    return words.map((w) => ({
      word: w.word.trim(),
      start: w.start,
      end: w.end,
      confidence: w.probability,
    }));
  }
}
