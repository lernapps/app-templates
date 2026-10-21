// Escaping a learner text for HTML, once for every archetype: `escape` for text and attribute values, `escapeText`
// for text only (inside <code>, where a quotation mark is no markup).

/** `text` for HTML text or a double-quoted attribute value. */
export const escape = (text: string): string =>
  text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

/** `text` for HTML text, quotation marks as they are. */
export const escapeText = (text: string): string =>
  text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
