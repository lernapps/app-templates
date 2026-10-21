// The end-to-end helpers for a question on any page with a question that renderQuestion
// (@lernapps/app-templates/questions) rendered and startQuestion made live: answerQuestion gives an answer through
// the question's controls, as a learner does; expectBackground and expectFeedbackInView check what the learner then
// sees. Run by the end-to-end tests of the archetypes that have questions.
import { expect, type Locator, type Page } from "playwright/test";
import { textsIn } from "../languages.ts";
import { QUESTION_MESSAGES } from "./render.ts";
import { questionId, type Answer, type Question } from "./question.ts";

/** The question's own texts in `lang`. */
const messagesOf = (lang: string) => textsIn(QUESTION_MESSAGES, lang);

export const question = (page: Page, item: Question) => page.locator(`#${questionId(item)}`);

/** Gives `answer` to the question through its controls, as a learner does, on a page in `lang`. */
export async function answerQuestion(page: Page, item: Question, answer: Answer, lang = "de"): Promise<void> {
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
  await form.getByRole("button", { name: messagesOf(lang).check }).click();
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
  const feedback = question(page, item).locator(".question-feedback");
  const top = await feedback.evaluate((element) => element.getBoundingClientRect().top);
  const height = await page.evaluate(() => innerHeight);
  expect(top, "the top of the feedback is in the viewport").toBeGreaterThanOrEqual(0);
  expect(top, "the top of the feedback is in the viewport").toBeLessThan(height);
  await expect(feedback).toBeFocused();
}
