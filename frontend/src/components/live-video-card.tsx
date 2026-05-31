"use client";

import { useState, useEffect } from "react";
import { VideoCard, type VideoData, type Platform } from "@/components/video-card";
import { subscribeStream, type LiveVideoMeta } from "@/lib/active-stream";

interface LiveVideoCardProps {
  threadId: string;
  position: 1 | 2;
  initial: VideoData;
}

function metaToVideoData(meta: LiveVideoMeta, label: "A" | "B", accent: "blue" | "green"): VideoData {
  const platform: Platform =
    meta.provider === "youtube"   ? "youtube"   :
    meta.provider === "instagram" ? "instagram" : "twitter";

  const videoType =
    platform === "youtube"   && meta.url.includes("/shorts/") ? "short" :
    platform === "instagram" && meta.url.includes("/reel/")   ? "reel"  :
    platform === "instagram"                                   ? "post"  :
    "video" as const;

  return {
    label,
    accent,
    platform,
    videoType,
    videoId: meta.videoId,
    title: meta.title,
    creator: meta.creator.name,
    followers: `${(meta.creator.followerCount / 1000).toFixed(0)}K`,
    views: meta.views.toLocaleString(),
    likes: meta.likes.toLocaleString(),
    comments: meta.commentCount.toLocaleString(),
    duration: `${Math.floor(meta.duration / 60)}:${String(Math.floor(meta.duration % 60)).padStart(2, "0")}`,
    engagementRate: meta.views > 0 ? parseFloat(((meta.likes / meta.views) * 100).toFixed(1)) : 0,
  };
}

export function LiveVideoCard({ threadId, position, initial }: LiveVideoCardProps) {
  const [video, setVideo] = useState<VideoData>(initial);

  useEffect(() => {
    const unsub = subscribeStream(threadId, (event) => {
      if (event.type === "video_meta" && event.position === position) {
        const label = position === 1 ? "A" : "B";
        const accent = position === 1 ? "blue" : "green";
        setVideo(metaToVideoData(event.meta, label, accent));
      }
    });
    return () => unsub?.();
  }, [threadId, position]);

  return <VideoCard video={video} isLoading={!video.title} />;
}
