// An open task in the browser (explainer.ts, assessment-client.ts): the learner answers first, then compares. "Deine
// Lösung" offers the ways the task allows: typing into a text field, or writing on paper and taking a photo of the
// sheet. "Vergleichen" opens once there is text or a photo; it shows the points of a good answer as tick boxes ("Was
// steht in deiner Antwort?"). On a content page "Auswerten" then says right (all ticked), partly right (some) or not
// yet (none), names each missing point with a link to its source, and opens the model answer ("Lösung"), which stays
// shut before the learner's own answer. In a self-assessment there is no result and no model answer: the ticks are the
// answer, read at "Auswerten" of the whole run. The photo is shown from memory (an object URL), never stored or sent;
// the text and the ticks stay in memory too.
import { moveFocus } from "@lernapps/tooling/a11y";
import { escape } from "../shared/html.ts";
import type { OpenTaskData } from "./exercises.ts";
import { message } from "./messages.ts";
import { SHOWN_EVENT } from "./tasks.ts";

/** What became of an open task: the points ticked and missed (each from 0), the text, whether there is a photo. */
export interface OpenTaskResult {
  state: "richtig" | "teilweise" | "falsch" | "offen";
  ticked: number[];
  missed: number[];
  text?: string;
  photo: boolean;
}

export interface OpenTaskOptions {
  /** In a self-assessment: no "Auswerten" of its own, no result, no model answer. */
  assessment?: boolean;
  /** The learner evaluated it (on a page), or changed a tick (in a self-assessment). */
  onResult?: (result: OpenTaskResult) => void;
}

/** The state of an open task as `ticked` of `total` points give it, and the points missed. */
export function openTaskState(ticked: readonly number[], total: number): Pick<OpenTaskResult, "state" | "missed"> {
  const missed = Array.from({ length: total }, (_point, index) => index).filter((index) => !ticked.includes(index));
  const state = ticked.length === total ? "richtig" : ticked.length === 0 ? "falsch" : "teilweise";
  return { state, missed };
}

