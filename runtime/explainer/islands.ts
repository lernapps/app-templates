// The islands of an explainer page in the browser: only a page with a vue-component block loads this module, and
// with it Vue (plugin.ts adds it to that page alone). Each component loads when its page has it, and hydrates the
// markup the build rendered into its island, with the props of the page's language. Then its island shows, and its
// nojs text goes, or, when the component declares defineOptions({ nojs: "caption" }), stays as a text description
// folded into a <details> under it. An exercise component reports each answer with answered { correct, reason? };
// the island shows the quiz's feedback for it, with the reason of a wrong answer under it, in view with the focus.
// An exercise component gets the seed of its task number as the prop seed, from the table of its distinct tasks the
// build ships (data-seeds; tasks.ts): the build rendered task number 1, it hydrates with it, and then moves to the
// number the address names (?<id>=<n>, wrapped into 1 to N) or to a random one; "Aufgabe Nr. <n>" shows above
// it, and "Neue Aufgabe" moves to the next number, writes it into the address and mounts the component afresh. Nothing is stored.
import { createSSRApp, h, ref, type Component } from "vue";
import { addressOf, nextTaskNumber, numberFromAddress, randomTaskNumber, taskNumber } from "./tasks.ts";

/** The components of the app by name, each loaded on first use. */
export type Components = Readonly<Record<string, () => Promise<{ default: Component }>>>;

/** The quiz's feedback on an answer, with the reason of a wrong one, in place of the one before, with the focus. */
function showFeedback(feedback: HTMLElement, correct: boolean, reason: unknown): void {
  feedback.className = `quiz-feedback ${correct ? "quiz-right" : "quiz-wrong"}`;
  feedback.textContent = (correct ? feedback.dataset["right"] : feedback.dataset["wrong"]) ?? "";
  if (!correct && typeof reason === "string" && reason.trim() !== "") {
    const why = feedback.ownerDocument.createElement("span");
    why.className = "quiz-diagnosis";
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

/** Hydrates one component in place. */
async function hydrate(element: HTMLElement, load: () => Promise<{ default: Component }>): Promise<void> {
  const island = element.querySelector<HTMLElement>(":scope > .explainer-island");
  const nojs = element.querySelector<HTMLElement>(":scope > .explainer-nojs");
  if (!island) return;
  const props = JSON.parse(
    element.querySelector(":scope > script.explainer-component-props")?.textContent ?? "{}",
  ) as Record<string, unknown>;
  const feedback = element.querySelector<HTMLElement>(":scope > .quiz-feedback");
  const { default: component } = await load();
  const onAnswered = (event: { correct?: unknown; reason?: unknown }) => {
    if (feedback) showFeedback(feedback, event.correct === true, event.reason);
  };
  if (element.dataset["exercise"] === undefined) {
    createSSRApp(component, { ...props, onAnswered }).mount(island);
  } else {
    // hydrates with the task of number 1, as the build rendered it, then shows the task of its own number
    const seeds = JSON.parse(element.dataset["seeds"] ?? "[1]") as number[];
    const count = Math.max(seeds.length, 1);
    const seed = ref(seeds[0] ?? 1);
    createSSRApp({ render: () => h(component, { ...props, seed: seed.value, key: seed.value, onAnswered }) }).mount(
      island,
    );
    const id = element.id;
    const from = numberFromAddress(location.href, id);
    let current = from === undefined ? randomTaskNumber(count) : taskNumber(from, count);
    history.replaceState(history.state, "", addressOf(location.href, id, current));
    const controls = element.querySelector<HTMLElement>(":scope > .explainer-task-controls");
    const number = controls?.querySelector<HTMLElement>(".explainer-task-number");
    const show = () => {
      seed.value = seeds[current - 1] ?? current;
      if (number) number.textContent = (number.dataset["template"] ?? "{n}").replace("{n}", String(current));
    };
    show();
    if (controls) controls.hidden = false;
    controls?.querySelector(".explainer-new-task")?.addEventListener("click", () => {
      current = nextTaskNumber(current, count);
      history.replaceState(history.state, "", addressOf(location.href, id, current));
      show();
      if (feedback) {
        feedback.className = "quiz-feedback";
        feedback.textContent = "";
      }
      number?.focus();
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
export function startIslands(components: Components, root: Document = document): void {
  for (const element of root.querySelectorAll<HTMLElement>(".explainer-component")) {
    const load = components[element.dataset["component"] ?? ""];
    if (load) void hydrate(element, load);
  }
}
