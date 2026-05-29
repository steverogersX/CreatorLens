import type { VideoInfo } from "ytdlp-nodejs";

export interface CaptionJson3 {
  content: string;
  lang: string;
}

export async function fetchCaptionJson3(info: VideoInfo): Promise<CaptionJson3 | null> {
  for (const source of [info.automatic_captions, info.subtitles]) {
    if (!source) continue;

    const keys = Object.keys(source);
    const lang =
      keys.find((k) => k === "en") ??
      keys.find((k) => k.startsWith("en")) ??
      keys[0];

    if (!lang) continue;

    const json3 = source[lang].find((f) => f.ext === "json3");
    if (!json3) continue;

    const res = await fetch(json3.url);
    if (!res.ok) continue;

    return { content: await res.text(), lang };
  }

  return null;
}
