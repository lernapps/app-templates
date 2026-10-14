// The quiz in several languages: a bank declares its languages (German first) and writes each learner text as a map
// { de: …, en: … }; the build fails on a missing translation and on a language it does not declare, with the
// messages of the explainer's language check; it writes one page per language, German at the root and every other
// below /<language>/, each with its language, its alternates and a language switch of plain links. A bank in German
// only builds as before: one page, no switch, no alternates. The fixture bank (test/fixtures/quiz-bilingual.json) is
// in German and English.
import { existsSync, mkdirSync, mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { describe, expect, test } from "vite-plus/test";
import { build } from "vite-plus";
import { quiz } from "../runtime/quiz/plugin.ts";
import { quizIn, type Quiz } from "../runtime/quiz/quiz.ts";
import { messagesIn, renderQuiz } from "../runtime/quiz/render.ts";
import { parseBank, readBank } from "../runtime/quiz/validate.ts";
import type { Text } from "../runtime/shared/languages.ts";

const fixture = (name: string) => readFileSync(new URL(`fixtures/${name}`, import.meta.url), "utf8");
const bilingual = fixture("quiz-bilingual.json");
const german = fixture("naturwunder.json");
type Raw = Record<string, unknown> & { questions: Record<string, unknown>[] };
const bank = () => JSON.parse(bilingual) as Raw;

/** The message of the error the build step throws for `bank`, or "" when the bank is valid. */
const failure = (value: unknown): string => {
  try {
    parseBank(typeof value === "string" ? value : JSON.stringify(value), "src/quiz.json");
    return "";
  } catch (error) {
    return error instanceof Error ? error.message : String(error);
  }
};

describe("a bank in several languages", () => {
  test("the fixture bank in German and English is valid", () => {
    expect(failure(bilingual)).toBe("");
  });

  test("a missing translation, in a question and in the bank's own texts, fails with its place", () => {
    const broken = bank();
    const question = broken.questions[1] as { explanation: Record<string, string> };
    delete question.explanation["en"];
    broken["title"] = "Naturwunder der Welt";
    const sources = broken["sources"] as { title: Record<string, string> }[];
    delete sources[0]?.title["en"];
    const message = failure(broken);
    expect(message).toContain("src/quiz.json is not a valid question bank");
    expect(message).toContain('questions[1].explanation (en) (question "totes-meer"): the translation is missing');
    expect(message).toContain("title (en): the translation is missing; write the text as a map: { de: …, en: … }");
    expect(message).toContain("sources[0].title (en): the translation is missing");
  });

  test("a language the bank does not declare fails, and says where to declare it", () => {
    const broken = bank();
    const question = broken.questions[0] as { text: Record<string, string> };
    question.text["fr"] = "Quel fleuve a creusé le Grand Canyon ?";
    expect(failure(broken)).toContain(
      'questions[0].text (fr) (question "grand-canyon"): fr is not a language of the app; declare it in languages in src/quiz.json, or remove it',
    );
    const undeclared = bank();
    delete undeclared["languages"];
    expect(failure(undeclared)).toContain(
      "title (en): en is not a language of the app; declare it in languages in src/quiz.json, or remove it",
    );
  });

  test("German comes first, and only languages the quiz has texts for", () => {
    const first = bank();
    first["languages"] = ["en", "de"];
    expect(failure(first)).toContain("languages[0]: German comes first");
    const unknown = bank();
    unknown["languages"] = ["de", "en", "fr"];
    expect(failure(unknown)).toContain("languages[2]: the runtime has no texts of its own in fr yet; it has de, en");
  });

  test("each language's quiz has the texts of that language", () => {
    const all = readBank(bilingual, "src/quiz.json");
    const en = quizIn(all, "en");
    expect(en.title).toBe("Natural wonders of the world");
    expect(en.questions[0]?.text).toBe("Which river shaped the Grand Canyon in the USA?");
    expect(quizIn(all, "de").title).toBe("Naturwunder der Welt");
    // the German quiz of the build step, as before
    expect(parseBank(bilingual, "src/quiz.json").questions[2]?.text).toContain("Wie hoch ist der Mount Everest?");
  });
});

describe("a page per language", () => {
  const all = (): Quiz<Text> => readBank(bilingual, "src/quiz.json");
  const languages = ["de", "en"];

  test("the English page: its texts, the quiz's own texts in English, the switch and the alternates", () => {
    const page = renderQuiz({ quiz: quizIn(all(), "en"), lang: "en" }, { languages });
    expect(page.title).toBe("Natural wonders of the world");
    expect(page.body).toContain(`<h2 class="quiz-heading">${messagesIn("en").questions}</h2>`);
    expect(page.body).toContain(`<h2>${messagesIn("en").solutions}</h2>`);
    expect(page.body).toContain(
      '<nav class="quiz-languages" aria-label="Language"><ul><li><a href="../" hreflang="de" lang="de">Deutsch</a></li><li><a href="../en/" hreflang="en" lang="en" aria-current="page">English</a></li></ul></nav>',
    );
    expect(page.alternates).toEqual([
      '<link rel="alternate" hreflang="de" href="../" />',
      '<link rel="alternate" hreflang="en" href="../en/" />',
    ]);
    // the engine reads the page's language from the data
    expect(page.body).toContain('"lang":"en"');
  });

  test("the German page links to the English one", () => {
    const page = renderQuiz({ quiz: quizIn(all(), "de") }, { languages });
    expect(page.body).toContain('<a href="en/" hreflang="en" lang="en">English</a>');
    expect(page.body).not.toContain('"lang":');
  });

  test("a German bank: no switch, no alternates", () => {
    const page = renderQuiz({ quiz: parseBank(german, "src/quiz.json") });
    expect(page.body).not.toContain("quiz-languages");
    expect(page.alternates).toEqual([]);
  });
});

/** A quiz app with `bank` as its src/quiz.json. */
function app(bank: string): string {
  const root = mkdtempSync(join(tmpdir(), "quiz-build-"));
  writeFileSync(
    join(root, "index.html"),
    `<!doctype html>\n<html lang="de">\n  <head>\n    <meta charset="utf-8" />\n    <script type="module" src="/src/main.ts"></script>\n  </head>\n  <body>\n    <!-- quiz -->\n  </body>\n</html>\n`,
  );
  mkdirSync(join(root, "src"));
  writeFileSync(join(root, "src/quiz.json"), bank);
  writeFileSync(join(root, "style.css"), "body { color: #1a1a1a; }\n");
  writeFileSync(join(root, "src/main.ts"), `import "../style.css";\ndocument.documentElement.dataset["js"] = "on";\n`);
  return root;
}

describe("one build writes a page per language", () => {
  test("German at the root, English below en/, each with its language and its assets", async () => {
    const root = app(bilingual);
    await build({ root, base: "./", logLevel: "silent", configFile: false, plugins: [quiz()] });
    for (const [lang, path] of [
      ["de", ""],
      ["en", "en/"],
    ] as const) {
      const file = join(root, "dist", path, "index.html");
      const html = readFileSync(file, "utf8");
      expect(html).toContain(`<html lang="${lang}">`);
      expect(html).toContain('<link rel="alternate" hreflang="en"');
      const src = /<script type="module" crossorigin src="([^"]+)"/.exec(html)?.[1] ?? "";
      expect(existsSync(join(dirname(file), src)), `${path}: ${src}`).toBe(true);
      const href = /<link rel="stylesheet" crossorigin href="([^"]+)"/.exec(html)?.[1] ?? "";
      expect(existsSync(join(dirname(file), href)), `${path}: ${href}`).toBe(true);
    }
    const en = readFileSync(join(root, "dist/en/index.html"), "utf8");
    expect(en).toContain("<title>Natural wonders of the world</title>");
    expect(en).toContain("Which river shaped the Grand Canyon in the USA?");
    // the quiz's own links stay relative to its page: again, in English
    expect(en).toContain('<a class="quiz-restart" href="./">');
  }, 60_000);

  test("a German bank: one page, as before", async () => {
    const root = app(german);
    await build({ root, base: "./", logLevel: "silent", configFile: false, plugins: [quiz()] });
    expect(existsSync(join(root, "dist/en"))).toBe(false);
    const html = readFileSync(join(root, "dist/index.html"), "utf8");
    expect(html).toContain('<html lang="de">');
    expect(html).not.toContain("hreflang");
  }, 60_000);
});
