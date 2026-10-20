// Categories of a quiz: the bank declares them and assigns each question one; a round draws from the chosen ones.
import { describe, expect, test } from "vite-plus/test";
import { inCategories } from "../runtime/quiz/quiz.ts";
import { problems } from "../runtime/quiz/validate.ts";
import { renderQuiz } from "../runtime/quiz/render.ts";
import { quizIn } from "../runtime/quiz/quiz.ts";

const question = (id: string, category?: string) => ({
  id,
  type: "true-false",
  text: `Frage ${id}`,
  explanation: "Erklärung",
  links: [{ title: "Mehr", url: "https://de.wikipedia.org/wiki/Bruch" }],
  answer: true,
  ...(category === undefined ? {} : { category }),
});
const bank = (overrides: object = {}) => ({
  title: "Quiz",
  intro: "Intro",
  categories: [
    { id: "berge", title: "Berge" },
    { id: "fluesse", title: "Flüsse" },
  ],
  questions: [question("a", "berge"), question("b", "fluesse"), question("c", "berge")],
  ...overrides,
});

describe("the categories of a bank", () => {
  test("a bank whose questions all have a declared category is valid", () => {
    expect(problems(bank())).toEqual([]);
  });

  test("a bank without categories stays valid", () => {
    expect(problems(bank({ categories: undefined, questions: [question("a")] }))).toEqual([]);
  });

  test("a question needs a category when the quiz has categories", () => {
    expect(problems(bank({ questions: [question("a", "berge"), question("b", "fluesse"), question("c")] }))).toEqual([
      expect.stringContaining('questions[2] (question "c"): add "category"'),
    ]);
  });

  test("an undeclared category, a category without questions and a category without declaration are named", () => {
    expect(problems(bank({ questions: [question("a", "berge"), question("b", "meere")] }))).toEqual([
      expect.stringContaining('"meere" is not declared'),
      expect.stringContaining('no question belongs to "fluesse"'),
    ]);
    expect(problems(bank({ categories: undefined }))).toHaveLength(3);
  });
});

describe("a round", () => {
  const questions = [question("a", "berge"), question("b", "fluesse"), question("c", "berge")];

  test("draws from the chosen categories, or from all without a choice", () => {
    expect(inCategories(questions, ["berge"]).map((q) => q.id)).toEqual(["a", "c"]);
    expect(inCategories(questions, ["berge", "fluesse"])).toHaveLength(3);
    expect(inCategories(questions, [])).toHaveLength(3);
  });
});

describe("the page", () => {
  test("offers a form with a checkbox per category, only when the quiz has categories", () => {
    const quiz = quizIn(bank() as never, "de");
    const withCategories = renderQuiz({ quiz }).body;
    expect(withCategories).toContain('class="quiz-categories"');
    expect(withCategories).toContain('name="category" value="fluesse"');
    const { categories: _categories, ...plain } = quiz;
    const without = renderQuiz({ quiz: plain }).body;
    expect(without).not.toContain("quiz-categories");
  });
});
