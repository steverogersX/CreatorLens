import type { ITranscript } from "@/types/transcript";

export abstract class TranscriptAdapter<TRaw> {
  abstract readonly provider: string;

  abstract adapt(raw: TRaw): ITranscript;

  protected timestamp(): Date {
    return new Date();
  }
}
