import { createDocument, listDocuments } from "@/lib/documents";
import { json, withUser } from "@/lib/http";
import { createDocSchema } from "@/lib/validation";

export const GET = withUser(async (_req, user) => json(await listDocuments(user.id)));

export const POST = withUser(async (req, user) => {
  const text = await req.text();
  const { title } = createDocSchema.parse(text ? JSON.parse(text) : {});
  const doc = await createDocument(user.id, title);
  return json(doc, 201);
});
