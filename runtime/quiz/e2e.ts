// The end-to-end tests of every quiz (@lernapps/app-templates/quiz/e2e), run by `lernapps check --pre-push` on the built
// app with the app's own question bank. An app's e2e/quiz.e2e.ts is
//
//   import { quizTests } from "@lernapps/app-templates/quiz/e2e";
//   quizTests();
//
// For each question: its deep link opens it, the right answer counts and a wrong one does not; after either, the
// background of every option, the explanation and the links for further reading show, the learner's choice marked.
// The feedback then has the focus and its top is in view, and the button to the next question comes after it.
// After the answer the reveal also says what is right: the right options marked, or the right answer for the other
// types. The seed in the address gives the order of the questions, and the address gets one when it has none. All
// right answers give the full score and show the solutions; nothing is stored on the device before, and afterwards
// only the last result when the bank asks for it. Without JavaScript every question and its solution, with the same
// background and links, can be read. Each test opens its own page; none depends on another, so they run in parallel.
// A bank in several languages runs all of this in German; for each other language, kept short: without JavaScript
// its page (/<language>/) is in that language with every question and its solution, and its switch leads to the page
// in every language; with JavaScript one question is answered, with the feedback in that language.
// The helpers answerQuestion, expectBackground and expectFeedbackInView work per question, on any page with a question
// that renderQuestion of @lernapps/app-templates/questions rendered and startQuestion made live (shared/questions/e2e.ts).
import { readFileSync } from "node:fs";
import { expect, test } from "playwright/test";
import type { Text } from "../shared/languages.ts";
import { answerQuestion, expectBackground, expectFeedbackInView, question } from "../shared/questions/e2e.ts";
import { questionId, rightAnswer, wrongAnswer } from "../shared/questions/question.ts";
import { quizIn, quizLanguages, type Quiz } from "./quiz.ts";
import { messagesIn, QUIZ_MESSAGES } from "./render.ts";

export { answerQuestion, expectBackground, expectFeedbackInView } from "../shared/questions/e2e.ts";

const de = QUIZ_MESSAGES.de;
/** The quiz's own texts in `lang`. */
const messagesOf = messagesIn;

