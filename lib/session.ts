import crypto from "node:crypto";
import { cookies } from "next/headers";
import { getUser, type User } from "./documents";

// Mocked auth for the demo: the cookie holds a seeded user id plus an HMAC so it
// can't be edited by hand. Swapping in real auth only changes this file.
export const SESSION_COOKIE = "pl_session";

function secret(): string {
  const s = process.env.SESSION_SECRET;
  if (!s || s.length < 16) throw new Error("SESSION_SECRET must be set (16+ characters)");
  return s;
}

function sign(value: string): string {
  return crypto.createHmac("sha256", secret()).update(value).digest("base64url");
}

export function encodeSession(userId: string): string {
  return `${userId}.${sign(userId)}`;
}

export function decodeSession(raw: string | undefined): string | null {
  if (!raw) return null;
  const dot = raw.lastIndexOf(".");
  if (dot <= 0) return null;
  const id = raw.slice(0, dot);
  const sig = Buffer.from(raw.slice(dot + 1));
  const expected = Buffer.from(sign(id));
  if (sig.length !== expected.length || !crypto.timingSafeEqual(sig, expected)) return null;
  return id;
}

export async function currentUser(): Promise<User | null> {
  const id = decodeSession((await cookies()).get(SESSION_COOKIE)?.value);
  return id ? getUser(id) : null;
}
