import { getDocument } from "@/lib/documents";
import { withUser, type IdParams } from "@/lib/http";
import { htmlToMarkdown } from "@/lib/exportMarkdown";

// Download the document as Markdown (anyone with view access).
export const GET = withUser<IdParams>(async (_req, user, { params }) => {
  const { id } = await params;
  const doc = await getDocument(user.id, id);
  const body = `# ${doc.title}\n\n${htmlToMarkdown(doc.contentHtml)}\n`;
  const filename = doc.title.replace(/[^\w\- ]+/g, "").trim().slice(0, 80) || "document";
  return new Response(body, {
    headers: {
      "Content-Type": "text/markdown; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}.md"`,
    },
  });
});
