import { tool } from "@langchain/core/tools";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db/client";
import { videoMeta } from "@/db/schema";
import { buildSelect } from "./utils";
import { pickColumns } from "./video-meta.fields";

const BASE_KEYS = ["id", "threadId", "videoId", "title", "description", "creatorName"] as const;

const EXTRA_FIELDS = [
  "position",
  "views",
  "likes",
  "commentCount",
  "creatorId",
  "creatorHandle",
  "creatorFollowerCount",
  "creatorAvatarUrl",
  "creatorProfileUrl",
  "hashtags",
  "uploadDate",
  "duration",
  "fetchedAt",
] as const;

const BASE_SELECT = pickColumns(BASE_KEYS);
const EXTRA_SELECT = pickColumns(EXTRA_FIELDS);

const ReadThreadVideoMetaSchema = z.object({
  threadId: z.uuid().describe("The thread ID whose videos to fetch"),
  extraFields: z
    .array(z.enum(EXTRA_FIELDS))
    .optional()
    .describe(`Extra fields to include on top of the default set. Available: ${EXTRA_FIELDS.join(", ")}`),
});

export const readThreadVideoMetaTool = tool(
  async ({ threadId, extraFields = [] }) => {
    const select = buildSelect(BASE_SELECT, EXTRA_SELECT, extraFields);

    const rows = await db
      .select(select as typeof BASE_SELECT)
      .from(videoMeta)
      .where(eq(videoMeta.threadId, threadId))
      .orderBy(videoMeta.position);

    return rows;
  },
  {
    name: "read_thread_video_meta",
    description: [
      "Fetches metadata for all videos in a thread, ordered by position.",
      "",
      "Always returned: id, threadId, videoId, title, description, creatorName.",
      "",
      `Optional fields — pass in extraFields when needed: ${EXTRA_FIELDS.join(", ")}.`,
    ].join("\n"),
    schema: ReadThreadVideoMetaSchema,
  },
);
