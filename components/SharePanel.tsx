"use client";

import { useEffect, useRef, useState } from "react";
import type { Share, User } from "@/lib/documents";

type Role = "viewer" | "editor";

export function SharePanel({ docId, ownerId, onClose }: { docId: string; ownerId: string; onClose: () => void }) {
  const [shares, setShares] = useState<Share[] | null>(null);
  const [users, setUsers] = useState<User[]>([]);
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<Role>("editor");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    Promise.all([fetch(`/api/documents/${docId}/shares`), fetch("/api/users")])
      .then(async ([s, u]) => {
        if (!s.ok) throw new Error((await s.json().catch(() => null))?.error ?? "Couldn't load sharing");
        setShares((await s.json()).shares);
        if (u.ok) setUsers((await u.json()).users);
      })
      .catch((e: Error) => setError(e.message));
    inputRef.current?.focus();
    const esc = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", esc);
    return () => window.removeEventListener("keydown", esc);
  }, [docId, onClose]);

  async function call(url: string, init: RequestInit) {
    setBusy(true);
    setError("");
    try {
      const res = await fetch(url, init);
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error ?? "Request failed");
      return data;
    } catch (e) {
      setError((e as Error).message);
      return null;
    } finally {
      setBusy(false);
    }
  }

  async function grant(targetEmail: string, r: Role) {
    const data = await call(`/api/documents/${docId}/shares`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: targetEmail, role: r }),
    });
    if (!data) return;
    setShares((prev) => [...(prev ?? []).filter((s) => s.userId !== data.share.userId), data.share]);
    setEmail("");
  }

  async function revoke(userId: string) {
    if (await call(`/api/documents/${docId}/shares/${encodeURIComponent(userId)}`, { method: "DELETE" })) {
      setShares((prev) => (prev ?? []).filter((s) => s.userId !== userId));
    }
  }

  const sharedIds = new Set((shares ?? []).map((s) => s.userId));
  const suggestions = users.filter((u) => u.id !== ownerId && !sharedIds.has(u.id));

  return (
    <div className="scrim" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className="dialog" role="dialog" aria-modal="true" aria-labelledby="share-title">
        <h2 id="share-title">Share document</h2>
        <p className="hint" style={{ margin: 0 }}>
          Add people by email. Editors can change the text; viewers can only read and export.
        </p>

        <form
          className="share-form"
          onSubmit={(e) => {
            e.preventDefault();
            if (email.trim()) grant(email.trim(), role);
          }}
        >
          <input
            ref={inputRef}
            type="email"
            list="user-emails"
            placeholder="name@paperlane.test"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            aria-label="Email to share with"
            required
          />
          <datalist id="user-emails">
            {suggestions.map((u) => (
              <option key={u.id} value={u.email}>
                {u.name}
              </option>
            ))}
          </datalist>
          <select value={role} onChange={(e) => setRole(e.target.value as Role)} aria-label="Access level">
            <option value="editor">Can edit</option>
            <option value="viewer">Can view</option>
          </select>
          <button className="btn btn-primary" disabled={busy}>
            Share
          </button>
        </form>
        {suggestions.length > 0 && (
          <p className="hint" style={{ margin: "0 0 4px" }}>
            Demo users: {suggestions.map((u) => u.email).join(", ")}
          </p>
        )}
        <p className="form-error" role="alert">
          {error}
        </p>

        <h3 className="section-title" style={{ marginTop: 8 }}>
          People with access
        </h3>
        <ul className="share-list">
          <li className="share-row">
            <span className="who">
              You<small>Owner</small>
            </span>
          </li>
          {shares === null && !error && <li className="share-row hint">Loading…</li>}
          {(shares ?? []).map((s) => (
            <li key={s.userId} className="share-row">
              <span className="who">
                {s.name}
                <small>{s.email}</small>
              </span>
              <select
                value={s.role}
                disabled={busy}
                onChange={(e) => grant(s.email, e.target.value as Role)}
                aria-label={`Access for ${s.name}`}
              >
                <option value="editor">Can edit</option>
                <option value="viewer">Can view</option>
              </select>
              <button className="btn btn-small btn-danger" disabled={busy} onClick={() => revoke(s.userId)}>
                Remove
              </button>
            </li>
          ))}
        </ul>

        <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 16 }}>
          <button className="btn" onClick={onClose}>
            Done
          </button>
        </div>
      </div>
    </div>
  );
}
