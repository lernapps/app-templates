// One question in the browser, for every archetype that has questions (@lernapps/app-templates/questions): the page
// has rendered it (render.ts); startQuestion makes it live. A complete answer gets its feedback, right or wrong, with
// the most specific reason of a wrong answer; then the solution shows: the background of every option with the right
// ones and the learner's choice marked, the explanation and further reading. A question can also be tried again
// (retry), as an exercise is. The question's own texts are in the page's language (the option `lang`, German by
// default). The browser imports only this module of the questions (@lernapps/app-templates/questions/engine), which
// has no build-time code: its types and the id of a question. Used on the element that renderQuestion rendered:
//
//   startQuestion(element, question);
import { moveFocus } from "@lernapps/tooling/a11y";
import { translator } from "@lernapps/tooling/i18n";
import { textsIn } from "../languages.ts";
import { QUESTION_MESSAGES } from "./render.ts";
import {
  hash,
  isComplete,
  isCorrect,
  missesRight,
  shuffled,
  wrongReasons,
  type Answer,
  type Question,
} from "./question.ts";

/** The learner's answer as the form holds it; undefined when nothing is given yet. */
function readAnswer(question: Question, form: HTMLFormElement): Answer | undefined {
  const checked = [...form.querySelectorAll<HTMLInputElement>("input:checked")].map((input) => input.value);
  switch (question.type) {
    case "single-choice":
      return checked[0] === undefined ? undefined : Number(checked[0]);
    case "multiple-choice":
      return checked.map(Number);
    case "true-false":
      return checked[0] === undefined ? undefined : checked[0] === "true";
    case "number":
      return form.querySelector<HTMLInputElement>("input")?.value ?? "";
    case "ordering":
    case "matching": {
      const key = question.type === "ordering" ? "item" : "left";
      const answer: number[] = [];
      for (const select of form.querySelectorAll<HTMLSelectElement>(`select[data-${key}]`)) {
        answer[Number(select.dataset[key])] = select.value === "" ? -1 : Number(select.value);
      }
      return answer;
    }
  }
}

/** The indices of the options the learner chose, for the question types with options. */
function chosenOptions(question: Question, answer: Answer): number[] {
  if (question.type !== "single-choice" && question.type !== "multiple-choice") return [];
  return typeof answer === "number" ? [answer] : typeof answer === "object" ? [...answer] : [];
}

export { questionId, type Answer, type Question } from "./question.ts";

/** What a page that runs one question may set. */
export interface StartQuestionOptions {
  /** Shows the options of a choice in an order given by this seed and the question; as rendered without one. */
  seed?: number;
  /** The page's language, for the feedback (German by default; the question is already in it). */
  lang?: string;
  /** What went wrong in a wrong answer, e.g. a typical mistake; shown under the feedback before any other reason. */
  diagnose?: (answer: Answer) => string | undefined;
  /**
   * A wrong answer may be tried again, as an exercise does: the controls stay open, the feedback says why the answer
   * is wrong and offers "Lösung zeigen"; the solution shows only after the right answer or that button. Without it,
   * as in a quiz round, every complete answer locks the question and shows its solution at once.
   */
  retry?: boolean;
  /** Called on each complete answer, right or wrong; once in a quiz round, where the answer locks the question. */
  onAnswer?: (answer: Answer, right: boolean) => void;
  /** Called once, when the solution shows. */
  onReveal?: () => void;
  /** How a text of the question that the feedback quotes becomes HTML (its formulas); plain text without it. */
  format?: (text: string) => string;
}

/**
 * Makes one rendered question (`item`, the element of renderQuestion) live: the button to check it shows; a complete
 * answer gets its feedback, with a wrong one the most specific reason the question gives (the diagnosis, the
 * background of each wrong option chosen, a number's typical mistake, else its hint). Then the solution shows: the
 * background of every option with the right ones and the learner's choice marked, the explanation and further
 * reading; the controls are locked, the button to the next question shows if there is one, and the focus moves to the
 * feedback. With `retry`, a wrong answer keeps the controls open and offers "Lösung zeigen" instead. An incomplete
 * answer is asked to be completed.
 */
