// The contract of one question of the quiz, as another archetype consumes it (@lernapps/app-templates/quiz/question):
// the schema of a question, usable from another schema; the validation of one question, with the same messages as
// the quiz's for the same problem, at the path the consumer gives; the rendering of one question's controls and of
// its solution without JavaScript, a fragment that can sit in a <details>; the checker; the messages. The quiz
// itself is built from the same exports. The fixture bank (test/fixtures/naturwunder.json) has every type of question.
import { readFileSync } from "node:fs";
import { Ajv2020 } from "ajv/dist/2020.js";
import { describe, expect, test } from "vite-plus/test";
import {
  isCorrect,
  messages,
  QUESTION_SCHEMA_URL,
  questionId,
  quizSchema,
  renderQuestion,
  renderSolution,
  rightAnswer,
  validateQuestion,
  wrongAnswer,
  type Question,
} from "../runtime/quiz/question.ts";
import { renderQuiz } from "../runtime/quiz/render.ts";
import { parseBank, problems } from "../runtime/quiz/validate.ts";

const text = readFileSync(new URL("fixtures/naturwunder.json", import.meta.url), "utf8");
const bank = parseBank(text, "src/quiz.json");
const questions = bank.questions;
/** A copy of the fixture's question `id`, to break. */
const copy = (id: string): Record<string, unknown> =>
  structuredClone(questions.find((question) => question.id === id)) as unknown as Record<string, unknown>;
/** The page as text, one line, without tags. */
const plain = (html: string) =>
  html
    .replace(/<[^>]+>/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/\s+/g, " ")
    .trim();

describe("the schema of a question, from another schema", () => {
  const ajv = new Ajv2020({ allErrors: true, strict: true });
  ajv.addSchema(quizSchema);
  const validate = ajv.compile({
    $id: "https://example.org/exercise.schema.json",
    type: "object",
    additionalProperties: false,
    required: ["exercise"],
    properties: { exercise: { $ref: QUESTION_SCHEMA_URL } },
  });

  test("names the question of the quiz's schema", () => {
    expect(QUESTION_SCHEMA_URL).toBe("https://lernapps.net/tooling/schemas/quiz.v1.schema.json#/$defs/question");
  });

  test.each(questions.map((question) => [question.type, question] as const))("a valid %s passes", (_type, item) => {
    expect(validate({ exercise: item })).toBe(true);
  });

  test("a question of an unknown type or with a property its type does not have fails", () => {
    expect(validate({ exercise: { ...copy("totes-meer"), type: "essay" } })).toBe(false);
    expect(validate({ exercise: { ...copy("totes-meer"), options: [] } })).toBe(false);
  });
});

describe("the validation of one question", () => {
  /** The problems the quiz reports for `question` as its first question. */
  const inBank = (question: unknown) => problems({ ...JSON.parse(text), questions: [question] });
  const broken: [string, Record<string, unknown>][] = [
    ["two correct options in a single choice", { ...copy("grand-canyon"), options: copy("weltnaturerbe")["options"] }],
    ["a missing property", (({ options: _options, ...rest }) => rest)(copy("weltnaturerbe"))],
    ["an unknown type", { ...copy("totes-meer"), type: "essay" }],
    ["an id that is not lower case", { ...copy("totes-meer"), id: "Totes Meer" }],
    ["a property its type does not have", { ...copy("everest-hoehe"), options: [] }],
    [
      "an empty option",
      {
        ...copy("galapagos"),
        options: [
          { text: "", correct: true, info: "x" },
          { text: "b", correct: false, info: "y" },
        ],
      },
    ],
    ["a link that is not https", { ...copy("uluru"), links: [{ title: "Uluru", url: "http://example.org" }] }],
    ["an item twice", { ...copy("berge-ordnen"), items: ["Zugspitze", "Zugspitze"] }],
    [
      "a right entry twice",
      {
        ...copy("wasserfaelle-laender"),
        pairs: [
          { left: "a", right: "c" },
          { left: "b", right: "c" },
        ],
      },
    ],
  ];

  test.each(questions.map((question) => [question.id, question] as const))("%s is valid", (_id, item) => {
    expect(validateQuestion(item, "questions[0]")).toEqual([]);
  });

  test.each(broken)("%s: the same messages as in the quiz", (_name, item) => {
    const found = validateQuestion(item, "questions[0]");
    expect(found.length).toBeGreaterThan(0);
    expect(found).toEqual(inBank(item));
  });

  test("at the consumer's path, naming the question", () => {
    expect(validateQuestion(broken[0]?.[1], "blocks[2]")).toEqual([
      'blocks[2] (question "grand-canyon"): a single-choice question needs exactly one correct option; it has 3. Mark one option "correct": true, or make it "multiple-choice"',
    ]);
    expect(validateQuestion(broken[5]?.[1], "blocks[2]")).toContain(
      'blocks[2].options[0].text (question "galapagos"): must not be empty',
    );
    expect(validateQuestion("frage", "blocks[2]")).toEqual(["blocks[2]: must be object"]);
  });
});

