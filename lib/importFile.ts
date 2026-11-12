import mammoth from "mammoth";
import { marked } from "marked";
import { sanitizeDocHtml } from "./sanitize";
import { AppError } from "./errors";

export const SUPPORTED_EXTENSIONS = [".txt", ".md", ".docx"] as const;
export const MAX_UPLOAD_BYTES = 2 * 1024 * 1024;

function escapeHtml(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

/** Plain text: blank lines start new paragraphs, single newlines become <br>. */
export function textToHtml(text: string): string {
  return text
    .replace(/\r\n?/g, "\n")
    .split(/\n{2,}/)
    .map((block) => block.trim())
    .filter(Boolean)
    .map((block) => `<p>${escapeHtml(block).replace(/\n/g, "<br>")}</p>`)
    .join("");
}

export function extensionOf(filename: string): string {
  const i = filename.lastIndexOf(".");
  return i === -1 ? "" : filename.slice(i).toLowerCase();
}

export function titleFromFilename(filename: string): string {
  const base = filename.replace(/\.[^.]+$/, "").replace(/[_-]+/g, " ").trim();
  return (base || "Imported document").slice(0, 200);
}

/** Convert an uploaded file into sanitized editor HTML. */
export async function fileToHtml(filename: string, data: Buffer): Promise<string> {
  if (data.byteLength === 0) throw new AppError(400, "The file is empty", "empty_file");
  if (data.byteLength > MAX_UPLOAD_BYTES) throw new AppError(413, "File is larger than 2 MB", "too_large");

  const ext = extensionOf(filename);
  let html: string;
  switch (ext) {
    case ".txt":
      html = textToHtml(data.toString("utf8"));
      break;
    case ".md":
      html = await marked.parse(data.toString("utf8"), { gfm: true });
      break;
    case ".docx": {
      try {
        const result = await mammoth.convertToHtml({ buffer: data });
        html = result.value;
      } catch {
        throw new AppError(422, "Couldn't read that .docx file. Is it a valid Word document?", "bad_docx");
      }
      break;
    }
    default:
      throw new AppError(415, "Unsupported file type. Upload a .txt, .md or .docx file.", "unsupported_type");
  }
  const clean = sanitizeDocHtml(html);
  if (!clean) throw new AppError(422, "No readable text was found in that file", "no_text");
  return clean;
}
