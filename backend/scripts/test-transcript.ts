import { YoutubeTranscript } from "youtube-transcript";

const URLS = [
  "https://youtu.be/TLysAkFM4cA?si=nOdbgkQ8PKVkGFtl",
  "https://www.youtube.com/watch?v=9bZkp7q19f0",
];

function extractVideoId(url: string): string {
  const match = url.match(/(?:v=|youtu\.be\/)([^&?/]+)/);
  if (!match) throw new Error(`Cannot extract video ID from: ${url}`);
  return match[1];
}

async function run(): Promise<void> {
  for (const url of URLS) {
    const videoId = extractVideoId(url);
    console.log(`\n--- Fetching transcript for: ${url} ---`);

    const transcript = await YoutubeTranscript.fetchTranscript(videoId);

    if (!transcript || transcript.length === 0) {
      console.log("No transcript available.");
      continue;
    }

    console.log(`Segments: ${transcript.length}`);
    console.log("\nTranscript:");
    transcript.forEach((entry) => {
      console.log(`  [${entry.offset}ms] ${entry.text}`);
    });
  }
}

run().catch(console.error);
