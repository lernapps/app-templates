// The contract of the build step of a quiz, as an app's build consumes it (plugin.ts): a broken question bank fails
// with a message naming the question and the problem; a valid one renders into a page that reads without
// JavaScript, as a worksheet with its answer key: the right answer of every type, the background of every option
// with the right ones marked, the explanation and further reading, the solutions after the questions, the sources
// and the footer. The fixture bank (test/fixtures/naturwunder.json) has every type of question.
import { readFileSync } from "node:fs";
import { describe, expect, test } from "vite-plus/test";
import { renderQuiz } from "../runtime/quiz/render.ts";
import { parseBank, SCHEMA_FILE } from "../runtime/quiz/validate.ts";

const text = readFileSync(new URL("fixtures/naturwunder.json", import.meta.url), "utf8");
const bank = () => JSON.parse(text) as { questions: Record<string, unknown>[] };
/** The message of the error the build step throws for `bank`, or "" when the bank is valid. */
const failure = (value: unknown): string => {
  try {
    parseBank(typeof value === "string" ? value : JSON.stringify(value), "src/quiz.json");
    return "";
  } catch (error) {
    return error instanceof Error ? error.message : String(error);
  }
};

describe("a broken question bank fails the build", () => {
  test("a single choice with two correct options, naming the question and the schema", () => {
    const broken = bank();
    const options = (broken.questions[0]?.["options"] ?? []) as { correct: boolean }[];
    for (const option of options) option.correct = true;
    const message = failure(broken);
    expect(message).toContain("src/quiz.json is not a valid question bank");
    expect(message).toContain(
      'questions[0] (question "grand-canyon"): a single-choice question needs exactly one correct option; it has 4',
    );
    expect(message).toContain(SCHEMA_FILE);
  });

  test("a question without its options, of an unknown type, or with a duplicate id", () => {
    const broken = bank();
    delete broken.questions[1]?.["options"];
    if (broken.questions[2]) broken.questions[2]["type"] = "essay";
    const message = failure(broken);
    expect(message).toContain('questions[1] (question "weltnaturerbe"): options is missing');
    expect(message).toContain('questions[2].type (question "totes-meer"): must be one of single-choice');
    const twice = bank();
    if (twice.questions[1]) twice.questions[1]["id"] = "grand-canyon";
    expect(failure(twice)).toContain('the id "grand-canyon" appears twice');
  });

  test("a bank that is not JSON, saying so", () => {
    expect(failure('{ "title": "Quiz", ')).toContain("src/quiz.json is not valid JSON");
  });

  test("the fixture bank is valid", () => {
    expect(failure(text)).toBe("");
  });
});

describe("the page without JavaScript", () => {
  const { body } = renderQuiz({ quiz: parseBank(text, "src/quiz.json") });
  /** The page as text, one line, without tags. */
  const plain = (html: string) =>
    html
      .replace(/<[^>]+>/g, " ")
      .replace(/&amp;/g, "&")
      .replace(/\s+/g, " ")
      .trim();
  const solutions = plain(body.slice(body.indexOf('id="loesungen"')));

  test("every question comes before the solutions", () => {
    for (const question of bank().questions) {
      expect(body.indexOf(`id="frage-${String(question["id"])}"`)).toBeLessThan(body.indexOf('id="loesungen"'));
      expect(body.indexOf(`id="loesung-${String(question["id"])}"`)).toBeGreaterThan(body.indexOf('id="loesungen"'));
    }
  });

  test("the solutions give the right answer of every type, with the right options marked", () => {
    const colorado = "Der Colorado ist der größte Fluss im Südwesten Nordamerikas. Er ist gut 2300 km lang.";
    expect(solutions).toContain(`Colorado richtige Antwort ${colorado}`);
    expect(solutions).toContain("Victoriafälle richtige Antwort");
    expect(solutions).toContain("Richtige Antwort: Die Aussage stimmt.");
    expect(solutions).toContain("Richtige Antwort: Die Aussage stimmt nicht.");
    expect(solutions).toContain("Richtige Antwort: 8.848 m (erlaubte Abweichung: 100 m)");
    expect(solutions).toContain("Richtige Antwort: 1. Zugspitze, 2. Mont Blanc, 3. Kilimandscharo, 4. Mount Everest");
    expect(solutions).toContain("Niagarafälle – USA und Kanada");
  });

  test("further reading is a plain link by its title, opened without access to the page", () => {
    expect(solutions).toContain("Mehr dazu:");
    expect(body).toContain(
      '<a href="https://de.wikipedia.org/wiki/Grand_Canyon" rel="noopener">Grand Canyon (Wikipedia)</a>',
    );
  });

  test("the sources and the footer with imprint and privacy notice", () => {
    expect(plain(body.slice(body.indexOf('id="quellen"')))).toContain("Wikipedia, die freie Enzyklopädie");
    expect(body.match(/href="https:\/\/lernapps\.net\/imprint\/"/g)).toHaveLength(1);
    expect(body.match(/href="https:\/\/lernapps\.net\/privacy\/"/g)).toHaveLength(1);
  });
});
