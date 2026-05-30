import { END, START, StateGraph } from "@langchain/langgraph";
import { type RunnableConfig } from "@langchain/core/runnables";
import { ToolNode } from "@langchain/langgraph/prebuilt";
import { ToolMessage, type ToolCall } from "@langchain/core/messages";
import { AgentState, type AgentStateType } from "./state";
import { contextLoader } from "./nodes/context-loader";
import { orchestratorNode, shouldContinue } from "./nodes/orchestrator";
import { tools } from "./tools/index";
import { logger } from "@/lib/logger";

const log = logger.child({ node: "tools" });
const _toolNode = new ToolNode(tools);

async function toolNode(state: AgentStateType): Promise<Partial<AgentStateType>> {
  const pending = state.messages[state.messages.length - 1];
  const pendingCalls: ToolCall[] = "tool_calls" in pending ? ((pending.tool_calls as ToolCall[]) ?? []) : [];

  log.info(
    { tools: pendingCalls.map((tc) => tc.name) },
    "[tools] executing tool calls",
  );

  pendingCalls.forEach((tc) => {
    log.debug({ tool: tc.name, args: tc.args }, "[tools] tool args");
  });

  const start = Date.now();
  const result = await _toolNode.invoke(state);
  const latencyMs = Date.now() - start;

  const toolMessages = (result.messages as ToolMessage[]).filter((m) => m instanceof ToolMessage);

  // Normalize content to plain string — required by Mistral, safe for all other providers
  const normalizedMessages = toolMessages.map((msg) => {
    const raw = typeof msg.content === "string" ? msg.content : JSON.stringify(msg.content);
    const preview = raw.slice(0, 600);
    const truncated = raw.length > 600;

    log.info(
      { tool: msg.name, outputBytes: raw.length, latencyMs, truncated },
      "[tools] tool returned",
    );
    log.debug({ tool: msg.name, output: preview + (truncated ? "…" : "") }, "[tools] tool output");

    msg.content = raw;
    return msg;
  });

  return { messages: normalizedMessages };
}

export const graph = new StateGraph(AgentState)
  .addNode("contextLoader", contextLoader)
  .addNode("orchestrator", orchestratorNode)
  .addNode("tools", toolNode)
  .addEdge(START, "contextLoader")
  .addEdge("contextLoader", "orchestrator")
  .addConditionalEdges("orchestrator", shouldContinue, {
    tools: "tools",
    [END]: END,
  })
  .addEdge("tools", "orchestrator")
  .compile();

export const graphConfig: RunnableConfig = { recursionLimit: 25 };
