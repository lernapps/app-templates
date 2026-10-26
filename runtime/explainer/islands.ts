// The islands of an explainer page in the browser: only a page with a vue-component block loads this module, and
// with it Vue (plugin.ts adds it to that page alone). Each component loads when its page has it, and hydrates the
// markup the build rendered into its island, with the props of the page's language. Then its island shows, and its
// nojs text goes, or, when the component declares defineOptions({ nojs: "caption" }), stays as a text description
// folded into a <details> under it. An exercise component is the input of its task: it emits answer with the
// learner's answer each time it changes. The explainer checks it with "Prüfen" under the component (a form, so Enter in
// a field of the component checks too, enabled while there is an answer that is not checked yet): check, reason and
// show of the component's logic module give whether it is right, the app's message for a wrong one and the answer as
// text. The island shows the feedback, with the message under it, in view with the focus, gives the component
// checked: true until the answer changes, when it declares that prop, and passes the answer on to the client module as
// the event explainer-answered on its element ({ correct, answer, message }: answer is what the learner gave, as text,
// for the result line of "Zurück zum Tutor", result.ts; message the app's message, for the lines of "Ich verstehe das
// nicht", stuck.ts).
// An exercise component gets the seed of its task number as the prop seed, from the table of its distinct tasks the
// build ships (data-seeds; tasks.ts): the build rendered task number 1, it hydrates with it, and then moves to the
// number the address names (?<id>=<n>, wrapped into 1 to N) or to a random one; "Aufgabe Nr. <n>" shows above
// it, and "Neue Aufgabe" moves to the next number, writes it into the address and mounts the component afresh. Nothing is stored.
import { createSSRApp, h, ref, shallowRef, type Component } from "vue";
import { addressOf, nextTaskNumber, numberFromAddress, randomTaskNumber, SHOWN_EVENT, taskNumber } from "./tasks.ts";

/** The components of the app by name, each loaded on first use. */
export type Components = Readonly<Record<string, () => Promise<{ default: Component }>>>;

/** What the islands call of an exercise component's logic module (exercise.ts). */
export interface Logic {
  generate(seed: number, props: unknown): unknown;
  check(task: unknown, answer: unknown): unknown;
  reason?(task: unknown, answer: unknown, props: unknown, lang: string): unknown;
  show?(answer: unknown, task: unknown, props: unknown, lang: string): unknown;
}

/** The logic modules of the app's exercise components by name, each loaded on first use. */
export type Logics = Readonly<Record<string, () => Promise<Logic>>>;

/** A text that is not empty, trimmed, or undefined. */
const textOf = (value: unknown) => (typeof value === "string" && value.trim() !== "" ? value.trim() : undefined);

/** The feedback on an answer, with the reason of a wrong one, in place of the one before, with the focus. */
function showFeedback(feedback: HTMLElement, correct: boolean, reason: unknown): void {
  feedback.className = `question-feedback ${correct ? "question-right" : "question-wrong"}`;
  feedback.textContent = (correct ? feedback.dataset["right"] : feedback.dataset["wrong"]) ?? "";
  if (!correct && typeof reason === "string" && reason.trim() !== "") {
    const why = feedback.ownerDocument.createElement("span");
    why.className = "question-diagnosis";
    why.textContent = reason;
    feedback.append(" ", why);
  }
  feedback.tabIndex = -1;
  feedback.focus();
}

/** The nojs text as a text description under the running component: folded, one click opens it. */
function foldCaption(element: HTMLElement, nojs: HTMLElement): void {
  const doc = element.ownerDocument;
  const details = doc.createElement("details");
  const summary = doc.createElement("summary");
  summary.textContent = element.dataset["caption"] ?? "";
  details.append(summary, ...nojs.childNodes);
  nojs.replaceChildren(details);
  nojs.classList.add("explainer-caption");
}

