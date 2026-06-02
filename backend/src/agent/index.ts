import { graph, graphConfig } from "./graph";
import { resolveCitations } from "./citations";
import type { RequestEventBus } from "@/lib/event-bus";
import { logger } from "@/lib/logger";

const log = logger.child({ module: "agent" });

export async function runAgent(threadId: string, userMessage: string): Promise<string> {
  const result = await graph.invoke(
    { threadId, userMessage },
    graphConfig,
  );
  const last = result.messages[result.messages.length - 1];
  return typeof last.content === "string" ? last.content : JSON.stringify(last.content);
}

const TOOL_LABELS: Record<string, string> = {
  read_video_transcript: "Reading video transcript",
  get_video_meta: "Fetching video metadata",
  read_thread_video_meta: "Reading thread video metadata",
};

function toolLabel(name: string): string {
  return TOOL_LABELS[name] ?? "Analyzing…";
}

export async function streamAgent(
  threadId: string,
  userMessage: string,
  bus: RequestEventBus,
  signal?: AbortSignal,
): Promise<string> {
  const events = graph.streamEvents(
    { threadId, userMessage },
    { version: "v2", signal, ...graphConfig },
  );

  let fullContent = "";
  let responseStepStarted = false;

  try {
    for await (const event of events) {
    if (signal?.aborted) break;
    if (event.event === "on_tool_start") {
      const label = toolLabel(event.name as string);
      bus.publish({ type: "agent_step", platform: null, label, stepStatus: "running" });
      continue;
    }

    if (event.event === "on_tool_end") {
      const label = toolLabel(event.name as string);
      bus.publish({ type: "agent_step", platform: null, label, stepStatus: "done" });
      continue;
    }

    if (event.event !== "on_chat_model_stream") continue;
    if (event.metadata?.langgraph_node !== "orchestrator") continue;

    const chunk = event.data?.chunk;
    if (!chunk) continue;

    const content = typeof chunk.content === "string" ? chunk.content : "";
    const hasToolCallChunks =
      Array.isArray(chunk.tool_call_chunks) && chunk.tool_call_chunks.length > 0;

    if (content && !hasToolCallChunks) {
      if (!responseStepStarted) {
        bus.publish({ type: "agent_step", platform: null, label: "Generating response", stepStatus: "running" });
        responseStepStarted = true;
      }
      fullContent += content;
      bus.publish({ type: "text_delta", delta: content });
    }
    }
  } catch (err) {
    // A client-initiated stop aborts the run; surface the partial answer
    // instead of throwing so it can be persisted and shown.
    if (signal?.aborted) {
      if (responseStepStarted) {
        bus.publish({ type: "agent_step", platform: null, label: "Generating response", stepStatus: "done" });
      }
      log.info({ threadId, partialLength: fullContent.length }, "[streamAgent] stopped by client");
      return fullContent;
    }
    throw err;
  }

  if (responseStepStarted) {
    bus.publish({ type: "agent_step", platform: null, label: "Generating response", stepStatus: "done" });
  }

  await resolveCitations(threadId, fullContent, bus);

  return fullContent;
}
