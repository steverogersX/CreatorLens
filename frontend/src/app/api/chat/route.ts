import { z } from "zod";
import { createUIMessageStream, createUIMessageStreamResponse } from "ai";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const chatRequestSchema = z.object({
  urls: z.tuple([z.url(), z.url()]),
  message: z.string().min(1),
});

export type ChatRequest = z.infer<typeof chatRequestSchema>;

export async function POST(req: Request): Promise<Response> {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const parsed = chatRequestSchema.safeParse(body);
  if (!parsed.success) {
    return Response.json({ error: parsed.error.issues }, { status: 422 });
  }

  const { urls, message } = parsed.data;
  void urls;
  void message;

  const placeholder =
    "I've analyzed both videos. Ask me anything about their content, structure, teaching style, or how they compare.[A:0:42][B:1:15]";

  const stream = createUIMessageStream({
    execute: async ({ writer }) => {
      const partId = "text-0";
      const chunks = placeholder.match(/\S+\s*/g) ?? [];

      writer.write({ type: "text-start", id: partId });
      for (const chunk of chunks) {
        writer.write({ type: "text-delta", id: partId, delta: chunk });
        await new Promise<void>((r) => setTimeout(r, 28));
      }
      writer.write({ type: "text-end", id: partId });
    },
  });

  return createUIMessageStreamResponse({ stream });
}
