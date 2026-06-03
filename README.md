# CreatorLens

Paste two short-form videos, ask a question, get a real answer with timestamps.

That's the whole pitch. You drop in a YouTube link and an Instagram Reel (or an X post), and you can ask things like "which one explains the hook better?" or "what does the second video say about pricing?" — and the answer comes back streaming, with little `[A:1:23]` style citations you can click to jump to the exact moment in the transcript. It's built for creators who want to compare how two pieces of content actually land, not just stare at view counts.

This README is me explaining what I built and, more importantly, *why* I made each call. Every choice here cost something — money, latency, or complexity — and I picked the trade-off I could live with. Where I cut a corner on purpose, I say so.

---

## What's actually in the box

Two apps in one repo:

- **`backend/`** — Node + Express + TypeScript. Does the fetching, transcribing, chunking, embedding, storage, and runs the agent that answers questions.
- **`frontend/`** — Next.js (App Router) + Tailwind + shadcn/ui. The chat UI, the video cards, the streaming, the citation hover-cards.
- **`shared/`** — the SSE event types both sides agree on, so the stream contract doesn't drift.

Data lives in one Postgres database (with the `pgvector` extension). That's it. One database. I'll defend that below because it's the choice people poke at first.

The flow, start to finish:

```
two URLs ─▶ fetch metadata + transcript (per platform)
         ─▶ semantic chunking (embeddings decide where to cut)
         ─▶ store chunks + embeddings in Postgres/pgvector
         ─▶ agent reads the transcripts, answers, cites timestamps
         ─▶ stream every step to the browser over SSE
```

Everything streams. You see "Analyzing the YouTube video," then the video card pops in, then "Thinking," then the answer typing out, then the citations resolve. I did that on purpose — a tool that fetches + transcribes + reasons can take 20–40 seconds, and a blank spinner for 30 seconds feels broken. Showing the work makes the wait feel honest.

---

## Getting the video data

This is where most of the real-world pain lives, so I'll go slow.

Every platform is wrapped in an **adapter**. The rest of the app only ever sees one clean shape — `IVideoMeta` and `ITranscript` — no matter where the data came from. YouTube's JSON looks nothing like Instagram's, which looks nothing like a tweet. If I let those raw shapes leak past the adapter, every downstream file would be full of `raw.videoViewCount ?? raw.videoPlayCount ?? 0` garbage. So each platform maps its mess into the shared shape once, in one file, and that's the only place that knows the difference. ([backend/src/adapters/](backend/src/adapters/))

### YouTube — yt-dlp, because it's free and it already has everything

For YouTube I use [`yt-dlp`](https://github.com/yt-dlp/yt-dlp) (via the `ytdlp-nodejs` wrapper). One call to `getInfoAsync` gives me **both** the metadata (title, views, likes, upload date, creator, thumbnail) **and** the caption tracks. ([backend/src/services/youtube.service.ts](backend/src/services/youtube.service.ts))

Why yt-dlp:

- **It costs nothing.** No API key, no per-request billing, no quota. yt-dlp talks to YouTube the way a browser would and pulls the public info. For a side project — or any project trying not to bleed money — "free and good enough" beats "paid and slightly cleaner" almost every time.
- **YouTube already wrote the transcript.** Almost every YouTube video has captions (auto-generated or human). If the creator did the transcription work for me, I'm not going to pay to redo it. I grab the JSON3 caption track, pick the best language (`en` → `en-*` → whatever's there), and map it straight into my transcript shape. ([backend/src/utils/captions.ts](backend/src/utils/captions.ts))

So for the common YouTube case, the marginal cost of analyzing a video is **basically $0**. That's the whole point.

**The fallback when there are no captions:** some videos genuinely have none. So `fetchCaptionJson3` returns `null` (it never throws — "no captions" isn't an error, it's a normal state), and I fall back to **AssemblyAI** to transcribe the audio. yt-dlp still earns its keep here: it hands me the direct audio URL, I pass that URL straight to AssemblyAI, and I never download or store the audio file myself. ([backend/src/utils/transcribe.ts](backend/src/utils/transcribe.ts))

That ordering — captions first, paid transcription only as a fallback — is a cost decision. AssemblyAI is cheap per minute but it's not free, and a YouTube transcript I can get for nothing shouldn't trigger a paid API call. So the paid path only runs when the free path comes back empty.

### Why NOT yt-dlp for Instagram and X

This is the question I'd expect on a call, so here's the straight answer.

