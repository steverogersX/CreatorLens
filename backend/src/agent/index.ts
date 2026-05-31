import { graph, graphConfig } from "./graph";
import type { RequestEventBus } from "@/lib/event-bus";

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
): Promise<string> {
  const events = graph.streamEvents(
    { threadId, userMessage },
    { version: "v2", ...graphConfig },
  );

  let fullContent = "";

  for await (const event of events) {

    if (event.event !== "on_chat_model_stream") continue;
    if (event.metadata?.langgraph_node !== "orchestrator") continue;

    const chunk = event.data?.chunk;
    if (!chunk) continue;

    const content = typeof chunk.content === "string" ? chunk.content : "";
    const hasToolCallChunks =
      Array.isArray(chunk.tool_call_chunks) && chunk.tool_call_chunks.length > 0;

    if (content && !hasToolCallChunks) {
      fullContent += content;
      bus.publish({ type: "text_delta", delta: content });
    }
  }

  return fullContent;
}
