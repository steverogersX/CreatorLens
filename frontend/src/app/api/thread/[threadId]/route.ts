export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const BACKEND_URL = process.env["BACKEND_URL"] ?? "http://localhost:5000";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ threadId: string }> },
): Promise<Response> {
  const { threadId } = await params;

  const backendRes = await fetch(`${BACKEND_URL}/api/v1/thread/${threadId}`, {
    cache: "no-store",
  });

  if (backendRes.status === 404) {
    return Response.json({ error: "Thread not found" }, { status: 404 });
  }
  if (!backendRes.ok) {
    return Response.json({ error: "Backend unavailable" }, { status: 502 });
  }

  const json = await backendRes.json();
  return Response.json(json);
}