yt-dlp *can* sometimes pull an Instagram or X video file. What it can't reliably give me is the stuff I actually need: **view count, like count, comment count, follower count, the caption, the hashtags, the creator's real name and avatar.** That data sits behind login walls and private GraphQL endpoints that change constantly. yt-dlp is a *media downloader* — its job is to get you the video file. It was never built to be a metadata scraper for social platforms, and when you lean on it for that, it breaks the week Instagram ships a change.

And metadata is the *whole product here.* CreatorLens compares how content performs. "Video A got 2M views with 50k likes, Video B got 200k with 30k likes" — that comparison is the value. A transcript with no engagement numbers is half a product.

So I split the job by what each tool is good at:

- **Apify** gets the metadata for Instagram and X (the hard part — the numbers behind the wall).
- **yt-dlp** gets the audio URL for those same videos (the easy part — just the media stream).
- **AssemblyAI** turns that audio URL into a transcript.

These run **in parallel**, not in sequence, because they don't depend on each other — Apify is fetching the like count at the same moment yt-dlp is grabbing the audio URL. No reason to wait. ([backend/src/services/social.service.ts](backend/src/services/social.service.ts))

```ts
const [meta, audioUrl] = await Promise.all([
  fetchInstagramMeta(url),   // Apify — the metadata behind the wall
  fetchAudioUrl(url, platform), // yt-dlp — just the audio stream
]);
```

### Why Apify specifically

Apify is a marketplace of maintained scrapers ("actors"). I call `apify/instagram-scraper` for Reels and `quacker/twitter-scraper` for X, hand each a URL, and get back clean JSON. ([backend/src/services/apify.service.ts](backend/src/services/apify.service.ts))

Why I went with it instead of rolling my own scraper or paying for an official API:

- **Instagram and X don't sell me a usable official API for this.** The Instagram Graph API only covers accounts you own; it won't tell you a random creator's Reel stats. X's official API got expensive and locked-down. For "give me the public stats of this one post," the official doors are closed or priced for enterprises.
- **I do not want to own anti-bot maintenance.** Scraping Instagram in-house means fighting login walls, rotating proxies, and rewriting the parser every time they change a field name. That's a full-time job, not a feature. Apify's whole business is keeping those actors working, so I rent that instead of building it. When Instagram changes something, that's *their* 2 a.m. problem, not mine.
- **It's the right cost shape — pay per use, nothing idle.** I only pay when someone actually analyzes a video. No monthly proxy bill sitting there whether anyone uses the app or not.

**The cost, honestly:** Apify bills per result / compute. The public Instagram and X actors land somewhere in the low single-digit dollars per ~1,000 posts (check their current pricing — it moves). So one analysis is on the order of a fraction of a cent. That's fine at my scale. **It would not be fine at scale**, and I'm clear-eyed about that — see the "10,000 users" section. The honest summary: Apify is the right call for getting *correct* data *now* without owning a scraping team. It is the *wrong* call as your permanent cost structure once volume is real.

**The cost trade-off, all in one place:**

| Platform | Metadata | Transcript | Why |
|---|---|---|---|
| YouTube | yt-dlp (free) | yt-dlp captions (free), AssemblyAI only if missing | YouTube hands you everything; don't pay for what's free |
| Instagram | Apify (paid, ~cents) | yt-dlp audio URL → AssemblyAI | Numbers are behind a wall; rent the scraper |
| X | Apify (paid, ~cents) | yt-dlp audio URL → AssemblyAI | Same wall, same reasoning |

The guiding rule for the whole fetch layer: **free first, paid only when free runs out.**

Everything degrades instead of exploding. No audio URL? You still get the metadata and an empty transcript, and the app keeps going. AssemblyAI key missing or the call fails? Same — empty transcript, app keeps running. ([backend/src/services/social.service.ts](backend/src/services/social.service.ts)) A half-answer beats a 500 error.

---

## Why Postgres + pgvector for the vector database

Short version: **I already needed Postgres for everything else, and pgvector lets the vectors live right next to the data they describe. Adding a second database to store some arrays of floats wasn't worth it.**

The longer defense, because this is the one people argue about.

