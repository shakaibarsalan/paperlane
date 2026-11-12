import { z } from "zod";

export const MAX_TITLE = 200;
export const MAX_CONTENT_BYTES = 500_000;

export const titleSchema = z
  .string()
  .trim()
  .min(1, "Title can't be empty")
  .max(MAX_TITLE, `Title must be ${MAX_TITLE} characters or fewer`);

export const createDocSchema = z.object({
  title: titleSchema.optional(),
});

export const updateDocSchema = z
  .object({
    title: titleSchema.optional(),
    contentHtml: z
      .string()
      .refine((s) => Buffer.byteLength(s, "utf8") <= MAX_CONTENT_BYTES, "Document is too large (500 KB max)")
      .optional(),
    version: z.number().int().positive(),
  })
  .refine((v) => v.title !== undefined || v.contentHtml !== undefined, "Nothing to update");

export const shareSchema = z.object({
  email: z.string().trim().toLowerCase().email("Enter a valid email"),
  role: z.enum(["viewer", "editor"]),
});

export const roleSchema = z.object({ role: z.enum(["viewer", "editor"]) });

export function firstIssue(err: z.ZodError): string {
  return err.issues[0]?.message ?? "Invalid input";
}
