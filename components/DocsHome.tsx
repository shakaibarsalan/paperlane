"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import type { DocSummary } from "@/lib/documents";

const ACCEPT = ".txt,.md,.docx";

function timeAgo(iso: string): string {
  const s = Math.max(0, (Date.now() - new Date(iso).getTime()) / 1000);
  if (s < 60) return "just now";
  if (s < 3600) return `${Math.floor(s / 60)} min ago`;
  if (s < 86400) return `${Math.floor(s / 3600)} h ago`;
  return new Date(iso).toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" });
}

export function DocsHome({ owned, shared }: { owned: DocSummary[]; shared: DocSummary[] }) {
  const router = useRouter();
  const fileInput = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState<"" | "create" | "upload">("");
  const [error, setError] = useState("");

  async function readError(res: Response, fallback: string) {
    return (await res.json().catch(() => null))?.error ?? fallback;
  }

  async function createDoc() {
    setBusy("create");
    setError("");
    const res = await fetch("/api/documents", { method: "POST" });
    if (!res.ok) {
      setError(await readError(res, "Couldn't create a document"));
      setBusy("");
      return;
    }
    const { id } = await res.json();
    router.push(`/docs/${id}`);
  }

  async function upload(file: File) {
    setError("");
    if (file.size > 2 * 1024 * 1024) {
      setError("That file is larger than 2 MB.");
      return;
    }
    setBusy("upload");
    const form = new FormData();
    form.append("file", file);
    const res = await fetch("/api/documents/import", { method: "POST", body: form });
    if (!res.ok) {
      setError(await readError(res, "Upload failed"));
      setBusy("");
      return;
    }
    const { id } = await res.json();
    router.push(`/docs/${id}`);
  }

  async function remove(doc: DocSummary) {
    if (!confirm(`Delete "${doc.title}"? People you shared it with will lose access too.`)) return;
    const res = await fetch(`/api/documents/${doc.id}`, { method: "DELETE" });
    if (!res.ok) setError(await readError(res, "Couldn't delete the document"));
    router.refresh();
  }

  return (
    <main className="page">
      <h1>Documents</h1>
      <p className="lead">Write, format and share documents with your team.</p>

      {error && (
        <div className="alert alert-error" role="alert">
          {error}
          <button className="btn btn-small" onClick={() => setError("")}>
            Dismiss
          </button>
        </div>
      )}

      <div className="actions-row">
        <button className="btn btn-primary" onClick={createDoc} disabled={busy !== ""}>
          {busy === "create" ? "Creating…" : "+ New document"}
        </button>
        <button className="btn" onClick={() => fileInput.current?.click()} disabled={busy !== ""}>
          {busy === "upload" ? "Importing…" : "Import a file"}
        </button>
        <span className="hint">Import .txt, .md or .docx (up to 2 MB) as a new document.</span>
        <input
          ref={fileInput}
          type="file"
          accept={ACCEPT}
          hidden
          onChange={(e) => {
            const f = e.target.files?.[0];
            e.target.value = "";
            if (f) upload(f);
          }}
        />
      </div>

      <h2 className="section-title">My documents ({owned.length})</h2>
      {owned.length === 0 ? (
        <div className="empty">You haven&apos;t created any documents yet. Start a new one or import a file.</div>
      ) : (
        <ul className="doc-list">
          {owned.map((d) => (
            <li key={d.id} className="doc-row">
              <Link className="doc-link" href={`/docs/${d.id}`}>
                <span className="doc-title">{d.title}</span>
                <span className="doc-meta">Edited {timeAgo(d.updatedAt)}</span>
              </Link>
              <span className="badge">Owner</span>
              <button className="btn btn-small btn-danger" onClick={() => remove(d)} aria-label={`Delete ${d.title}`}>
                Delete
              </button>
            </li>
          ))}
        </ul>
      )}

      <h2 className="section-title">Shared with me ({shared.length})</h2>
      {shared.length === 0 ? (
        <div className="empty">Nothing has been shared with you yet.</div>
      ) : (
        <ul className="doc-list">
          {shared.map((d) => (
            <li key={d.id} className="doc-row">
              <Link className="doc-link" href={`/docs/${d.id}`}>
                <span className="doc-title">{d.title}</span>
                <span className="doc-meta">
                  Shared by {d.owner.name} · edited {timeAgo(d.updatedAt)}
                </span>
              </Link>
              <span className={d.role === "editor" ? "badge" : "badge badge-view"}>
                {d.role === "editor" ? "Can edit" : "Can view"}
              </span>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
