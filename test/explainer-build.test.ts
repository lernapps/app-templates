// The explainer's build, end to end through Vite, on the template's content and on the fixtures: one build writes
// every page in every language, each linking the one hashed client module and stylesheet that Vite builds from
// index.html at its own depth, with its language and the archetype marker, and an exercise on every content page (a
// generated one with three worked tasks); and the tutor page of each content page, with no llms.txt, tutor file or
// task file beside it. A page with a component also loads the
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
import { notFoundPage } from "../runtime/shared/pages.ts";
import { runInNewContext } from "node:vm";

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

/** An exercise component of a content: the pages it is on, and what each shows of it, by language. */
interface ComponentPages {
  pages: string[];
  /** The self-assessments that ask it: with its island, in a <template> until the client module runs. */
  assessments: string[];
  /** Its markup, rendered at build. */
  island: RegExp;
  /** Its anchor and the seeds of its numbers, as the page starts them. */
  component: string;
  /** Without JavaScript: a part of the task of number 1, and its solution folded, by language. */
  task: Record<string, string>;
  solution: RegExp;
}

// the content, the number of its pages in German, and its exercise component
const contents: [string, string, number, ComponentPages | undefined][] = [
  [
    "the template",
    join(import.meta.dirname, "../explainer/src"),
    3,
    {
      pages: ["prozent/prozentwert/"],
      assessments: ["einschaetzung/"],
      island: /<div class="explainer-island" hidden><div class="prozent-feld"[^>]*><p[^>]*>Das Feld hat 40 Kästchen/,
      component:
        '<div class="explainer-component" id="prozentfeld" data-component="ProzentFeld" data-exercise data-seeds="[1,2,4,',
      task: { de: "Färbe 5 % davon." },
      solution: /<details class="explainer-solution"><summary>[^<]+<\/summary><p>2 Kästchen: /,
    },
  ],
  ["the all-blocks fixture", join(import.meta.dirname, "fixtures/explainer-all-blocks"), 4, undefined],
  [
    "the history fixture",
    join(import.meta.dirname, "fixtures/explainer-history"),
    3,
    {
      pages: ["revolution/staende/", "en/revolution/staende/"],
      assessments: [],
      island: /<div class="explainer-island" hidden><div class="assign-labels"[^>]*><svg /,
      component:
        '<div class="explainer-component" id="assign-labels" data-component="AssignLabels" data-exercise data-seeds="[1,2,5,7,10]" data-checked>',
      task: { de: "Zur Wahl stehen, in dieser Reihenfolge:", en: "The choices, in this order:" },
      solution: /<details class="explainer-solution"><summary>[^<]+<\/summary><p>(Stufe|Level) 1: /,
    },
  ],
];

