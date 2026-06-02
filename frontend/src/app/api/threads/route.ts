export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const BACKEND_URL = process.env["BACKEND_URL"] ?? "http://localhost:5000";

export async function GET(): Promise<Response> {
  const backendRes = await fetch(`${BACKEND_URL}/api/v1/threads`, { cache: "no-store" });

  if (!backendRes.ok) {
    return Response.json({ error: "Backend unavailable" }, { status: 502 });
  }

  const json = await backendRes.json();
  return Response.json(json);
}