I have a real relational model here — threads, videos, video metadata, transcripts, chunks, chat messages, all tied together with foreign keys and cascade deletes. ([backend/src/db/schema/index.ts](backend/src/db/schema/index.ts)) When you delete a thread, everything under it — metadata, transcript, chunks, embeddings, messages — should vanish in one shot. With Postgres that's one `ON DELETE CASCADE` and it's transactionally correct. If my vectors lived in Pinecone or Qdrant, deleting a thread becomes "delete from Postgres, then *also remember* to delete the matching vectors from the other system, and pray nothing fails in between." Now I've got two stores that can disagree, and orphaned vectors leaking forever. No thanks.

The killer detail is in [backend/src/db/persist.ts](backend/src/db/persist.ts): I write the video metadata, the transcript, and all its chunks-with-embeddings inside **one database transaction**. Either the whole video lands or none of it does. You cannot get that guarantee when your text rows are in Postgres and your vectors are in a separate vector DB — there's no transaction that spans both.

What I'd be paying for if I reached for a dedicated vector DB:

- A second service to run, monitor, back up, and pay for.
- A second consistency problem (the sync issue above).
- More moving parts in local dev — right now `docker compose up` gives you the entire data layer from one `pgvector/pgvector:pg17` image. ([docker-compose.yml](docker-compose.yml))

And what would I actually gain? Dedicated vector DBs win when you're doing similarity search over **millions to billions** of vectors and need that to be blisteringly fast. I am nowhere near that. A thread is two videos. A short-form transcript is small — a 60-second Reel might be a few dozen chunks; even a 20-minute YouTube video is a few hundred. pgvector with an **HNSW index** (`vector_cosine_ops`) handles that without breaking a sweat. ([backend/src/db/schema/index.ts](backend/src/db/schema/index.ts))

I provisioned the HNSW index up front anyway:

```ts
index("chunks_embedding_idx").using("hnsw", t.embedding.op("vector_cosine_ops"))
```

So the moment I *do* want fast cross-thread similarity search ("find me every video where a creator talks about X"), the index is already there and it's one query away. I built the road before I needed to drive on it, but I didn't build a separate highway system to do it.

**The honest line for a reviewer:** pgvector is the right call until I'm doing similarity search over a corpus large enough that Postgres's vector performance becomes the bottleneck. I am a long way from that, and the operational simplicity of one database is worth real money and real sanity today.

---

## Chunking — and why the embeddings earn their keep here

A transcript is a wall of timed text. Before I can store or reason over it, I have to cut it into pieces. *How* you cut matters more than people think, so I didn't just chop every N words.

I do **semantic chunking**. ([backend/src/utils/chunker.ts](backend/src/utils/chunker.ts)) Here's the actual idea:

1. Embed every transcript segment.
2. Walk the segments in order and measure cosine similarity between each one and the next.
3. When two neighboring segments are similar, they're talking about the same thing — keep them together. When the similarity *drops*, the speaker changed topic — cut there.
4. The cut threshold isn't a magic constant. It's `median(similarities) − 1.5 × stdDev(similarities)` — so the boundary adapts to each individual video instead of me hard-coding a number that's wrong for half the videos.

Why this instead of fixed-size chunks? Because fixed-size chunks slice mid-thought. Imagine the creator says: *"...and that's why the hook matters. Now, completely different topic, let's talk about pricing..."* A dumb 200-token window might cut right after "let's talk about" and strand "pricing" in the next chunk. Now neither chunk reads cleanly, and a citation pointing at that moment lands on a fragment. Cutting on the *topic change* keeps each chunk about one thing — which makes it readable, makes it a clean citation target, and makes its embedding actually mean something.

Then I clean up: any chunk shorter than `CHUNK_MIN_DURATION_SECS` (default **15 seconds**) gets merged back into the one before it. ([backend/src/utils/chunker.ts](backend/src/utils/chunker.ts), [backend/src/config.ts](backend/src/config.ts)) Why 15 seconds? Because in short-form video, a 3-second chunk is noise — it's "uh, so, yeah" — and it just clutters the transcript and the agent's view with tiny meaningless rows. 15 seconds is roughly one complete spoken thought in this format. It's tuned for the content type, and it's a config value precisely because the right number for a 30-second TikTok isn't the right number for a 40-minute podcast. When I add long-form, I bump the env var, not the code.

So the embeddings do double duty: **at write time they decide where the chunk boundaries go**, and they're **stored for later similarity search**. They're not dead weight sitting in a column — they shaped the data on the way in.

---

## How the RAG actually works (no hand-waving)

I want to be precise here because "we use RAG" is the kind of phrase that means nothing. Here's what genuinely happens, including the part that surprises people.

