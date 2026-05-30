import { eq } from "drizzle-orm";
import { db } from "./client";
import {
  threads,
  videos,
  videoMeta,
  transcripts,
  chunks as chunksTable,
} from "./schema";
import type { VideoAnalysis } from "@/services/video.service";

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
