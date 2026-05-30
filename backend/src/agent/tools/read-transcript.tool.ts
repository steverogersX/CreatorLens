import { tool } from "@langchain/core/tools";
import { and, eq, gte, lte } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db/client";
import { chunks, transcripts } from "@/db/schema";

const ReadTranscriptSchema = z.object({
  videoId: z.uuid().describe("The video ID to fetch the transcript for"),
  provider: z
    .string()
    .optional()
    .describe("Filter by transcript provider, e.g. 'youtube' or 'whisper'"),
  startTime: z
    .number()
    .nonnegative()
    .optional()
    .describe("Only return chunks at or after this time (seconds)"),
  endTime: z
    .number()
    .nonnegative()
    .optional()
    .describe("Only return chunks at or before this time (seconds)"),
  offset: z
    .number()
    .int()
    .nonnegative()
    .optional()
    .describe("Number of chunks to skip (for pagination). Default 0."),
  limit: z
    .number()
    .int()
    .min(1)
    .optional()
    .describe("Max chunks to return. Default 50. Increase if the answer was not found in the current window."),
});

export const readTranscriptTool = tool(
  async ({ videoId, provider, startTime, endTime, offset = 0, limit = 50 }) => {
    const rows = await db
      .select({
        transcriptId: transcripts.id,
        provider: transcripts.provider,
        language: transcripts.language,
        duration: transcripts.duration,
        chunkIndex: chunks.chunkIndex,
        text: chunks.text,
        startTime: chunks.startTime,
        endTime: chunks.endTime,
      })
      .from(transcripts)
      .innerJoin(chunks, eq(chunks.transcriptId, transcripts.id))
      .where(
        and(
          eq(transcripts.videoId, videoId),
          provider !== undefined ? eq(transcripts.provider, provider) : undefined,
          startTime !== undefined ? gte(chunks.startTime, startTime) : undefined,
          endTime !== undefined ? lte(chunks.endTime, endTime) : undefined,
        ),
      )
      .orderBy(chunks.chunkIndex)
      .offset(offset)
      .limit(limit);

    return rows;
  },
  {
    name: "read_video_transcript",
    description: [
      "Retrieves transcript chunks for a given video, paginated.",
      "",
      "Each chunk is a time-bounded segment with the spoken text, returned in order (chunkIndex).",
      "startTime and endTime on each chunk are in seconds.",
      "",
      "Pagination: use `offset` and `limit` to read the transcript in windows instead of loading",
      "everything at once. Default limit is 50 chunks. If the answer is not found in the current",
      "window, call again with offset += limit to advance to the next window.",
      "",
      "Use `startTime` / `endTime` (seconds) to restrict to a known portion of the video.",
      "These narrow the candidate set before offset/limit are applied.",
      "",
      "Use `provider` to narrow to a specific transcript source when multiple exist",
      "(e.g. 'youtube', 'whisper').",
      "",
      "The `duration` field on each row is the total transcript duration in seconds — use it",
      "to estimate how many windows you may need to page through.",
    ].join("\n"),
    schema: ReadTranscriptSchema,
  },
);
