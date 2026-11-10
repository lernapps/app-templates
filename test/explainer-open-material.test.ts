// The material of an open task: content that helps to solve the task (a figure, a table, …), shown between the task
// and the answer as a question shows its material; checked like a question's; named on the tutor page.
import { cpSync, mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, test } from "vite-plus/test";
import { build } from "vite-plus";
import { check, loadSite } from "../runtime/explainer/load.ts";
import { explainer } from "../runtime/explainer/plugin.ts";
import { contentPages } from "../runtime/explainer/routes.ts";
import { tutorPageMarkdown } from "../runtime/explainer/tutorpage.ts";

const FIXTURE = join(import.meta.dirname, "fixtures/explainer-all-blocks");
const PAGE = "zahlen/zahlen-01.yaml";

/** A copy of the all-blocks fixture as an app: index.html, src/main.ts and the content in src/. */
function app(): string {
  const root = mkdtempSync(join(tmpdir(), "explainer-open-material-"));
  cpSync(FIXTURE, join(root, "src"), { recursive: true });
  writeFileSync(
    join(root, "index.html"),
    `<!doctype html>\n<html lang="de">\n  <head>\n    <meta charset="utf-8" />\n    <script type="module" src="/src/main.ts"></script>\n  </head>\n  <body>\n    <!-- explainer -->\n  </body>\n</html>\n`,
  );
  writeFileSync(join(root, "src/main.ts"), `document.documentElement.dataset["js"] = "on";\n`);
  return root;
}

/** Replaces `from` by `to` in the page of the app; `from` must be there. */
function edit(root: string, from: string, to: string): void {
  const path = join(root, "src", PAGE);
  const text = readFileSync(path, "utf8");
  if (!text.includes(from)) throw new Error(`${PAGE} has no ${JSON.stringify(from)}`);
  writeFileSync(path, text.replace(from, to));
}

describe("the material of an open task", () => {
  test("the page shows it between the task and the points, in the page's language, without JavaScript", async () => {
    const root = app();
    await build({ root, base: "./", logLevel: "silent", configFile: false, plugins: [explainer()] });
    for (const [path, alt] of [
      ["zahlen/zahlen-01/index.html", "Ein Umriss als Hilfe zur Aufgabe"],
      ["en/zahlen/zahlen-01/index.html", "An outline to help with the task"],
    ] as const) {
      const html = readFileSync(join(root, "dist", path), "utf8");
      const task = html.split('id="erklaeren"')[1]?.split('class="explainer-exercise-data"')[0] ?? "";
      const material = task.indexOf('<div class="question-material">');
      expect(material, path).toBeGreaterThan(task.indexOf("explainer-open-task-text"));
      expect(material, path).toBeLessThan(task.indexOf("explainer-open-points"));
      expect(task, path).toContain(alt);
    }
  }, 60_000);

  test("an open task without material renders as before", async () => {
    const root = app();
    edit(
      root,
      /        material:\n          - type: figure\n            image: images\/umriss.svg[^]*?licence: CC0-1.0\n/.exec(
        readFileSync(join(root, "src", PAGE), "utf8"),
      )?.[0] ?? "",
      "",
    );
    await build({ root, base: "./", logLevel: "silent", configFile: false, plugins: [explainer()] });
    const html = readFileSync(join(root, "dist/zahlen/zahlen-01/index.html"), "utf8");
    const task = html.split('id="erklaeren"')[1]?.split('class="explainer-exercise-data"')[0] ?? "";
    expect(task).not.toContain("question-material");
  }, 60_000);

  test("its figure is checked like a question's: no alternative text is a problem with its place", () => {
    const root = app();
    edit(
      root,
      '            alt: { de: "Ein Umriss als Hilfe zur Aufgabe", en: "An outline to help with the task" }\n',
      "",
    );
    const { problems } = check(root, 0);
    expect(problems.join("\n")).toMatch(/zahlen-01\.yaml.*material/);
  });

  test("a block that is no material, such as a section, is not allowed", () => {
    const root = app();
    edit(
      root,
      "          - type: figure\n            image: images/umriss.svg",
      "          - type: section\n            image: images/umriss.svg",
    );
    expect(check(root, 0).problems.join("\n")).toMatch(/zahlen-01\.yaml/);
  });

  test("the tutor page names the figure by its alternative text and caption", () => {
    const site = loadSite(app(), 0);
    const page = contentPages(site).find((candidate) => candidate.chapter === "zahlen" && candidate.id === "zahlen-01");
    if (page === undefined) throw new Error("no page zahlen/zahlen-01");
    const text = tutorPageMarkdown(site, page, "de", new Map());
    const task = text.split("### Übung erklaeren")[1] ?? "";
    expect(task).toContain("Ein Umriss als Hilfe zur Aufgabe");
    expect(task).toContain("Der Umriss hilft beim Erklären.");
  });
});

describe("the material of a language task", () => {
  test("it stands in the same container as a question's and an open task's material", async () => {
    const root = mkdtempSync(join(tmpdir(), "explainer-language-material-"));
    cpSync(join(import.meta.dirname, "../explainer/examples/franzoesisch/src"), join(root, "src"), { recursive: true });
    writeFileSync(
      join(root, "index.html"),
      `<!doctype html>\n<html lang="de">\n  <head>\n    <meta charset="utf-8" />\n    <script type="module" src="/src/main.ts"></script>\n  </head>\n  <body>\n    <!-- explainer -->\n  </body>\n</html>\n`,
    );
    writeFileSync(join(root, "src/main.ts"), `document.documentElement.dataset["js"] = "on";\n`);
    await build({ root, base: "./", logLevel: "silent", configFile: false, plugins: [explainer()] });
    const html = readFileSync(join(root, "dist/bonjour/a-table/index.html"), "utf8");
    const task = html.split('id="tisch-beschriften"')[1]?.split('class="explainer-exercise-data"')[0] ?? "";
    expect(task).toContain('<div class="question-material">');
  }, 60_000);
});
