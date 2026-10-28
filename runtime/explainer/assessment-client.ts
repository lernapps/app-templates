// The self-assessment in the browser (assessment.ts), started by the client module (explainer.ts). On the start page
// or a chapter's page it shows the offer, which the build hid, and names the last result when the device keeps one.
// On the self-assessment's page it shows the intro, or the last result when the device keeps one. A start draws a new
// task of each generated exercise (a random task number) and shows the pages one by one, "Weiter" and "Zurück"
// between them: the exercises have no "Prüfen" and give no feedback. "Auswerten" checks them all together, keeps the
// result on the device (it replaces the one before) and shows it: for each content page whether the learner probably
// knows it, should look at it again or should read it, with its link. The way to the tutor takes the result along on
// a click: the self-assessment's tutor page with the result in its address, and a line per exercise (the input of a
// wrong one), in the address of the assistant chosen, or copied with the tutor page's Markdown. Nothing goes over the
// network but that click.
import { moveFocus } from "@lernapps/tooling/a11y";
import { createStorage } from "@lernapps/tooling/storage";
import { readAnswer } from "../shared/questions/engine.ts";
import { renderQuestion } from "../shared/questions/render.ts";
import { isComplete, isCorrect, type Question } from "../shared/questions/question.ts";
import {
  assessmentPrompt,
  isStoredResult,
  pageResults,
  resultQuery,
  type Band,
  type ItemResult,
} from "./assessment.ts";
import type { AssessmentData } from "./assessment-page.ts";
import { mistakeOf, questionFor } from "./generated/question.ts";
import { taskText } from "./generated/texts.ts";
import { generate } from "./generated/values.ts";
import { message, type Messages } from "./messages.ts";
import { answerShown } from "./result.ts";
import { randomTaskNumber } from "./tasks.ts";

/** A way to the tutor: an assistant of the app, or copying the text (no address). */
interface Way {
  name: string;
  url?: string;
  paste?: boolean;
}

/** What the self-assessment uses of the client module's way to the tutor (explainer.ts). */
export interface TutorWays {
  /** The way the learner switched on, if any, kept under the app's name `storage`, of the assistants `ways`. */
  chosen: (storage: string, ways: readonly Way[]) => Way | undefined;
  /** Opens the assistant `way` with the prompt, or copies it; `say` tells whether copying worked. */
  open: (
    way: Way | undefined,
    prompts: { start: () => string; copy: () => string | Promise<string>; placeholder: string },
    say: (copied: boolean | undefined) => void,
  ) => void;
  /** Shows in `hint` how the chosen option works, when it says so. */
  hint: (select: HTMLSelectElement, hint: HTMLElement | null) => void;
}

/** The value of copying the text in the select of the ways. */
const COPY = "copy";

/** The words of a band in the result. */
const BAND: Readonly<Record<Band, keyof Messages>> = {
  known: "assessmentKnown",
  partly: "assessmentPartly",
  read: "assessmentRead",
  unasked: "assessmentUnasked",
};

/** The offer on the start page or a chapter's page: shown, and naming the last result when the device keeps one. */
function startOffers(root: Document): void {
  for (const offer of root.querySelectorAll<HTMLElement>(".explainer-assessment-offer")) {
    const storage = createStorage(offer.dataset["storage"] ?? "explainer");
    const link = offer.querySelector<HTMLAnchorElement>(".explainer-assessment-link");
    const last = link?.dataset["last"];
    if (link && last !== undefined && storage.load(offer.dataset["key"] ?? "", isStoredResult) !== undefined) {
      link.textContent = last;
    }
    offer.hidden = false;
  }
}

/** One exercise of a run: how to read and check its answer. */
interface Live {
  question: Question;
  /** The task number of a generated exercise. */
  number?: number;
  /** The typical mistake a wrong answer makes, from 0. */
  mistake?: (answer: Parameters<typeof isCorrect>[1]) => number | undefined;
}

