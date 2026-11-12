import sanitizeHtml from "sanitize-html";

// The editor only produces this subset; anything else (scripts, styles, event
// handlers, images, iframes) is dropped before it reaches the database.
const OPTIONS: sanitizeHtml.IOptions = {
  allowedTags: [
    "p", "br", "strong", "em", "u", "s", "h1", "h2", "h3",
    "ul", "ol", "li", "blockquote", "code", "pre", "hr", "a",
  ],
  allowedAttributes: { a: ["href", "target", "rel"] },
  allowedSchemes: ["http", "https", "mailto"],
  transformTags: {
    b: "strong",
    i: "em",
    h4: "h3",
    h5: "h3",
    h6: "h3",
    a: sanitizeHtml.simpleTransform("a", { rel: "noopener noreferrer", target: "_blank" }),
  },
};

export function sanitizeDocHtml(html: string): string {
  return sanitizeHtml(html, OPTIONS).trim();
}
