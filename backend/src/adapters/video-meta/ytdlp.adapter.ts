import type { VideoInfo } from "ytdlp-nodejs";
import type { IVideoMeta, VideoCreator } from "@/types/video-meta";
import { VideoMetaAdapter } from "./base";

export class YtDlpVideoMetaAdapter extends VideoMetaAdapter<VideoInfo> {
  constructor(readonly provider: string = "youtube") {
    super();
  }

  adapt(raw: VideoInfo): IVideoMeta {
    return {
      provider: this.provider,
      videoId: raw.id,
      title: raw.title,
      description: raw.description || undefined,
      url: raw.webpage_url,
      thumbnailUrl: raw.thumbnail || undefined,
      views: raw.view_count ?? 0,
      likes: raw.like_count ?? 0,
      commentCount: raw.comment_count ?? 0,
      retweets: (raw as unknown as { repost_count?: number }).repost_count ?? undefined,
      creator: this.adaptCreator(raw),
      hashtags: this.adaptHashtags(raw.tags ?? []),
      uploadDate: raw.upload_date ? this.parseUploadDate(raw.upload_date) : new Date(0),
      duration: raw.duration ?? 0,
      fetchedAt: this.timestamp(),
    };
  }

  private adaptCreator(raw: VideoInfo): VideoCreator {
    return {
      id: raw.channel_id ?? raw.uploader_id,
      name: raw.channel ?? raw.uploader,
      handle: raw.uploader_id ?? "",
      followerCount: raw.channel_follower_count ?? 0,
      profileUrl: raw.channel_url ?? raw.uploader_url,
    };
  }

  private adaptHashtags(tags: string[]): string[] {
    return tags
      .filter((t) => t.trim().length > 0)
      .map((t) => (t.startsWith("#") ? t : `#${t}`));
  }

  // upload_date from yt-dlp is "YYYYMMDD"
  private parseUploadDate(uploadDate: string): Date {
    const year = parseInt(uploadDate.slice(0, 4), 10);
    const month = parseInt(uploadDate.slice(4, 6), 10) - 1;
    const day = parseInt(uploadDate.slice(6, 8), 10);
    return new Date(year, month, day);
  }
}
