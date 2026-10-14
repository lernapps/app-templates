// Language maps in the quiz's question schema, for the explainer that embeds the quiz's question types: every learner
// text of a question is a string or a map { de: …, en: … }; German is required; completeness is checked against the
// declared languages with the explainer's messages; rendering and the checker pick the page's language. Banks with
// plain strings stay valid as they are.
import { describe, expect, test } from "vite-plus/test";
import { messagesIn, questionIn, renderQuestion, renderSolution, validateQuestion } from "../runtime/quiz/question.ts";
import { isCorrect, type Question } from "../runtime/quiz/quiz.ts";
import type { Text } from "../runtime/shared/languages.ts";

const both = (de: string, en: string) => ({ de, en });

const number: Question<Text> = {
  id: "hoehe",
  type: "number",
  text: both("Wie hoch ist der Uluru?", "How high is Uluru?"),
  explanation: both("Er ist 348 m hoch.", "It is 348 m high."),
  links: [{ title: both("Uluru (Wikipedia)", "Uluru (Wikipedia)"), url: "https://de.wikipedia.org/wiki/Uluru" }],
  answer: 348,
  tolerance: 10,
  unit: both("Meter", "metres"),
};

const choice: Question<Text> = {
  id: "kontinent",
  type: "single-choice",
  text: both("Wo liegt der Uluru?", "Where is Uluru?"),
  explanation: both("In Australien.", "In Australia."),
  links: [{ title: "Uluru (Wikipedia)", url: "https://de.wikipedia.org/wiki/Uluru" }],
  options: [
    { text: both("Australien", "Australia"), correct: true, info: both("Ein Kontinent.", "A continent.") },
    { text: both("Afrika", "Africa"), correct: false, info: both("Ein anderer.", "Another one.") },
  ],
};

describe("language maps in a question", () => {
  test("a question in German and English is valid for an app in both", () => {
    expect(validateQuestion(number, "blocks[0]", ["de", "en"])).toEqual([]);
    expect(validateQuestion(choice, "blocks[1]", ["de", "en"])).toEqual([
      'blocks[1].links[0].title (en) (question "kontinent"): the translation is missing; write the text as a map: { de: …, en: … }',
    ]);
  });

  test("a missing translation and an undeclared language, with the explainer's messages", () => {
    const missing = { ...number, explanation: { de: "Er ist 348 m hoch." } };
    expect(validateQuestion(missing, "blocks[0]", ["de", "en"])).toEqual([
      'blocks[0].explanation (en) (question "hoehe"): the translation is missing',
    ]);
    const extra = {
      ...number,
      text: { de: "Wie hoch ist der Uluru?", en: "How high is Uluru?", fr: "Quelle hauteur ?" },
    };
    expect(validateQuestion(extra, "blocks[0]", ["de", "en"])).toEqual([
      'blocks[0].text (fr) (question "hoehe"): fr is not a language of the app; declare it in languages in src/app.yaml, or remove it',
    ]);
  });

  test("German is required", () => {
    const noGerman = { ...number, text: { en: "How high is Uluru?" } };
    expect(validateQuestion(noGerman, "blocks[0]", ["de", "en"])).toEqual([
      'blocks[0].text (de) (question "hoehe"): the translation is missing',
    ]);
  });

  test("a plain-string question stays valid as before, for a German app", () => {
    const plain = questionIn(choice, "de");
    expect(
      validateQuestion({ ...plain, links: [{ title: "Uluru", url: "https://de.wikipedia.org/wiki/Uluru" }] }, "q", [
        "de",
      ]),
    ).toEqual([]);
    expect(
      validateQuestion({ ...plain, links: [{ title: "Uluru", url: "https://de.wikipedia.org/wiki/Uluru" }] }, "q"),
    ).toEqual([]);
  });

  test("the checker and the rendering pick the page's language", () => {
    const en = questionIn(number, "en");
    expect(en.text).toBe("How high is Uluru?");
    expect(isCorrect(en, "350 metres")).toBe(true);
    expect(isCorrect(questionIn(number, "de"), "350 Meter")).toBe(true);
    const html = renderQuestion(en, { lang: "en" });
    expect(html).toContain("How high is Uluru?");
    expect(html).toContain(messagesIn("en").check);
    expect(messagesIn("en").check).not.toBe(messagesIn("de").check);
    const solution = renderSolution(questionIn(choice, "en"), { lang: "en" });
    expect(solution).toContain("A continent.");
    expect(solution).toContain(messagesIn("en").rightOption);
  });
});
