import type { IVideoMeta } from "@/types/video-meta";

export abstract class VideoMetaAdapter<TRaw> {
  abstract readonly provider: string;

  abstract adapt(raw: TRaw): IVideoMeta;

  protected timestamp(): Date {
    return new Date();
  }
}
