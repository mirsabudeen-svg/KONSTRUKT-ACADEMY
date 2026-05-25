import { fetchParentPortalByToken } from "@/lib/communications/parent-portal";

export const runtime = "nodejs";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ token: string }> }
) {
  const { token } = await params;
  const data = await fetchParentPortalByToken(token);

  if (!data) {
    return Response.json({ error: "Invalid or expired portal link" }, { status: 404 });
  }

  return Response.json(data);
}
