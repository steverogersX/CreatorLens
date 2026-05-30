import { HumanMessage } from "@langchain/core/messages";
import { graph, graphConfig } from "./graph";

export async function runAgent(threadId: string, userMessage: string): Promise<string> {
  const result = await graph.invoke(
    {
      threadId,
      messages: [new HumanMessage(userMessage)],
    },
    graphConfig,
  );

  const last = result.messages[result.messages.length - 1];
  return typeof last.content === "string" ? last.content : JSON.stringify(last.content);
}
