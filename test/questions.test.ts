// The contract of one question, as an archetype consumes it (@lernapps/app-templates/questions): the schema of a
// question, usable from another schema; the validation of one question, with the same messages whatever the archetype,
// at the path the consumer gives; the rendering of one question's controls and of its solution without JavaScript, a
// fragment that can sit in a <details>; the checker; the messages. The quiz and the explainer are built from the same
// exports. The fixture bank (test/fixtures/naturwunder.json) has every type of question.
import { readFileSync } from "node:fs";
import { Ajv2020 } from "ajv/dist/2020.js";
import { describe, expect, test } from "vite-plus/test";
import {
  isCorrect,
  messages,
  QUESTION_REF,
  questionId,
  questionIn,
  questionSchemas,
  renderQuestion,
  renderSolution,
  rightAnswer,
  validateQuestion,
  wrongAnswer,
  wrongReasons,
  type Question,
} from "../runtime/shared/questions/index.ts";
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
  for (const each of questionSchemas) ajv.addSchema(each);
  const validate = ajv.compile({
    $id: "https://example.org/exercise.schema.json",
    type: "object",
    additionalProperties: false,
    required: ["exercise"],
    properties: { exercise: { $ref: QUESTION_REF } },
  });

  test("names the question of the schema of a question", () => {
    expect(QUESTION_REF).toBe("urn:lernapps:schema:question.v1#/$defs/question");
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
    ["an empty hint", { ...copy("berge-ordnen"), hint: "" }],
    [
      "a number's mistake that counts as right",
      { ...copy("everest-hoehe"), mistakes: [{ answer: 8800, message: "x" }] },
    ],
    [
      "a number's mistake twice",
      {
        ...copy("everest-hoehe"),
        mistakes: [
          { answer: 8000, message: "x" },
          { answer: 8000, message: "y" },
        ],
      },
    ],
    ["a mistake on a type without it", { ...copy("berge-ordnen"), mistakes: [{ answer: 1, message: "x" }] }],
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

  test("a number's mistake names its number", () => {
    expect(validateQuestion(broken.find(([name]) => name.includes("counts as right"))?.[1], "blocks[2]")).toEqual([
      'blocks[2] (question "everest-hoehe"): the mistake 8800 counts as right: it is within the tolerance of the answer 8848; give the wrong number the mistake leads to',
    ]);
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

describe("a question's examples run through its checker", () => {
  /** The fixture's question `id` with `examples`. */
  const withExamples = (id: string, examples: unknown) => ({ ...copy(id), examples });

  test.each([
    ["grand-canyon", { accepted: ["Colorado"], rejected: [1, "Nil"] }],
    [
      "weltnaturerbe",
      {
        accepted: [["Victoriafälle", 1, 0]],
        rejected: [
          [0, 1],
          [0, 1, 2, 3],
        ],
      },
    ],
    ["totes-meer", { accepted: [true], rejected: [false] }],
    ["everest-hoehe", { accepted: [8800, "8 900"], rejected: [8700, "8.900"] }],
    [
      "berge-ordnen",
      { accepted: [[0, 1, 2, 3]], rejected: [["Mont Blanc", "Zugspitze", "Kilimandscharo", "Mount Everest"]] },
    ],
    [
      "wasserfaelle-laender",
      {
        accepted: [
          [
            ["Victoriafälle", "Simbabwe und Sambia"],
            [0, 0],
            [2, 2],
          ],
        ],
        rejected: [
          [
            [0, 1],
            [1, 0],
            [2, 2],
          ],
        ],
      },
    ],
  ])("%s: each as it is listed", (id, examples) => {
    expect(validateQuestion(withExamples(id, examples), "questions[0]")).toEqual([]);
  });

  test("one the checker judges otherwise, or that no learner could give, names its place", () => {
    expect(
      validateQuestion(
        withExamples("berge-ordnen", { accepted: [[1, 0, 2, 3]], rejected: [[0, 1, 2]] }),
        "questions[4]",
      ),
    ).toEqual([
      'questions[4].examples.accepted[0] (question "berge-ordnen"): the check rejects [1,0,2,3], but it is listed as accepted; if the task\'s text allows it, change the question (e.g. another type, a tolerance) so that its check accepts it, else move it to rejected',
      'questions[4].examples.rejected[0] (question "berge-ordnen"): give each of the 4 items once, in the learner\'s order',
    ]);
    expect(validateQuestion(withExamples("everest-hoehe", { rejected: [8900] }), "blocks[2]")).toEqual([
      'blocks[2].examples.rejected[0] (question "everest-hoehe"): the check accepts 8900, but it is listed as rejected; if the task\'s text rules it out, change the question (e.g. another type, a tolerance) so that its check rejects it, else move it to accepted',
    ]);
  });

  test("the quiz in a language has none of them", () => {
    expect(
      questionIn(withExamples("totes-meer", { accepted: [true] }) as unknown as Question, "de"),
    ).not.toHaveProperty("examples");
  });
});

describe("one question's controls", () => {
  const count = (html: string, pattern: RegExp) => html.match(pattern)?.length ?? 0;

  test.each(questions.map((question) => [question.type, question] as const))(
    "%s: its text, its controls and the button to check, in an element of its own",
    (_type, item) => {
      const html = renderQuestion(item);
      expect(html.startsWith(`<div class="question" id="${questionId(item)}" data-id="${item.id}"`)).toBe(true);
      expect(html.endsWith("</div>")).toBe(true);
      expect(html).toContain(`<legend class="question-text">`);
      expect(html).toContain(`>${messages.check}</button>`);
      expect(html).not.toContain("question-next");
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
    expect(html.startsWith(`<li class="question"`)).toBe(true);
    expect(html.endsWith("</li>")).toBe(true);
    expect(html).toContain(`class="question-next" hidden>${messages.next}</button>`);
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

describe("why a wrong answer is wrong", () => {
  const question = (id: string) => questions.find((item) => item.id === id) as Question;

  test("a choice: the background of each wrong option chosen, with the option", () => {
    const item = question("grand-canyon");
    if (item.type !== "single-choice") throw new Error("grand-canyon is a single choice");
    const wrong = item.options.findIndex((option) => !option.correct);
    expect(wrongReasons(item, wrong)).toEqual([{ option: item.options[wrong]?.text, text: item.options[wrong]?.info }]);
    expect(wrongReasons(item, rightAnswer(item))).toEqual([]);
  });

  test("a number: the message of the mistake it matches, within the tolerance; else the hint", () => {
    const item = {
      ...question("everest-hoehe"),
      hint: "Schau dir die Höhe in Metern an.",
      mistakes: [{ answer: 29_032, message: "Das ist die Höhe in Fuß." }],
    } as Question;
    expect(wrongReasons(item, "29000")).toEqual([{ text: "Das ist die Höhe in Fuß." }]);
    expect(wrongReasons(item, "5000")).toEqual([{ text: "Schau dir die Höhe in Metern an." }]);
  });

  test("other types: the hint, or nothing", () => {
    const item = question("berge-ordnen");
    expect(wrongReasons(item, wrongAnswer(item))).toEqual([]);
    expect(wrongReasons({ ...item, hint: "Der höchste Berg kommt zuletzt." }, wrongAnswer(item))).toEqual([
      { text: "Der höchste Berg kommt zuletzt." },
    ]);
  });
});
