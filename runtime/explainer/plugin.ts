// The build step of an explainer (@lernapps/app-templates/explainer/plugin), a Vite plugin. An app's vite.config.ts
// adds it to the shared preset of @lernapps/tooling:
//
//   import { lernapps } from "@lernapps/tooling/preset";
//   import { explainer } from "@lernapps/app-templates/explainer/plugin";
//   export default lernapps({ plugins: [explainer()] });
//
// It reads the content in src/ (load.ts) and fails the build with one line per problem. index.html is Vite's only
// entry: Vite builds the one hashed client module (src/main.ts) and stylesheet from it. The built index.html is then
// the shell of every page: each page is the shell with its language, its head and its body where it says
// <!-- explainer -->, written into its folder, with the shell's relative asset URLs (./assets/…) rewritten for its
// depth. The bundled images go to images/, llms.txt to the root of each language tree. `vp dev` serves the same
// pages, rendered on each request.
import { readFileSync } from "node:fs";
import { join } from "node:path";
import type { Plugin } from "vite-plus";
import type { Site } from "./content.ts";
import { loadSite } from "./load.ts";
import { llmsTxt, renderSite, type RenderedPage } from "./render.ts";
import { languageRoot } from "./routes.ts";

const MARKER = "<!-- explainer -->";

/** The shell's relative URLs (./assets/…, built by Vite with base "./"), from a page at `path`. */
export function fromDepth(html: string, path: string): string {
  const up = "../".repeat(path.split("/").filter((part) => part !== "").length);
  return html.replace(/((?:src|href)=")\.\/(?!\/)/g, `$1${up === "" ? "./" : up}`);
}

/** The shell with the page in it. */
export function fill(shell: string, page: RenderedPage): string {
  if (!shell.includes(MARKER)) throw new Error(`index.html has no ${MARKER}: put it in <body>, where the pages go`);
  const html = shell
    .replace(/<html([^>]*?)\slang="[^"]*"/, "<html$1")
    .replace("<html", `<html lang="${page.route.lang}"`)
    .replace(/\s*<title>[\s\S]*?<\/title>/, "")
    .replace("</head>", `  ${page.head}\n  </head>`);
  return fromDepth(html, page.route.path).replace(MARKER, () => page.body);
}

/** The build step of an explainer: validates the content in src/ and writes every page. */
export function explainer(): Plugin {
  let root = process.cwd();
  let site: Site | undefined;
  const load = () => (site ??= loadSite(root));
  return {
    name: "lernapps-explainer",
    enforce: "post",
    configResolved(config) {
      root = config.root;
    },
    buildStart() {
      site = undefined;
      try {
        load();
      } catch (error) {
        this.error(error instanceof Error ? error.message : String(error));
      }
    },
    generateBundle(_options, bundle) {
      const index = bundle["index.html"];
      if (index === undefined || index.type !== "asset") return;
      const shell = String(index.source);
      const content = load();
      for (const page of renderSite(content)) {
        const html = fill(shell, page);
        if (page.route.path === "") index.source = html;
        else this.emitFile({ type: "asset", fileName: `${page.route.path}index.html`, source: html });
      }
      for (const [image, file] of content.images) {
        this.emitFile({ type: "asset", fileName: image, source: readFileSync(file) });
      }
      for (const lang of content.app.languages) {
        this.emitFile({ type: "asset", fileName: `${languageRoot(lang)}llms.txt`, source: llmsTxt(content, lang) });
      }
    },
    configureServer(server) {
      server.watcher.on("all", (_event, file) => {
        if (file.startsWith(join(root, "src")) && !file.endsWith(".ts")) {
          site = undefined;
          server.ws.send({ type: "full-reload" });
        }
      });
      // before Vite's own fallback to index.html
      server.middlewares.use((request, response, next) => {
        const url = new URL(request.url ?? "/", "http://localhost");
        const path = decodeURIComponent(url.pathname).replace(/^\//, "");
        if (path.startsWith("images/")) {
          response.setHeader("content-type", path.endsWith(".svg") ? "image/svg+xml" : "application/octet-stream");
          response.end(readFileSync(join(root, "src", path)));
          return;
        }
        if (!(path === "" || path.endsWith("/"))) return next();
        let content: Site;
        try {
          content = load();
        } catch (error) {
          response.statusCode = 500;
          response.setHeader("content-type", "text/plain; charset=utf-8");
          response.end(error instanceof Error ? error.message : String(error));
          return;
        }
        const page = renderSite(content).find((candidate) => candidate.route.path === path);
        if (page === undefined) return next();
        const shell = readFileSync(join(root, "index.html"), "utf8");
        server
          .transformIndexHtml(`/${path}`, fill(shell, { ...page, route: { ...page.route, path: "" } }))
          .then((html) => {
            response.setHeader("content-type", "text/html; charset=utf-8");
            response.end(html);
          })
          .catch(next);
      });
    },
  };
}
