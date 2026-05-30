import { AIMessage, HumanMessage, SystemMessage } from "@langchain/core/messages";
import { desc, eq } from "drizzle-orm";
import { db } from "@/db/client";
import { chatMessages, videoMeta } from "@/db/schema";
import { type AgentStateType, type VideoIndexEntry } from "../state";
import { logger } from "@/lib/logger";

const log = logger.child({ node: "contextLoader" });

const HISTORY_TURNS = 3;

const ROLE_MAP: Record<string, (content: string) => HumanMessage | AIMessage | SystemMessage> = {
  user: (c) => new HumanMessage(c),
  assistant: (c) => new AIMessage(c),
  system: (c) => new SystemMessage(c),
};

export async function contextLoader(state: AgentStateType): Promise<Partial<AgentStateType>> {
  const { threadId } = state;

  log.info({ threadId }, "[contextLoader] starting — loading chat history and video index");

  const [history, index] = await Promise.all([
    db
      .select({ role: chatMessages.role, content: chatMessages.content })
      .from(chatMessages)
      .where(eq(chatMessages.threadId, threadId))
      .orderBy(desc(chatMessages.createdAt))
      .limit(HISTORY_TURNS * 2),
    db
      .select({
        videoId: videoMeta.videoId,
        title: videoMeta.title,
        duration: videoMeta.duration,
      })
      .from(videoMeta)
      .where(eq(videoMeta.threadId, threadId))
      .orderBy(videoMeta.position) as Promise<VideoIndexEntry[]>,
  ]);

  log.info(
    { threadId, historyMessages: history.length, videos: index.length },
    "[contextLoader] db queries done",
  );

  log.debug(
    {
      history: history.map((r) => ({ role: r.role, preview: r.content.slice(0, 80) })),
      videoIndex: index.map((v) => ({ videoId: v.videoId, title: v.title, duration: v.duration })),
    },
    "[contextLoader] loaded content",
  );

  const messages = history
    .reverse()
    .map((row) => (ROLE_MAP[row.role] ?? ROLE_MAP.assistant)(row.content));

  return { messages, videoIndex: index };
}