describe("one build writes every page", () => {
  test.each(contents)(
    "%s",
    async (_name, src, count, component) => {
      const withComponents = component?.pages ?? [];
      const root = app(src);
      await build({ root, base: "./", logLevel: "silent", configFile: false, plugins: [explainer()] });
      const assets = readdirSync(join(root, "dist/assets"));
      const scripts = assets.filter((file) => file.endsWith(".js"));
      if (withComponents.length === 0) {
        expect(scripts).toHaveLength(1);
        expect(scripts[0]).toMatch(/^index-[\w-]{8}\.js$/);
      }
      expect(assets.filter((file) => file.endsWith(".css") && file.startsWith("index-"))).toHaveLength(1);
      const site = loadSite(root);
      const all = routes(site);
      expect(all.filter((route) => route.kind === "page" && route.lang === "de")).toHaveLength(count);
      for (const route of all) {
        const file = join(root, "dist", route.path, "index.html");
        const html = readFileSync(file, "utf8");
        expect(html).toContain(`<html lang="${route.lang}">`);
        expect(html).toContain(`<meta name="lernapps-archetype" content="explainer" />`);
        // an exercise's examples are test cases for the build: never on the page
        expect(html, `${route.path}: examples`).not.toContain('"examples"');
        const src = /<script type="module" crossorigin src="([^"]+)"/.exec(html)?.[1] ?? "";
        expect(existsSync(join(dirname(file), src)), `${route.path}: ${src}`).toBe(true);
        const href = /<link rel="stylesheet" crossorigin href="([^"]+)"/.exec(html)?.[1] ?? "";
        expect(existsSync(join(dirname(file), href)), `${route.path}: ${href}`).toBe(true);
        // Vue only where there is a component: its markup rendered at build, hidden until it hydrates
        const vue = shipped(file).some((script) => readFileSync(script, "utf8").includes(VUE));
        const asking = component?.assessments.includes(route.path) ?? false;
        expect(vue, `${route.path}: ships Vue`).toBe(withComponents.includes(route.path) || asking);
        if (component !== undefined && asking) {
          expect(html).toMatch(component.island);
          expect(html).toContain('data-component="ProzentFeld" data-exercise data-assessment data-seeds="[1,2,4,');
        }
        if (component !== undefined && withComponents.includes(route.path)) {
          expect(html).toMatch(component.island);
          // in a form with the explainer's "Prüfen", hidden and disabled until it hydrates and there is an answer
          expect(html).toContain(
            '<form class="explainer-component-form" novalidate><div class="explainer-island" hidden>',
          );
          expect(html).toMatch(
            /<\/div><p class="question-actions" hidden><button type="submit" class="question-check" disabled>(Prüfen|Check)<\/button><\/p><\/form>/,
          );
          // an exercise component: its anchor, its task number with "Neue Aufgabe" for JavaScript, and without it
          // the task of number 1 as its describe states it, with the solution folded
          expect(html).toContain(component.component);
          expect(html).toMatch(
            /<p class="explainer-task-controls" hidden><span class="explainer-task-number"[^>]*>(Aufgabe Nr\.|Task no\.) 1<\/span>/,
          );
          const nojs = html.split('<div class="explainer-nojs">')[1]?.split('<p class="question-feedback"')[0] ?? "";
          expect(nojs).toContain(route.lang === "de" ? "Aufgabe Nr. 1" : "Task no. 1");
          expect(nojs).toContain(component.task[route.lang]);
          expect(nojs).toMatch(component.solution);
        }
        // every content page has an exercise; a generated one its three worked tasks, each with its "Lösung"
        if (route.kind === "page") expect(html, `${route.path}: an exercise`).toContain('class="explainer-exercise');
        for (const generated of html.split('class="explainer-exercise explainer-generated"').slice(1)) {
          const exercise = generated.split('class="explainer-exercise-data"')[0] ?? "";
          expect(exercise.split('class="explainer-worked-task"').length - 1).toBe(3);
          expect(exercise).toMatch(/<p class="explainer-task-number">(Aufgabe Nr\.|Task no\.) 3<\/p>/);
          expect(exercise.split('<details class="explainer-solution">').length - 1).toBe(3);
        }
      }
      // every address the app does not have: 404.html at the root, not indexed, with a link to the start page
      const missing = readFileSync(join(root, "dist", "404.html"), "utf8");
      expect(missing).toContain('<meta name="robots" content="noindex" />');
      expect(missing).toContain('<a id="start" href="/">');
      for (const lang of new Set(all.map((route) => route.lang))) {
        // no llms.txt: the tutor page and the pages themselves are what an assistant reads
        expect(existsSync(join(root, "dist", lang === "de" ? "" : lang, "llms.txt")), "no llms.txt").toBe(false);
        for (const route of all.filter((candidate) => candidate.kind === "page" && candidate.lang === "de")) {
          const tree = join(root, "dist", lang === "de" ? "" : lang);
          // no tutor file, no task files: the tutor page is the one source of what a tutor gets
          expect(existsSync(join(tree, route.local, "tutor.md")), `${route.local}tutor.md`).toBe(false);
          expect(existsSync(join(tree, route.local, "aufgaben")), `${route.local}aufgaben/`).toBe(false);
        }
        expect(existsSync(join(root, "dist", lang === "de" ? "" : lang, "tutor.md")), "no tutor prompt").toBe(false);
        // the tutor page of each content page: lean HTML in the page's folder, linked from the page
        for (const chapter of site.chapters) {
          const tree = join(root, "dist", lang === "de" ? "" : lang);
          expect(existsSync(join(tree, chapter.id, "tutor")), "no tutor page per chapter").toBe(false);
          for (const { id } of chapter.pages) {
            const page = readFileSync(join(tree, chapter.id, id, "tutor", "index.html"), "utf8");
            expect(page).toMatch(new RegExp(`^<!doctype html>\\n<html lang="${lang}">`));
            expect(page).not.toContain("<script");
            // its Markdown beside it, for copying
            const markdown = readFileSync(join(tree, chapter.id, id, "tutor", "index.md"), "utf8");
            expect(markdown).toMatch(/^# .+ – (für deinen KI-Tutor|for your AI tutor)\n/);
            const html = readFileSync(join(tree, chapter.id, id, "index.html"), "utf8");
            const up = lang === "de" ? "../../" : `../../../${lang}/`;
            expect(html).toContain(`<a class="explainer-tutor-guide" href="${up}${chapter.id}/${id}/tutor/">`);
            // way A at the top: beside the page's title, in one row with it, inside main; folded until an assistant is on, its name
            // the summary; then a bar with one button
            expect(html).toMatch(
              /<main[^>]*>\n<div class="explainer-title-row">\n<h1>[^<]*<\/h1>\n<div class="explainer-tutor explainer-tutor-page">\n<details class="explainer-tutor-off">\n<summary>(Mit einem KI-Tutor lernen|Learn with an AI tutor)<\/summary>/,
            );
            expect(html).toMatch(
              /<p class="explainer-tutor-bar" hidden><button type="button" class="explainer-tutor-go">/,
            );
            // that the learner uses an account of their own, and the assistant is no offer of lernapps.net
            expect(html).toContain(lang === "de" ? "kein Angebot von lernapps.net" : "not offered by lernapps.net");
            expect(html.indexOf("explainer-tutor-page"), "not after main").toBeLessThan(html.indexOf("</main>"));
            // the way to the tutor: a select of the assistants, Claude, ChatGPT and Mistral Vibe, copying last, "Einschalten"
            expect(html).toContain('<select class="explainer-tutor-select"');
            expect(html).toMatch(
              /<option value="Claude">Claude<\/option><option value="ChatGPT">ChatGPT<\/option><option value="Mistral Vibe" data-hint="[^"]*">Mistral Vibe<\/option><option value="copy">/,
            );
            expect(html).toContain('<button type="button" class="explainer-tutor-on">');
            expect(html).not.toContain("explainer-tutor-text");
          }
          // a chapter page starts no tutor: that is each page's
          if (existsSync(join(tree, chapter.id, "index.html"))) {
            expect(readFileSync(join(tree, chapter.id, "index.html"), "utf8")).not.toContain("explainer-tutor");
          }
        }
        const start = readFileSync(join(root, "dist", lang === "de" ? "" : lang, "index.html"), "utf8");
        // the start page says what the tutor is and where to start it, and starts none itself
        expect(start).toMatch(
          /<section class="explainer-tutor-about" aria-labelledby="ki-tutor">\n<h2 id="ki-tutor">(Mit einem KI-Tutor lernen|Learn with an AI tutor)<\/h2>/,
        );
        expect(start).not.toMatch(/explainer-tutor-(prompt|select|go|provider)/);
        // the choice of the assistant, "Keiner" first, shown once the client module runs
        expect(start).toMatch(
          /<p class="explainer-tutor-choice" hidden><label>[^<]+ <select class="explainer-tutor-choose" data-storage="[^"]+"><option value="">(Keiner|None)<\/option><option value="Claude">/,
        );
        expect(start).toContain(lang === "de" ? "kein Angebot von lernapps.net" : "not offered by lernapps.net");
        // the needs for the tutor in a dialog that "Einstellungen" beside the assistant opens (dec-tutor-needs)
        expect(start).toContain('<button type="button" class="explainer-tutor-needs-open" aria-haspopup="dialog">');
        expect(start).toMatch(
          /<dialog class="explainer-tutor-needs" data-storage="[^"]+" aria-labelledby="bedarf-titel">/,
        );
        expect(start).toContain('<input type="checkbox" class="explainer-tutor-need" id="bedarf-kurze-schritte" value="kurze-schritte"');
        expect(start).toContain('<select class="explainer-tutor-language">');
        expect(start).toContain('name="bedarf-gilt" value="archetype"');
        // the header holds the language switch and nothing else (no link with the app's name), and an app with one
        // language has none
        expect(start).not.toContain("explainer-brand");
        if (site.app.languages.length > 1) {
          expect(start).toMatch(/<header class="page-header"><nav class="page-languages"/);
        } else expect(start).not.toContain("<header");
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