The agent is a **LangGraph** state graph with three nodes: load context → orchestrate → call tools → back to orchestrate, looping until it has an answer. ([backend/src/agent/graph.ts](backend/src/agent/graph.ts))

1. **Context loader** pulls the last few turns of chat history (3 turns) and a lightweight index of the videos in this thread — just `videoId`, `title`, `duration`. ([backend/src/agent/nodes/context-loader.ts](backend/src/agent/nodes/context-loader.ts)) That little index goes straight into the system prompt so the model already knows what videos exist and **doesn't waste a tool call just to look up an ID it was already handed.** ([backend/src/agent/prompts/orchestrator.prompt.ts](backend/src/agent/prompts/orchestrator.prompt.ts))

2. **The orchestrator** (the LLM) decides what it needs. It has three tools: read the thread's video metadata, get extended metadata for one video, and **read a video's transcript**. ([backend/src/agent/tools/](backend/src/agent/tools/))

3. **It reads transcripts in paginated windows.** The `read_video_transcript` tool takes a `videoId`, an `offset`, and a `limit` (default 50 chunks), plus optional `startTime`/`endTime` to jump to a known slice of the video. The model reads a window, and if the answer isn't in it, it advances the offset and reads the next one. ([backend/src/agent/tools/read-transcript.tool.ts](backend/src/agent/tools/read-transcript.tool.ts))

Here's the honest part: **for answering questions, I am not doing top-k vector similarity search.** The agent retrieves transcript chunks by **paging through them in order** (and by time window), not by embedding the question and pulling the nearest vectors.

That's a deliberate choice, and I'll defend it. The corpus for any given question is *one or two short transcripts.* Top-k vector retrieval is built for the opposite situation — finding the needle in a haystack of millions of documents. When the "haystack" is two Reels, vector search mostly creates a way to *miss* relevant context: pick k=5 and the model never sees chunk #6 that mattered. Letting the agent page through the whole (small) transcript means it can't silently skip the part with the answer, and it can decide for itself when it's read enough. For short-form comparison, "let the model walk the transcript" beats "hope the top-5 vectors were the right 5."

So where do the embeddings get *used* for retrieval? Two places, and I'm not going to pretend otherwise:

- **Right now:** they power the *semantic chunking* above — that's real work that improves every answer, because better boundaries mean cleaner windows for the agent to read.
- **The HNSW index is built and waiting** for when the corpus grows past "a couple short transcripts" — cross-thread search, long-form podcasts, a creator's whole back-catalog. At that point paging stops being free and `embedding <=> query` similarity search becomes the right tool. The plumbing's already in place; flipping it on is a new tool, not a migration.

That's the system I'd defend on a call: classic vector-kNN RAG would be premature for the content size I have, so I'm using embeddings where they pay off today (chunking) and I've pre-built the index for the day the scale justifies kNN. Calling it "RAG" is fair — the model retrieves grounded transcript text before it answers — I'm just being straight about *how* it retrieves.

### Citations — the part that makes the answer trustworthy

When the model writes a sentence backed by the transcript, the system prompt makes it append a marker like `[A:1:23]` — Video A, 1 minute 23 seconds — using the **actual `startTime` of the chunk it read.** It's told, in those words, not to guess timestamps. ([backend/src/agent/prompts/orchestrator.prompt.ts](backend/src/agent/prompts/orchestrator.prompt.ts))

After the answer streams out, I parse those markers and match each one back to the real chunk it points at — preferring the chunk whose time span *contains* the cited second, falling back to the nearest one. ([backend/src/agent/citations.ts](backend/src/agent/citations.ts)) That gives the UI a hover-card with the exact quote, the platform icon, and a link to the source. And because only the message *text* is stored (not the resolved citations), when you reload an old thread I **re-resolve** the markers against the stored chunks so the hover-cards survive a refresh. ([backend/src/controllers/video.controller.ts](backend/src/controllers/video.controller.ts))

That's the difference between "the AI said something" and "the AI said something *and here's where it got it.*" For a tool whose entire job is analyzing real content, ungrounded claims are worthless. The citation pipeline is what makes the output checkable.

---

## The models, and why there are fallbacks everywhere

Two spots use AI, and **both have a primary and a backup**, because a single external API is a single point of failure and these all rate-limit you eventually.

