import { cookies } from "next/headers";
import { z } from "zod";
import { getUser } from "@/lib/documents";
import { errorResponse, json } from "@/lib/http";
import { encodeSession, SESSION_COOKIE } from "@/lib/session";

const bodySchema = z.object({ userId: z.string().min(1).max(64) });

// Sign in as one of the seeded demo users.
export async function POST(req: Request) {
  try {
    const { userId } = bodySchema.parse(await req.json());
    const user = await getUser(userId);
    if (!user) return json({ error: "Unknown demo user", code: "not_found" }, 404);
    (await cookies()).set(SESSION_COOKIE, encodeSession(user.id), {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: 60 * 60 * 24 * 7,
    });
    return json({ user });
  } catch (err) {
    return errorResponse(err);
  }
}

export async function DELETE() {
  (await cookies()).delete(SESSION_COOKIE);
  return json({ ok: true });
}
