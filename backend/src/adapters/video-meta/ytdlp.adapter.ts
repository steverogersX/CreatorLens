import type { VideoInfo } from "ytdlp-nodejs";
import type { IVideoMeta, VideoCreator } from "@/types/video-meta";
import { VideoMetaAdapter } from "./base";

export class YtDlpVideoMetaAdapter extends VideoMetaAdapter<VideoInfo> {
  readonly provider = "youtube";

  adapt(raw: VideoInfo): IVideoMeta {
    return {
      provider: this.provider,
      videoId: raw.id,
      title: raw.title,
      description: raw.description || undefined,
      url: raw.webpage_url,
      views: raw.view_count ?? 0,
      likes: raw.like_count ?? 0,
      commentCount: raw.comment_count ?? 0,
      creator: this.adaptCreator(raw),
      hashtags: this.adaptHashtags(raw.tags ?? []),
      uploadDate: this.parseUploadDate(raw.upload_date),
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
