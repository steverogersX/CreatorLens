import type { Request, Response, NextFunction } from "express";
import { fromZodError } from "zod-validation-error";
import { analyzeVideosSchema } from "@/schemas/video.schema";
import { BadRequestError } from "@/errors/app-error";
import { analyzeVideosStreaming } from "@/services/video.service";
import { getThreadData, listThreads, saveMessages, threadExists, updateThreadStatus } from "@/db/persist";
import { streamAgent } from "@/agent";
import { StatusCodes } from "http-status-codes";
import { openSSE, writeSSE } from "@/lib/sse";
import { RequestEventBus } from "@/lib/event-bus";

export async function chatStream(req: Request, res: Response, next: NextFunction): Promise<void> {
  const result = analyzeVideosSchema.safeParse(req.body);
  if (!result.success) {
    next(new BadRequestError(fromZodError(result.error).message));
    return;
  }

  openSSE(res);

  const bus = new RequestEventBus();
  bus.subscribe((event) => writeSSE(res, event));

  let threadId: string | null = null;

  try {
    if (result.data.type === "new") {
      const { urls, userMessage } = result.data;

      threadId = await analyzeVideosStreaming(urls, bus);
      const aiResponse = await streamAgent(threadId, userMessage, bus);

      await saveMessages(threadId, [
        { role: "user", content: userMessage },
        { role: "assistant", content: aiResponse },
      ]);
      await updateThreadStatus(threadId, "completed");
    } else {
      const { userMessage } = result.data;
      threadId = result.data.threadId;

      const exists = await threadExists(threadId);
      if (!exists) {
        writeSSE(res, { type: "error", message: `Thread ${threadId} not found` });
        res.end();
        return;
      }

      const aiResponse = await streamAgent(threadId, userMessage, bus);

      await saveMessages(threadId, [
        { role: "user", content: userMessage },
        { role: "assistant", content: aiResponse },
      ]);
    }

    writeSSE(res, { type: "done" });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    if (threadId) await updateThreadStatus(threadId, "error").catch(() => {});
    writeSSE(res, { type: "error", message });
  } finally {
    res.end();
  }
}

export async function getThreads(_req: Request, res: Response): Promise<void> {
  const threads = await listThreads();
  res.status(StatusCodes.OK).json({ data: threads });
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
