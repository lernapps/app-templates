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
 * The header of a page in `lang`: the language switch, a link to the page in each language, named in its own
 * language, the current one marked; nothing while the app has one language. `label` and `name` give HTML, already
 * escaped.
 */
export function pageHeader(
  page: PageInLanguages & { lang: string; label: string; name: (lang: string) => string },
): string {
  const { path, local, languages, lang: current, label, name } = page;
  if (languages.length < 2) return "";
  const links = languages.map(
    (lang) =>
      `<li><a href="${relative(path, languageRoot(lang) + local)}" hreflang="${lang}" lang="${lang}"${lang === current ? ' aria-current="page"' : ""}>${name(lang)}</a></li>`,
  );
  return `<header class="page-header"><nav class="page-languages" aria-label="${label}"><ul>${links.join("")}</ul></nav></header>`;
}

/** The footer of a page: what the app is, and the links to the imprint and the privacy statement; texts as HTML, already escaped. */
export const pageFooter = (words: { footer: string; imprint: string; privacy: string }): string =>
  `<footer class="page-footer"><p>${words.footer} · <a href="https://lernapps.net/imprint/">${words.imprint}</a> · <a href="https://lernapps.net/privacy/">${words.privacy}</a></p></footer>`;

/**
 * The page for every address the app does not have, 404.html at the bundle's root: GitHub Pages serves it for any
 * missing path below the site, at that path, so the page cannot know its own depth, and relative links in it would
 * point below the missing path. Its script finds the app's root instead: from the missing path's folder upwards, the
 * first folder whose 404.html exists (one HEAD request each, to the same server) is the root of the bundle that
 * answers there: the app at /<repo>/, a preview at /<repo>/pr-preview/pr-<n>/ (which has its own 404.html), or / when
 * served locally. It then moves on to that root's start page and points the link there. Without JavaScript the link
 * leads to the start page of the site. German, plain language, not indexed, nothing loaded from another server.
 */
export function notFoundPage(): string {
  const script = `(async () => {
  const link = document.getElementById("start");
  let folder = location.pathname.slice(0, location.pathname.lastIndexOf("/") + 1);
  for (;;) {
    try {
      const found = await fetch(folder + "404.html", { method: "HEAD", cache: "no-store" });
      if (found.ok) break;
    } catch {
      return;
    }
    if (folder === "/") return;
    folder = folder.slice(0, folder.lastIndexOf("/", folder.length - 2) + 1);
  }
  link.href = folder;
  link.textContent = "Zur Startseite der App";
  if (folder === location.pathname) return;
  document.getElementById("weiter").hidden = false;
  location.replace(folder);
})();`;
  return [
    `<!doctype html>`,
    `<html lang="de">`,
    `  <head>`,
    `    <meta charset="utf-8" />`,
    `    <meta name="viewport" content="width=device-width, initial-scale=1" />`,
    `    <meta name="robots" content="noindex" />`,
    `    <title>Seite nicht gefunden</title>`,
    `    <style>body { margin: 2rem auto; max-width: 40rem; padding: 0 1rem; font-family: system-ui, sans-serif; line-height: 1.5; color: #1a1a1a; background: #ffffff; } a { color: #1d4ed8; }</style>`,
    `  </head>`,
    `  <body>`,
    `    <main>`,
    `      <h1>Seite nicht gefunden</h1>`,
    `      <p>Diese Seite gibt es nicht (mehr).</p>`,
    `      <p id="weiter" hidden>Du wirst zur Startseite der App weitergeleitet.</p>`,
    `      <p><a id="start" href="/">Zur Startseite</a></p>`,
    `    </main>`,
    `    <script>${script}</script>`,
    `  </body>`,
    `</html>`,
    ``,
  ].join("\n");
}
