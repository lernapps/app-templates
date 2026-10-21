// The per-question contract of the quiz runtime, from a consumer's side: a page that embeds one question of each type
// through @lernapps/app-templates/questions (rendering), @lernapps/app-templates/questions/engine (startQuestion) and
// @lernapps/app-templates/questions/e2e (the helpers). With JavaScript each question checks on its own: the right answer
// counts, a wrong one does not, an incomplete one is asked to be completed; after an answer the feedback is in view
// with the focus, the background of every option, the explanation and the links show, and there is no button to a
// next question. Without JavaScript each question and its controls can be read, and its solution opens in a
// <details>: the right answer, the background of every option, the explanation and the links.
import { readFileSync } from "node:fs";
import { answerQuestion, expectBackground, expectFeedbackInView } from "@lernapps/app-templates/questions/e2e";
import { messages, questionId, rightAnswer, wrongAnswer, type Question } from "@lernapps/app-templates/questions";
import { expect, test, type Page } from "playwright/test";

const questions = JSON.parse(readFileSync("src/questions.json", "utf8")) as Question[];
const exercise = (page: Page, item: Question) => page.locator(`#${questionId(item)}`);
const solution = (page: Page, item: Question) =>
  page.locator("section", { has: exercise(page, item) }).locator("details");

test("the page has one question of each type", () => {
  expect(new Set(questions.map((item) => item.type)).size).toBe(6);
});

test.describe("with JavaScript", () => {
  test.use({ reducedMotion: "reduce" });

  for (const item of questions) {
    test(`${item.id} (${item.type}): the right answer counts, the background shows`, async ({ page }) => {
      await page.goto("./");
      await answerQuestion(page, item, rightAnswer(item));
      await expect(exercise(page, item).locator(".question-feedback")).toHaveText(messages.right);
      await expectFeedbackInView(page, item);
      const reveal = exercise(page, item).locator(".question-reveal");
      await expectBackground(reveal, item);
      if (item.type === "single-choice" || item.type === "multiple-choice") {
        await expect(reveal.locator(".question-badge-right")).toHaveCount(item.options.filter((o) => o.correct).length);
      } else {
        await expect(reveal).toContainText(messages.rightAnswer);
      }
      await expect(exercise(page, item).getByRole("button", { name: messages.check })).toBeHidden();
      await expect(exercise(page, item).locator(".question-next")).toHaveCount(0);
      for (const control of await exercise(page, item).locator("input, select").all()) {
        await expect(control).toBeDisabled();
      }
    });

    test(`${item.id} (${item.type}): a wrong answer does not count`, async ({ page }) => {
      await page.goto("./");
      await answerQuestion(page, item, wrongAnswer(item));
      await expect(exercise(page, item).locator(".question-feedback")).toHaveText(messages.wrong);
      await expectFeedbackInView(page, item);
      await expectBackground(exercise(page, item).locator(".question-reveal"), item);
      if (item.type === "single-choice" || item.type === "multiple-choice") {
        await expect(exercise(page, item).locator(".question-badge-chosen").first()).toHaveText(messages.yourChoice);
      }
    });

    test(`${item.id} (${item.type}): no answer is asked for, then the right one counts`, async ({ page }) => {
      await page.goto("./");
      await exercise(page, item).getByRole("button", { name: messages.check }).click();
      await expect(exercise(page, item).locator(".question-feedback")).toHaveText(messages.incomplete);
      await expect(exercise(page, item).locator(".question-reveal")).toBeHidden();
      await answerQuestion(page, item, rightAnswer(item));
      await expect(exercise(page, item).locator(".question-feedback")).toHaveText(messages.right);
    });
  }

  test("each question checks on its own", async ({ page }) => {
    await page.goto("./");
    for (const [index, item] of questions.entries()) {
      await answerQuestion(page, item, index % 2 === 0 ? rightAnswer(item) : wrongAnswer(item));
    }
    for (const [index, item] of questions.entries()) {
      await expect(exercise(page, item).locator(".question-feedback")).toHaveText(
        index % 2 === 0 ? messages.right : messages.wrong,
      );
    }
  });
});

test.describe("without JavaScript", () => {
  test.use({ javaScriptEnabled: false });

  for (const item of questions) {
    test(`${item.id} (${item.type}): the question reads, its solution opens`, async ({ page }) => {
      await page.goto("./");
      await expect(exercise(page, item).locator("legend")).toHaveText(item.text);
      await expect(exercise(page, item).locator("input, select").first()).toBeVisible();
      await expect(exercise(page, item).getByRole("button", { name: messages.check })).toBeHidden();
      await expect(exercise(page, item).locator(".question-reveal")).toBeHidden();
      const details = solution(page, item);
      await expect(details.getByText(item.explanation, { exact: true })).toBeHidden();
      await details.getByText(messages.solution, { exact: true }).click();
      await expectBackground(details, item);
      if (item.type === "single-choice" || item.type === "multiple-choice") {
        await expect(details.locator(".question-badge-right")).toHaveCount(item.options.filter((o) => o.correct).length);
      } else {
        await expect(details).toContainText(messages.rightAnswer);
      }
    });
  }
});
