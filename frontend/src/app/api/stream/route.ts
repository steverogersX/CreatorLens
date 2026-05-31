import { z } from "zod";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const BACKEND_URL = process.env["BACKEND_URL"] ?? "http://localhost:5000";

const bodySchema = z.object({
  type: z.literal("new"),
  urls: z.tuple([z.string().url(), z.string().url()]),
  userMessage: z.string().min(1),
});

export async function POST(req: Request): Promise<Response> {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = bodySchema.safeParse(body);
  if (!parsed.success) {
    return Response.json({ error: "Invalid request" }, { status: 422 });
  }

  const backendRes = await fetch(`${BACKEND_URL}/api/v1/chat`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(parsed.data),
  });

  if (!backendRes.ok || !backendRes.body) {
    return Response.json({ error: "Backend unavailable" }, { status: 502 });
  }

  // Relay raw SSE from backend — no transformation
  return new Response(backendRes.body, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    },
  });
}
