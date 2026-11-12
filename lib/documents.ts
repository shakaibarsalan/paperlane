// Document service: every function takes the acting user's id and enforces
// access rules from lib/access.ts. API routes stay thin wrappers around this.
import { db } from "./db";
import { canEdit, canManage, canView, resolveRole, type Role, type ShareRole } from "./access";
import { AppError, badRequest, forbidden, notFound } from "./errors";
import { sanitizeDocHtml } from "./sanitize";

export type User = { id: string; name: string; email: string; color: string };

export type DocSummary = {
  id: string;
  title: string;
  updatedAt: string;
  role: Role;
  owner: { id: string; name: string };
};

export type Doc = DocSummary & { contentHtml: string; version: number };

export type Share = { userId: string; name: string; email: string; role: ShareRole };

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function getUser(id: string): Promise<User | null> {
  const { rows } = await db().query<User>("SELECT id, name, email, color FROM users WHERE id = $1", [id]);
  return rows[0] ?? null;
}

export async function listUsers(): Promise<User[]> {
  const { rows } = await db().query<User>("SELECT id, name, email, color FROM users ORDER BY name");
  return rows;
}

export async function listDocuments(userId: string): Promise<{ owned: DocSummary[]; shared: DocSummary[] }> {
  const { rows } = await db().query(
    `SELECT d.id, d.title, d.updated_at, d.owner_id, u.name AS owner_name, s.role AS share_role
       FROM documents d
       JOIN users u ON u.id = d.owner_id
       LEFT JOIN document_shares s ON s.document_id = d.id AND s.user_id = $1
      WHERE d.owner_id = $1 OR s.user_id = $1
      ORDER BY d.updated_at DESC`,
    [userId],
  );
  const all: DocSummary[] = rows.map((r) => ({
    id: r.id,
    title: r.title,
    updatedAt: new Date(r.updated_at).toISOString(),
    role: resolveRole(r.owner_id, userId, r.share_role)!,
    owner: { id: r.owner_id, name: r.owner_name },
  }));
  return { owned: all.filter((d) => d.role === "owner"), shared: all.filter((d) => d.role !== "owner") };
}

/** Load a document with the caller's role, or throw 404 if they can't see it. */
export async function getDocument(userId: string, docId: string): Promise<Doc> {
  // Unknown ids and ids the user can't see both return 404, so ids can't be probed.
  if (!UUID_RE.test(docId)) throw notFound();
  const { rows } = await db().query(
    `SELECT d.id, d.title, d.content_html, d.version, d.updated_at, d.owner_id,
            u.name AS owner_name, s.role AS share_role
       FROM documents d
       JOIN users u ON u.id = d.owner_id
       LEFT JOIN document_shares s ON s.document_id = d.id AND s.user_id = $2
      WHERE d.id = $1`,
    [docId, userId],
  );
  const r = rows[0];
  const role = r ? resolveRole(r.owner_id, userId, r.share_role) : null;
  if (!r || !canView(role)) throw notFound();
  return {
    id: r.id,
    title: r.title,
    contentHtml: r.content_html,
    version: r.version,
    updatedAt: new Date(r.updated_at).toISOString(),
    role: role!,
    owner: { id: r.owner_id, name: r.owner_name },
  };
}

export async function createDocument(userId: string, title?: string, contentHtml = ""): Promise<{ id: string }> {
  const { rows } = await db().query(
    "INSERT INTO documents (owner_id, title, content_html) VALUES ($1, $2, $3) RETURNING id",
    [userId, title?.trim() || "Untitled document", sanitizeDocHtml(contentHtml)],
  );
  return { id: rows[0].id };
}

/**
 * Save title and/or content. Uses optimistic concurrency: the caller sends the
 * version it loaded; if someone saved in between, nothing is overwritten and a
 * 409 tells the client to reload.
 */
export async function updateDocument(
  userId: string,
  docId: string,
  patch: { title?: string; contentHtml?: string; version: number },
): Promise<{ version: number; updatedAt: string }> {
  const doc = await getDocument(userId, docId);
  if (!canEdit(doc.role)) throw forbidden("You have view-only access to this document");

  const { rows } = await db().query(
    `UPDATE documents
        SET title = COALESCE($3, title),
            content_html = COALESCE($4, content_html),
            version = version + 1,
            updated_at = now()
      WHERE id = $1 AND version = $2
      RETURNING version, updated_at`,
    [
      docId,
      patch.version,
      patch.title?.trim() ?? null,
      patch.contentHtml === undefined ? null : sanitizeDocHtml(patch.contentHtml),
    ],
  );
  if (!rows[0]) {
    throw new AppError(
      409,
      "This document was changed somewhere else. Reload to see the latest version.",
      "version_conflict",
    );
  }
  return { version: rows[0].version, updatedAt: new Date(rows[0].updated_at).toISOString() };
}

export async function deleteDocument(userId: string, docId: string): Promise<void> {
  const doc = await getDocument(userId, docId);
  if (!canManage(doc.role)) throw forbidden("Only the owner can delete this document");
  await db().query("DELETE FROM documents WHERE id = $1", [docId]);
}

export async function listShares(userId: string, docId: string): Promise<Share[]> {
  const doc = await getDocument(userId, docId);
  if (!canManage(doc.role)) throw forbidden("Only the owner can see who has access");
  const { rows } = await db().query(
    `SELECT s.user_id, u.name, u.email, s.role
       FROM document_shares s JOIN users u ON u.id = s.user_id
      WHERE s.document_id = $1 ORDER BY u.name`,
    [docId],
  );
  return rows.map((r) => ({ userId: r.user_id, name: r.name, email: r.email, role: r.role }));
}

/** Grant (or change) access for the user with this email. */
export async function shareDocument(userId: string, docId: string, email: string, role: ShareRole): Promise<Share> {
  const doc = await getDocument(userId, docId);
  if (!canManage(doc.role)) throw forbidden("Only the owner can share this document");
  const { rows } = await db().query<User>(
    "SELECT id, name, email, color FROM users WHERE lower(email) = lower($1)",
    [email],
  );
  const target = rows[0];
  if (!target) throw new AppError(404, `No Paperlane user has the email ${email}`, "user_not_found");
  if (target.id === userId) throw badRequest("You already own this document");
  await db().query(
    `INSERT INTO document_shares (document_id, user_id, role) VALUES ($1, $2, $3)
     ON CONFLICT (document_id, user_id) DO UPDATE SET role = EXCLUDED.role`,
    [docId, target.id, role],
  );
  return { userId: target.id, name: target.name, email: target.email, role };
}

export async function unshareDocument(userId: string, docId: string, targetUserId: string): Promise<void> {
  const doc = await getDocument(userId, docId);
  if (!canManage(doc.role)) throw forbidden("Only the owner can remove access");
  await db().query("DELETE FROM document_shares WHERE document_id = $1 AND user_id = $2", [docId, targetUserId]);
}
