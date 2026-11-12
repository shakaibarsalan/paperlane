// End-to-end check of the document service against a real Postgres.
// Runs only when DATABASE_URL is set (npm run db:migrate first); skipped otherwise.
import { afterAll, describe, expect, it } from "vitest";
import {
  createDocument,
  deleteDocument,
  getDocument,
  listDocuments,
  shareDocument,
  unshareDocument,
  updateDocument,
} from "@/lib/documents";
import { db } from "@/lib/db";

const hasDb = Boolean(process.env.DATABASE_URL);
const created: string[] = [];

describe.skipIf(!hasDb)("document service (Postgres)", () => {
  afterAll(async () => {
    if (created.length) await db().query("DELETE FROM documents WHERE id = ANY($1::uuid[])", [created]);
    await db().end();
  });

  it("enforces owner / editor / viewer / no-access end to end", async () => {
    const { id } = await createDocument("alice", "Test: sharing flow", "<p>Hello</p><script>x()</script>");
    created.push(id);

    const doc = await getDocument("alice", id);
    expect(doc.role).toBe("owner");
    expect(doc.contentHtml).toBe("<p>Hello</p>"); // sanitized on write

    // Bob can't see it until it is shared; unknown and hidden docs both look like 404.
    await expect(getDocument("bob", id)).rejects.toMatchObject({ status: 404 });

    await shareDocument("alice", id, "BOB@paperlane.test", "viewer");
    expect((await listDocuments("bob")).shared.map((d) => d.id)).toContain(id);
    await expect(updateDocument("bob", id, { contentHtml: "<p>hack</p>", version: doc.version })).rejects.toMatchObject({
      status: 403,
    });
    await expect(shareDocument("bob", id, "carol@paperlane.test", "editor")).rejects.toMatchObject({ status: 403 });

    // Upgrade to editor: Bob can now save.
    await shareDocument("alice", id, "bob@paperlane.test", "editor");
    const saved = await updateDocument("bob", id, { contentHtml: "<p><strong>Edited</strong></p>", version: doc.version });
    expect(saved.version).toBe(doc.version + 1);
    expect((await getDocument("alice", id)).contentHtml).toBe("<p><strong>Edited</strong></p>");

    // Carol is still locked out; deleting is owner-only.
    await expect(getDocument("carol", id)).rejects.toMatchObject({ status: 404 });
    await expect(deleteDocument("bob", id)).rejects.toMatchObject({ status: 403 });

    await unshareDocument("alice", id, "bob");
    await expect(getDocument("bob", id)).rejects.toMatchObject({ status: 404 });
  });

  it("rejects a stale save instead of overwriting newer content", async () => {
    const { id } = await createDocument("alice", "Test: conflict");
    created.push(id);
    const v1 = (await getDocument("alice", id)).version;

    await updateDocument("alice", id, { contentHtml: "<p>first tab</p>", version: v1 });
    await expect(updateDocument("alice", id, { contentHtml: "<p>stale tab</p>", version: v1 })).rejects.toMatchObject({
      status: 409,
    });
    expect((await getDocument("alice", id)).contentHtml).toBe("<p>first tab</p>");
  });
});
