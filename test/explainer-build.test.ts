// The explainer's build, end to end through Vite, on the template's content and on the fixtures: one build writes
// every page in every language, each linking the one hashed client module and stylesheet that Vite builds from
// index.html at its own depth, with its language and the archetype marker; and llms.txt for each language tree.
import { cpSync, existsSync, mkdtempSync, readFileSync, readdirSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { describe, expect, test } from "vite-plus/test";
import { build } from "vite-plus";
import { explainer } from "../runtime/explainer/plugin.ts";
import { loadSite } from "../runtime/explainer/load.ts";
import { routes } from "../runtime/explainer/routes.ts";

/** An app with the content of `src`: index.html, src/main.ts with a stylesheet next to the app, and the content. */
function app(src: string): string {
  const root = mkdtempSync(join(tmpdir(), "explainer-build-"));
  cpSync(src, join(root, "src"), { recursive: true });
  writeFileSync(
    join(root, "index.html"),
    `<!doctype html>\n<html lang="de">\n  <head>\n    <meta charset="utf-8" />\n    <script type="module" src="/src/main.ts"></script>\n  </head>\n  <body>\n    <!-- explainer -->\n  </body>\n</html>\n`,
  );
  writeFileSync(join(root, "src/main.ts"), `import "../style.css";\ndocument.documentElement.dataset["js"] = "on";\n`);
  writeFileSync(join(root, "style.css"), "body { color: #1a1a1a; }\n");
  return root;
}

const contents: [string, string, number][] = [
  ["the template", join(import.meta.dirname, "../explainer/src"), 3],
  ["the all-blocks fixture", join(import.meta.dirname, "fixtures/explainer-all-blocks"), 4],
  ["the history fixture", join(import.meta.dirname, "fixtures/explainer-history"), 3],
];

describe("one build writes every page", () => {
  test.each(contents)(
    "%s",
    async (_name, src, count) => {
      const root = app(src);
      await build({ root, base: "./", logLevel: "silent", configFile: false, plugins: [explainer()] });
      const assets = readdirSync(join(root, "dist/assets"));
      const scripts = assets.filter((file) => file.endsWith(".js"));
      expect(scripts).toHaveLength(1);
      expect(scripts[0]).toMatch(/^index-[\w-]{8}\.js$/);
      expect(assets.filter((file) => file.endsWith(".css"))).toHaveLength(1);
      const all = routes(loadSite(root));
      expect(all.filter((route) => route.kind === "page" && route.lang === "de")).toHaveLength(count);
      for (const route of all) {
        const file = join(root, "dist", route.path, "index.html");
        const html = readFileSync(file, "utf8");
        expect(html).toContain(`<html lang="${route.lang}">`);
        expect(html).toContain(`<meta name="lernapps-archetype" content="explainer" />`);
        const src = /<script type="module" crossorigin src="([^"]+)"/.exec(html)?.[1] ?? "";
        expect(existsSync(join(dirname(file), src)), `${route.path}: ${src}`).toBe(true);
        const href = /<link rel="stylesheet" crossorigin href="([^"]+)"/.exec(html)?.[1] ?? "";
        expect(existsSync(join(dirname(file), href)), `${route.path}: ${href}`).toBe(true);
      }
      for (const lang of new Set(all.map((route) => route.lang))) {
        const llms = readFileSync(join(root, "dist", lang === "de" ? "" : lang, "llms.txt"), "utf8");
        for (const route of all.filter((candidate) => candidate.kind === "page" && candidate.lang === "de")) {
          expect(llms).toContain(`](${route.local})`);
        }
      }
    },
    60_000,
  );
});
