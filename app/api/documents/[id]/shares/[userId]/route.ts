import { unshareDocument } from "@/lib/documents";
import { json, withUser } from "@/lib/http";

type Ctx = { params: Promise<{ id: string; userId: string }> };

export const DELETE = withUser<Ctx>(async (_req, user, { params }) => {
  const { id, userId } = await params;
  await unshareDocument(user.id, id, userId);
  return json({ ok: true });
});
