// Module-level singleton — survives Next.js soft navigations in the browser.
// Home page writes events here; /c/[threadId] subscribes and renders them.

export interface LiveVideoMeta {
  provider: string;
  videoId: string;
  title: string;
  url: string;
  views: number;
  likes: number;
  commentCount: number;
  creator: { name: string; handle: string; followerCount: number; avatarUrl?: string };
  duration: number;
}

export type LiveEvent =
  | { type: "video_meta"; position: number; meta: LiveVideoMeta }
  | { type: "agent_step"; label: string; stepStatus: "running" | "done" }
  | { type: "text_delta"; delta: string }
  | { type: "done" }
  | { type: "error"; message: string };

type Listener = (event: LiveEvent) => void;

let _threadId: string | null = null;
let _buffer: LiveEvent[] = [];
let _listeners = new Set<Listener>();
let _done = false;

export function initStream(threadId: string): void {
  _threadId = threadId;
  _buffer = [];
  _listeners = new Set();
  _done = false;
}

export function pushStreamEvent(event: LiveEvent): void {
  if (!_threadId) return;
  _buffer.push(event);
  if (event.type === "done" || event.type === "error") _done = true;
  _listeners.forEach((l) => l(event));
}

/** Subscribe to live events for a threadId. Replays buffered events immediately. Returns unsub fn or null if wrong threadId. */
export function subscribeStream(threadId: string, listener: Listener): (() => void) | null {
  if (_threadId !== threadId) return null;
  // Replay already-buffered events synchronously
  _buffer.forEach((e) => listener(e));
  if (_done) return () => {};
  _listeners.add(listener);
  return () => _listeners.delete(listener);
}

export function isStreamKnown(threadId: string): boolean {
  return _threadId === threadId;
}
