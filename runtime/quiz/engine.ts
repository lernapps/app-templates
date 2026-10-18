// The quiz engine in the browser (@lernapps/app-templates/quiz). The build has rendered every question into the page
// (render.ts); the engine turns that page into a quiz: one question at a time in an order given by the seed in the
// address (?seed=<number>); after each answer, right or wrong, the background of every option with the right ones
// and the learner's choice marked, the explanation and further reading; the score and the solutions at the end. A deep
// link (#frage-<id>) opens its question. The quiz's own texts are in the page's language (its data's lang, German
// without one). Nothing is stored, except the last result on the device when the bank asks for it
// (rememberLastResult), through the storage of @lernapps/tooling. An app's src/main.ts is
//
//   import "@lernapps/app-templates/quiz/style.css";
//   import { startQuiz } from "@lernapps/app-templates/quiz";
//   startQuiz();
//
// One question on its own, as another archetype embeds it: startQuestion on the element that renderQuestion of
// @lernapps/app-templates/quiz/question rendered. The quiz runs each of its questions so.
import { announce, moveFocus } from "@lernapps/tooling/a11y";
import { translator } from "@lernapps/tooling/i18n";
import { createStorage } from "@lernapps/tooling/storage";
import de from "./messages/de.json" with { type: "json" };
import en from "./messages/en.json" with { type: "json" };
import {
  hash,
  isComplete,
  isCorrect,
  missesRight,
  questionId,
  shuffled,
  wrongReasons,
  type Answer,
  type Question,
} from "./quiz.ts";
import type { QuizData } from "./render.ts";

export * from "./quiz.ts";
export type { QuizData } from "./render.ts";

/** The quiz's texts, by the page's language. */
const BY_LANGUAGE: Readonly<Record<string, typeof de>> = { de, en };
const SEED = "seed";

interface LastResult {
  score: number;
  total: number;
}

const isLastResult = (value: unknown): value is LastResult =>
  typeof value === "object" &&
  value !== null &&
  "score" in value &&
  "total" in value &&
  typeof value.score === "number" &&
  typeof value.total === "number";

/** The seed in the address; a new one, written into the address, when there is none. */
function seedOf(location: Location): number {
  const url = new URL(location.href);
  const given = Number(url.searchParams.get(SEED));
  if (Number.isInteger(given) && given > 0) return given;
  const seed = 1 + Math.floor(Math.random() * 999_999);
  url.searchParams.set(SEED, String(seed));
  history.replaceState(history.state, "", url);
  return seed;
}

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
  const t = translator(BY_LANGUAGE[options.lang ?? "de"] ?? de);
  const form = item.querySelector("form");
  const feedback = item.querySelector<HTMLElement>(".quiz-feedback");
  const check = item.querySelector<HTMLButtonElement>(".quiz-check");
  const next = item.querySelector<HTMLButtonElement>(".quiz-next");
  if (!form || !feedback || !check) return;
  const doc = item.ownerDocument;
  // the options of a choice in an order of their own, from the seed and the question
  const fieldset = item.querySelector("fieldset");
  if (
    options.seed !== undefined &&
    fieldset &&
    (question.type === "single-choice" || question.type === "multiple-choice")
  ) {
    const labels = [...fieldset.querySelectorAll(".quiz-option")];
    for (const index of shuffled(labels.length, options.seed ^ hash(question.id))) {
      const label = labels[index];
      if (label) fieldset.append(label);
    }
  }
  const actions = item.querySelector<HTMLElement>(".quiz-actions");
  if (actions) actions.hidden = false;
  // "Lösung zeigen", after a wrong answer of a question that may be tried again
  let solve: HTMLButtonElement | undefined;
  if (options.retry === true) {
    solve = doc.createElement("button");
    solve.type = "button";
    solve.className = "quiz-solve";
    solve.textContent = t("showSolution");
    solve.hidden = true;
    check.after(" ", solve);
  }
  const line = (text: string, option?: string) => {
    const why = doc.createElement("p");
    why.className = "quiz-diagnosis";
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
    const solution = item.querySelector<HTMLElement>(".quiz-reveal");
    for (const index of last === undefined ? [] : chosenOptions(question, last)) {
      const option = solution?.querySelector<HTMLElement>(`[data-option="${index}"]`);
      if (!option) continue;
      option.classList.add("quiz-info-chosen");
      const badge = doc.createElement("span");
      badge.className = "quiz-badge quiz-badge-chosen";
      badge.textContent = t("yourChoice");
      option.querySelector(".quiz-info-head")?.append(" ", badge);
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
      feedback.className = "quiz-feedback";
      return;
    }
    last = answer;
    const right = isCorrect(question, answer);
    feedback.className = `quiz-feedback ${right ? "quiz-right" : "quiz-wrong"}`;
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
    moveFocus(item.querySelector<HTMLElement>(".quiz-reveal") ?? feedback);
  });
}

