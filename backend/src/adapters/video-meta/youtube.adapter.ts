import type { IVideoMeta, VideoCreator } from "@/types/video-meta";
import { VideoMetaAdapter } from "./base";

export interface YouTubeChannel {
  id: string;
  title: string;
  customUrl: string;
  subscriberCount: string;
  thumbnails?: { default?: { url: string } };
}

export interface YouTubeVideoSnippet {
  title: string;
  description: string;
  publishedAt: string;
  channelId: string;
  tags?: string[];
}

export interface YouTubeVideoStatistics {
  viewCount: string;
  likeCount: string;
  commentCount: string;
}

export interface YouTubeVideoContentDetails {
  duration: string;
}

export interface YouTubeRawResult {
  id: string;
  snippet: YouTubeVideoSnippet;
  statistics: YouTubeVideoStatistics;
  contentDetails: YouTubeVideoContentDetails;
  channel: YouTubeChannel;
}

export class YouTubeAdapter extends VideoMetaAdapter<YouTubeRawResult> {
  readonly provider = "youtube";

  adapt(raw: YouTubeRawResult): IVideoMeta {
    return {
      provider: this.provider,
      videoId: raw.id,
      title: raw.snippet.title,
      description: raw.snippet.description,
      url: `https://www.youtube.com/watch?v=${raw.id}`,
      views: parseInt(raw.statistics.viewCount, 10),
      likes: parseInt(raw.statistics.likeCount, 10),
      commentCount: parseInt(raw.statistics.commentCount, 10),
      creator: this.mapCreator(raw.channel),
      hashtags: this.extractHashtags(raw.snippet.tags),
      uploadDate: new Date(raw.snippet.publishedAt),
      duration: this.parseDuration(raw.contentDetails.duration),
      fetchedAt: this.timestamp(),
    };
  }

  private mapCreator(channel: YouTubeChannel): VideoCreator {
    return {
      id: channel.id,
      name: channel.title,
      handle: channel.customUrl,
      followerCount: parseInt(channel.subscriberCount, 10),
      avatarUrl: channel.thumbnails?.default?.url,
      profileUrl: `https://www.youtube.com/${channel.customUrl}`,
    };
  }

  private extractHashtags(tags?: string[]): string[] {
    if (!tags) return [];
    return tags.filter((t) => t.startsWith("#")).map((t) => t.slice(1).toLowerCase());
  }

  // Parses ISO 8601 duration (PT4M13S) → seconds
  private parseDuration(iso: string): number {
    const match = iso.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
    if (!match) return 0;
    const hours = parseInt(match[1] ?? "0", 10);
    const minutes = parseInt(match[2] ?? "0", 10);
    const seconds = parseInt(match[3] ?? "0", 10);
    return hours * 3600 + minutes * 60 + seconds;
  }
}
