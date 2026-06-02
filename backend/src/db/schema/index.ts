import {
  pgTable,
  uuid,
  text,
  integer,
  real,
  timestamp,
  unique,
  index,
  vector,
} from "drizzle-orm/pg-core";

export const threads = pgTable("threads", {
  id: uuid("id").defaultRandom().primaryKey(),
  status: text("status").notNull().default("streaming"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const videos = pgTable(
  "videos",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    provider: text("provider").notNull(),
    externalId: text("external_id").notNull(),
    url: text("url").notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (t) => [unique().on(t.provider, t.externalId)],
);

export const videoMeta = pgTable(
  "video_meta",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    threadId: uuid("thread_id")
      .notNull()
      .references(() => threads.id, { onDelete: "cascade" }),
    videoId: uuid("video_id")
      .notNull()
      .references(() => videos.id, { onDelete: "cascade" }),
    position: integer("position").notNull(),
    title: text("title").notNull(),
    description: text("description"),
    thumbnailUrl: text("thumbnail_url"),
    views: integer("views").notNull(),
    likes: integer("likes").notNull(),
    commentCount: integer("comment_count").notNull(),
    retweets: integer("retweets"),
    creatorId: text("creator_id").notNull(),
    creatorName: text("creator_name").notNull(),
    creatorHandle: text("creator_handle").notNull(),
    creatorFollowerCount: integer("creator_follower_count").notNull(),
    creatorAvatarUrl: text("creator_avatar_url"),
    creatorProfileUrl: text("creator_profile_url"),
    hashtags: text("hashtags").array().notNull(),
    uploadDate: timestamp("upload_date").notNull(),
    duration: real("duration").notNull(),
    fetchedAt: timestamp("fetched_at").notNull(),
  },
  (t) => [unique().on(t.threadId, t.position)],
);

export const transcripts = pgTable("transcripts", {
  id: uuid("id").defaultRandom().primaryKey(),
  threadId: uuid("thread_id")
    .notNull()
    .references(() => threads.id, { onDelete: "cascade" }),
  videoId: uuid("video_id")
    .notNull()
    .references(() => videos.id, { onDelete: "cascade" }),
  provider: text("provider").notNull(),
  language: text("language").notNull(),
  duration: real("duration").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const chunks = pgTable(
  "chunks",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    transcriptId: uuid("transcript_id")
      .notNull()
      .references(() => transcripts.id, { onDelete: "cascade" }),
    chunkIndex: integer("chunk_index").notNull(),
    text: text("text").notNull(),
    startTime: real("start_time").notNull(),
    endTime: real("end_time").notNull(),
    embedding: vector("embedding", { dimensions: 768 }),
  },
  (t) => [index("chunks_embedding_idx").using("hnsw", t.embedding.op("vector_cosine_ops"))],
);

export const chatMessages = pgTable("chat_messages", {
  id: uuid("id").defaultRandom().primaryKey(),
  threadId: uuid("thread_id")
    .notNull()
    .references(() => threads.id, { onDelete: "cascade" }),
  role: text("role").notNull(),
  content: text("content").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});
