// The interactive archetype's build, end to end through Vite, on the template (interactive/): one build checks the
// app's components and plays every playthrough against its core, then writes the start page, without any script,
// and the app page, which loads the client module, in each language, with the archetype marker, the routes as links
// and anchors, and 404.html. A bilingual app gets a page tree per language.
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { expect, test } from "vite-plus/test";
import { build } from "vite-plus";
import { interactive } from "../runtime/interactive/plugin.ts";
import { interactiveApp } from "./interactive-app.ts";

const read = (root: string, file: string) => readFileSync(join(root, "dist", file), "utf8");

test("the template builds: a start page without script, and the app page with the client module", async () => {
  const root = interactiveApp();
  await build({ root, base: "./", logLevel: "silent", configFile: false, plugins: [interactive()] });
  const start = read(root, "index.html");
  expect(start).toContain('<html lang="de">');
  expect(start).toContain('<meta name="lernapps-archetype" content="interactive" />');
  expect(start).toContain("<title>Buchstaben tippen</title>");
  expect(start).toContain("<h1>Buchstaben tippen</h1>");
  expect(start).toContain('<noscript><p class="interactive-noscript">');
  expect(start).toContain('<a class="interactive-start" href="app/">');
  expect(start).toContain('<a href="app/#grundreihe">Grundreihe</a>');
  expect(start).toContain('<h2 id="zehn-finger">Warum die Grundreihe?</h2>');
  expect(start).toContain("<li>Ich kann die Buchstaben der Grundreihe auf der Tastatur finden.</li>");
  expect(start).not.toContain("<script");
  expect(start).not.toContain("modulepreload");
  const app = read(root, "app/index.html");
  expect(app).toContain('<li id="grundreihe"><a href="#grundreihe">Grundreihe</a></li>');
  expect(app).toContain('<div class="interactive-app" data-routes="[&quot;grundreihe&quot;,&quot;obere-reihe&quot;]">');
  expect(app).toContain('<a href="../">Zur Startseite</a>');
  // the client module and the stylesheet, at the page's depth
  const script = /<script type="module" crossorigin src="([^"]+)"/.exec(app)?.[1] ?? "";
  expect(script).toMatch(/^\.\.\/assets\/index-[\w-]+\.js$/);
  expect(existsSync(join(root, "dist/app", script))).toBe(true);
  for (const [page, html] of [
    ["", start],
    ["app/", app],
  ] as const) {
    const href = /<link rel="stylesheet" crossorigin href="([^"]+)"/.exec(html)?.[1] ?? "";
    expect(existsSync(join(root, "dist", page, href)), `${page}: ${href}`).toBe(true);
  }
  expect(read(root, "404.html")).toContain('<meta name="robots" content="noindex" />');
}, 60_000);

test("a bilingual app: German at the root, English below en/, each with its language and a switch", async () => {
  const root = interactiveApp();
  writeFileSync(
    join(root, "src/app.yaml"),
    [
      "title: { de: Buchstaben tippen, en: Typing letters }",
      "description: { de: Du tippst Buchstaben., en: You type letters. }",
      "howto: { de: Tippe den Buchstaben., en: Type the letter. }",
      "competencies: [{ de: Ich kann tippen., en: I can type. }]",
      "languages: [de, en]",
      "routes:",
      "  - { id: grundreihe, title: { de: Grundreihe, en: Home row } }",
      "  - { id: obere-reihe, title: { de: Obere Reihe, en: Top row } }",
      "",
    ].join("\n"),
  );
  await build({ root, base: "./", logLevel: "silent", configFile: false, plugins: [interactive()] });
  const en = read(root, "en/index.html");
  expect(en).toContain('<html lang="en">');
  expect(en).toContain("<h1>Typing letters</h1>");
  expect(en).toContain('<link rel="alternate" hreflang="de" href="../" />');
  expect(en).toContain('<a href="../" hreflang="de" lang="de">Deutsch</a>');
  expect(en).toContain('<a class="interactive-start" href="../en/app/">Let\'s go</a>');
  const enApp = read(root, "en/app/index.html");
  expect(enApp).toContain('<li id="grundreihe"><a href="#grundreihe">Home row</a></li>');
  expect(existsSync(join(root, "dist/en/app", /src="([^"]+\.js)"/.exec(enApp)?.[1] ?? "-"))).toBe(true);
  expect(read(root, "app/index.html")).toContain('<a href="../en/app/" hreflang="en" lang="en">English</a>');
}, 60_000);
