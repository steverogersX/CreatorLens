import { videoMeta } from "@/db/schema";

export const VIDEO_META_COLUMNS = {
  id: videoMeta.id,
  threadId: videoMeta.threadId,
  videoId: videoMeta.videoId,
  title: videoMeta.title,
  description: videoMeta.description,
  creatorName: videoMeta.creatorName,
  position: videoMeta.position,
  views: videoMeta.views,
  likes: videoMeta.likes,
  commentCount: videoMeta.commentCount,
  creatorId: videoMeta.creatorId,
  creatorHandle: videoMeta.creatorHandle,
  creatorFollowerCount: videoMeta.creatorFollowerCount,
  creatorAvatarUrl: videoMeta.creatorAvatarUrl,
  creatorProfileUrl: videoMeta.creatorProfileUrl,
  hashtags: videoMeta.hashtags,
  uploadDate: videoMeta.uploadDate,
  duration: videoMeta.duration,
  fetchedAt: videoMeta.fetchedAt,
} as const;

export type VideoMetaColumn = keyof typeof VIDEO_META_COLUMNS;

export function pickColumns<K extends VideoMetaColumn>(keys: readonly K[]) {
  return Object.fromEntries(keys.map((k) => [k, VIDEO_META_COLUMNS[k]])) as Pick<
    typeof VIDEO_META_COLUMNS,
    K
  >;
}
