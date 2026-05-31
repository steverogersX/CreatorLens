import { asc, eq } from "drizzle-orm";
import { db } from "./client";
import {
  threads,
  videos,
  videoMeta,
  transcripts,
  chunks as chunksTable,
  chatMessages,
} from "./schema";
import type { VideoAnalysis } from "@/services/video.service";

export interface ThreadVideoRow {
  position: number;
  url: string;
  provider: string;
  externalId: string;
  title: string;
  views: number;
  likes: number;
  commentCount: number;
  creatorName: string;
  creatorHandle: string;
  creatorFollowerCount: number;
  duration: number;
}

export type ThreadStatus = "streaming" | "completed" | "error";

export interface ThreadData {
  threadId: string;
  status: ThreadStatus;
  videos: ThreadVideoRow[];
  messages: Array<{ role: string; content: string; createdAt: Date }>;
}

export async function createThread(): Promise<string> {
  const [thread] = await db.insert(threads).values({ status: "streaming" }).returning({ id: threads.id });
  return thread!.id;
}

export async function updateThreadStatus(threadId: string, status: ThreadStatus): Promise<void> {
  await db.update(threads).set({ status }).where(eq(threads.id, threadId));
}

export async function persistVideoAnalysis(
  threadId: string,
  position: number,
  analysis: VideoAnalysis,
): Promise<void> {
  const { meta, transcript, chunks } = analysis;

  await db.transaction(async (tx) => {
    const [video] = await tx
      .insert(videos)
      .values({ provider: meta.provider, externalId: meta.videoId, url: meta.url })
      .onConflictDoUpdate({
        target: [videos.provider, videos.externalId],
        set: { url: meta.url },
      })
      .returning({ id: videos.id });

    await tx.insert(videoMeta).values({
      threadId,
      videoId: video!.id,
      position,
      title: meta.title,
      description: meta.description ?? null,
      views: meta.views,
      likes: meta.likes,
      commentCount: meta.commentCount,
      creatorId: meta.creator.id,
      creatorName: meta.creator.name,
      creatorHandle: meta.creator.handle,
      creatorFollowerCount: meta.creator.followerCount,
      creatorAvatarUrl: meta.creator.avatarUrl ?? null,
      creatorProfileUrl: meta.creator.profileUrl ?? null,
      hashtags: meta.hashtags,
      uploadDate: meta.uploadDate,
      duration: meta.duration,
      fetchedAt: meta.fetchedAt,
    });

    const [dbTranscript] = await tx
      .insert(transcripts)
      .values({
        threadId,
        videoId: video!.id,
        provider: transcript.provider,
        language: transcript.language,
        duration: transcript.duration,
      })
      .returning({ id: transcripts.id });

    if (chunks.length > 0) {
      await tx.insert(chunksTable).values(
        chunks.map((c) => ({
          transcriptId: dbTranscript!.id,
          chunkIndex: c.chunkIndex,
          text: c.text,
          startTime: c.startTime,
          endTime: c.endTime,
          embedding: c.embedding,
        })),
      );
    }
  });
}

export async function saveMessages(
  threadId: string,
  messages: Array<{ role: string; content: string }>,
): Promise<void> {
  if (messages.length === 0) return;
  await db.insert(chatMessages).values(messages.map((m) => ({ threadId, ...m })));
}

export async function getThreadData(threadId: string): Promise<ThreadData | null> {
  const threadRows = await db
    .select({ id: threads.id, status: threads.status })
    .from(threads)
    .where(eq(threads.id, threadId))
    .limit(1);

  if (threadRows.length === 0) return null;

  const [videoRows, messageRows] = await Promise.all([
    db
      .select({
        position: videoMeta.position,
        url: videos.url,
        provider: videos.provider,
        externalId: videos.externalId,
        title: videoMeta.title,
        views: videoMeta.views,
        likes: videoMeta.likes,
        commentCount: videoMeta.commentCount,
        creatorName: videoMeta.creatorName,
        creatorHandle: videoMeta.creatorHandle,
        creatorFollowerCount: videoMeta.creatorFollowerCount,
        duration: videoMeta.duration,
      })
      .from(videoMeta)
      .innerJoin(videos, eq(videoMeta.videoId, videos.id))
      .where(eq(videoMeta.threadId, threadId))
      .orderBy(asc(videoMeta.position)),
    db
      .select({ role: chatMessages.role, content: chatMessages.content, createdAt: chatMessages.createdAt })
      .from(chatMessages)
      .where(eq(chatMessages.threadId, threadId))
      .orderBy(asc(chatMessages.createdAt)),
  ]);

  return {
    threadId,
    status: threadRows[0]!.status as ThreadStatus,
    videos: videoRows,
    messages: messageRows,
  };
}

export async function threadExists(threadId: string): Promise<boolean> {
  const rows = await db
    .select({ id: threads.id })
    .from(threads)
    .where(eq(threads.id, threadId))
    .limit(1);
  return rows.length > 0;
}

export async function persistThread(analyses: VideoAnalysis[]): Promise<string> {
  return await db.transaction(async (tx) => {
    const [thread] = await tx
      .insert(threads)
      .values({})
      .returning({ id: threads.id });

    for (let i = 0; i < analyses.length; i++) {
      const { meta, transcript, chunks } = analyses[i]!;
      const position = i + 1;

      const [video] = await tx
        .insert(videos)
        .values({ provider: meta.provider, externalId: meta.videoId, url: meta.url })
        .onConflictDoUpdate({
          target: [videos.provider, videos.externalId],
          set: { url: meta.url },
        })
        .returning({ id: videos.id });

      await tx.insert(videoMeta).values({
        threadId: thread!.id,
        videoId: video!.id,
        position,
        title: meta.title,
        description: meta.description ?? null,
        views: meta.views,
        likes: meta.likes,
        commentCount: meta.commentCount,
        creatorId: meta.creator.id,
        creatorName: meta.creator.name,
        creatorHandle: meta.creator.handle,
        creatorFollowerCount: meta.creator.followerCount,
        creatorAvatarUrl: meta.creator.avatarUrl ?? null,
        creatorProfileUrl: meta.creator.profileUrl ?? null,
        hashtags: meta.hashtags,
        uploadDate: meta.uploadDate,
        duration: meta.duration,
        fetchedAt: meta.fetchedAt,
      });

      const [dbTranscript] = await tx
        .insert(transcripts)
        .values({
          threadId: thread!.id,
          videoId: video!.id,
          provider: transcript.provider,
          language: transcript.language,
          duration: transcript.duration,
        })
        .returning({ id: transcripts.id });

      if (chunks.length > 0) {
        await tx.insert(chunksTable).values(
          chunks.map((c) => ({
            transcriptId: dbTranscript!.id,
            chunkIndex: c.chunkIndex,
            text: c.text,
            startTime: c.startTime,
            endTime: c.endTime,
            embedding: c.embedding,
          })),
        );
      }
    }

    return thread!.id;
  });
}
