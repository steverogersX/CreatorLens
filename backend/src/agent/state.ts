import { Annotation, MessagesAnnotation } from "@langchain/langgraph";

export interface VideoIndexEntry {
  videoId: string;
  title: string;
  duration: number;
}

export const AgentState = Annotation.Root({
  ...MessagesAnnotation.spec,
  threadId: Annotation<string>(),
  videoIndex: Annotation<VideoIndexEntry[]>({
    value: (_, update) => update,
    default: () => [],
  }),
});

export type AgentStateType = typeof AgentState.State;
