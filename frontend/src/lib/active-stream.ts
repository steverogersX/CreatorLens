// Module-level singleton — survives Next.js soft navigations in the browser.
// Home page writes events here; /c/[threadId] subscribes and renders them.

import type { ChatSSEEvent } from "@shared/events";

export type { VideoMetaPayload as LiveVideoMeta } from "@shared/events";
export type LiveEvent = ChatSSEEvent;

type Listener = (event: LiveEvent) => void;

let _threadId: string | null = null;
let _buffer: LiveEvent[] = [];
let _listeners = new Set<Listener>();
let _done = false;
let _userMessage = "";

export function initStream(threadId: string, userMessage = ""): void {
  _threadId = threadId;
  _buffer = [];
  _listeners = new Set();
  _done = false;
  _userMessage = userMessage;
}

/** The user message that kicked off this stream — used to render/commit the user bubble on the thread page. */
export function getStreamUserMessage(threadId: string): string {
  return _threadId === threadId ? _userMessage : "";
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
