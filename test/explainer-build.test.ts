// The explainer's build, end to end through Vite, on the template's content and on the fixtures: one build writes
// every page in every language, each linking the one hashed client module and stylesheet that Vite builds from
// index.html at its own depth, with its language and the archetype marker, and an exercise on every content page (a
// generated one with three worked tasks); and llms.txt for each language tree. A page with a component also loads the
// islands module, which brings Vue; a page without one ships no Vue at all. Each language's page, complete without
// JavaScript, credits its images and quotes and links further reading in its own language.
import { cpSync, existsSync, mkdtempSync, readFileSync, readdirSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { describe, expect, test } from "vite-plus/test";
import { build } from "vite-plus";
import { explainer } from "../runtime/explainer/plugin.ts";
import { loadSite } from "../runtime/explainer/load.ts";
import { renderPage } from "../runtime/explainer/render.ts";
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

/** A string of Vue's runtime, in every build of it. */
const VUE = "Hydration completed but contains mismatches";

/** The scripts the page `file` loads, with every module they import statically, as paths. */
function shipped(file: string): string[] {
  const html = readFileSync(file, "utf8");
  const found = new Set<string>();
  const add = (path: string) => {
    if (found.has(path)) return;
    found.add(path);
    for (const [, url = ""] of readFileSync(path, "utf8").matchAll(/(?:import|from)\s*["'](\.\/[^"']+\.js)["']/g)) {
      add(join(dirname(path), url));
    }
  };
  for (const [, src = ""] of html.matchAll(/<script type="module" crossorigin src="([^"]+)"/g))
    add(join(dirname(file), src));
  for (const [, href = ""] of html.matchAll(/<link rel="modulepreload" crossorigin href="([^"]+)"/g)) {
    add(join(dirname(file), href));
  }
  return [...found];
}

// the content, the number of its pages in German, and the pages with a component
const contents: [string, string, number, string[]][] = [
  ["the template", join(import.meta.dirname, "../explainer/src"), 3, []],
  ["the all-blocks fixture", join(import.meta.dirname, "fixtures/explainer-all-blocks"), 4, []],
  [
    "the history fixture",
    join(import.meta.dirname, "fixtures/explainer-history"),
    3,
    ["revolution/staende/", "en/revolution/staende/"],
  ],
];

describe("one build writes every page", () => {
  test.each(contents)(
    "%s",
    async (_name, src, count, withComponents) => {
      const root = app(src);
      await build({ root, base: "./", logLevel: "silent", configFile: false, plugins: [explainer()] });
      const assets = readdirSync(join(root, "dist/assets"));
      const scripts = assets.filter((file) => file.endsWith(".js"));
      if (withComponents.length === 0) {
        expect(scripts).toHaveLength(1);
        expect(scripts[0]).toMatch(/^index-[\w-]{8}\.js$/);
      }
      expect(assets.filter((file) => file.endsWith(".css") && file.startsWith("index-"))).toHaveLength(1);
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
        // Vue only where there is a component: its markup rendered at build, hidden until it hydrates
        const vue = shipped(file).some((script) => readFileSync(script, "utf8").includes(VUE));
        expect(vue, `${route.path}: ships Vue`).toBe(withComponents.includes(route.path));
        if (withComponents.includes(route.path)) {
          expect(html).toMatch(/<div class="explainer-island" hidden><div class="assign-labels"[^>]*><svg /);
        }
        // every content page has an exercise; a generated one its three worked tasks, each with its "Lösung"
        if (route.kind === "page") expect(html, `${route.path}: an exercise`).toContain('class="explainer-exercise');
        for (const generated of html.split('class="explainer-exercise explainer-generated"').slice(1)) {
          const exercise = generated.split('class="explainer-exercise-data"')[0] ?? "";
          expect(exercise.split('class="explainer-worked-task"').length - 1).toBe(3);
          expect(exercise.split('<details class="explainer-solution">').length - 1).toBe(3);
        }
      }
      // each old address of app.yaml, in each language tree: a page that moves on to its new place and links it
      for (const [from, to] of Object.entries(loadSite(root).app.redirects ?? {})) {
        for (const lang of new Set(all.map((route) => route.lang))) {
          const at = `${lang === "de" ? "" : `${lang}/`}${from.slice(1)}`;
          const href = `${"../".repeat(at.split("/").length - 1)}${lang === "de" ? "" : `${lang}/`}${to.slice(1)}`;
          const html = readFileSync(join(root, "dist", at, "index.html"), "utf8");
          expect(html, `${at}: in its language`).toContain(`<html lang="${lang}">`);
          expect(html, `${at}: moves on`).toContain(`<meta http-equiv="refresh" content="0; url=${href}" />`);
          expect(html, `${at}: canonical`).toContain(`<link rel="canonical" href="${href}" />`);
          expect(html, `${at}: the link`).toContain(`<a href="${href}">`);
        }
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

test("each language's page has its own credits and the addresses of its links", () => {
  const site = loadSite(app(join(import.meta.dirname, "fixtures/explainer-all-blocks")));
  const page = (lang: string) => {
    const route = routes(site).find((candidate) => candidate.lang === lang && candidate.local === "formen/formen-01/");
    if (route === undefined) throw new Error(`no page formen/formen-01/ in ${lang}`);
    return renderPage(site, route).body;
  };
  const [de, en] = [page("de"), page("en")];
  expect(de).toContain("eigene Zeichnung");
  expect(de).toContain('href="https://de.wikipedia.org/wiki/Sechseck"');
  expect(en).toContain("own drawing");
  expect(en).toContain("Heraclitus, fragments");
  expect(en).toContain('href="https://en.wikipedia.org/wiki/Hexagon"');
  expect(en).not.toContain("eigene Zeichnung");
  expect(en).not.toContain("wikipedia.org/wiki/Sechseck");
});