/** Starts the self-assessment's page, and the offers on the start page and the chapters' pages. */
export function startAssessment(root: Document, ways: TutorWays): void {
  startOffers(root);
  const box = root.querySelector<HTMLElement>(".explainer-assessment");
  const script = box?.querySelector("script.explainer-assessment-data");
  if (!box || !script) return;
  const data = JSON.parse(script.textContent ?? "{}") as AssessmentData;
  const lang = root.documentElement.lang;
  const t = (key: keyof Messages, params?: Readonly<Record<string, string>>) => message(lang, key, params);
  const storage = createStorage(data.storage);
  const intro = box.querySelector<HTMLElement>(".explainer-assessment-intro");
  const steps = [...box.querySelectorAll<HTMLElement>(".explainer-assessment-step")];
  const result = box.querySelector<HTMLElement>(".explainer-assessment-result");
  if (!intro || !result) return;
  for (const nojs of root.querySelectorAll<HTMLElement>(".explainer-assessment-nojs")) nojs.hidden = true;
  box.hidden = false;
  // an exercise's form never leaves the page: Enter in a field moves nowhere
  box.addEventListener("submit", (event) => event.preventDefault());

  const views = [intro, ...steps, result];
  const show = (view: HTMLElement, focus: boolean) => {
    for (const other of views) other.hidden = other !== view;
    const heading = view.querySelector<HTMLElement>("h2");
    if (focus && heading) moveFocus(heading);
  };

  // the exercises of the run
  const live = new Map<string, Live>();
  const element = (key: string) => box.querySelector<HTMLElement>(`.explainer-assessment-item[data-key="${key}"]`);

  /** A new run: a new task of each generated exercise, every answer empty, the first page. */
  const begin = () => {
    live.clear();
    for (const item of data.items) {
      const place = element(item.key);
      if (!place) continue;
      const exercise = item.data;
      if (exercise.kind === "question") {
        place.querySelector("form")?.reset();
        live.set(item.key, { question: exercise.question });
        continue;
      }
      const { spec, templates, seeds } = exercise;
      const number = randomTaskNumber(Math.max(seeds.length, 1));
      // the task number drawn, for the tests and a look at the page
      place.dataset["number"] = String(number);
      const task = generate(spec, seeds[number - 1] ?? number, exercise.data);
      const question = { ...questionFor(spec, task, lang, templates), id: item.key };
      const target = place.querySelector<HTMLElement>(".explainer-assessment-live");
      if (target)
        target.innerHTML = renderQuestion(question, { lang, textHtml: taskText(spec, task, lang, templates) });
      live.set(item.key, {
        question,
        number,
        mistake: (answer) => mistakeOf(spec, task, question, answer),
      });
    }
    const first = steps[0];
    if (first) show(first, true);
  };

  /** What became of each exercise of the run. */
  const evaluate = (): ItemResult[] =>
    data.items.map((item) => {
      const run = live.get(item.key);
      const form = element(item.key)?.querySelector("form");
      const base = { key: item.key, ref: item.ref, ...(run?.number === undefined ? {} : { number: run.number }) };
      if (!run || !form) return { ...base, state: "offen" };
      const answer = readAnswer(run.question, form);
      if (!isComplete(run.question, answer)) return { ...base, state: "offen" };
      if (isCorrect(run.question, answer)) return { ...base, state: "richtig" };
      const mistake = run.mistake?.(answer);
      return {
        ...base,
        state: "falsch",
        input: answerShown(run.question, answer, lang),
        ...(mistake === undefined ? {} : { mistake: mistake + 1 }),
      };
    });

  // the result
  const score = result.querySelector<HTMLElement>(".explainer-assessment-score");
  const advice = result.querySelector<HTMLElement>(".explainer-assessment-advice");
  const list = result.querySelector<HTMLElement>(".explainer-assessment-pages");
  const status = result.querySelector<HTMLElement>(".explainer-assessment-status");
  let shown: ItemResult[] = [];

  /** Shows the result of a run: the score, the advice, and each content page with its band. */
  const showResult = (results: ItemResult[], focus: boolean) => {
    shown = results;
    const pageOf = Object.fromEntries(data.items.map((item) => [item.key, item.page]));
    const pages = pageResults(
      data.pages.map((page) => page.page),
      pageOf,
      results,
    );
    const right = results.filter((one) => one.state === "richtig").length;
    if (score) score.textContent = t("assessmentScore", { right: String(right), total: String(results.length) });
    if (advice) {
      const open = pages.some((page) => page.band === "read" || page.band === "partly");
      advice.textContent = t(open ? "assessmentAdvice" : "assessmentAllKnown");
    }
    if (list) {
      list.replaceChildren(
        ...pages.map((page) => {
          const info = data.pages.find((candidate) => candidate.page === page.page);
          const item = root.createElement("li");
          item.className = "explainer-assessment-page";
          item.dataset["band"] = page.band;
          const link = root.createElement("a");
          link.href = info?.href ?? "";
          link.textContent = info?.title ?? page.page;
          const band = root.createElement("strong");
          band.textContent = t(BAND[page.band]);
          item.append(link, " ", band);
          if (page.total > 0) {
            const count = root.createElement("span");
            count.className = "explainer-assessment-count";
            count.textContent = t("assessmentPageScore", { right: String(page.right), total: String(page.total) });
            item.append(" ", count);
          }
          return item;
        }),
      );
    }
    if (status) status.textContent = "";
    show(result, focus);
  };

  // the way to the tutor
  const select = result.querySelector<HTMLSelectElement>(".explainer-assessment-way");
  const go = result.querySelector<HTMLButtonElement>(".explainer-assessment-go");
  const said = result.querySelector<HTMLElement>(".explainer-assessment-tutor-status");
  const hint = result.querySelector<HTMLElement>(".explainer-tutor-hint");
  if (select && go) {
    const chosen = ways.chosen(data.storage, data.ways);
    if (chosen !== undefined) select.value = chosen.url === undefined ? COPY : chosen.name;
    const way = (): Way | undefined =>
      select.value === COPY ? { name: COPY } : data.ways.find((candidate) => candidate.name === select.value);
    const label = () => {
      const current = way();
      go.textContent = current?.url === undefined ? t("tutorCopy") : t("assessmentTutorGo", { name: current.name });
      ways.hint(select, hint);
    };
    select.addEventListener("change", label);
    label();
    go.addEventListener("click", () => {
      const href = root.location.href;
      const base = new URL(data.root, href);
      const tutor = new URL(`${data.tutor}${resultQuery(shown)}`, base).href;
      const items = data.items.map((item) => ({
        key: item.key,
        page: data.pages.find((page) => page.page === item.page)?.title ?? item.page,
        exercise: item.exercise,
      }));
      const prompt = () => assessmentPrompt(tutor, items, shown, lang);
      const copy = async () => {
        try {
          const response = await fetch(new URL(data.markdown, base).href);
          if (response.ok) return `${prompt()}\n\n${(await response.text()).trimEnd()}\n`;
        } catch {
          // not reachable: the prompt names the tutor page
        }
        return prompt();
      };
      ways.open(way(), { start: prompt, copy, placeholder: data.placeholder }, (copied) => {
        if (said) said.textContent = copied === undefined ? "" : t(copied ? "tutorCopied" : "tutorCopyFailed");
      });
    });
  }

  // the buttons
  box.querySelector(".explainer-assessment-begin")?.addEventListener("click", begin);
  steps.forEach((step, index) => {
    step.querySelector(".explainer-assessment-back")?.addEventListener("click", () => {
      const before = steps[index - 1];
      if (before) show(before, true);
    });
    step.querySelector(".explainer-assessment-next")?.addEventListener("click", () => {
      const after = steps[index + 1];
      if (after) show(after, true);
    });
    step.querySelector(".explainer-assessment-finish")?.addEventListener("click", () => {
      const results = evaluate();
      storage.save(data.key, { version: 1, items: results });
      showResult(results, true);
    });
  });
  result.querySelector(".explainer-assessment-restart")?.addEventListener("click", begin);
  result.querySelector(".explainer-assessment-delete")?.addEventListener("click", () => {
    storage.remove(data.key);
    show(intro, false);
    const button = intro.querySelector<HTMLElement>(".explainer-assessment-begin");
    if (button) button.focus();
    const line = root.createElement("p");
    line.className = "explainer-assessment-deleted";
    line.setAttribute("role", "status");
    line.textContent = t("assessmentDeleted");
    intro.querySelector(".explainer-assessment-deleted")?.remove();
    intro.prepend(line);
  });

  // the last result, when the device keeps one of exercises the content still has
  const stored = storage.load(data.key, isStoredResult);
  const kept = stored?.items.filter((one) => data.items.some((item) => item.key === one.key && item.ref === one.ref));
  if (kept !== undefined && kept.length > 0) showResult(kept, false);
  else show(intro, false);
}