describe("one question's controls", () => {
  const count = (html: string, pattern: RegExp) => html.match(pattern)?.length ?? 0;

  test.each(questions.map((question) => [question.type, question] as const))(
    "%s: its text, its controls and the button to check, in an element of its own",
    (_type, item) => {
      const html = renderQuestion(item);
      expect(html.startsWith(`<div class="quiz-question" id="${questionId(item)}" data-id="${item.id}"`)).toBe(true);
      expect(html.endsWith("</div>")).toBe(true);
      expect(html).toContain(`<legend class="quiz-text">`);
      expect(html).toContain(`>${messages.check}</button>`);
      expect(html).not.toContain("quiz-next");
      const controls = {
        "single-choice": [/type="radio"/g, item.type === "single-choice" ? item.options.length : 0],
        "multiple-choice": [/type="checkbox"/g, item.type === "multiple-choice" ? item.options.length : 0],
        "true-false": [/type="radio"/g, 2],
        number: [/inputmode="decimal"/g, 1],
        ordering: [/<select /g, item.type === "ordering" ? item.items.length : 0],
        matching: [/<select /g, item.type === "matching" ? item.pairs.length : 0],
      } as const;
      const [pattern, expected] = controls[item.type];
      expect(count(html, pattern)).toBe(expected);
    },
  );

  test("in a list item and with the button to the next question, as in the quiz", () => {
    const item = questions[0] as Question;
    const html = renderQuestion(item, { element: "li", next: true });
    expect(html.startsWith(`<li class="quiz-question"`)).toBe(true);
    expect(html.endsWith("</li>")).toBe(true);
    expect(html).toContain(`class="quiz-next" hidden>${messages.next}</button>`);
  });
});

describe("one question's solution without JavaScript", () => {
  const solution = (id: string) => renderSolution(questions.find((question) => question.id === id) as Question);

  test("the right answer of every type, the right options marked", () => {
    expect(plain(solution("grand-canyon"))).toContain(`Colorado ${messages.rightOption}`);
    expect(plain(solution("weltnaturerbe"))).toContain(messages.rightOption);
    expect(plain(solution("totes-meer"))).toContain(`${messages.rightAnswer} ${messages.statementTrue}`);
    expect(plain(solution("uluru"))).toContain(`${messages.rightAnswer} ${messages.statementFalse}`);
    expect(plain(solution("everest-hoehe"))).toContain("Richtige Antwort: 8.848 m (erlaubte Abweichung: 100 m)");
    expect(plain(solution("berge-ordnen"))).toContain(
      "Richtige Antwort: 1. Zugspitze, 2. Mont Blanc, 3. Kilimandscharo, 4. Mount Everest",
    );
    expect(plain(solution("wasserfaelle-laender"))).toContain("Niagarafälle – USA und Kanada");
  });

  test.each(questions.map((question) => [question.id, question] as const))(
    "%s: the background of every option, the explanation and the links",
    (_id, item) => {
      const html = renderSolution(item);
      if (item.type === "single-choice" || item.type === "multiple-choice") {
        for (const option of item.options) expect(plain(html)).toContain(plain(option.info));
      }
      expect(plain(html)).toContain(plain(item.explanation));
      expect(plain(html)).toContain(messages.moreReading);
      for (const link of item.links) expect(html).toContain(`<a href="${link.url}" rel="noopener">`);
    },
  );

  test.each(questions.map((question) => [question.id, question] as const))(
    "%s: a fragment that can sit in a <details>: no ids, no controls, nothing hidden",
    (_id, item) => {
      const html = renderSolution(item);
      expect(html).not.toMatch(/\sid="/);
      expect(html).not.toMatch(/<(input|select|button|form|details|summary)\b/);
      expect(html).not.toMatch(/\shidden\b/);
      expect(`<details><summary>${messages.solution}</summary>${html}</details>`).toContain(
        "<summary>Lösung</summary>",
      );
    },
  );
});

describe("the quiz is built from the same exports", () => {
  const { body } = renderQuiz({ quiz: bank });

  test.each(questions.map((question) => [question.id, question] as const))(
    "%s: its question and its solution",
    (_id, item) => {
      expect(body).toContain(renderQuestion(item, { element: "li", next: true }));
      expect(body).toContain(renderSolution(item));
    },
  );
});

test.each(questions.map((question) => [question.id, question] as const))(
  "the checker: %s counts its right answer and not its wrong one",
  (_id, item) => {
    expect(isCorrect(item, rightAnswer(item))).toBe(true);
    expect(isCorrect(item, wrongAnswer(item))).toBe(false);
  },
);

test("the package exports the question, the engine, the e2e helpers and the messages", () => {
  const manifest = JSON.parse(readFileSync(new URL("../package.json", import.meta.url), "utf8")) as {
    exports: Record<string, string | { types: string; default: string }>;
  };
  expect(manifest.exports["./quiz/question"]).toEqual({
    types: "./runtime/quiz/question.ts",
    default: "./dist/quiz-question.mjs",
  });
  expect(manifest.exports["./quiz/messages/de.json"]).toBe("./runtime/quiz/messages/de.json");
  expect(manifest.exports["./quiz"]).toBeDefined();
  expect(manifest.exports["./quiz/e2e"]).toBeDefined();
});
