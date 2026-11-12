import { describe, expect, it } from "vitest";
import { fileToHtml, textToHtml, titleFromFilename } from "@/lib/importFile";
import { sanitizeDocHtml } from "@/lib/sanitize";
import { htmlToMarkdown } from "@/lib/exportMarkdown";
import { updateDocSchema } from "@/lib/validation";

describe("file import", () => {
  it("turns plain text into escaped paragraphs", () => {
    expect(textToHtml("Hello <b>world</b>\nline two\n\nSecond para")).toBe(
      "<p>Hello &lt;b&gt;world&lt;/b&gt;<br>line two</p><p>Second para</p>",
    );
  });

  it("converts Markdown headings, emphasis and lists", async () => {
    const html = await fileToHtml("notes.md", Buffer.from("# Plan\n\nSome **bold** text\n\n- one\n- two\n"));
    expect(html).toContain("<h1>Plan</h1>");
    expect(html).toContain("<strong>bold</strong>");
    expect(html).toMatch(/<ul>\s*<li>one<\/li>\s*<li>two<\/li>\s*<\/ul>/);
  });

  it("strips scripts and event handlers from imported Markdown", async () => {
    const html = await fileToHtml("x.md", Buffer.from('Hi <script>alert(1)</script><img src=x onerror="alert(1)">'));
    expect(html).not.toMatch(/script|onerror|<img/i);
  });

  it("rejects unsupported and empty files with clear errors", async () => {
    await expect(fileToHtml("photo.png", Buffer.from("abc"))).rejects.toMatchObject({ status: 415 });
    await expect(fileToHtml("empty.txt", Buffer.alloc(0))).rejects.toMatchObject({ status: 400 });
  });

  it("rejects a corrupt .docx instead of crashing", async () => {
    await expect(fileToHtml("broken.docx", Buffer.from("not a zip"))).rejects.toMatchObject({ status: 422 });
  });

  it("derives a readable title from the filename", () => {
    expect(titleFromFilename("q3_launch-plan.docx")).toBe("q3 launch plan");
  });
});

describe("sanitizer and export", () => {
  it("keeps editor formatting and drops unsafe attributes", () => {
    const html = sanitizeDocHtml('<h2 style="color:red">T</h2><p><b>b</b> <i>i</i> <u>u</u></p><a href="javascript:x">l</a>');
    expect(html).toBe('<h2>T</h2><p><strong>b</strong> <em>i</em> <u>u</u></p><a rel="noopener noreferrer" target="_blank">l</a>');
  });

  it("exports formatting to Markdown, keeping underline as HTML", () => {
    const md = htmlToMarkdown("<h1>Title</h1><p><strong>b</strong> <u>u</u></p><ol><li>first</li></ol>");
    expect(md).toContain("# Title");
    expect(md).toContain("**b** <u>u</u>");
    expect(md).toMatch(/1\.\s+first/);
  });
});

describe("update validation", () => {
  it("requires a version and at least one field", () => {
    expect(updateDocSchema.safeParse({ title: "x" }).success).toBe(false);
    expect(updateDocSchema.safeParse({ version: 1 }).success).toBe(false);
    expect(updateDocSchema.safeParse({ version: 1, title: "  " }).success).toBe(false);
    expect(updateDocSchema.safeParse({ version: 1, title: "Plan" }).success).toBe(true);
  });
});
