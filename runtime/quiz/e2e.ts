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
import { readFileSync } from "node:fs";
import { expect, test, type Locator, type Page } from "playwright/test";
import de from "./messages/de.json" with { type: "json" };
import { rightAnswer, wrongAnswer, type Answer, type Question, type Quiz } from "./quiz.ts";

const question = (page: Page, item: Question) => page.locator(`#frage-${item.id}`);

/** Gives `answer` to the question through its controls, as a learner does. */
export async function answerQuestion(page: Page, item: Question, answer: Answer): Promise<void> {
  const form = question(page, item);
  switch (item.type) {
    case "single-choice":
    case "multiple-choice":
    case "true-false": {
      const values = typeof answer === "object" ? answer.map(String) : [String(answer)];
      for (const value of values) await form.locator(`input[value="${value}"]`).check();
      break;
    }
    case "number":
      await form.locator("input").fill(String(answer));
      break;
    case "ordering":
    case "matching": {
      if (typeof answer !== "object") throw new Error(`${item.id}: an ${item.type} answer is a list`);
      const key = item.type === "ordering" ? "item" : "left";
      for (const [index, value] of answer.entries()) {
        await form.locator(`select[data-${key}="${index}"]`).selectOption(String(value));
      }
      break;
    }
  }
  await form.getByRole("button", { name: de.check }).click();
}

/** What the learner learns about a question shows in `where`: each option's background, the explanation, the links. */
export async function expectBackground(where: Locator, item: Question): Promise<void> {
  if (item.type === "single-choice" || item.type === "multiple-choice") {
    for (const option of item.options) {
      await expect(where.getByText(option.info, { exact: true })).toBeVisible();
      if (option.link) await expect(where.locator(`a[href="${option.link.url}"]`).first()).toBeVisible();
    }
  }
  await expect(where.getByText(item.explanation, { exact: true })).toBeVisible();
  for (const link of item.links) {
    const anchor = where.locator(`a[href="${link.url}"]`).first();
    await expect(anchor).toBeVisible();
    await expect(anchor).toHaveAttribute("rel", "noopener");
  }
}

/** After an answer, the learner sees the feedback without scrolling back; it has the focus, the next button follows. */
export async function expectFeedbackInView(page: Page, item: Question): Promise<void> {
  const feedback = question(page, item).locator(".quiz-feedback");
  const top = await feedback.evaluate((element) => element.getBoundingClientRect().top);
  const height = await page.evaluate(() => innerHeight);
  expect(top, "the top of the feedback is in the viewport").toBeGreaterThanOrEqual(0);
  expect(top, "the top of the feedback is in the viewport").toBeLessThan(height);
  await expect(feedback).toBeFocused();
}

/** The quiz's tests, for the question bank in `bank` (relative to the app's root). */
export function quizTests(bank = "src/quiz.json"): void {
  const quiz = JSON.parse(readFileSync(bank, "utf8")) as Quiz;

  test.describe("quiz", () => {
    // The runtime scrolls smoothly unless the learner asks for less motion (quiz.css) and moves the focus after every
    // answer: with motion, every click would wait for a scroll to settle, the run through a quiz grow with its size.
    test.use({ reducedMotion: "reduce" });

    for (const item of quiz.questions) {
      test(`${item.id} (${item.type}): its link opens it and the right answer counts`, async ({ page }) => {
        await page.goto(`./#frage-${item.id}`);
        await expect(question(page, item)).toBeVisible();
        await expect(page.locator(".quiz-question:visible")).toHaveCount(1);
        await answerQuestion(page, item, rightAnswer(item));
        await expect(question(page, item).locator(".quiz-feedback")).toContainText(de.right);
        await expectFeedbackInView(page, item);
        // from the feedback, the keyboard reaches the next question (past the links of the background)
        const next = question(page, item).locator(".quiz-next");
        for (let tab = 0; tab < 30 && !(await next.evaluate((button) => button === document.activeElement)); tab++) {
          await page.keyboard.press("Tab");
        }
        await expect(next).toBeFocused();
        const reveal = question(page, item).locator(".quiz-reveal");
        await expectBackground(reveal, item);
        if (item.type === "single-choice" || item.type === "multiple-choice") {
          const right = item.options.filter((option) => option.correct).length;
          await expect(reveal.locator(".quiz-badge-right")).toHaveCount(right);
          await expect(reveal.locator(".quiz-badge-right").first()).toHaveText(de.rightOption);
        } else {
          await expect(reveal).toContainText(de.rightAnswer);
        }
      });

      test(`${item.id} (${item.type}): a wrong answer does not count`, async ({ page }) => {
        await page.goto(`./#frage-${item.id}`);
        await answerQuestion(page, item, wrongAnswer(item));
        await expect(question(page, item).locator(".quiz-feedback")).toContainText(de.wrong);
        await expectFeedbackInView(page, item);
        await expectBackground(question(page, item).locator(".quiz-reveal"), item);
        if (item.type === "single-choice" || item.type === "multiple-choice") {
          await expect(question(page, item).locator(".quiz-badge-chosen").first()).toHaveText(de.yourChoice);
        }
      });
    }

    test("the seed in the address gives the order; without one, the address gets one", async ({ page }) => {
      const order = async (address: string) => {
        await page.goto(address);
        return page.locator(".quiz-question").evaluateAll((items) => items.map((item) => item.id).join());
      };
      const first = await order("./?seed=11");
      expect(await order("./?seed=11")).toBe(first);
      if (quiz.questions.length > 2) {
        const others = [];
        for (const seed of [12, 13, 14, 15, 16]) others.push(await order(`./?seed=${seed}`));
        expect(others.some((other) => other !== first)).toBe(true);
      }
      await page.goto("./");
      await expect.poll(() => new URL(page.url()).searchParams.get("seed")).toMatch(/^\d+$/);
    });

    test("all right answers give the full score, then the solutions show", async ({ page }) => {
      await page.goto("./");
      expect(await page.evaluate(() => Object.keys(localStorage))).toEqual([]);
      for (let step = 0; step < quiz.questions.length; step++) {
        const id = await page.locator(".quiz-question:visible").getAttribute("data-id");
        const item = quiz.questions.find((candidate) => candidate.id === id);
        if (item === undefined) throw new Error(`no visible question at step ${step + 1}`);
        await answerQuestion(page, item, rightAnswer(item));
        await question(page, item).locator(".quiz-next").click();
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
  });
}
