// The islands of an explainer page in the browser: only a page with a vue-component block loads this module, and
// with it Vue (plugin.ts adds it to that page alone). Each component loads when its page has it, and hydrates the
// markup the build rendered into its island, with the props of the page's language. Then its island shows, and its
// nojs text goes, or stays as its caption when the component declares defineOptions({ nojs: "caption" }). An
// exercise component reports each answer with answered { correct }; the island shows the quiz's feedback for it, in
// view with the focus. Nothing is stored.
import { createSSRApp, type Component } from "vue";

/** The components of the app by name, each loaded on first use. */
export type Components = Readonly<Record<string, () => Promise<{ default: Component }>>>;

/** The quiz's feedback on an answer, in place of the one before, with the focus on it. */
function showFeedback(feedback: HTMLElement, correct: boolean): void {
  feedback.className = `quiz-feedback ${correct ? "quiz-right" : "quiz-wrong"}`;
  feedback.textContent = (correct ? feedback.dataset["right"] : feedback.dataset["wrong"]) ?? "";
  feedback.tabIndex = -1;
  feedback.focus();
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
  const onAnswered = (event: { correct?: unknown }) => {
    if (feedback) showFeedback(feedback, event.correct === true);
  };
  createSSRApp(component, { ...props, onAnswered }).mount(island);
  island.hidden = false;
  if (nojs) {
    if (element.dataset["nojs"] === "caption") nojs.classList.add("explainer-caption");
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
