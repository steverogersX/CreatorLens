import { AIMessage, AIMessageChunk, SystemMessage } from "@langchain/core/messages";
import { END } from "@langchain/langgraph";
import { type AgentStateType } from "../state";
import { buildOrchestratorSystemPrompt } from "../prompts/orchestrator.prompt";
import { tools } from "../tools/index";
import { createModel } from "../model";
import { logger } from "@/lib/logger";
import { config } from "@/config";

const log = logger.child({ node: "orchestrator" });

const model = createModel(tools);

const MODEL_TIMEOUT_MS = 130_000;

function withTimeout<T>(promise: Promise<T>, ms: number, label: string): Promise<T> {
  return Promise.race([
    promise,
    new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error(`${label} timed out after ${ms}ms`)), ms),
    ),
  ]);
}

export async function orchestratorNode(
  state: AgentStateType,
): Promise<Partial<AgentStateType>> {
  const systemPrompt = buildOrchestratorSystemPrompt(state);

  log.info(
    { provider: config.LLM_PROVIDER, model: config.LLM_MODEL, messageCount: state.messages.length },
    "[orchestrator] invoking model",
  );

  log.debug({ systemPrompt }, "[orchestrator] system prompt sent to model");

  const start = Date.now();
  let response: AIMessage;
  try {
    response = await withTimeout(
      model.invoke([new SystemMessage(systemPrompt), ...state.messages]) as Promise<AIMessage>,
      MODEL_TIMEOUT_MS,
      "model.invoke",
    );
  } catch (err) {
    log.error({ err }, "[orchestrator] model invocation failed");
    throw err;
  }

  const latencyMs = Date.now() - start;
  const usage = (response as AIMessageChunk).usage_metadata;

  log.info(
    { latencyMs, inputTokens: usage?.input_tokens, outputTokens: usage?.output_tokens },
    "[orchestrator] model responded",
  );

  if (response.tool_calls?.length) {
    log.info(
      {
        toolCalls: response.tool_calls.map((tc) => ({ name: tc.name, args: tc.args })),
        finishReason: response.response_metadata?.finishReason ?? response.response_metadata?.finish_reason,
      },
      "[orchestrator] model chose to call tools",
    );
    log.debug(
      { rawContent: response.content },
      "[orchestrator] model internal content alongside tool calls (reasoning if any)",
    );
  } else {
    const content = typeof response.content === "string" ? response.content : JSON.stringify(response.content);
    log.info(
      { answerLength: content.length },
      "[orchestrator] model produced final answer",
    );
    log.debug({ answer: content }, "[orchestrator] final answer content");
  }

  return { messages: [response] };
}

export function shouldContinue(state: AgentStateType): "tools" | typeof END {
  const last = state.messages[state.messages.length - 1];
  if ((last instanceof AIMessage || last instanceof AIMessageChunk) && last.tool_calls?.length) {
    log.debug({ toolNames: last.tool_calls.map((tc) => tc.name) }, "[orchestrator] routing to tools");
    return "tools";
  }
  log.debug("[orchestrator] no tool calls — routing to END");
  return END;
}
