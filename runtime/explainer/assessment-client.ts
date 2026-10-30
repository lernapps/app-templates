// The self-assessment in the browser (assessment.ts), started by the client module (explainer.ts). It puts into the
// page what the build wrote into a <template> for it. On the start page or a chapter's page it shows the offer, and names the last result when the device keeps one.
// On the self-assessment's page it shows the intro, or the last result when the device keeps one. A start draws a new
// task of each generated exercise and exercise component (a random task number; the islands show a component's task,
// islands.ts) and shows the pages one by one, "Weiter" and "Zurück"
// between them: the exercises have no "Prüfen" and give no feedback. "Auswerten" checks them all together, keeps the
// result on the device (it replaces the one before) and shows it: for each content page whether the learner probably
// knows it, should look at it again or should read it, with its link. The way to the tutor takes the result along on
// a click: the self-assessment's tutor page with the result in its address, and a line per exercise (the input of a
// wrong one), in the address of the assistant chosen, or copied with the tutor page's Markdown. Nothing goes over the
// network but that click.
import { moveFocus } from "@lernapps/tooling/a11y";
import { createStorage } from "@lernapps/tooling/storage";
import { withLanguage, withNeeds, type NeedsChoice } from "./needs.ts";
import { readAnswer } from "../shared/questions/engine.ts";
import { renderQuestion } from "../shared/questions/render.ts";
import { isComplete, isCorrect, shuffled, type Question } from "../shared/questions/question.ts";
import {
  assessmentPrompt,
  BAND_MESSAGES,
  linkLines,
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
import {
  ASSESSMENT_ANSWER_EVENT,
  ASSESSMENT_TASK_EVENT,
  ASSESSMENT_UNPACKED_EVENT,
  randomTaskNumber,
  type AssessmentAnswer,
} from "./tasks.ts";

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
  /** The needs the learner chose for the tutor, kept under the app's name `storage` or for every explainer. */
  needs: (storage: string) => NeedsChoice | undefined;
  /** Whether a tutor opened the page (via=tutor): its chat runs already. */
  running: boolean;
  /**
   * Copies `text` for the running chat: `button` says it is copied and where to paste it (the assistant switched on
   * under the app's name `storage`, of `ways`), and `place` says it too.
   */
  back: (text: string, button: HTMLButtonElement, place: HTMLElement, storage: string, ways: readonly Way[]) => void;
}

/** The value of copying the text in the select of the ways. */
const COPY = "copy";

/** The words of a band in the result. */
const BAND: Readonly<Record<Band, keyof Messages>> = BAND_MESSAGES;

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

/**
 * The options of a choice in an order of its own, new for each run, so that a second run asks the question, not the
 * place of its answer.
 */
function mix(place: HTMLElement, question: Question): void {
  if (question.type !== "single-choice" && question.type !== "multiple-choice") return;
  const options = [...place.querySelectorAll<HTMLElement>(".question-option")];
  const parent = options[0]?.parentElement;
  if (!parent) return;
  for (const index of shuffled(options.length, Math.floor(Math.random() * 2 ** 31))) {
    const option = options[index];
    if (option) parent.append(option);
  }
}

/** A task number of 1 to `count`, at random, avoiding the numbers in `avoid` while others are left. */
function drawNumber(count: number, avoid: readonly ReadonlySet<number>[]): number {
  const left = Array.from({ length: count }, (_n, index) => index + 1).filter((n) => avoid.every((set) => !set.has(n)));
  return left.length === 0 ? randomTaskNumber(count) : (left[Math.floor(Math.random() * left.length)] ?? 1);
}

/** The task numbers of the round before, by exercise (its ref), from the address's vorher=a1.28,a4.2. */
function previousNumbers(href: string, items: readonly { key: string; ref: string }[]): Map<string, Set<number>> {
  const numbers = new Map<string, Set<number>>();
  for (const pair of (new URL(href).searchParams.get("vorher") ?? "").split(",")) {
    const [key, n] = pair.split(".");
    const ref = items.find((item) => item.key === key)?.ref;
    if (ref === undefined || !Number.isInteger(Number(n))) continue;
    numbers.set(ref, (numbers.get(ref) ?? new Set<number>()).add(Number(n)));
  }
  return numbers;
}

