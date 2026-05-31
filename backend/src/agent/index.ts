import { graph, graphConfig } from "./graph";
import type { AgentStepStatus } from "@/types/sse";

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
  onDelta: (delta: string) => void,
  onStep?: (label: string, stepStatus: AgentStepStatus) => void,
): Promise<string> {
  const events = graph.streamEvents(
    { threadId, userMessage },
    { version: "v2", ...graphConfig },
  );

  let fullContent = "";

  for await (const event of events) {
    // Tool lifecycle events — surface as agent steps
    if (event.event === "on_tool_start" && event.metadata?.langgraph_node === "tools") {
      onStep?.(toolLabel(event.name as string), "running");
      continue;
    }
    if (event.event === "on_tool_end" && event.metadata?.langgraph_node === "tools") {
      onStep?.(toolLabel(event.name as string), "done");
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
      fullContent += content;
      onDelta(content);
    }
  }

  return fullContent;
}
