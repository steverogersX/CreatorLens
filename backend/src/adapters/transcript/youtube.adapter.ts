import type { ITranscript, TranscriptSegment, TranscriptWord } from "@/types/transcript";
import { TranscriptAdapter } from "./base";

interface Json3Seg {
  utf8: string;
  tOffsetMs?: number;
}

interface Json3Event {
  tStartMs: number;
  dDurationMs?: number;
  segs?: Json3Seg[];
}

export interface YouTubeJson3 {
  events: Json3Event[];
  language?: string;
}

export class YouTubeTranscriptAdapter extends TranscriptAdapter<YouTubeJson3> {
  readonly provider = "youtube";

  adapt(raw: YouTubeJson3): ITranscript {
    const captionEvents = raw.events.filter(
      (e): e is Json3Event & { segs: Json3Seg[] } =>
        Array.isArray(e.segs) &&
        e.segs.some((s) => s.utf8 && s.utf8.replace(/\n/g, "").trim().length > 0),
    );

    const last = captionEvents[captionEvents.length - 1];
    const duration = last ? (last.tStartMs + (last.dDurationMs ?? 0)) / 1000 : 0;

    const segments: TranscriptSegment[] = captionEvents.map((event, index) => {
      const segWords: TranscriptWord[] = event.segs
        .filter((s) => s.utf8.replace(/\n/g, "").trim().length > 0)
        .map((s) => ({
          word: s.utf8.replace(/\n/g, " ").trim(),
          start: (event.tStartMs + (s.tOffsetMs ?? 0)) / 1000,
          end: (event.tStartMs + (s.tOffsetMs ?? 0) + (event.dDurationMs ?? 0)) / 1000,
          confidence: 1,
        }));

      const text = event.segs
        .map((s) => s.utf8)
        .join("")
        .replace(/\n/g, " ")
        .trim();

      return {
        id: index,
        start: event.tStartMs / 1000,
        end: (event.tStartMs + (event.dDurationMs ?? 0)) / 1000,
        text,
        words: segWords,
        confidence: 1,
      };
    });

    return {
      provider: this.provider,
      language: raw.language ?? "unknown",
      text: segments
        .map((s) => s.text)
        .filter(Boolean)
        .join(" "),
      duration,
      segments,
      words: segments.flatMap((s) => s.words),
      createdAt: this.timestamp(),
    };
  }
}
