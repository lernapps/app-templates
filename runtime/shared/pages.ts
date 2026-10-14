// The page trees of an app in several languages, shared by the archetypes' build steps (the explainer, the quiz):
// German at the root, every other language below /<language>/, the same address within each tree. Each page has its
// language on <html>, an alternate link to itself in every language, and a language switch of plain links, so it
// works without JavaScript. Every URL is relative, so the app works under any path.

/** The root of a language's tree, from the app's root: "" for German, "en/" for English. */
export const languageRoot = (lang: string): string => (lang === "de" ? "" : `${lang}/`);

/** A relative URL from the page at `from` to `to` (both from the app's root). */
export function relative(from: string, to: string): string {
  const up = "../".repeat(from.split("/").filter((part) => part !== "").length);
  const url = `${up}${to}`;
  return url === "" ? "./" : url.startsWith("#") ? `./${url}` : url;
}

/** The built shell's relative URLs (./assets/…, built by Vite with base "./"), from a page at `path`. */
export function fromDepth(html: string, path: string): string {
  const up = "../".repeat(path.split("/").filter((part) => part !== "").length);
  return html.replace(/((?:src|href)=")\.\/(?!\/)/g, `$1${up === "" ? "./" : up}`);
}

/** The page with `lang` as the language of its <html>, in place of the one it had. */
export const withLanguage = (html: string, lang: string): string =>
  html.replace(/<html([^>]*?)\slang="[^"]*"/, "<html$1").replace("<html", `<html lang="${lang}"`);

/** Where a page is in its language tree, and the languages it exists in. */
export interface PageInLanguages {
  /** Where the page is, from the app's root: "", "en/", "en/prozent/prozentwert/". */
  path: string;
  /** The same page's address within any language tree: "", "prozent/prozentwert/". */
  local: string;
  /** The app's languages, German first. */
  languages: readonly string[];
}

/** An alternate link to the page in each of its languages, for <head>. */
export const alternateLinks = ({ path, local, languages }: PageInLanguages): string[] =>
  languages.map(
    (lang) => `<link rel="alternate" hreflang="${lang}" href="${relative(path, languageRoot(lang) + local)}" />`,
  );

/**
 * The language switch of a page in `lang`: a link to the page in each language, named in its own language, the
 * current one marked; nothing while the app has one language. `label` and `name` give HTML, already escaped.
 */
export function languageSwitch(
  page: PageInLanguages & { lang: string; className: string; label: string; name: (lang: string) => string },
): string {
  const { path, local, languages, lang: current, className, label, name } = page;
  if (languages.length < 2) return "";
  const links = languages.map(
    (lang) =>
      `<li><a href="${relative(path, languageRoot(lang) + local)}" hreflang="${lang}" lang="${lang}"${lang === current ? ' aria-current="page"' : ""}>${name(lang)}</a></li>`,
  );
  return `<nav class="${className}" aria-label="${label}"><ul>${links.join("")}</ul></nav>`;
}
