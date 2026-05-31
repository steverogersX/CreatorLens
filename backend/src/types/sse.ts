import type { IVideoMeta } from "./video-meta";

export type AgentStepStatus = "running" | "done";

export type ChatSSEEvent =
  | { type: "thread_created"; threadId: string }
  | { type: "video_meta"; position: number; meta: IVideoMeta }
  | { type: "video_ready"; position: number }
  | { type: "agent_step"; label: string; stepStatus: AgentStepStatus }
  | { type: "text_delta"; delta: string }
  | { type: "error"; message: string }
  | { type: "done" };
