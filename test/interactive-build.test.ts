// The interactive archetype's build, end to end through Vite, on the template (interactive/): one build checks the
// app's components and plays every playthrough against its core, then writes the start page, without any script,
// and the app page, which loads the client module, in each language, with the archetype marker, the routes as links
// and anchors, and 404.html. A bilingual app gets a page tree per language.
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { expect, test } from "vite-plus/test";
import { build } from "vite-plus";
import { interactive } from "../runtime/interactive/plugin.ts";
import { edit, interactiveApp, withDependency } from "./interactive-app.ts";

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
  // the heading line: the title as the h1, and the slot, hidden until an app fills it
  expect(app).toContain(
    '<div class="interactive-title"><h1>Buchstaben tippen</h1><div class="interactive-title-slot" hidden></div></div>',
  );
  expect(app.match(/<h1>/g)).toHaveLength(1);
  // one language: no header, and no link with the app's name anywhere in the frame (the title is the h1)
  for (const html of [start, app]) {
    expect(html).not.toContain("<header");
    expect(html).not.toContain("interactive-brand");
  }
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
  // two languages: a header with the language switch and nothing else
  expect(en).toMatch(/<header class="page-header"><nav class="page-languages"[^>]*><ul>.*<\/ul><\/nav><\/header>/);
  expect(en).not.toContain("interactive-brand");
  expect(en).toContain('<a href="../" hreflang="de" lang="de">Deutsch</a>');
  expect(en).toContain('<a class="interactive-start" href="../en/app/">Let\'s go</a>');
  const enApp = read(root, "en/app/index.html");
  expect(enApp).toContain('<li id="grundreihe"><a href="#grundreihe">Home row</a></li>');
  expect(existsSync(join(root, "dist/en/app", /src="([^"]+\.js)"/.exec(enApp)?.[1] ?? "-"))).toBe(true);
  expect(read(root, "app/index.html")).toContain('<a href="../en/app/" hreflang="en" lang="en">English</a>');
}, 60_000);

test("a component imports a library in the dependencies of package.json, and the build bundles it", async () => {
  const root = interactiveApp();
  withDependency(root);
  edit(
    root,
    "ui/App.vue",
    'import de from "../messages/de.json";\n',
    'import de from "../messages/de.json";\nimport { stringify } from "yaml";\n',
  );
  edit(
    root,
    "ui/App.vue",
    "const t = translator(de);\n",
    "const t = translator(de);\nconst lessonText = computed(() => stringify({ route: props.state.route }));\n",
  );
  edit(
    root,
    "ui/App.vue",
    '<p class="prompt">',
    '<p class="lesson" hidden>{{ lessonText }}</p>\n      <p class="prompt">',
  );
  await build({ root, base: "./", logLevel: "silent", configFile: false, plugins: [interactive()] });
  const app = read(root, "app/index.html");
  const script = /<script type="module" crossorigin src="([^"]+)"/.exec(app)?.[1] ?? "";
  // the library is in the app's own bundle, not loaded from elsewhere
  expect(readFileSync(join(root, "dist/app", script), "utf8")).not.toMatch(/from\s*["']yaml["']/);
}, 60_000);
