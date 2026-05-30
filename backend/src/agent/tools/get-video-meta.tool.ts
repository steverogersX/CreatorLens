import { tool } from "@langchain/core/tools";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db/client";
import { videoMeta } from "@/db/schema";
import { buildSelect } from "./utils";
import { pickColumns } from "./video-meta.fields";

const BASE_KEYS = ["id", "videoId", "title", "description", "creatorName"] as const;

const EXTRA_FIELDS = [
  "threadId",
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

const GetVideoMetaSchema = z.object({
  videoId: z.uuid().describe("The video ID to fetch metadata for"),
  extraFields: z
    .array(z.enum(EXTRA_FIELDS))
    .optional()
    .describe(`Extra fields to include on top of the default set. Available: ${EXTRA_FIELDS.join(", ")}`),
});

export const getVideoMetaTool = tool(
  async ({ videoId, extraFields = [] }) => {
    const select = buildSelect(BASE_SELECT, EXTRA_SELECT, extraFields);

    const rows = await db
      .select(select as typeof BASE_SELECT)
      .from(videoMeta)
      .where(eq(videoMeta.videoId, videoId));

    return rows;
  },
  {
    name: "get_video_meta",
    description: [
      "Fetches metadata for a specific video by its video ID.",
      "",
      "A video can appear in multiple threads, so this may return more than one row",
      "(one per thread the video belongs to).",
      "",
      "Always returned: id, videoId, title, description, creatorName.",
      "",
      `Optional fields — pass in extraFields when needed: ${EXTRA_FIELDS.join(", ")}.`,
    ].join("\n"),
    schema: GetVideoMetaSchema,
  },
);
