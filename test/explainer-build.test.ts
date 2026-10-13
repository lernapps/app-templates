// The explainer's build, end to end through Vite: one build writes every page, and every page links the one hashed
// client module and stylesheet that Vite builds from index.html, at its own depth.
import { existsSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { expect, test } from "vite-plus/test";
import { build } from "vite-plus";
import { explainer, type Page } from "../runtime/explainer/plugin.ts";

function app(): string {
  const root = mkdtempSync(join(tmpdir(), "explainer-build-"));
  const files: Record<string, string> = {
    "index.html": `<!doctype html>\n<html lang="de">\n  <head>\n    <meta charset="utf-8" />\n    <script type="module" src="/src/main.ts"></script>\n  </head>\n  <body>\n    <!-- explainer -->\n  </body>\n</html>\n`,
    "src/main.ts": `import "./style.css";\ndocument.documentElement.dataset["js"] = "on";\n`,
    "src/style.css": "body { color: #1a1a1a; }\n",
  };
  for (const [file, text] of Object.entries(files)) {
    mkdirSync(dirname(join(root, file)), { recursive: true });
    writeFileSync(join(root, file), text);
  }
  return root;
}

const pages: Page[] = [
  { path: "", title: "Start", body: "<h1>Start</h1>" },
  ...Array.from({ length: 60 }, (_, index) => ({
    path: `kapitel-${Math.floor(index / 10) + 1}/seite-${index + 1}/`,
    title: `Seite ${index + 1}`,
    body: `<h1>Seite ${index + 1}</h1>`,
  })),
];

test("one build writes 61 pages, each with the one hashed module and stylesheet at its depth", async () => {
  const root = app();
  await build({ root, base: "./", logLevel: "silent", configFile: false, plugins: [explainer(() => pages)] });
  const assets = readdirSync(join(root, "dist/assets"));
  const scripts = assets.filter((file) => file.endsWith(".js"));
  expect(scripts).toHaveLength(1);
  expect(scripts[0]).toMatch(/^index-[\w-]{8}\.js$/);
  expect(assets.filter((file) => file.endsWith(".css"))).toHaveLength(1);
  for (const page of pages) {
    const file = join(root, "dist", page.path, "index.html");
    const html = readFileSync(file, "utf8");
    expect(html).toContain(page.body);
    expect(html).toContain(`<title>${page.title}</title>`);
    const src = /<script type="module" crossorigin src="([^"]+)"/.exec(html)?.[1] ?? "";
    expect(existsSync(join(dirname(file), src)), `${page.path}: ${src}`).toBe(true);
    const href = /<link rel="stylesheet" crossorigin href="([^"]+)"/.exec(html)?.[1] ?? "";
    expect(existsSync(join(dirname(file), href)), `${page.path}: ${href}`).toBe(true);
  }
}, 30_000);
