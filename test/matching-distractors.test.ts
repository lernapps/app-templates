// A matching question may offer right entries that match no left entry (distractors): the learner can choose them, and
// each is wrong. They count after the right entries of the pairs, mixed in with them on the page.
import { describe, expect, test } from "vite-plus/test";
import {
  isComplete,
  isCorrect,
  questionIn,
  rightEntries,
  type Question,
} from "../runtime/shared/questions/question.ts";
import { renderQuestion } from "../runtime/shared/questions/render.ts";
import { validateQuestion } from "../runtime/shared/questions/validate.ts";

const base = (extra: Record<string, unknown> = {}): Record<string, unknown> => ({
  id: "begriffe",
  type: "matching",
  text: "Ordne zu.",
  pairs: [
    { left: "Das Ganze", right: "Grundwert" },
    { left: "Der Teil", right: "Prozentwert" },
  ],
  distractors: ["Prozentsatz", "Zinssatz"],
  explanation: "Das Ganze ist der Grundwert.",
  links: [{ title: "Prozentrechnung (Wikipedia)", url: "https://de.wikipedia.org/wiki/Prozentrechnung" }],
  ...extra,
});

const item = (extra?: Record<string, unknown>) => questionIn(base(extra) as unknown as Question<string>, "de");
const problems = (value: unknown) => validateQuestion(value, "questions[0]");

describe("the distractors of a matching question", () => {
  test("the right entries are those of the pairs, then the distractors", () => {
    expect(rightEntries(item() as Extract<Question, { type: "matching" }>)).toEqual([
      "Grundwert",
      "Prozentwert",
      "Prozentsatz",
      "Zinssatz",
    ]);
  });

  test("the page offers every right entry in each list, and only the pairs make the answer right", () => {
    const html = renderQuestion(item());
    for (const text of ["Grundwert", "Prozentwert", "Prozentsatz", "Zinssatz"]) {
      expect(html.split(`>${text}</option>`).length - 1).toBe(2);
    }
    expect(isCorrect(item(), [0, 1])).toBe(true);
    expect(isCorrect(item(), [2, 1])).toBe(false);
    expect(isComplete(item(), [2, 3])).toBe(true);
  });

  test("a question without distractors renders as before", () => {
    const { distractors: _distractors, ...plain } = base();
    expect(renderQuestion(item({ distractors: undefined }))).toBe(
      renderQuestion(questionIn(plain as unknown as Question<string>, "de")),
    );
  });

  test("examples may choose a distractor, by its text", () => {
    expect(
      problems(
        base({
          examples: {
            accepted: [
              [
                ["Das Ganze", "Grundwert"],
                ["Der Teil", "Prozentwert"],
              ],
            ],
            rejected: [
              [
                ["Das Ganze", "Prozentsatz"],
                ["Der Teil", "Prozentwert"],
              ],
            ],
          },
        }),
      ),
    ).toEqual([]);
  });

  test("a distractor that equals a right entry is a problem", () => {
    expect(problems(base({ distractors: ["Grundwert"] }))).toEqual([
      'questions[0] (question "begriffe"): the right entry "Grundwert" appears twice',
    ]);
  });

  test("an empty list, or more than four, is a problem of the schema", () => {
    expect(problems(base({ distractors: [] })).length).toBe(1);
    expect(problems(base({ distractors: ["a", "b", "c", "d", "e"] })).length).toBe(1);
  });

  test("the pairs from a figure take distractors too", () => {
    const figure = {
      type: "labelled-figure",
      image: "images/klammern.svg",
      alt: "Ein Feld. A unten, B oben.",
      source: "eigene Zeichnung",
      licence: "CC0-1.0",
      legend: false,
      labels: [
        { marker: "A", x: 50, y: 90, text: "Grundwert" },
        { marker: "B", x: 20, y: 5, text: "Prozentwert" },
      ],
    };
    const { pairs: _pairs, ...rest } = base({ material: [figure], pairsFrom: "material" });
    expect(validateQuestion(rest, "questions[0]", ["de"], undefined, { imageExists: () => true })).toEqual([]);
    const both = questionIn(rest as unknown as Question<string>, "de");
    expect(rightEntries(both as Extract<Question, { type: "matching" }>)).toEqual([
      "Grundwert",
      "Prozentwert",
      "Prozentsatz",
      "Zinssatz",
    ]);
  });
});
