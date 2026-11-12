import { createDocument } from "@/lib/documents";
import { badRequest } from "@/lib/errors";
import { json, withUser } from "@/lib/http";
import { fileToHtml, MAX_UPLOAD_BYTES, titleFromFilename } from "@/lib/importFile";

// Upload a .txt, .md or .docx file and turn it into a new editable document.
export const POST = withUser(async (req, user) => {
  const length = Number(req.headers.get("content-length") ?? 0);
  if (length > MAX_UPLOAD_BYTES + 64 * 1024) return json({ error: "File is larger than 2 MB", code: "too_large" }, 413);

  const form = await req.formData().catch(() => null);
  const file = form?.get("file");
  if (!(file instanceof File)) throw badRequest("Choose a file to upload");

  const html = await fileToHtml(file.name, Buffer.from(await file.arrayBuffer()));
  const doc = await createDocument(user.id, titleFromFilename(file.name), html);
  return json(doc, 201);
});
