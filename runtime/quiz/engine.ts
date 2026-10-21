// The quiz engine in the browser (@lernapps/app-templates/quiz). The build has rendered every question into the page
// (render.ts); the engine turns that page into a quiz: one question at a time in an order given by the seed in the
// address (?seed=<number>), as many as the learner chooses at the start (?n=<number>, all by default); after each answer, right or wrong, the background of every option with the right ones
// and the learner's choice marked, the explanation and further reading; the score and the solutions at the end, with confetti from 80% right and fireworks for all right. A deep
// link (#frage-<id>) opens its question. The quiz's own texts are in the page's language (its data's lang, German
// without one). Nothing is stored, except the last result on the device when the bank asks for it
// (rememberLastResult), through the storage of @lernapps/tooling. An app's src/main.ts is
//
//   import "@lernapps/app-templates/quiz/style.css";
//   import { startQuiz } from "@lernapps/app-templates/quiz";
//   startQuiz();
//
// One question on its own (startQuestion, shared/questions/engine.ts): the quiz runs each of its questions so.
import { announce, moveFocus } from "@lernapps/tooling/a11y";
import { translator } from "@lernapps/tooling/i18n";
import { createStorage } from "@lernapps/tooling/storage";
import de from "./messages/de.json" with { type: "json" };
import en from "./messages/en.json" with { type: "json" };
import { startQuestion } from "../shared/questions/engine.ts";
import { isCorrect, questionId, shuffled, type Answer } from "../shared/questions/question.ts";
import { solutionId, type QuizData } from "./render.ts";

/** The quiz's texts, by the page's language. */
const BY_LANGUAGE: Readonly<Record<string, typeof de>> = { de, en };
const SEED = "seed";
const COUNT = "n";

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

/** The number of questions in the address (?n=<number>), if it is one from 1 to `total`. */
function countOf(location: Location, total: number): number | undefined {
  const given = Number(new URL(location.href).searchParams.get(COUNT));
  return Number.isInteger(given) && given >= 1 && given <= total ? given : undefined;
}

/** The share of right answers from which the result rains confetti; all right gives fireworks instead. */
const CONFETTI_FROM = 0.8;

/**
 * Celebrates a result on a layer over the page that takes no clicks and is hidden for those who prefer less motion
 * (quiz.css): confetti from 80% right, fireworks for all right. Positions, delays and colours are fixed by index, so
 * the same result always looks the same.
 */
function celebrate(root: Document, right: number, total: number): HTMLElement | undefined {
  if (total === 0 || right / total < CONFETTI_FROM) return undefined;
  const layer = root.createElement("div");
  layer.setAttribute("aria-hidden", "true");
  const add = (parent: HTMLElement, tag: string, style: Record<string, string>): HTMLElement => {
    const element = root.createElement(tag);
    for (const [name, value] of Object.entries(style)) element.style.setProperty(name, value);
    parent.append(element);
    return element;
  };
  if (right === total) {
    layer.className = "quiz-celebration quiz-fireworks";
    const bursts = [
      { left: "24%", top: "26%", delay: "0.3s", hue: 20 },
      { left: "76%", top: "22%", delay: "0.9s", hue: 200 },
      { left: "50%", top: "40%", delay: "1.5s", hue: 320 },
      { left: "18%", top: "58%", delay: "2.1s", hue: 140 },
      { left: "82%", top: "56%", delay: "2.7s", hue: 50 },
    ];
    for (const burst of bursts) {
      const element = add(layer, "span", { left: burst.left, top: burst.top, "--hue": String(burst.hue) });
      element.className = "quiz-burst";
      for (let index = 0; index < 28; index++) {
        const spark = add(element, "i", {
          "--angle": `${index * (360 / 28)}deg`,
          "--far": index % 2 === 0 ? "1" : "0.6",
        });
        spark.style.animationDelay = burst.delay;
      }
    }
  } else {
    layer.className = "quiz-celebration quiz-confetti";
    for (let index = 0; index < 28; index++) {
      const piece = add(layer, "span", {
        left: `${(index * 37) % 100}%`,
        "--hue": String((index * 47) % 360),
        "--turn": `${(index % 2 === 0 ? 1 : -1) * (180 + ((index * 29) % 360))}deg`,
      });
      piece.style.animationDelay = `${((index * 53) % 100) / 100}s`;
    }
  }
  root.body.append(layer);
  return layer;
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
  const total = quiz.questions.length;
  const shuffledQuestions = shuffled(total, seed).flatMap((index) => quiz.questions[index] ?? []);
  const hashId = decodeURIComponent(root.location.hash.slice(1));
  const list = main.querySelector<HTMLElement>(".quiz-questions");
  const progress = main.querySelector<HTMLElement>(".quiz-progress");
  const result = main.querySelector<HTMLElement>(".quiz-result");
  const solutions = main.querySelector<HTMLElement>(".quiz-solutions");
  if (!list || !progress || !result || !solutions) return;
  const heading = main.querySelector<HTMLElement>(".quiz-heading");
  const form = main.querySelector<HTMLFormElement>(".quiz-start");

  /** Runs the quiz with the first `count` questions in the order of the seed. */
  const run = (count: number) => {
    const order = shuffledQuestions.slice(0, count);
    // a link to a question that this run does not ask puts that question first, so every question keeps its link
    const linked = shuffledQuestions.find((question) => questionId(question) === hashId);
    if (linked && !order.includes(linked)) order[0] = linked;
    const answers = new Map<string, Answer>();

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
    // the questions this run does not ask: neither the question nor its solution
    for (const question of quiz.questions.filter((candidate) => !order.includes(candidate))) {
      root.getElementById(questionId(question))?.remove();
      root.getElementById(solutionId(question))?.remove();
    }

    let celebration: HTMLElement | undefined;
    const show = (index: number, focus: boolean) => {
      celebration?.remove();
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
      if (restart) restart.href = `?${SEED}=${1 + ((seed * 7919) % 999_999)}&${COUNT}=${order.length}`;
      result.hidden = false;
      solutions.hidden = false;
      celebration?.remove();
      celebration = celebrate(root, right, order.length);
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
  };

  const given = countOf(root.location, total);
  // the learner chooses how many questions to answer, unless the address already says (or links to a question)
  if (given !== undefined || hashId !== "" || !form || total < 2) {
    run(given ?? total);
    return;
  }
  const input = form.querySelector<HTMLInputElement>("input");
  if (!input) return run(total);
  list.hidden = true;
  solutions.hidden = true;
  if (heading) heading.hidden = true;
  form.hidden = false;
  form.addEventListener("submit", (event) => {
    event.preventDefault();
    const count = Math.min(total, Math.max(1, Math.floor(Number(input.value)) || total));
    const url = new URL(root.location.href);
    url.searchParams.set(COUNT, String(count));
    history.replaceState(history.state, "", url);
    form.hidden = true;
    list.hidden = false;
    if (heading) heading.hidden = false;
    run(count);
  });
}