/**
 * One exercise of a run: how to read and check its answer; of an exercise component, the islands judge it
 * (`component`).
 */
interface Live {
  question?: Question;
  component?: true;
  /** The task number of a generated exercise or an exercise component. */
  number?: number;
  /** The typical mistake a wrong answer makes, from 0. */
  mistake?: (answer: Parameters<typeof isCorrect>[1]) => number | undefined;
}

/** Puts what the build wrote for JavaScript into the page: each <template> of a self-assessment, in its place. */
function unpack(root: Document): void {
  for (const template of root.querySelectorAll<HTMLTemplateElement>("template.explainer-assessment-template")) {
    template.replaceWith(root.importNode(template.content, true));
  }
  // the islands hydrate the exercise components in it now
  root.dispatchEvent(new CustomEvent(ASSESSMENT_UNPACKED_EVENT));
}

/** Starts the self-assessment's page, and the offers on the start page and the chapters' pages. */
export function startAssessment(root: Document, ways: TutorWays): void {
  unpack(root);
  startOffers(root);
  const box = root.querySelector<HTMLElement>(".explainer-assessment");
  const script = box?.querySelector("script.explainer-assessment-data");
  if (!box || !script) return;
  const data = JSON.parse(script.textContent ?? "{}") as AssessmentData;
  const lang = root.documentElement.lang;
  const t = (key: keyof Messages, params?: Readonly<Record<string, string>>) => message(lang, key, params);
  // a run a tutor opened is no self-assessment of the learner's: the device keeps nothing of it
  const storage = ways.running ? undefined : createStorage(data.storage);
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

  // the exercises of the run, and the answer each exercise component has now, as the islands judged it
  const live = new Map<string, Live>();
  const answers = new Map<string, AssessmentAnswer>();
  box.addEventListener(ASSESSMENT_ANSWER_EVENT, (event) => {
    const key = (event.target as HTMLElement).closest<HTMLElement>(".explainer-assessment-item")?.dataset["key"];
    const answer = (event as CustomEvent<AssessmentAnswer | null>).detail;
    // none: emptied, incomplete, or one the logic cannot read
    if (key !== undefined) {
      if (answer === null) answers.delete(key);
      else answers.set(key, answer);
    }
  });
  const element = (key: string) => box.querySelector<HTMLElement>(`.explainer-assessment-item[data-key="${key}"]`);

  // the task numbers of the round before, which a tutor's link names (vorher=a1.28,a4.2): a new round avoids them
  const before = previousNumbers(root.location.href, data.items);

  /** A new run: a new task of each generated exercise, every answer empty, the options mixed, the first page. */
  const begin = () => {
    live.clear();
    answers.clear();
    // the task numbers drawn of each exercise: listed again, it draws another
    const drawn = new Map<string, Set<number>>();
    for (const item of data.items) {
      const place = element(item.key);
      if (!place) continue;
      const exercise = item.data;
      if (exercise.kind === "question") {
        place.querySelector("form")?.reset();
        mix(place, exercise.question);
        live.set(item.key, { question: exercise.question });
        continue;
      }
      const { seeds } = exercise;
      const used = drawn.get(item.ref) ?? new Set<number>();
      drawn.set(item.ref, used);
      const number = drawNumber(Math.max(seeds.length, 1), [used, before.get(item.ref) ?? new Set<number>()]);
      used.add(number);
      // the task number drawn, for the tests and a look at the page
      place.dataset["number"] = String(number);
      if (exercise.kind === "component") {
        // the islands show its task: at once when hydrated, else when they hydrate it
        const component = place.querySelector<HTMLElement>(".explainer-component");
        const seed = seeds[number - 1] ?? number;
        if (component) {
          component.dataset["seed"] = String(seed);
          component.dispatchEvent(new CustomEvent(ASSESSMENT_TASK_EVENT, { detail: { seed } }));
        }
        live.set(item.key, { component: true, number });
        continue;
      }
      const { spec, templates } = exercise;
      const task = generate(spec, seeds[number - 1] ?? number, exercise.data);
      const question = { ...questionFor(spec, task, lang, templates), id: item.key };
      const target = place.querySelector<HTMLElement>(".explainer-assessment-live");
      if (target)
        target.innerHTML = renderQuestion(question, { lang, textHtml: taskText(spec, task, lang, templates) });
      mix(place, question);
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
      if (run?.component === true) {
        const answer = answers.get(item.key);
        if (answer === undefined) return { ...base, state: "offen" };
        if (answer.correct) return { ...base, state: "richtig" };
        return {
          ...base,
          state: "falsch",
          ...(answer.answer === undefined ? {} : { input: answer.answer }),
          ...(answer.mistake === undefined ? {} : { mistake: answer.mistake + 1 }),
        };
      }
      if (!run?.question || !form) return { ...base, state: "offen" };
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

  // the full address of every page and self-assessment, as the browser has them: the tutor builds none itself
  const links = () => linkLines(new URL(data.root, root.location.href).href, data.chapters, data.whole, lang);

  // what the prompt says of the exercises and of each content page
  const promptItems = () =>
    data.items.map((item) => ({
      key: item.key,
      page: data.pages.find((page) => page.page === item.page)?.title ?? item.page,
      exercise: item.exercise,
    }));
  const promptPages = () =>
    pageResults(
      data.pages.map((page) => page.page),
      Object.fromEntries(data.items.map((item) => [item.key, item.page])),
      shown,
    ).map((page) => ({ ...page, title: data.pages.find((one) => one.page === page.page)?.title ?? page.page }));

  // the way to the tutor
  const select = result.querySelector<HTMLSelectElement>(".explainer-assessment-way");
  const go = result.querySelector<HTMLButtonElement>(".explainer-assessment-go");
  const said = result.querySelector<HTMLElement>(".explainer-assessment-tutor-status");
  const hint = result.querySelector<HTMLElement>(".explainer-tutor-hint");
  const tutorBox = result.querySelector<HTMLElement>(".explainer-assessment-tutor");
  if (ways.running && tutorBox) {
    // the chat runs: "Zurück zum Tutor" copies the result for it, as every page a tutor opened does
    const back = root.createElement("button");
    back.type = "button";
    back.className = "explainer-assessment-back-to-tutor";
    back.textContent = t("backToTutor");
    const intro = root.createElement("p");
    intro.textContent = t("assessmentBackIntro");
    const row = root.createElement("p");
    row.append(back);
    tutorBox.replaceChildren(intro, row);
    back.addEventListener("click", () => {
      const base = new URL(data.root, root.location.href);
      const tutor = new URL(`${data.tutor}${resultQuery(shown)}`, base).href;
      // the link of the next round: the same self-assessment, with the task numbers of this one to avoid
      const next = new URL(root.location.href);
      next.search = "";
      next.hash = "";
      next.searchParams.set("via", "tutor");
      const numbers = shown.flatMap((one) => (one.number === undefined ? [] : [`${one.key}.${one.number}`]));
      if (numbers.length > 0) next.searchParams.set("vorher", numbers.join(","));
      const lines = assessmentPrompt(tutor, promptItems(), shown, lang, promptPages(), "back", links());
      ways.back(
        `${lines}\n${t("assessmentNextRound", { url: next.href.replace(/%2C/g, ",") })}`,
        back,
        tutorBox,
        data.storage,
        data.ways,
      );
    });
    result.querySelector(".explainer-assessment-delete")?.remove();
    const privacy = root.querySelector<HTMLElement>(".explainer-assessment-privacy");
    if (privacy) privacy.textContent = t("assessmentTutorRun");
  } else if (select && go) {
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
      // a new chat: with the learner's needs (dec-tutor-needs)
      const needs = ways.needs(data.storage);
      const tutor = new URL(`${data.tutor}${withNeeds(resultQuery(shown), needs)}`, base).href;
      const prompt = () =>
        withLanguage(assessmentPrompt(tutor, promptItems(), shown, lang, promptPages(), "ask", links()), needs, lang);
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
      storage?.save(data.key, { version: 1, items: results });
      showResult(results, true);
    });
  });
  result.querySelector(".explainer-assessment-restart")?.addEventListener("click", begin);
  result.querySelector(".explainer-assessment-delete")?.addEventListener("click", () => {
    storage?.remove(data.key);
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
  const stored = storage?.load(data.key, isStoredResult);
  const kept = stored?.items.filter((one) => data.items.some((item) => item.key === one.key && item.ref === one.ref));
  if (kept !== undefined && kept.length > 0) showResult(kept, false);
  else show(intro, false);
}