describe("404.html finds the app's root from any missing address and moves on to it", () => {
  /** Runs the page's script at `path` on a server that has 404.html in `roots`; where it moves on to, if anywhere. */
  async function movesTo(path: string, roots: readonly string[]): Promise<string | undefined> {
    const script = /<script>([\s\S]*)<\/script>/.exec(notFoundPage())?.[1] ?? "";
    const elements = { start: { href: "/", textContent: "" }, weiter: { hidden: true } };
    let target: string | undefined;
    const fetch = (url: string) => Promise.resolve({ ok: roots.some((root) => url === `${root}404.html`) });
    const location = { pathname: path, replace: (url: string) => (target = url) };
    const document = { getElementById: (id: "start" | "weiter") => elements[id] };
    await runInNewContext(script, { fetch, location, document });
    if (target !== undefined) expect(elements.start.href).toBe(target);
    return target;
  }

  test.each([
    ["/elektrizitaet/strom/alt/", ["/", "/elektrizitaet/"], "/elektrizitaet/"],
    ["/elektrizitaet/strom", ["/", "/elektrizitaet/"], "/elektrizitaet/"],
    [
      "/elektrizitaet/pr-preview/pr-12/strom/alt/",
      ["/", "/elektrizitaet/", "/elektrizitaet/pr-preview/pr-12/"],
      "/elektrizitaet/pr-preview/pr-12/",
    ],
    ["/elektrizitaet/pr-preview/pr-13/strom/", ["/", "/elektrizitaet/"], "/elektrizitaet/"],
    ["/strom/alt/", ["/"], "/"],
  ])("%s: to %s", async (path, roots, root) => {
    expect(await movesTo(path, roots)).toBe(root);
  });

  test("not when the root itself is missing, nor without any root", async () => {
    expect(await movesTo("/elektrizitaet/", ["/elektrizitaet/"])).toBeUndefined();
    expect(await movesTo("/a/b/", [])).toBeUndefined();
  });
});

test("the tutor section of a page gives the root of its language tree as the base of the prompt's links", () => {
  const site = loadSite(app(join(import.meta.dirname, "fixtures/explainer-all-blocks")));
  const rootOf = (lang: string, local: string) => {
    const route = routes(site).find((candidate) => candidate.lang === lang && candidate.local === local);
    if (route === undefined) throw new Error(`no page ${local} in ${lang}`);
    const body = renderPage(site, route).body;
    const data = /<script type="application\/json" class="explainer-tutor-prompt">(.*?)<\/script>/s.exec(body)?.[1];
    if (data === undefined) throw new Error(`no tutor section on ${local} in ${lang}`);
    const json = JSON.parse(data.replace(/\\u003c/g, "<")) as { root: string };
    // where the browser puts the prompt's links, from the page's own address
    return new URL(json.root, `https://app.example/${route.path}`).pathname;
  };
  expect(rootOf("de", "zahlen/zahlen-01/")).toBe("/");
  expect(rootOf("de", "formen/formen-01/")).toBe("/");
  expect(rootOf("en", "zahlen/zahlen-01/")).toBe("/en/");
  expect(rootOf("en", "formen/formen-01/")).toBe("/en/");
});
