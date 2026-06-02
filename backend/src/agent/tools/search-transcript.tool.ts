import { tool } from "@langchain/core/tools";
import { and, eq, isNotNull, sql } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db/client";
import { chunks, transcripts } from "@/db/schema";
import { getEmbedder } from "@/embeddings";

const SearchTranscriptSchema = z.object({
  videoId: z.string().uuid().describe("The video ID to search within"),
  query: z.string().min(1).describe("Natural language query to find in the transcript"),
  limit: z
    .number()
    .int()
    .min(1)
    .max(20)
    .optional()
    .describe("Max results to return. Default 5."),
  threshold: z
    .number()
    .min(0)
    .max(1)
    .optional()
    .describe(
      "Minimum cosine similarity (0–1). Default 0.4. Lower = broader results, higher = stricter match.",
    ),
  provider: z
    .string()
    .optional()
    .describe("Filter by transcript provider, e.g. 'youtube' or 'whisper'"),
});

export const searchTranscriptTool = tool(
  async ({ videoId, query, limit = 5, threshold = 0.4, provider }) => {
    const [queryEmbedding] = await getEmbedder().embed([query], "query");

    // Build vector literal using sql.raw — safe because queryEmbedding is number[]
    const vec = sql.raw(`'[${queryEmbedding.join(",")}]'::vector`);
    const similarity = sql<number>`1 - (${chunks.embedding} <=> ${vec})`;

    const rows = await db
      .select({
        provider: transcripts.provider,
        language: transcripts.language,
        chunkIndex: chunks.chunkIndex,
        text: chunks.text,
        startTime: chunks.startTime,
        endTime: chunks.endTime,
        similarity,
      })
      .from(chunks)
      .innerJoin(transcripts, eq(chunks.transcriptId, transcripts.id))
      .where(
        and(
          eq(transcripts.videoId, videoId),
          isNotNull(chunks.embedding),
          provider !== undefined ? eq(transcripts.provider, provider) : undefined,
          sql`(1 - (${chunks.embedding} <=> ${vec})) >= ${threshold}`,
        ),
      )
      .orderBy(sql`${chunks.embedding} <=> ${vec}`)
      .limit(limit);

    return rows;
  },
  {
    name: "search_video_transcript",
    description: [
      "Semantically searches a video's transcript for chunks relevant to a natural language query.",
      "",
      "Uses cosine vector similarity to find the most relevant spoken segments.",
      "Returns chunks sorted by relevance (highest similarity first), each with a similarity score (0–1).",
      "",
      "Use this as the primary way to find WHERE in a video a topic is discussed.",
      "After finding relevant chunks, call read_video_transcript with startTime/endTime to read",
      "the surrounding context if a fuller picture is needed.",
      "",
      "Only chunks that have been embedded will be returned. If no results come back,",
      "try lowering the threshold (e.g. 0.3) or rephrasing the query.",
    ].join("\n"),
    schema: SearchTranscriptSchema,
  },
);
