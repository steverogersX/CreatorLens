export type AgentStepStatus = "running" | "done";

export interface VideoCreatorPayload {
  name: string;
  handle: string;
  followerCount: number;
  avatarUrl?: string;
}

export interface VideoMetaPayload {
  provider: string;
  videoId: string;
  title: string;
  url: string;
  thumbnailUrl?: string;
  views: number;
  likes: number;
  commentCount: number;
  retweets?: number;
  creator: VideoCreatorPayload;
  duration: number;
}

export interface CitationPayload {
  video: "A" | "B";
  /** Start of the cited chunk, formatted MM:SS — matches the inline `[A:MM:SS]` marker. */
  timestampLabel: string;
  timestampSecs: number;
  /** End of the cited chunk, formatted MM:SS — used to render the time range. */
  endTimestampLabel: string;
  endSecs: number;
  /** The transcript text of the cited chunk. */
  snippet: string;
}

export type ChatSSEEvent =
  | { type: "thread_created"; threadId: string }
  | { type: "video_meta"; position: number; meta: VideoMetaPayload }
  | { type: "video_ready"; position: number }
  | { type: "agent_step"; platform: string | null, label: string; stepStatus: AgentStepStatus }
  | { type: "text_delta"; delta: string }
  | { type: "citations"; citations: CitationPayload[] }
  | { type: "error"; message: string }
  | { type: "done" };
