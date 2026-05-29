import { YtDlp } from "ytdlp-nodejs";
import { YouTubeTranscriptAdapter, type YouTubeJson3 } from "@/adapters/transcript/youtube.adapter";
import { TranscriptSchema } from "@/types/transcript";

const URLS = [
  "https://youtu.be/TLysAkFM4cA?si=nOdbgkQ8PKVkGFtl",
  "https://www.youtube.com/watch?v=9bZkp7q19f0",
];

const ytdlp = new YtDlp();
const adapter = new YouTubeTranscriptAdapter();

function toTimestamp(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
}

async function run(): Promise<void> {
  for (const url of URLS) {
    console.log(`\n--- Fetching transcript for: ${url} ---`);

    const info = await ytdlp.getInfoAsync<"video">(url);

    let found = false;
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

      const content = await res.text();
      const raw: YouTubeJson3 = { ...(JSON.parse(content) as YouTubeJson3), language: lang };
      const transcript = TranscriptSchema.parse(adapter.adapt(raw));

      console.log(
        `Segments: ${transcript.segments.length}, Words: ${transcript.words.length}, Duration: ${toTimestamp(transcript.duration)}`,
      );
      console.log("\nTranscript:");
      transcript.segments.forEach((seg) => {
        console.log(`  [${toTimestamp(seg.start)}] ${seg.text}`);
      });
      found = true;
      break;
    }

    if (!found) {
      console.log("No captions available.");
    }
  }
}

run().catch(console.error);
