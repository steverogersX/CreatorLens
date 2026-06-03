export interface VideoCreator {
  id: string;
  name: string;
  handle: string;
  followerCount: number;
  avatarUrl?: string;
  profileUrl?: string;
}

export interface IVideoMeta {
  provider: string;
  videoId: string;
  title: string;
  description?: string;
  url: string;
  thumbnailUrl?: string;
  views: number;
  likes: number;
  commentCount: number;
  retweets?: number;
  creator: VideoCreator;
  hashtags: string[];
  uploadDate: Date;
  duration: number;
  fetchedAt: Date;
}