/** The quiz's tests, for the question bank in `bank` (relative to the app's root). */
export function quizTests(bank = "src/quiz.json"): void {
  const all = JSON.parse(readFileSync(bank, "utf8")) as Quiz<Text>;
  const languages = quizLanguages(all);
  const quiz = quizIn(all, "de");

  test.describe("quiz", () => {
    // The runtime scrolls smoothly unless the learner asks for less motion (quiz.css) and moves the focus after every
    // answer: with motion, every click would wait for a scroll to settle, the run through a quiz grow with its size.
    test.use({ reducedMotion: "reduce" });

    for (const item of quiz.questions) {
      test(`${item.id} (${item.type}): its link opens it and the right answer counts`, async ({ page }) => {
        await page.goto(`./#${questionId(item)}`);
        await expect(question(page, item)).toBeVisible();
        await expect(page.locator(".question:visible")).toHaveCount(1);
        await answerQuestion(page, item, rightAnswer(item));
        await expect(question(page, item).locator(".question-feedback")).toContainText(de.right);
        await expectFeedbackInView(page, item);
        // from the feedback, the keyboard reaches the next question (past the links of the background)
        const next = question(page, item).locator(".question-next");
        for (let tab = 0; tab < 30 && !(await next.evaluate((button) => button === document.activeElement)); tab++) {
          await page.keyboard.press("Tab");
        }
        await expect(next).toBeFocused();
        const reveal = question(page, item).locator(".question-reveal");
        await expectBackground(reveal, item);
        if (item.type === "single-choice" || item.type === "multiple-choice") {
          const right = item.options.filter((option) => option.correct).length;
          await expect(reveal.locator(".question-badge-right")).toHaveCount(right);
          await expect(reveal.locator(".question-badge-right").first()).toHaveText(de.rightOption);
        } else {
          await expect(reveal).toContainText(de.rightAnswer);
        }
      });

      test(`${item.id} (${item.type}): a wrong answer does not count`, async ({ page }) => {
        await page.goto(`./#${questionId(item)}`);
        await answerQuestion(page, item, wrongAnswer(item));
        await expect(question(page, item).locator(".question-feedback")).toContainText(de.wrong);
        await expectFeedbackInView(page, item);
        await expectBackground(question(page, item).locator(".question-reveal"), item);
        if (item.type === "single-choice" || item.type === "multiple-choice") {
          await expect(question(page, item).locator(".question-badge-chosen").first()).toHaveText(de.yourChoice);
        }
      });
    }

    test("the seed in the address gives the order; without one, the address gets one", async ({ page }) => {
      const everything = `&n=${quiz.questions.length}`;
      const order = async (address: string) => {
        await page.goto(address);
        return page.locator(".question").evaluateAll((items) => items.map((item) => item.id).join());
      };
      const first = await order(`./?seed=11${everything}`);
      expect(await order(`./?seed=11${everything}`)).toBe(first);
      if (quiz.questions.length > 2) {
        const others = [];
        for (const seed of [12, 13, 14, 15, 16]) others.push(await order(`./?seed=${seed}${everything}`));
        expect(others.some((other) => other !== first)).toBe(true);
      }
      await page.goto("./");
      await expect.poll(() => new URL(page.url()).searchParams.get("seed")).toMatch(/^\d+$/);
    });

    test("all right answers give the full score, then the solutions show", async ({ page }) => {
      await page.goto("./");
      if (quiz.questions.length > 1) await page.locator(".quiz-start button").click();
      expect(await page.evaluate(() => Object.keys(localStorage))).toEqual([]);
      for (let step = 0; step < quiz.questions.length; step++) {
        const id = await page.locator(".question:visible").getAttribute("data-id");
        const item = quiz.questions.find((candidate) => candidate.id === id);
        if (item === undefined) throw new Error(`no visible question at step ${step + 1}`);
        await answerQuestion(page, item, rightAnswer(item));
        await question(page, item).locator(".question-next").click();
      }
      const total = String(quiz.questions.length);
      await expect(page.locator(".quiz-score")).toHaveText(
        de.score.replace("{score}", total).replace("{total}", total),
      );
      await expect(page.locator("#loesungen")).toBeVisible();
      // only the last result, and only when the bank asks for it, under the app's own prefix
      const stored = await page.evaluate(() => Object.keys(localStorage));
      if (quiz.rememberLastResult === true) {
        expect(stored).toHaveLength(1);
        expect(stored[0]).toMatch(/^lernapps:.+:last-result$/);
      } else {
        expect(stored).toEqual([]);
      }
    });

    if (quiz.questions.length > 1) {
      test("the learner chooses how many questions to answer; the address keeps the choice", async ({ page }) => {
        await page.goto("./?seed=11");
        await expect(page.locator(".quiz-start")).toBeVisible();
        await expect(page.locator(".question:visible")).toHaveCount(0);
        const count = page.locator("#quiz-count");
        await expect(count).toHaveValue(String(quiz.questions.length));
        await expect(count).toHaveAttribute("max", String(quiz.questions.length));
        await count.fill("1");
        await page.locator(".quiz-start button").click();
        await expect(page.locator(".quiz-start")).toBeHidden();
        expect(new URL(page.url()).searchParams.get("n")).toBe("1");
        await expect(page.locator(".question")).toHaveCount(1);
        await expect(page.locator(".quiz-solution")).toHaveCount(1);
        const id = await page.locator(".question:visible").getAttribute("data-id");
        const item = quiz.questions.find((candidate) => candidate.id === id);
        if (item === undefined) throw new Error("no visible question");
        await answerQuestion(page, item, rightAnswer(item));
        await question(page, item).locator(".question-next").click();
        await expect(page.locator(".quiz-score")).toHaveText(de.score.replace("{score}", "1").replace("{total}", "1"));
        // the same address asks the same question, without asking again
        await page.goto(page.url());
        await expect(page.locator(".quiz-start")).toBeHidden();
        await expect(page.locator(".question")).toHaveCount(1);
        await expect(page.locator(".question")).toHaveAttribute("data-id", item.id);
      });
    }

    test.describe("without JavaScript", () => {
      test.use({ javaScriptEnabled: false });

      test("every question and its solution can be read", async ({ page }) => {
        await page.goto("./");
        for (const item of quiz.questions) {
          await expect(question(page, item).locator("legend")).toHaveText(item.text);
          await expectBackground(page.locator(`#loesung-${item.id}`), item);
        }
      });
    });

    for (const lang of languages.slice(1)) {
      const local = quizIn(all, lang);
      const words = messagesOf(lang);
      const address = `./${lang}/`;

      test.describe(`in ${lang}`, () => {
        test.describe("without JavaScript", () => {
          test.use({ javaScriptEnabled: false });

          test(`the page is in ${lang}, every question and its solution can be read, the switch leads to every language`, async ({
            page,
          }) => {
            await page.goto(address);
            await expect(page.locator("html")).toHaveAttribute("lang", lang);
            await expect(page.locator("h1")).toHaveText(local.title);
            await expect(page.locator("#loesungen h2")).toHaveText(words.solutions);
            for (const item of local.questions) {
              await expect(question(page, item).locator("legend")).toHaveText(item.text);
              await expectBackground(page.locator(`#loesung-${item.id}`), item);
            }
            for (const other of languages) {
              await expect(page.locator(`link[rel="alternate"][hreflang="${other}"]`)).toHaveCount(1);
            }
            for (const other of languages.filter((candidate) => candidate !== lang)) {
              await page.goto(address);
              await page.locator(`.page-languages a[hreflang="${other}"]`).click();
              await expect(page.locator("html")).toHaveAttribute("lang", other);
              await expect(page.locator("h1")).toHaveText(quizIn(all, other).title);
              await expect(page.locator('.page-languages a[aria-current="page"]')).toHaveAttribute("hreflang", other);
            }
          });
        });

        test(`one question, answered in ${lang}`, async ({ page }) => {
          const item = local.questions[0];
          if (item === undefined) throw new Error("the quiz has no questions");
          await page.goto(`${address}#${questionId(item)}`);
          await expect(question(page, item)).toBeVisible();
          await answerQuestion(page, item, rightAnswer(item), lang);
          await expect(question(page, item).locator(".question-feedback")).toContainText(words.right);
          await expectBackground(question(page, item).locator(".question-reveal"), item);
        });
      });
    }
  });
}
