import { deleteDocument, getDocument, updateDocument } from "@/lib/documents";
import { json, withUser, type IdParams } from "@/lib/http";
import { updateDocSchema } from "@/lib/validation";

export const GET = withUser<IdParams>(async (_req, user, { params }) => {
  const { id } = await params;
  return json(await getDocument(user.id, id));
});

export const PATCH = withUser<IdParams>(async (req, user, { params }) => {
  const { id } = await params;
  const patch = updateDocSchema.parse(await req.json());
  return json(await updateDocument(user.id, id, patch));
});

export const DELETE = withUser<IdParams>(async (_req, user, { params }) => {
  const { id } = await params;
  await deleteDocument(user.id, id);
  return json({ ok: true });
});
