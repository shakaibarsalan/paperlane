import { listShares, shareDocument } from "@/lib/documents";
import { json, withUser, type IdParams } from "@/lib/http";
import { shareSchema } from "@/lib/validation";

export const GET = withUser<IdParams>(async (_req, user, { params }) => {
  const { id } = await params;
  return json({ shares: await listShares(user.id, id) });
});

export const POST = withUser<IdParams>(async (req, user, { params }) => {
  const { id } = await params;
  const { email, role } = shareSchema.parse(await req.json());
  return json({ share: await shareDocument(user.id, id, email, role) }, 201);
});
