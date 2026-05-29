import { YtDlp } from "ytdlp-nodejs";
import { YtDlpVideoMetaAdapter } from "@/adapters/video-meta/ytdlp.adapter";

const URLS = [
  "https://youtu.be/TLysAkFM4cA?si=nOdbgkQ8PKVkGFtl",
  "https://www.youtube.com/watch?v=9bZkp7q19f0",
];

const ytdlp = new YtDlp();
const adapter = new YtDlpVideoMetaAdapter();

async function run(): Promise<void> {
  for (const url of URLS) {
    console.log(`\n--- Fetching metadata for: ${url} ---`);

    const info = await ytdlp.getInfoAsync<"video">(url);
    const meta = adapter.adapt(info);

    console.log(`Title:        ${meta.title}`);
    console.log(`Video ID:     ${meta.videoId}`);
    console.log(`URL:          ${meta.url}`);
    console.log(`Views:        ${meta.views.toLocaleString()}`);
    console.log(`Likes:        ${meta.likes.toLocaleString()}`);
    console.log(`Comments:     ${meta.commentCount.toLocaleString()}`);
    console.log(`Duration:     ${meta.duration}s`);
    console.log(`Upload date:  ${meta.uploadDate.toDateString()}`);
    console.log(`Hashtags:     ${meta.hashtags.join(", ") || "(none)"}`);
    console.log(`Creator:`);
    console.log(`  Name:       ${meta.creator.name}`);
    console.log(`  Handle:     ${meta.creator.handle}`);
    console.log(`  Followers:  ${meta.creator.followerCount.toLocaleString()}`);
    console.log(`  Profile:    ${meta.creator.profileUrl ?? "(none)"}`);
    console.log(`Fetched at:   ${meta.fetchedAt.toISOString()}`);
  }
}

run().catch(console.error);