**Embeddings:** Jina (`jina-embeddings-v3`) is primary, Gemini (`text-embedding-004`) is the fallback. If Jina throws, the code catches it and transparently switches to Gemini for that call. ([backend/src/embeddings/index.ts](backend/src/embeddings/index.ts), [backend/src/embeddings/providers/fallback.ts](backend/src/embeddings/providers/fallback.ts)) Both output **768 dimensions**, which is the number baked into the database column and the HNSW index — so the fallback is a true drop-in and a vector from either provider fits the same slot. Why Jina first: it has a genuine batch endpoint (send all the chunk texts in one request) and a usable free tier, so embedding a whole transcript is one cheap call. Gemini's SDK has no batch embed, so the fallback has to fan out into parallel single calls — it works, it's just the slower path, which is exactly what you want from a *backup*. ([backend/src/embeddings/providers/gemini.ts](backend/src/embeddings/providers/gemini.ts))

**The agent LLM:** Gemini `gemini-2.0-flash` is primary, Mistral `mistral-large-latest` is the fallback, wired through LangChain's `withFallbacks`. ([backend/src/agent/model.ts](backend/src/agent/model.ts)) Why Flash: it's fast, it's cheap, it handles tool-calling well, and for "read these transcripts and compare them" I don't need a frontier reasoning model — I need a competent one that returns quickly and doesn't cost much per call. Latency *is* the product here; every extra second is a second the user watches a stream. If Gemini is down or rate-limited, Mistral picks up so the user gets an answer instead of an error. (The fallback is optional — no Mistral key just means no backup, the app logs it and runs on Gemini alone.)

There's a deliberate detail in the tool layer: tool outputs get normalized to plain strings before going back to the model, because Mistral is strict about message content shape and the others tolerate it. ([backend/src/agent/graph.ts](backend/src/agent/graph.ts)) Small thing, but it's the kind of thing that makes the fallback actually work instead of blowing up the moment you need it.

The whole posture is: **assume every external dependency will fail, and make sure the app limps forward when it does.** Embeddings fail over. The LLM fails over. Missing transcripts degrade to empty instead of crashing. Quota errors get caught and turned into a friendly "try again in a moment" instead of a stack trace. ([backend/src/controllers/video.controller.ts](backend/src/controllers/video.controller.ts))

---

## Streaming, because a 30-second blank screen is a bug

Analyzing two videos + reasoning takes real time. So nothing waits for the whole thing to finish. The backend pushes **Server-Sent Events** the entire way through, and the frontend renders them live. ([backend/src/lib/sse.ts](backend/src/lib/sse.ts), [backend/src/lib/event-bus.ts](backend/src/lib/event-bus.ts))

You see, in order: the thread gets created → "Analyzing the YouTube video" → the video card appears the *instant* its metadata is back (before the slower embedding/storage even finishes) → "Thinking" → the answer types out token by token → the citations light up → suggested follow-up questions appear. ([backend/src/services/video.service.ts](backend/src/services/video.service.ts), [backend/src/agent/index.ts](backend/src/agent/index.ts))

Two details I'm a little proud of:

- The video card is published the moment metadata returns, and the slow chunk+embed+store work happens *after* that publish. So the user sees the video almost immediately even though the heavy lifting is still going. ([backend/src/services/video.service.ts](backend/src/services/video.service.ts))
- If you hit **Stop** (or just close the tab), an `AbortController` kills the agent run, and whatever *partial* answer already streamed gets saved — so a reload shows exactly what you saw, not a blank. ([backend/src/controllers/video.controller.ts](backend/src/controllers/video.controller.ts), [backend/src/agent/index.ts](backend/src/agent/index.ts))

SSE over WebSockets because this is one-directional: server talks, browser listens. WebSockets are bidirectional and bring connection-management overhead I don't need. SSE is plain HTTP, it reconnects on its own, and it does exactly the one thing I want. Don't reach for the heavier tool when the lighter one fits.

---

## What breaks at 10,000 users

I'd rather tell you where this falls over than pretend it doesn't. Today this is built like a strong single-instance app, and here's honestly what cracks first as it scales, roughly in order:

1. **The fetch/transcribe/reason work runs inside the request.** When you analyze two videos, the Apify scrape, the AssemblyAI transcription, the embedding, and the agent run all happen *during* the HTTP request, holding the connection open the whole time. ([backend/src/controllers/video.controller.ts](backend/src/controllers/video.controller.ts)) That's totally fine for one user and great for the streaming UX. At thousands of concurrent analyses it falls apart — you'd hand the slow work to a **job queue** (BullMQ/Redis, say), have workers chew through it, and stream results back. The architecture is *ready* for this — it's already split into fetch/chunk/embed/persist stages — but it isn't wired to a queue yet.

