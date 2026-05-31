// Mock SSE stream for UI development.
// Enable with NEXT_PUBLIC_MOCK_STREAM=1 or by visiting /?mock
// Simulates the full sequence: thinking → steps → video meta → text streaming → done

import { initStream, pushStreamEvent } from "./active-stream";

export const MOCK_THREAD_ID = "mock-preview-thread";

const MOCK_META_A = {
  provider: "youtube",
  videoId: "dQw4w9WgXcQ",
  title: "React in 100 Seconds",
  url: "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
  views: 1_240_000,
  likes: 48_200,
  commentCount: 3_100,
  creator: { name: "Fireship", handle: "@fireship", followerCount: 2_800_000 },
  duration: 100,
};

const MOCK_META_B = {
  provider: "instagram",
  videoId: "DUjdiFhDaj0",
  title: "React Tutorial for Beginners",
  url: "https://www.instagram.com/reel/DUjdiFhDaj0/?hl=en",
  views: 4_500_000,
  likes: 132_000,
  commentCount: 8_900,
  creator: {
    name: "Programming with Mosh",
    handle: "@programmingwithmosh",
    followerCount: 3_900_000,
  },
  duration: 3_180,
};

const MOCK_TEXT = `## React in 100 Seconds vs React Tutorial for Beginners

### TL;DR
**Fireship** delivers a rapid-fire overview for devs who want a quick mental model. **Mosh's tutorial** is a methodical deep-dive for absolute beginners — nearly 53× longer.

### Audience & Pacing

| | React in 100 Seconds | React Tutorial |
|---|---|---|
| Target audience | Experienced devs | Complete beginners |
| Duration | 1 min 40 sec | 53 min |
| Pace | Very fast | Deliberate |
| Depth | Conceptual | Hands-on |

### Engagement Breakdown
Fireship achieves a **3.9% engagement rate** on a 100-second video — exceptional. Mosh hits **2.9%** on a 53-minute tutorial, which is strong for long-form educational content.

Both creators have over 2.8M subscribers, but Fireship's comment section skews toward "this made me finally get it" reactions, while Mosh's leans toward help requests and progress updates.

### Content Coverage
- **Fireship** covers JSX, components, state, and hooks in a memorable, meme-driven format. Best for the initial "aha moment."
- **Mosh** walks through environment setup, component composition, props, state, useEffect, and builds a real project. Best for actual skill acquisition.

### Verdict
> If your audience already codes → **Fireship** for a quick orientation.
> If you're learning from scratch → **Mosh** for real comprehension.

Neither is objectively better — they target completely different points in a developer's journey.`;

const delay = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

function chunkText(text: string, size = 10): string[] {
  const chunks: string[] = [];
  for (let i = 0; i < text.length; i += size) chunks.push(text.slice(i, i + size));
  return chunks;
}

/** Kicks off a mock stream asynchronously. Returns the mock threadId immediately. */
export function playMockStream(threadId = MOCK_THREAD_ID): string {
  initStream(threadId);

  void (async () => {
    // -- thinking pause --
    await delay(500);
    pushStreamEvent({ type: "agent_step", label: "Fetching video metadata", stepStatus: "running" });

    await delay(700);
    pushStreamEvent({ type: "video_meta", position: 1, meta: MOCK_META_A });

    await delay(350);
    pushStreamEvent({ type: "video_meta", position: 2, meta: MOCK_META_B });

    await delay(300);
    pushStreamEvent({ type: "agent_step", label: "Fetching video metadata", stepStatus: "done" });

    await delay(80);
    pushStreamEvent({ type: "agent_step", label: "Analyzing transcripts", stepStatus: "running" });

    await delay(1_400);
    pushStreamEvent({ type: "agent_step", label: "Analyzing transcripts", stepStatus: "done" });

    await delay(80);
    pushStreamEvent({ type: "agent_step", label: "Generating comparison", stepStatus: "running" });

    await delay(1_000);
    pushStreamEvent({ type: "agent_step", label: "Generating comparison", stepStatus: "done" });

    await delay(250);

    for (const chunk of chunkText(MOCK_TEXT)) {
      pushStreamEvent({ type: "text_delta", delta: chunk });
      await delay(22);
    }

    await delay(400);
    pushStreamEvent({ type: "done" });
  })();

  return threadId;
}
