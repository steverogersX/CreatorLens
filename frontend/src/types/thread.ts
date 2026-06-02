export type ThreadStatus = "pending" | "streaming" | "completed" | "error";

export interface ThreadSummary {
  threadId: string;
  title: string;
  videoTitles: string[];
  status: ThreadStatus;
  createdAt: string;
}

export interface ThreadVideoRow {
  position: number;
  url: string;
  provider: string;
  externalId: string;
  title: string;
  views: number;
  likes: number;
  commentCount: number;
  creatorName: string;
  creatorHandle: string;
  creatorFollowerCount: number;
  duration: number;
}
