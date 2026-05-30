import type { ITranscript, TranscriptSegment } from "@/types/transcript";
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
      confidence: Math.exp(seg.avg_logprob),
    }));

    return {
      provider: this.provider,
      language: raw.language,
      text: raw.text.trim(),
      duration: raw.duration,
      segments,
      createdAt: this.timestamp(),
    };
  }
}
