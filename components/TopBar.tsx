"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import type { User } from "@/lib/documents";
import { Avatar } from "./Avatar";

export function TopBar({ user }: { user: User }) {
  const router = useRouter();
  async function switchUser() {
    await fetch("/api/session", { method: "DELETE" });
    router.push("/login");
    router.refresh();
  }
  return (
    <header className="topbar">
      <Link href="/" className="brand">
        <span className="brand-mark" aria-hidden="true" /> Paperlane
      </Link>
      <div className="user-chip">
        <Avatar name={user.name} color={user.color} />
        <span className="name">{user.name}</span>
        <button className="btn btn-small" onClick={switchUser}>
          Switch user
        </button>
      </div>
    </header>
  );
}
