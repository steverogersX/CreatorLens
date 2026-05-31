import type { Request, Response, NextFunction } from "express";
import { fromZodError } from "zod-validation-error";
import { analyzeVideosSchema } from "@/schemas/video.schema";
import { BadRequestError } from "@/errors/app-error";
import { analyzeVideosStreaming } from "@/services/video.service";
import { getThreadData, saveMessages, threadExists } from "@/db/persist";
import { streamAgent } from "@/agent";
import { StatusCodes } from "http-status-codes";
import type { ChatSSEEvent } from "@/types/sse";

function writeSSE(res: Response, event: ChatSSEEvent): void {
  res.write(`data: ${JSON.stringify(event)}\n\n`);
}

function openSSE(res: Response): void {
  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");
  res.flushHeaders();
}

export async function chatStream(req: Request, res: Response, next: NextFunction): Promise<void> {
  const result = analyzeVideosSchema.safeParse(req.body);
  if (!result.success) {
    next(new BadRequestError(fromZodError(result.error).message));
    return;
  }

  openSSE(res);

  try {
    if (result.data.type === "new") {
      const { urls, userMessage } = result.data;

      const threadId = await analyzeVideosStreaming(urls, {
        onThreadCreated: (id) => writeSSE(res, { type: "thread_created", threadId: id }),
        onVideoMeta: (position, meta) => writeSSE(res, { type: "video_meta", position, meta }),
        onVideoReady: (position) => writeSSE(res, { type: "video_ready", position }),
      });

      const aiResponse = await streamAgent(
        threadId,
        userMessage,
        (delta) => writeSSE(res, { type: "text_delta", delta }),
        (label, stepStatus) => writeSSE(res, { type: "agent_step", label, stepStatus }),
      );

      await saveMessages(threadId, [
        { role: "user", content: userMessage },
        { role: "assistant", content: aiResponse },
      ]);
    } else {
      const { threadId, userMessage } = result.data;

      const exists = await threadExists(threadId);
      if (!exists) {
        writeSSE(res, { type: "error", message: `Thread ${threadId} not found` });
        res.end();
        return;
      }

      const aiResponse = await streamAgent(
        threadId,
        userMessage,
        (delta) => writeSSE(res, { type: "text_delta", delta }),
        (label, stepStatus) => writeSSE(res, { type: "agent_step", label, stepStatus }),
      );

      await saveMessages(threadId, [
        { role: "user", content: userMessage },
        { role: "assistant", content: aiResponse },
      ]);
    }

    writeSSE(res, { type: "done" });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    writeSSE(res, { type: "error", message });
  } finally {
    res.end();
  }
}

export async function getThread(req: Request, res: Response): Promise<void> {
  const threadId = req.params["threadId"] as string;
  const data = await getThreadData(threadId);
  if (!data) {
    res.status(StatusCodes.NOT_FOUND).json({ error: `Thread ${threadId} not found` });
    return;
  }
  res.status(StatusCodes.OK).json({ data });
}
