// The build step of an explainer (@lernapps/app-templates/explainer/plugin), a Vite plugin. Spike: it emits many
// HTML pages from one build, each linking the one hashed client module that Vite builds from index.html.
//
// index.html is Vite's only entry. After Vite has written it, with the hashed script and stylesheet, the plugin
// takes it as the shell of every page: each page is the shell with its own content, and the shell's relative asset
// URLs (./assets/…) are rewritten for the page's depth (../../assets/… for <chapter>/<page>/).
import type { Plugin } from "vite-plus";

/** A page of the built app: where it goes, relative to the app's root, and what it says. */
export interface Page {
  /** The page's folder, e.g. "prozent/prozentwert/"; "" for the start page. */
  path: string;
  title: string;
  body: string;
}

const MARKER = "<!-- explainer -->";

/** The shell's relative URLs (./assets/…, built by Vite with base "./"), from a page at `path`. */
export function fromDepth(html: string, path: string): string {
  const up = "../".repeat(path.split("/").filter((part) => part !== "").length);
  return html.replace(/((?:src|href)=")\.\/(?!\/)/g, `$1${up === "" ? "./" : up}`);
}

/** The shell with the page in it. */
export function fill(shell: string, page: Page): string {
  const escaped = page.title.replace(/&/g, "&amp;").replace(/</g, "&lt;");
  return fromDepth(shell.replace("</head>", `<title>${escaped}</title>\n  </head>`), page.path).replace(
    MARKER,
    () => page.body,
  );
}

/** The build step: renders `pages()` into the shell, the start page into index.html, the others next to it. */
export function explainer(pages: () => Page[]): Plugin {
  return {
    name: "lernapps-explainer",
    enforce: "post",
    generateBundle(_options, bundle) {
      const index = bundle["index.html"];
      if (index === undefined || index.type !== "asset") throw new Error("the build has no index.html");
      const shell = String(index.source);
      if (!shell.includes(MARKER)) throw new Error(`index.html has no ${MARKER}: put it in <body>`);
      for (const page of pages()) {
        const html = fill(shell, page);
        if (page.path === "") index.source = html;
        else this.emitFile({ type: "asset", fileName: `${page.path}index.html`, source: html });
      }
    },
  };
}
