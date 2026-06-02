import type { Response } from "express";
import type { ChatSSEEvent } from "@/types/sse";

export function openSSE(res: Response): void {
  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");
  res.flushHeaders();
}

export function writeSSE(res: Response, event: ChatSSEEvent): void {
  res.write(`data: ${JSON.stringify(event)}\n\n`);
}
