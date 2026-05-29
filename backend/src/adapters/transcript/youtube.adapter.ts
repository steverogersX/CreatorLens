import type { TranscriptResponse } from "youtube-transcript";
import type { ITranscript, TranscriptSegment } from "@/types/transcript";
import { TranscriptAdapter } from "./base";

export class YouTubeTranscriptAdapter extends TranscriptAdapter<TranscriptResponse[]> {
  readonly provider = "youtube";

  adapt(raw: TranscriptResponse[]): ITranscript {
    const last = raw[raw.length - 1];
    const duration = last ? (last.offset + last.duration) / 1000 : 0;

    const segments: TranscriptSegment[] = raw.map((entry, index) => ({
      id: index,
      start: entry.offset / 1000,
      end: (entry.offset + entry.duration) / 1000,
      text: entry.text.trim(),
      words: [],
      confidence: 1,
    }));

    return {
      provider: this.provider,
      language: raw[0]?.lang ?? "unknown",
      text: raw.map((e) => e.text.trim()).join(" "),
      duration,
      segments,
      words: [],
      createdAt: this.timestamp(),
    };
  }
}