/** Hydrates one component in place, with the logic module of an exercise component. */
async function hydrate(
  element: HTMLElement,
  load: () => Promise<{ default: Component }>,
  loadLogic: (() => Promise<Logic>) | undefined,
): Promise<void> {
  const island = element.querySelector<HTMLElement>(".explainer-island");
  const nojs = element.querySelector<HTMLElement>(":scope > .explainer-nojs");
  if (!island) return;
  const props = JSON.parse(
    element.querySelector(":scope > script.explainer-component-props")?.textContent ?? "{}",
  ) as Record<string, unknown>;
  const feedback = element.querySelector<HTMLElement>(":scope > .question-feedback");
  const { default: component } = await load();
  if (element.dataset["exercise"] === undefined || loadLogic === undefined) {
    createSSRApp(component, props).mount(island);
  } else {
    const logic = await loadLogic();
    const lang = element.ownerDocument.documentElement.lang || "de";
    const form = element.querySelector<HTMLFormElement>(":scope > form.explainer-component-form");
    const actions = form?.querySelector<HTMLElement>(":scope > .question-actions");
    const check = actions?.querySelector<HTMLButtonElement>(".question-check");
    // hydrates with the task of number 1, as the build rendered it, then shows the task of its own number
    const seeds = JSON.parse(element.dataset["seeds"] ?? "[1]") as number[];
    const count = Math.max(seeds.length, 1);
    const seed = ref(seeds[0] ?? 1);
    // the learner's answer, as the component emits it, and whether "Prüfen" judged this one
    const answer = shallowRef<unknown>(undefined);
    const checked = ref(false);
    const sync = () => {
      if (check) check.disabled = answer.value === undefined || checked.value;
    };
    const onAnswer = (value: unknown) => {
      answer.value = value;
      checked.value = false;
      sync();
    };
    const declaresChecked = element.dataset["checked"] !== undefined;
    createSSRApp({
      render: () =>
        h(component, {
          ...props,
          seed: seed.value,
          key: seed.value,
          ...(declaresChecked ? { checked: checked.value } : {}),
          onAnswer,
        }),
    }).mount(island);
    form?.addEventListener("submit", (event) => {
      event.preventDefault();
      if (answer.value === undefined || checked.value) return;
      const task = logic.generate(seed.value, props);
      const correct = logic.check(task, answer.value) === true;
      const message = correct ? undefined : textOf(logic.reason?.(task, answer.value, props, lang));
      const shown = logic.show === undefined ? undefined : textOf(logic.show(answer.value, task, props, lang));
      checked.value = true;
      sync();
      if (feedback) showFeedback(feedback, correct, message);
      element.dispatchEvent(
        new CustomEvent("explainer-answered", {
          bubbles: true,
          detail: {
            correct,
            ...(shown === undefined ? {} : { answer: shown }),
            ...(message === undefined ? {} : { message }),
          },
        }),
      );
    });
    if (actions) actions.hidden = false;
    sync();
    const id = element.id;
    const from = numberFromAddress(location.href, id);
    let current = from === undefined ? randomTaskNumber(count) : taskNumber(from, count);
    history.replaceState(history.state, "", addressOf(location.href, id, current));
    const controls = element.querySelector<HTMLElement>(":scope > .explainer-task-controls");
    const number = controls?.querySelector<HTMLElement>(".explainer-task-number");
    const show = () => {
      seed.value = seeds[current - 1] ?? current;
      answer.value = undefined;
      checked.value = false;
      sync();
      if (number) number.textContent = (number.dataset["template"] ?? "{n}").replace("{n}", String(current));
    };
    show();
    if (controls) controls.hidden = false;
    controls?.querySelector(".explainer-new-task")?.addEventListener("click", () => {
      current = nextTaskNumber(current, count);
      history.replaceState(history.state, "", addressOf(location.href, id, current));
      show();
      if (feedback) {
        feedback.className = "question-feedback";
        feedback.textContent = "";
      }
      number?.focus();
      element.dispatchEvent(new CustomEvent(SHOWN_EVENT, { bubbles: true }));
    });
  }
  island.hidden = false;
  if (nojs) {
    if (element.dataset["nojs"] === "caption") foldCaption(element, nojs);
    else nojs.hidden = true;
  }
  element.dataset["hydrated"] = "";
}

/** Hydrates every component of the page. */
export function startIslands(components: Components, logics: Logics = {}, root: Document = document): void {
  for (const element of root.querySelectorAll<HTMLElement>(".explainer-component")) {
    const name = element.dataset["component"] ?? "";
    const load = components[name];
    if (load) void hydrate(element, load, logics[name]);
  }
}