2. **Apify cost stops being a rounding error.** Cents per analysis is invisible at hundreds of analyses and a real line item at hundreds of thousands. The fix is a **caching layer** keyed on the video — the `videos` table already has a `UNIQUE(provider, external_id)` constraint and the persist path already does `onConflictDoUpdate`, so the same video isn't re-inserted. ([backend/src/db/persist.ts](backend/src/db/persist.ts)) But it still re-scrapes Apify on every request. The next step is: if I scraped this exact video recently, serve the cached metadata and skip Apify entirely. That single change turns the cost curve from linear into something much flatter, because popular videos get analyzed over and over.

3. **The SSE event bus is in-process.** Each request gets its own in-memory `EventEmitter`. ([backend/src/lib/event-bus.ts](backend/src/lib/event-bus.ts)) That's correct and simple on one server, but it assumes the socket and the work live in the same process. The moment I run multiple backend instances behind a load balancer, I need a shared transport (Redis pub/sub) so a worker on box B can push events to a browser connected to box A.

4. **Postgres vector search will eventually want tuning.** Not at 10,000 users — pgvector with HNSW is comfortable far past that. But the day the corpus is millions of chunks and I'm doing heavy cross-thread similarity search, that's when I revisit HNSW build parameters, maybe a read replica, and *only then* honestly re-ask whether a dedicated vector DB earns its second-system cost. Not before. Choosing it earlier would be solving a problem I don't have with complexity I'd have to carry every day until then.

5. **Some singletons assume one process.** The embedder and the agent model are module-level singletons. ([backend/src/embeddings/index.ts](backend/src/embeddings/index.ts), [backend/src/agent/nodes/orchestrator.ts](backend/src/agent/nodes/orchestrator.ts)) Fine and even desirable per-process, but it's the kind of thing to keep in mind when you go horizontal.

The theme: I built the thing that's correct and simple *now*, and I left the seams in the obvious places — staged pipeline, unique constraints, upserts, a pre-built vector index — so the scale work is "add a queue and a cache," not "rewrite the core." I'd rather ship a clean single-instance app with clear upgrade paths than over-engineer for a load I don't have yet.

---

## Running it locally

You need Node 18+ and Docker.

```bash
# 1. Start Postgres (with pgvector) via Docker
docker compose up -d

# 2. Backend
cd backend
npm install
cp .env.example .env     # then fill in the keys below
npm run migrate          # apply the Drizzle migrations
npm run dev              # http://localhost:5000

# 3. Frontend (new terminal)
cd frontend
npm install
npm run dev              # http://localhost:3000
```

Environment keys the backend validates on boot — it refuses to start if a required one is missing, so you find out at startup, not mid-request ([backend/src/config.ts](backend/src/config.ts)):

| Key | Required? | What it's for |
|---|---|---|
| `DATABASE_URL` | yes | Postgres connection |
| `JINA_API_KEY` | yes | Primary embeddings |
| `GEMINI_API_KEY` | yes | Primary LLM + embedding fallback |
| `MISTRAL_API_KEY` | optional | LLM fallback (no key = no backup) |
| `ASSEMBLYAI_API_KEY` | optional | Transcription when captions are missing |
| `APIFY_API_KEY` | optional | Instagram / X metadata |

The optional ones are optional *on purpose* — without AssemblyAI you just get empty transcripts for caption-less videos; without Apify, Instagram/X analysis is off; without Mistral, no LLM fallback. The app starts and runs with the three required keys, and every optional capability degrades cleanly instead of crashing. That's the same "fail soft" principle as everywhere else, applied to config.

---

## The one-paragraph version

CreatorLens compares two short-form videos and answers questions about them with timestamped citations. It gets YouTube data free via yt-dlp (captions included), and uses Apify for the Instagram/X stats that hide behind login walls — paying only when a free path runs out. It chunks transcripts on *topic* boundaries (embeddings decide where), stores everything — text and vectors — in one Postgres/pgvector database so deletes and writes stay transactional, and runs a LangGraph agent that pages through the (small) transcripts to answer, grounding every claim in a real timestamp. Embeddings, the LLM, and the transcript path all have fallbacks, and the whole thing streams over SSE so a slow job feels alive instead of frozen. It's built clean for one instance, with the seams left exactly where the scale work will go.
