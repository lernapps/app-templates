// The self-test block of an explainer: a short question with options for a recap page, which may carry no exercise. The
// learner picks an option and sees at once whether it was right and why. It is no exercise: nothing is counted, stored
// or sent, and the page keeps no score. Without JavaScript the page shows the question, the options and, folded in
// <details>, the answer with the reason of every option. The client module shows each option as a button (one tab
// stop each, Enter or Space picks, the arrow keys scroll as everywhere: no radio group that answers on its way
// through), hides the folded answer and says in a status line, in the learner's own time, what the pick means.
// Pages written for the component Kurztest (lernapps/mathe-saetze-entdecken) become this block when the app has no
// such component of its own (kurztestAsSelfTest).
// Browser-safe: render.ts writes the markup at build, explainer.ts starts the buttons in the browser.
import type { Block, BlockOf, SelfTestOption, Text } from "./content.ts";
import { escape } from "../shared/html.ts";
import { message } from "./messages.ts";

/** How a page turns the texts of the block into HTML: restricted Markdown without a paragraph. */
export interface SelfTestContext {
  lang: string;
  inline: (text: Text) => string;
}

/** A short stable id of the question's text, for the label of the group. */
function idOf(question: string): string {
  let hash = 7;
  for (const char of question) hash = (hash * 31 + char.charCodeAt(0)) | 0;
  return `selftest-${Math.abs(hash).toString(36)}`;
}

/** The markup of a self-test block. */
export function renderSelfTest(context: SelfTestContext, block: BlockOf<"self-test">): string {
  const { lang, inline } = context;
  const id = idOf(JSON.stringify(block.question));
  const right = inline(block.right ?? message(lang, "selfTestRight"));
  const wrong = inline(block.wrong ?? message(lang, "selfTestWrong"));
  const options = block.options
    .map(
      (option, index) =>
        `<li class="explainer-selftest-option" data-index="${index}"><button type="button" class="explainer-selftest-pick" hidden>${inline(option.text)}</button><span class="explainer-selftest-text">${inline(option.text)}</span></li>`,
    )
    .join("");
  const reasons = block.options
    .map(
      (option, index) =>
        `<li data-index="${index}" data-correct="${option.correct}"><strong>${inline(option.text)}</strong> (${escape(message(lang, option.correct ? "selfTestRightOption" : "selfTestWrongOption"))}): <span class="explainer-selftest-reason">${inline(option.info)}</span></li>`,
    )
    .join("");
  return [
    `<div class="explainer-selftest" role="group" aria-labelledby="${id}">`,
    `<p class="explainer-selftest-label">${escape(message(lang, "selfTestLabel"))}</p>`,
    `<p class="explainer-selftest-question" id="${id}">${inline(block.question)}</p>`,
    `<ul class="explainer-selftest-options">${options}</ul>`,
    `<p class="explainer-selftest-feedback" role="status" data-right="${escape(right)}" data-wrong="${escape(wrong)}"></p>`,
    `<details class="explainer-selftest-answer"><summary>${escape(message(lang, "selfTestShow"))}</summary><ul>${reasons}</ul></details>`,
    `</div>`,
  ].join("\n");
}

/** The lines of a self-test block for the tutor page: the question, each option with its reason. */
export function selfTestLines(block: BlockOf<"self-test">, one: (text: Text) => string, word: string): string[] {
  return [
    `${word}: ${one(block.question)}`,
    ...block.options.map(
      (option: SelfTestOption) => `- ${one(option.text)}${option.correct ? " ✓" : ""}: ${one(option.info)}`,
    ),
  ];
}

/** Gives the buttons of every self-test: a pick shows the feedback and the reason of that option. */
export function startSelfTests(root: Document): void {
  for (const block of root.querySelectorAll<HTMLElement>(".explainer-selftest")) {
    const feedback = block.querySelector<HTMLElement>(".explainer-selftest-feedback");
    if (!feedback) continue;
    const picks = [...block.querySelectorAll<HTMLButtonElement>(".explainer-selftest-pick")];
    for (const pick of picks) {
      const item = pick.closest("li");
      const index = item?.dataset["index"];
      const reason = block.querySelector<HTMLElement>(`.explainer-selftest-answer li[data-index="${index}"]`);
      if (!item || !reason) continue;
      pick.addEventListener("click", () => {
        const correct = reason.dataset["correct"] === "true";
        for (const other of picks) other.setAttribute("aria-pressed", String(other === pick));
        feedback.className = `explainer-selftest-feedback ${correct ? "question-right" : "question-wrong"}`;
        feedback.innerHTML = `${(correct ? feedback.dataset["right"] : feedback.dataset["wrong"]) ?? ""} ${reason.querySelector(".explainer-selftest-reason")?.innerHTML ?? ""}`;
      });
      pick.hidden = false;
      item.querySelector<HTMLElement>(".explainer-selftest-text")?.setAttribute("hidden", "");
    }
    block.querySelector<HTMLElement>(".explainer-selftest-answer")?.setAttribute("hidden", "");
  }
}

/**
 * The blocks with every vue-component block of the component `Kurztest` (props question, options, right, wrong) turned
 * into a self-test block, where `hasComponent` says the app has no such component of its own. A block whose props do
 * not have that shape stays as it is. The copy keeps where it was written (`viaComponent`: its texts are under props).
 */
export function kurztestAsSelfTest(blocks: readonly Block[], hasComponent: boolean): readonly Block[] {
  if (hasComponent) return blocks;
  const isText = (value: unknown): value is Text =>
    typeof value === "string" || (typeof value === "object" && value !== null && !Array.isArray(value));
  return blocks.map((block): Block => {
    if ("blocks" in block) return { ...block, blocks: kurztestAsSelfTest(block.blocks, hasComponent) } as Block;
    if (block.type !== "vue-component" || block.component !== "Kurztest") return block;
    const props = block.props ?? {};
    const options = props["options"];
    if (
      !isText(props["question"]) ||
      !Array.isArray(options) ||
      !options.every(
        (option: unknown): option is SelfTestOption =>
          typeof option === "object" &&
          option !== null &&
          isText((option as SelfTestOption).text) &&
          typeof (option as SelfTestOption).correct === "boolean" &&
          isText((option as SelfTestOption).info),
      )
    )
      return block;
    return {
      type: "self-test",
      question: props["question"],
      options,
      ...(isText(props["right"]) ? { right: props["right"] } : {}),
      ...(isText(props["wrong"]) ? { wrong: props["wrong"] } : {}),
      viaComponent: true,
    };
  });
}
