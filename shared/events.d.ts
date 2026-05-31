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
  views: number;
  likes: number;
  commentCount: number;
  creator: VideoCreatorPayload;
  duration: number;
}

export type ChatSSEEvent =
  | { type: "thread_created"; threadId: string }
  | { type: "video_meta"; position: number; meta: VideoMetaPayload }
  | { type: "video_ready"; position: number }
  | { type: "agent_step"; platform: string | null, label: string; stepStatus: AgentStepStatus }
  | { type: "text_delta"; delta: string }
  | { type: "error"; message: string }
  | { type: "done" };