/** Starts the quiz on the page the build rendered; does nothing on a page without one. */
export function startQuiz(root: Document = document): void {
  const dataElement = root.getElementById("quiz-data");
  const main = root.getElementById("quiz");
  if (!dataElement || !main) return;
  const { quiz, storage: storageName, lang = "de" } = JSON.parse(dataElement.textContent ?? "{}") as QuizData;
  const t = translator(BY_LANGUAGE[lang] ?? de);
  const storage = storageName === undefined ? undefined : createStorage(storageName);
  const seed = seedOf(root.location);
  const order = shuffled(quiz.questions.length, seed).flatMap((index) => quiz.questions[index] ?? []);
  const answers = new Map<string, Answer>();
  const list = main.querySelector<HTMLElement>(".quiz-questions");
  const progress = main.querySelector<HTMLElement>(".quiz-progress");
  const result = main.querySelector<HTMLElement>(".quiz-result");
  const solutions = main.querySelector<HTMLElement>(".quiz-solutions");
  if (!list || !progress || !result || !solutions) return;

  main.classList.add("quiz-running");
  solutions.hidden = true;
  progress.hidden = false;
  const items = new Map<string, HTMLElement>();
  for (const question of order) {
    const item = root.getElementById(questionId(question));
    if (!item) continue;
    items.set(question.id, item);
    list.append(item); // in the order of the seed
    startQuestion(item, question, { seed, lang, onAnswer: (answer) => answers.set(question.id, answer) });
  }

  const show = (index: number, focus: boolean) => {
    order.forEach((question, at) => {
      const item = items.get(question.id);
      if (item) item.hidden = at !== index;
    });
    result.hidden = true;
    solutions.hidden = true;
    progress.textContent = t("progress", { current: index + 1, total: order.length });
    const legend = items.get(order[index]?.id ?? "")?.querySelector<HTMLElement>("legend");
    if (focus && legend) moveFocus(legend);
  };

  const finish = () => {
    for (const item of items.values()) item.hidden = true;
    progress.hidden = true;
    const right = order.filter((question) => {
      const answer = answers.get(question.id);
      return answer !== undefined && isCorrect(question, answer);
    }).length;
    const scoreText = main.querySelector(".quiz-score");
    if (scoreText) scoreText.textContent = t("score", { score: right, total: order.length });
    const last = storage?.load("last-result", isLastResult);
    const lastText = main.querySelector<HTMLElement>(".quiz-last");
    if (lastText && last) {
      lastText.textContent = t("last", { score: last.score, total: last.total });
      lastText.hidden = false;
    }
    storage?.save("last-result", { score: right, total: order.length } satisfies LastResult);
    const restart = main.querySelector<HTMLAnchorElement>(".quiz-restart");
    if (restart) restart.href = `?${SEED}=${1 + ((seed * 7919) % 999_999)}`;
    result.hidden = false;
    solutions.hidden = false;
    moveFocus(result);
    announce(scoreText?.textContent ?? "");
  };

  order.forEach((question, index) => {
    const next = items.get(question.id)?.querySelector<HTMLButtonElement>(".quiz-next");
    if (!next) return;
    const isLast = index === order.length - 1;
    if (isLast) next.textContent = t("toResult");
    next.addEventListener("click", () => {
      if (isLast) finish();
      else show(index + 1, true);
    });
  });

  const fromAddress = (focus: boolean) => {
    const hashId = decodeURIComponent(root.location.hash.slice(1));
    const index = order.findIndex((question) => questionId(question) === hashId);
    show(index >= 0 ? index : 0, focus || index >= 0);
  };
  globalThis.addEventListener("hashchange", () => fromAddress(true));
  fromAddress(false);
}
