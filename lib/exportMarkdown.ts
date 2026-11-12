import TurndownService from "turndown";

const turndown = new TurndownService({ headingStyle: "atx", bulletListMarker: "-", codeBlockStyle: "fenced" });
// Markdown has no underline; keep it as inline HTML so it isn't silently lost.
turndown.keep(["u"]);

export function htmlToMarkdown(html: string): string {
  return turndown.turndown(html || "");
}
