"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Avatar } from "@/components/Avatar";
import type { User } from "@/lib/documents";

export function LoginOptions({ users }: { users: User[] }) {
  const router = useRouter();
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState("");

  async function signIn(userId: string) {
    setBusy(userId);
    setError("");
    const res = await fetch("/api/session", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId }),
    });
    if (!res.ok) {
      setError((await res.json().catch(() => null))?.error ?? "Couldn't sign in");
      setBusy(null);
      return;
    }
    router.push("/");
    router.refresh();
  }

  return (
    <div>
      {users.map((u) => (
        <button key={u.id} className="user-option" onClick={() => signIn(u.id)} disabled={busy !== null}>
          <Avatar name={u.name} color={u.color} />
          <span style={{ flex: 1 }}>
            <strong>{u.name}</strong>
            <br />
            <span className="hint">{u.email}</span>
          </span>
          <span className="hint">{busy === u.id ? "Signing in…" : "Continue →"}</span>
        </button>
      ))}
      <p className="form-error" role="alert">
        {error}
      </p>
    </div>
  );
}
