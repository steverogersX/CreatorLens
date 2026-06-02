import type { Request, Response, NextFunction } from "express";
import { fromZodError } from "zod-validation-error";
import { analyzeVideosSchema } from "@/schemas/video.schema";
import { BadRequestError } from "@/errors/app-error";
import { analyzeVideosStreaming } from "@/services/video.service";
import {
  getThreadData,
  listThreads,
  saveMessages,
  threadExists,
  truncateThreadMessages,
  updateThreadStatus,
} from "@/db/persist";
import { streamAgent } from "@/agent";
import {
  containsCitationMarker,
  fetchThreadChunks,
  resolveCitationsFromChunks,
} from "@/agent/citations";
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

  // Abort the agent run when the client disconnects (Stop button / navigation).
  const ac = new AbortController();
  let responseEnded = false;
  res.on("close", () => {
    if (!responseEnded) ac.abort();
  });

  // Persist the user turn plus a non-empty assistant answer. A stop may leave
  // the assistant partial or empty — keep whatever was streamed so a reload
  // matches what the user saw.
  const persistTurn = async (threadId: string, userMessage: string, aiResponse: string) => {
    const turn = [{ role: "user", content: userMessage }];
    if (aiResponse.trim().length > 0) turn.push({ role: "assistant", content: aiResponse });
    await saveMessages(threadId, turn);
  };

  let threadId: string | null = null;

  try {
    if (result.data.type === "new") {
      const { urls, userMessage } = result.data;

      threadId = await analyzeVideosStreaming(urls, bus);
      const aiResponse = await streamAgent(threadId, userMessage, bus, ac.signal);

      await persistTurn(threadId, userMessage, aiResponse);
      await updateThreadStatus(threadId, "completed");
    } else {
      const { userMessage, truncateTo } = result.data;
      threadId = result.data.threadId;

      const exists = await threadExists(threadId);
      if (!exists) {
        writeSSE(res, { type: "error", message: `Thread ${threadId} not found` });
        res.end();
        return;
      }

      // Edit/regenerate: drop the messages being replaced before re-running.
      if (truncateTo !== undefined) await truncateThreadMessages(threadId, truncateTo);

      const aiResponse = await streamAgent(threadId, userMessage, bus, ac.signal);

      await persistTurn(threadId, userMessage, aiResponse);
    }

    writeSSE(res, { type: "done" });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    if (threadId) await updateThreadStatus(threadId, "error").catch(() => {});
    writeSSE(res, { type: "error", message });
  } finally {
    responseEnded = true;
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

  // Re-resolve inline citation markers against the stored transcript chunks so
  // hover snippets survive a reload (only the message text is persisted).
  const hasCitations = data.messages.some(
    (m) => m.role === "assistant" && containsCitationMarker(m.content),
  );
  const messages = hasCitations
    ? await (async () => {
        const byPosition = await fetchThreadChunks(threadId);
        return data.messages.map((m) =>
          m.role === "assistant"
            ? { ...m, citations: resolveCitationsFromChunks(m.content, byPosition) }
            : m,
        );
      })()
    : data.messages;

  res.status(StatusCodes.OK).json({ data: { ...data, messages } });
}
