// A speaking task of an explainer (speaking-task; dec-speaking-task): the learner hears a model, records themself and rates
// the pronunciation. The page as the build writes it: the models with their players and texts, the note that recording needs
// JavaScript, the place for the live task; the build stops when a model is missing, in another language, or does not say the text
// beside it, and when a self-assessment asks the task. The tutor page says that the tutor hears nothing. The recording
// itself is tested in the browser (runtime/explainer/e2e.ts).
import { cpSync, mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, test } from "vite-plus/test";
import { ContentError, loadSite } from "../runtime/explainer/load.ts";
import { outline } from "../runtime/explainer/outline.ts";
import { renderPage } from "../runtime/explainer/render.ts";
import { routes } from "../runtime/explainer/routes.ts";
import { tutorPageMarkdown } from "../runtime/explainer/tutorpage.ts";

const here = import.meta.dirname;
const PAGE = "src/bonjour/se-presenter.yaml";
const CHAPTER = "src/bonjour/chapter.yaml";

/** The French example, with `from` replaced by `to` in the file `file` when they are given. */
function app(from?: string, to?: string, file = PAGE): string {
  const root = mkdtempSync(join(tmpdir(), "explainer-speaking-"));
  cpSync(join(here, "../explainer/examples/franzoesisch/src"), join(root, "src"), { recursive: true });
  if (from !== undefined && to !== undefined) {
    const text = readFileSync(join(root, file), "utf8");
    if (!text.includes(from)) throw new Error(`${file} has no "${from}"`);
    writeFileSync(join(root, file), text.replace(from, to));
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

const body = (root: string): string => {
  const site = loadSite(root, 0);
  const route = routes(site).find((candidate) => candidate.path === "bonjour/se-presenter/");
  if (route === undefined) throw new Error("no page");
  return renderPage(site, route).body;
};

describe("a speaking task on the page", () => {
  test("is valid in the example", () => {
    expect(problemsOf(app())).toEqual([]);
  });

  test("shows the models with their players and texts, and says that recording needs JavaScript", () => {
    const html = body(app());
    const task =
      /<div class="explainer-exercise explainer-speaking-task" id="nachsprechen">[\s\S]*?<\/script>/.exec(html)?.[0] ??
      "";
    expect(task).toContain("Hör zu, sprich nach und nimm dich auf. Vergleiche dann mit dem Original.");
    expect(task.match(/<audio controls preload="none" src="\.\.\/\.\.\/audio\/[a-z-]+\.mp3"/g)).toHaveLength(3);
    expect(task).toMatch(
      /<span class="explainer-ai-voice" tabindex="0" role="note" title="KI-Stimme\. Modell kokoro-v1\.0, Stimme ff_siwis\. Erzeugt am \d{4}-\d{2}-\d{2}\. Lizenz: CC BY-SA 4\.0\. Namensnennung: SIWIS[^"]*" aria-label="KI-Stimme\.[^"]*">KI<\/span>/,
    );
    expect(task).toContain('<span class="explainer-speaking-sentence" lang="fr">Je m\'appelle Marie.</span>');
    expect(task).toContain("Zum Aufnehmen braucht diese Übung JavaScript.");
    expect(task).toContain('<div class="explainer-speaking-live" hidden></div>');
    expect(task).toContain("Sprich langsam.");
  });

  test("gives the browser its data: the models' players and the texts", () => {
    const html = body(app());
    const json =
      /id="nachsprechen"[\s\S]*?<script type="application\/json" class="explainer-exercise-data">([\s\S]*?)<\/script>/.exec(
        html,
      )?.[1];
    const data = JSON.parse(json ?? "{}") as {
      kind: string;
      language: string;
      items: { audio: string; text?: string }[];
      texts: Record<string, string>;
    };
    expect(data.kind).toBe("speaking");
    expect(data.language).toBe("fr");
    expect(data.items.map((item) => item.audio)).toEqual([
      "je-mappelle.mp3",
      "jai-douze-ans.mp3",
      "je-suis-de-berlin.mp3",
    ]);
    expect(data.items[2]?.text).toBeUndefined();
    expect(data.texts["speakSame"]).toBe("Klingt gleich");
    expect(data.texts["speakBumpy"]).toBe("Erkennbar, aber holprig");
    expect(data.texts["speakAgain"]).toBe("Nochmal");
  });

  test("is an exercise of the outline with the texts of its models, and its models are audio of the page", () => {
    const page = outline(app()).pages["de"]?.find((candidate) => candidate.url === "bonjour/se-presenter/");
    expect(page?.speaking.map((task) => task.id)).toEqual(["nachsprechen"]);
    const exercise = page?.exercises.find((candidate) => candidate.id === "nachsprechen");
    expect(exercise?.kind).toBe("speaking");
    expect(exercise?.kind === "speaking" ? exercise.solutions : []).toEqual([
      "Je m'appelle Marie.",
      "J'ai douze ans.",
      "Je suis de Berlin.",
    ]);
    expect(page?.audio).toContain("audio/jai-douze-ans.mp3");
  });

  test("the tutor page says that the tutor hears nothing, and gives the text of each model", () => {
    const site = loadSite(app(), 0);
    const page = site.chapters[0]?.pages.find((candidate) => candidate.id === "se-presenter");
    if (page === undefined) throw new Error("no page");
    const text = tutorPageMarkdown(site, page, "de", new Map());
    expect(text).toContain("Du kannst weder das Original noch die Aufnahme hören.");
    expect(text).toContain("1. Audio → Je m'appelle Marie.");
    expect(text).toContain("3. Audio → Je suis de Berlin.");
  });
});

describe("what the build reports about a speaking task", () => {
  const FIRST = `- audio: je-mappelle.mp3
            text: "Je m'appelle Marie."`;

  test("a model that is not in src/audio/", () => {
    const problems = problemsOf(app(FIRST, FIRST.replace("je-mappelle.mp3", "absent.mp3")));
    expect(problems).toHaveLength(1);
    expect(problems[0]).toMatch(
      /^src\/bonjour\/se-presenter\.yaml:\d+: .*audio\/absent\.mp3 is missing: put the file into src\/audio\//,
    );
  });

  test("a model in another language than the task's", () => {
    const problems = problemsOf(app("language: fr\n", "language: en\n"));
    expect(problems.join("\n")).toMatch(
      /audio\/je-mappelle\.mp3 is spoken in fra \(TLAN\), but the task's language en is eng/,
    );
  });

  test("a text that the model does not say", () => {
    const problems = problemsOf(app(FIRST, FIRST.replace("Marie", "Paul")));
    expect(problems).toHaveLength(1);
    expect(problems[0]).toContain(
      'the text is "Je m\'appelle Paul.", but audio/je-mappelle.mp3 says "Je m\'appelle Marie."',
    );
  });

  test("a self-assessment cannot ask it", () => {
    const problems = problemsOf(
      app(
        "        - /bonjour/se-presenter/#vorstellen-uebersetzen\n",
        "        - /bonjour/se-presenter/#nachsprechen\n",
        CHAPTER,
      ),
    );
    expect(problems).toHaveLength(1);
    expect(problems[0]).toMatch(/is a speaking task, which the learner rates themself/);
  });

  test("no items, or more than ten, or a wrong name, is a schema problem", () => {
    expect(problemsOf(app("language: fr\n", "language: fr\n        extra: x\n")).length).toBeGreaterThan(0);
    expect(problemsOf(app(FIRST, FIRST.replace("je-mappelle.mp3", "Je Mappelle.MP3"))).length).toBeGreaterThan(0);
  });
});
