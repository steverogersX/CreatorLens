import { z } from "zod";
import { createUIMessageStream, createUIMessageStreamResponse } from "ai";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const BACKEND_URL = process.env["BACKEND_URL"] ?? "http://localhost:5000";

const newThreadSchema = z.object({
  type: z.literal("new"),
  urls: z.tuple([z.string().url(), z.string().url()]),
  userMessage: z.string().min(1),
});

const followUpSchema = z.object({
  type: z.literal("followup"),
  threadId: z.string().uuid(),
  userMessage: z.string().min(1),
  truncateTo: z.number().int().nonnegative().optional(),
});

const chatRequestSchema = z.discriminatedUnion("type", [newThreadSchema, followUpSchema]);

export async function POST(req: Request): Promise<Response> {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const parsed = chatRequestSchema.safeParse(body);
  if (!parsed.success) {
    return Response.json({ error: parsed.error.issues }, { status: 422 });
  }

  let backendRes: Response;
  try {
    backendRes = await fetch(`${BACKEND_URL}/api/v1/chat`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(parsed.data),
      // Propagate a client Stop / disconnect to the backend so the agent halts.
      signal: req.signal,
    });
  } catch {
    // Client aborted before the backend responded — nothing to stream.
    return new Response(null, { status: 499 });
  }

  if (!backendRes.ok || !backendRes.body) {
    return Response.json({ error: "Backend unavailable" }, { status: 502 });
  }

  const stream = createUIMessageStream({
    execute: async ({ writer }) => {
      const reader = backendRes.body!.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      const textPartId = "text-0";
      let textStarted = false;

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() ?? "";

        for (const line of lines) {
          if (!line.startsWith("data: ")) continue;
          const raw = line.slice(6).trim();
          if (!raw) continue;

          let event: Record<string, unknown>;
          try {
            event = JSON.parse(raw) as Record<string, unknown>;
          } catch {
            continue;
          }

          switch (event["type"]) {
            case "thread_created":
              writer.write({ type: "data-thread-created", data: { threadId: event["threadId"] } });
              break;

            case "video_meta":
              writer.write({
                type: "data-video-meta",
                data: { position: event["position"], meta: event["meta"] },
              });
              break;

            case "video_ready":
              writer.write({ type: "data-video-ready", data: { position: event["position"] } });
              break;

            case "agent_step":
              writer.write({
                type: "data-agent-step",
                data: { label: event["label"], platform: event["platform"], stepStatus: event["stepStatus"] },
              });
              break;

            case "text_delta": {
              const delta = event["delta"] as string;
              if (!textStarted) {
                writer.write({ type: "text-start", id: textPartId });
                textStarted = true;
              }
              writer.write({ type: "text-delta", id: textPartId, delta });
              break;
            }

            case "done":
              if (textStarted) {
                writer.write({ type: "text-end", id: textPartId });
                textStarted = false;
              }
              break;

            case "citations":
              writer.write({
                type: "data-citations",
                data: { citations: event["citations"] },
              });
              break;

            case "error":
              if (textStarted) {
                writer.write({ type: "text-end", id: textPartId });
                textStarted = false;
              }
              await reader.cancel();
              throw new Error(event["message"] as string);
          }
        }
      }

      if (textStarted) {
        writer.write({ type: "text-end", id: textPartId });
      }
    },
  });

  return createUIMessageStreamResponse({ stream });
}