export function startQuestion(item: HTMLElement, question: Question, options: StartQuestionOptions = {}): void {
  const t = translator(textsIn(QUESTION_MESSAGES, options.lang ?? "de"));
  const form = item.querySelector("form");
  const feedback = item.querySelector<HTMLElement>(".question-feedback");
  const check = item.querySelector<HTMLButtonElement>(".question-check");
  const next = item.querySelector<HTMLButtonElement>(".question-next");
  if (!form || !feedback || !check) return;
  const doc = item.ownerDocument;
  // the options of a choice in an order of their own, from the seed and the question
  const fieldset = item.querySelector("fieldset");
  if (
    options.seed !== undefined &&
    fieldset &&
    (question.type === "single-choice" || question.type === "multiple-choice")
  ) {
    const labels = [...fieldset.querySelectorAll(".question-option")];
    for (const index of shuffled(labels.length, options.seed ^ hash(question.id))) {
      const label = labels[index];
      if (label) fieldset.append(label);
    }
  }
  const actions = item.querySelector<HTMLElement>(".question-actions");
  if (actions) actions.hidden = false;
  // "Lösung zeigen", after a wrong answer of a question that may be tried again
  let solve: HTMLButtonElement | undefined;
  if (options.retry === true) {
    solve = doc.createElement("button");
    solve.type = "button";
    solve.className = "question-solve";
    solve.textContent = t("showSolution");
    solve.hidden = true;
    check.after(" ", solve);
  }
  const line = (text: string, option?: string) => {
    const why = doc.createElement("p");
    why.className = "question-diagnosis";
    if (option !== undefined) {
      const name = doc.createElement("strong");
      if (options.format) name.innerHTML = `${options.format(option)}:`;
      else name.textContent = `${option}:`;
      why.append(name, " ");
    }
    if (options.format) why.insertAdjacentHTML("beforeend", options.format(text));
    else why.append(text);
    feedback.append(why);
  };
  let answered = false;
  let last: Answer | undefined;

  /** The solution: every option's background, the right ones marked, the learner's last choice marked too. */
  const reveal = () => {
    answered = true;
    const solution = item.querySelector<HTMLElement>(".question-reveal");
    for (const index of last === undefined ? [] : chosenOptions(question, last)) {
      const option = solution?.querySelector<HTMLElement>(`[data-option="${index}"]`);
      if (!option) continue;
      option.classList.add("question-info-chosen");
      const badge = doc.createElement("span");
      badge.className = "question-badge question-badge-chosen";
      badge.textContent = t("yourChoice");
      option.querySelector(".question-info-head")?.append(" ", badge);
    }
    if (solution) solution.hidden = false;
    for (const control of form.querySelectorAll<HTMLInputElement | HTMLSelectElement>("input, select")) {
      control.disabled = true;
    }
    check.hidden = true;
    if (solve) solve.hidden = true;
    if (next) next.hidden = false;
    options.onReveal?.();
  };

  form.addEventListener("submit", (event) => {
    event.preventDefault();
    if (answered) return;
    const answer = readAnswer(question, form);
    if (!isComplete(question, answer)) {
      feedback.textContent = t("incomplete");
      feedback.className = "question-feedback";
      return;
    }
    last = answer;
    const right = isCorrect(question, answer);
    feedback.className = `question-feedback ${right ? "question-right" : "question-wrong"}`;
    feedback.textContent = t(right ? "right" : "wrong");
    if (!right) {
      // the most specific reason: the diagnosis, else what the question says about this answer; the background of a
      // chosen option only where the solution does not show it right away
      const diagnosis = options.diagnose?.(answer);
      const reasons =
        diagnosis !== undefined
          ? [{ text: diagnosis }]
          : wrongReasons(question, answer).filter((reason) => options.retry === true || reason.option === undefined);
      for (const reason of reasons) line(reason.text, reason.option);
      const missing = missesRight(question, answer);
      if (diagnosis === undefined && missing) line(t("missingRight"));
      if (options.retry === true) {
        if (reasons.length === 0 && !missing) line(t("lookAgain"));
        line(t("tryAgain"));
      }
    }
    options.onAnswer?.(answer, right);
    if (right || options.retry !== true) reveal();
    else if (solve) solve.hidden = false;
    // the focus on the feedback, not on the button below the background: the feedback stays in view, a screen
    // reader reads it, and the next tab stops are the links of the background, then the button
    moveFocus(feedback);
  });
  solve?.addEventListener("click", () => {
    if (answered) return;
    reveal();
    // the focus on the solution, which shows below the feedback in place of the button
    moveFocus(item.querySelector<HTMLElement>(".question-reveal") ?? feedback);
  });
}
