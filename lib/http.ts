import { NextResponse } from "next/server";
import { ZodError } from "zod";
import { AppError } from "./errors";
import { firstIssue } from "./validation";
import { currentUser } from "./session";
import type { User } from "./documents";

export function json(data: unknown, status = 200) {
  return NextResponse.json(data, { status });
}

export type IdParams = { params: Promise<{ id: string }> };

/** Wrap a route handler: require a signed-in user and map errors to JSON. */
export function withUser<C>(handler: (req: Request, user: User, ctx: C) => Promise<Response>) {
  return async (req: Request, ctx: C) => {
    try {
      const user = await currentUser();
      if (!user) return json({ error: "Please sign in first", code: "unauthenticated" }, 401);
      return await handler(req, user, ctx);
    } catch (err) {
      return errorResponse(err);
    }
  };
}

export function errorResponse(err: unknown) {
  if (err instanceof AppError) return json({ error: err.message, code: err.code }, err.status);
  if (err instanceof ZodError) return json({ error: firstIssue(err), code: "bad_request" }, 400);
  if (err instanceof SyntaxError) return json({ error: "Request body must be valid JSON", code: "bad_request" }, 400);
  console.error(err);
  return json({ error: "Something went wrong on our side. Please try again.", code: "server_error" }, 500);
}