/** Makes the open task in `element` live; returns what became of it so far. */
export function startOpenTask(
  element: HTMLElement,
  data: OpenTaskData,
  options: OpenTaskOptions = {},
): { result: () => OpenTaskResult } {
  const { lang, id, points } = data;
  const t = (key: Parameters<typeof message>[1], params?: Record<string, string>) => escape(message(lang, key, params));
  const live = element.querySelector<HTMLElement>(".explainer-open-live");
  const listed = element.querySelector<HTMLElement>(".explainer-open-points");
  const solution = element.querySelector<HTMLDetailsElement>(":scope > details.explainer-solution");
  const empty = (): OpenTaskResult => ({ state: "offen", ticked: [], missed: [], photo: false });
  if (!live) return { result: empty };
  // with JavaScript the learner answers before seeing the points and the model answer
  if (listed) listed.hidden = true;
  if (solution) solution.hidden = true;

  const both = data.answer.includes("text") && data.answer.includes("photo");
  let way: "text" | "photo" = data.answer.includes("text") ? "text" : "photo";
  let text = "";
  let photo: string | undefined;
  let ticked: number[] = [];
  let compared = false;

  const choice = both
    ? [
        `<fieldset class="explainer-open-choice"><legend>${t("openTaskChoice")}</legend>`,
        `<label><input type="radio" name="${id}-way" value="text" checked> <span>${t("openTaskType")}</span></label>`,
        `<label><input type="radio" name="${id}-way" value="photo"> <span>${t("openTaskPaper")}</span></label>`,
        `</fieldset>`,
      ].join("")
    : "";
  live.innerHTML = [
    `<div class="explainer-open-write">`,
    choice,
    `<div class="explainer-open-text"><label for="${id}-text">${t("openTaskAnswer")}</label>`,
    `<textarea id="${id}-text" rows="6"></textarea></div>`,
    `<div class="explainer-open-photo" hidden><p>${t("openTaskPaperHow")}</p>`,
    `<label class="explainer-open-shoot"><input type="file" accept="image/*" capture="environment"> <span>${t("openTaskPhoto")}</span></label>`,
    `<img class="explainer-open-preview" alt="${t("openTaskPhotoAlt")}" hidden>`,
    `<p class="explainer-open-local"><small>${t("openTaskPhotoLocal")}</small></p></div>`,
    `<p class="explainer-open-need" aria-live="polite"></p>`,
    `<p class="explainer-open-locked"><small>${t("openTaskLocked")}</small></p>`,
    `</div>`,
    `<fieldset class="explainer-open-check" hidden><legend>${t("openTaskCheck")}</legend>`,
    `<p>${t("openTaskCheckHow")}</p>`,
    points
      .map(
        (point, index) =>
          `<label><input type="checkbox" value="${index}"> <span>${escape(point.text)}${point.kind === "form" ? ` <small>(${t("openTaskForm")})</small>` : ""}</span></label>`,
      )
      .join(""),
    `</fieldset>`,
    `<div class="explainer-open-result" role="status" hidden></div>`,
    `<p class="question-actions">`,
    `<button type="button" class="explainer-open-compare">${t("openTaskCompare")}</button>`,
    options.assessment
      ? ""
      : ` <button type="button" class="explainer-open-evaluate" hidden>${t("openTaskEvaluate")}</button>`,
    ` <button type="button" class="explainer-open-change" hidden>${t("openTaskChange")}</button>`,
    `</p>`,
  ].join("");
  live.hidden = false;
  // the tutor's help button goes into the row of "Vergleichen" (explainer.ts)
  element.dispatchEvent(new CustomEvent(SHOWN_EVENT, { bubbles: true }));

  const part = <T extends HTMLElement>(selector: string) => live.querySelector<T>(selector);
  const write = part<HTMLElement>(".explainer-open-write");
  const textPart = part<HTMLElement>(".explainer-open-text");
  const photoPart = part<HTMLElement>(".explainer-open-photo");
  const field = part<HTMLTextAreaElement>("textarea");
  const file = part<HTMLInputElement>('input[type="file"]');
  const preview = part<HTMLImageElement>(".explainer-open-preview");
  const shoot = part<HTMLElement>(".explainer-open-shoot span");
  const need = part<HTMLElement>(".explainer-open-need");
  const check = part<HTMLFieldSetElement>(".explainer-open-check");
  const result = part<HTMLElement>(".explainer-open-result");
  const compare = part<HTMLButtonElement>(".explainer-open-compare");
  const evaluate = part<HTMLButtonElement>(".explainer-open-evaluate");
  const change = part<HTMLButtonElement>(".explainer-open-change");

  const ready = () => (way === "text" ? text.trim() !== "" : photo !== undefined);
  const current = (): OpenTaskResult => {
    const answer = way === "text" ? { text: text.trim() } : {};
    if (!compared) return { ...empty(), ...answer, photo: way === "photo" && photo !== undefined };
    return { ...openTaskState(ticked, points.length), ticked: [...ticked], ...answer, photo: way === "photo" };
  };

  /** The step the learner is at: writing, or comparing. */
  const show = () => {
    if (textPart) textPart.hidden = way !== "text";
    if (photoPart) photoPart.hidden = way !== "photo";
    if (write) write.hidden = compared;
    if (check) check.hidden = !compared;
    if (compare) compare.hidden = compared;
    if (evaluate) evaluate.hidden = !compared;
    if (change) change.hidden = !compared;
    if (need)
      need.textContent =
        compared || ready() ? "" : message(lang, way === "text" ? "openTaskWriteFirst" : "openTaskPhotoFirst");
    if (!compared && result) result.hidden = true;
  };

  for (const radio of live.querySelectorAll<HTMLInputElement>(".explainer-open-choice input")) {
    radio.addEventListener("change", () => {
      if (radio.checked) way = radio.value === "photo" ? "photo" : "text";
      show();
    });
  }
  field?.addEventListener("input", () => {
    text = field.value;
    show();
  });
  file?.addEventListener("change", () => {
    const chosen = file.files?.[0];
    if (!chosen) return;
    // shown from memory only: never stored, never sent
    if (photo !== undefined) URL.revokeObjectURL(photo);
    photo = URL.createObjectURL(chosen);
    if (preview) {
      preview.src = photo;
      preview.hidden = false;
    }
    if (shoot) shoot.textContent = message(lang, "openTaskPhotoAgain");
    show();
  });
  compare?.addEventListener("click", () => {
    if (!ready()) {
      show();
      if (need) moveFocus(need);
      return;
    }
    compared = true;
    show();
    const legend = check?.querySelector<HTMLElement>("legend");
    if (legend) moveFocus(legend);
    if (options.assessment) options.onResult?.(current());
  });
  change?.addEventListener("click", () => {
    compared = false;
    show();
    if (field && way === "text") moveFocus(field);
  });
  for (const box of check?.querySelectorAll<HTMLInputElement>("input") ?? []) {
    box.addEventListener("change", () => {
      const index = Number(box.value);
      ticked = box.checked ? [...ticked, index].sort((a, b) => a - b) : ticked.filter((one) => one !== index);
      if (options.assessment) options.onResult?.(current());
    });
  }
  evaluate?.addEventListener("click", () => {
    const now = current();
    if (result) {
      const total = String(points.length);
      const key =
        now.state === "richtig" ? "openTaskRight" : now.state === "teilweise" ? "openTaskPartly" : "openTaskWrong";
      result.innerHTML = [
        `<p><strong>${t(key, { n: String(now.ticked.length), total })}</strong></p>`,
        now.missed.length === 0
          ? ""
          : `<ul>${now.missed
              .map((index) => {
                const point = points[index];
                if (!point) return "";
                const link =
                  point.href === undefined ? "" : ` <a href="${escape(point.href)}">${t("openTaskSource")}</a>`;
                return `<li>${t("openTaskMissing", { point: point.text })}${link}</li>`;
              })
              .join("")}</ul>`,
      ].join("");
      result.hidden = false;
      result.dataset["state"] = now.state;
    }
    // the model answer opens after the learner's own answer
    if (solution) solution.hidden = false;
    options.onResult?.(now);
  });
  show();
  return { result: current };
}

/** The names of the points at `indexes` (each from 0): P1, P2, … */
export const pointNames = (indexes: readonly number[]): string => indexes.map((index) => `P${index + 1}`).join(", ");
