// A dictation and a listening task of an explainer (language-task with `audio`; dec-audio-player): an item starts from an
// audio file of src/audio/ in place of the other side. The page writes the browser's player with the label of an AI
// voice and the buttons for the tempo; the check of the answers is the one of every language task. The build stops when
// the file is missing, is spoken in another language than the target, or says what no answer is, since then nobody
// could solve the task. The example of a French explainer is the app; its files are made by the audio skill.
import { cpSync, mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, test } from "vite-plus/test";
import { ContentError, loadSite } from "../runtime/explainer/load.ts";
import { renderPage } from "../runtime/explainer/render.ts";
import { routes } from "../runtime/explainer/routes.ts";
import { allBlocks } from "../runtime/explainer/content.ts";
import { audioOf } from "../runtime/explainer/media.ts";
import { tutorPageMarkdown } from "../runtime/explainer/tutorpage.ts";

const here = import.meta.dirname;
const PAGE = "src/bonjour/se-presenter.yaml";

const FIRST = `- audio: je-mappelle.mp3
            target: "Je m'appelle Marie."`;

/** The French example, which has a section of tasks that start from audio, with its page's text changed by `change`. */
function app(from?: string, to?: string): string {
  const root = mkdtempSync(join(tmpdir(), "explainer-dictation-"));
  cpSync(join(here, "../explainer/examples/franzoesisch/src"), join(root, "src"), { recursive: true });
  if (from !== undefined && to !== undefined) {
    const page = readFileSync(join(root, PAGE), "utf8");
    if (!page.includes(from)) throw new Error(`the page has no "${from}"`);
    writeFileSync(join(root, PAGE), page.replace(from, to));
  }
  return root;
}

const problemsOf = (root: string): readonly string[] => {
  try {
    loadSite(root, 0);
  } catch (error) {
    if (error instanceof ContentError) return error.problems;
    throw error;
  }
  return [];
};

const pageBody = (root: string): string => {
  const site = loadSite(root, 0);
  const route = routes(site).find((candidate) => candidate.path === "bonjour/se-presenter/");
  if (route === undefined) throw new Error("no page");
  return renderPage(site, route).body;
};

describe("a task that starts from audio", () => {
  test("is a valid language task", () => {
    expect(problemsOf(app())).toEqual([]);
  });

  test("the page has the player, the label of an AI voice and the tempo buttons, loading nothing before a click", () => {
    const html = pageBody(app());
    const task =
      /<div class="explainer-exercise explainer-language-task" id="diktat">[\s\S]*?<\/ol>/.exec(html)?.[0] ?? "";
    expect(task).toContain(
      '<audio controls preload="none" src="../../audio/je-mappelle.mp3" aria-label="Audio abspielen">',
    );
    expect(task).toMatch(
      /<span class="explainer-ai-voice" tabindex="0" role="note" data-info="KI-Stimme\. Modell kokoro-v1\.0, Stimme ff_siwis\. Erzeugt am \d{4}-\d{2}-\d{2}\. Lizenz: CC BY-SA 4\.0\. Namensnennung: SIWIS[^"]*" aria-label="KI-Stimme\.[^"]*">KI<\/span>/,
    );
    expect(task).toMatch(/data-speed="0\.75"[^>]*>0,75×</);
    expect(task).toMatch(/data-speed="1" aria-pressed="true">1×</);
    expect(task).toMatch(/data-speed="1\.25"[^>]*>1,25×</);
    expect(task).toContain("Hör zu und schreibe den Satz auf Französisch auf.");
  });

  test("a translation of what is heard says so, and the answer is in the other language", () => {
    const html = pageBody(app());
    const task = /id="hoeren-verstehen"[\s\S]*?<\/ol>/.exec(html)?.[0] ?? "";
    expect(task).toContain("Hör zu und schreibe auf Deutsch, was gesagt wird.");
  });

  test("the solution without JavaScript is the text that is heard", () => {
    const html = pageBody(app());
    const solution =
      /id="diktat"[\s\S]*?<details class="explainer-solution">([\s\S]*?)<\/details>/.exec(html)?.[1] ?? "";
    expect(solution).toContain("Je m'appelle Marie.");
  });

  test("the tutor page says that the learner hears a file the tutor cannot play", () => {
    const site = loadSite(app(), 0);
    const page = site.chapters[0]?.pages.find((candidate) => candidate.id === "se-presenter");
    if (page === undefined) throw new Error("no page");
    const text = tutorPageMarkdown(site, page, "de", new Map());
    expect(text).toContain("Du kannst sie nicht abspielen");
    expect(text).toContain("Audio → Je m'appelle Marie.");
  });

  test("the media overview names the page that uses the file", () => {
    const site = loadSite(app(), 0);
    const route = routes(site).find((candidate) => candidate.kind === "media");
    if (route === undefined) throw new Error("no media page");
    const html = renderPage(site, route).body;
    expect(html).toMatch(/Verwendet auf: <a href="\.\.\/bonjour\/se-presenter\/">Sich vorstellen<\/a>/);
  });
});

describe("what the build reports about audio in a task", () => {
  const withChange = app;

  test("a file that is not in src/audio/", () => {
    const problems = problemsOf(withChange(FIRST, FIRST.replace("je-mappelle.mp3", "absent.mp3")));
    expect(problems).toHaveLength(1);
    expect(problems[0]).toMatch(
      /^src\/bonjour\/se-presenter\.yaml:\d+: .*audio\/absent\.mp3 is missing: put the file into src\/audio\//,
    );
  });

  test("a file in another language than the task's target", () => {
    const problems = problemsOf(
      withChange(
        "id: diktat\n        languages: { source: de, target: fr }",
        "id: diktat\n        languages: { source: de, target: en }",
      ),
    );
    expect(problems.join("\n")).toMatch(
      /audio\/je-mappelle\.mp3 is spoken in fra \(TLAN\), but the task's language en is eng/,
    );
  });

  test("a text that is no version of the answer", () => {
    const problems = problemsOf(withChange(FIRST, FIRST.replace("Marie", "Paul")));
    expect(problems).toHaveLength(1);
    expect(problems[0]).toContain('the text of audio/je-mappelle.mp3 is "Je m\'appelle Marie."');
  });

  test("audio and a cue together", () => {
    const problems = problemsOf(withChange(FIRST, FIRST.replace("target:", `cue: "s'appeler"\n            target:`)));
    expect(problems.join("\n")).toContain("give exactly one thing to start from");
  });

  test("a name that is no file name", () => {
    const problems = problemsOf(withChange(FIRST, FIRST.replace("je-mappelle.mp3", "../je.mp3")));
    expect(problems.length).toBeGreaterThan(0);
  });
});

describe("the French example", () => {
  test("has audio tasks of every kind: write, gap and choice, both directions, and speaking, with both voices", () => {
    const site = loadSite(app(), 0);
    const kinds = new Set<string>();
    const voices = new Set<string>();
    for (const chapter of site.chapters)
      for (const page of chapter.pages)
        for (const block of allBlocks(page.blocks)) {
          for (const name of audioOf(block)) voices.add(site.audio.get(name)?.meta.voice ?? "");
          if (block.type === "language-task" && audioOf(block).length > 0) {
            kinds.add(`${block.mode ?? "write"} ${block.direction ?? "to-target"}`);
          } else if (block.type === "speaking-task") kinds.add("speaking");
        }
    expect([...kinds].sort()).toEqual([
      "choice to-target",
      "gap to-target",
      "speaking",
      "write to-source",
      "write to-target",
    ]);
    expect([...voices].sort()).toEqual(["ff_siwis", "pierre"]);
  });
});
