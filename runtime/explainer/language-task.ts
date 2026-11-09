// A language task in the browser (explainer.ts, assessment-client.ts; dec-language-task): the learner writes each
// answer, a word, a form, an expression or whole sentences, into the gaps of a text, the cells of a table or a field of
// its own, or chooses for each gap; "Prüfen" checks every unit with the check of language.ts and says per unit whether
// it is right, partly right or not, naming the class of a mistake of form with the learner's words, or the message of
// a typical mistake. A wrong answer may be tried again; "Lösung" then shows every answer. The fields are marked with the
// language the learner writes (screen readers, no correction by the device); a bar of the language's special
// characters inserts them where the learner writes last. In a self-assessment there is no "Prüfen": the run reads the
// answers at "Auswerten".
import { moveFocus } from "@lernapps/tooling/a11y";
import { escape } from "../shared/html.ts";
import type { LanguageTaskData } from "./exercises.ts";
import { checkUnit, combined, type State, type Verdict } from "./language.ts";
import { SHOWN_EVENT } from "./tasks.ts";

export interface LanguageTaskOptions {
  /** In a self-assessment: no "Prüfen", no solution. */
  assessment?: boolean;
  /** A complete answer was checked: whether it is right, the input as text, and what the feedback said. */
  onAnswer?: (right: boolean, input: string, said: string) => void;
  /** The learner opened the solution. */
  onReveal?: () => void;
}

/** What became of a language task: its state ("offen" while a field is empty), and the input as text. */
export interface LanguageTaskResult {
  state: State | "offen";
  input: string;
}

type Field = HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement;

/** A field for one answer, marked with its language, without the device's correction. */
function fieldHtml(id: string, label: string, lang: string, width: number, long: boolean): string {
  const common = `id="${id}" aria-label="${escape(label)}" lang="${escape(lang)}" spellcheck="false" autocapitalize="off" autocomplete="off" autocorrect="off"`;
  return long
    ? `<textarea class="explainer-language-field" rows="2" ${common}></textarea>`
    : `<input type="text" class="explainer-language-field" size="${Math.max(4, Math.min(width + 2, 40))}" ${common}>`;
}

/** A choice of a gap: an empty first option, then the options. */
function selectHtml(id: string, label: string, lang: string, options: readonly string[]): string {
  return [
    `<select class="explainer-language-field" id="${id}" aria-label="${escape(label)}" lang="${escape(lang)}">`,
    `<option value="">…</option>`,
    ...options.map((option) => `<option>${escape(option)}</option>`),
    `</select>`,
  ].join("");
}

/** Makes a language task live in `element`: its fields, the bar of characters, and (on a content page) "Prüfen". */
export function startLanguageTask(
  element: HTMLElement,
  data: LanguageTaskData,
  options: LanguageTaskOptions = {},
): { result: () => LanguageTaskResult } {
  const live = element.querySelector<HTMLElement>(".explainer-language-live");
  const empty = (): LanguageTaskResult => ({ state: "offen", input: "" });
  if (!live) return { result: empty };
  const { texts, answerLang, mode } = data;
  const t = (key: string, params: Readonly<Record<string, string>> = {}) =>
    (texts[key] ?? key).replace(/\{(\w+)\}/g, (placeholder, name: string) => params[name] ?? placeholder);
  const id = data.id;
  const fieldId = (unit: number, slot: number) => `${id}-u${unit}-s${slot}`;
  // every field of the task as wide as its longest answer: a field's width tells nothing about its own answer
  const width = Math.max(
    0,
    ...data.units.flatMap((unit) => unit.slots.flatMap((slot) => slot.allowed.map((answer) => answer.length))),
  );
  const field = (unit: number, slot: number, label: string) => {
    const spec = data.units[unit]?.slots[slot];
    if (spec === undefined) return "";
    if (spec.options !== undefined) return selectHtml(fieldId(unit, slot), label, answerLang, spec.options);
    return fieldHtml(fieldId(unit, slot), label, answerLang, width, mode === "write" && width > 40);
  };
  const gapped = (unit: number, parts: readonly (string | number)[], name: string) =>
    parts
      .map((part) =>
        typeof part === "number"
          ? field(unit, part, t("languageGapLabel", { gap: String(part + 1), n: name }))
          : escape(part),
      )
      .join("");

  const units =
    mode === "table"
      ? [
          `<table class="explainer-language-table">`,
          data.columns === undefined
            ? ""
            : `<thead><tr>${data.columns.map((column) => `<th scope="col">${escape(column)}</th>`).join("")}</tr></thead>`,
          `<tbody lang="${escape(answerLang)}">`,
          ...data.units.map(
            (unit, index) =>
              `<tr class="explainer-language-unit" data-unit="${index}">${(unit.cellParts ?? [])
                .map((parts, column) => {
                  let slot = 0;
                  const cell = parts
                    .map((part) =>
                      typeof part === "number"
                        ? field(
                            index,
                            part,
                            t("languageCellLabel", {
                              row: String(index + 1),
                              column: data.columns?.[column] ?? String(column + 1),
                            }) + (slot++ > 0 ? ` (${slot})` : ""),
                          )
                        : escape(part),
                    )
                    .join("");
                  return `<td>${cell}</td>`;
                })
                .join("")}</tr>`,
          ),
          `</tbody></table>`,
          // the verdicts of the rows under the table, which stays narrow
          `<ul class="explainer-language-row-verdicts" role="status"></ul>`,
        ].join("")
      : `<ol class="explainer-language-units">${data.units
          .map((unit, index) => {
            const name = String(index + 1);
            const input =
              unit.parts === undefined
                ? field(index, 0, t("languageAnswer", { n: name }))
                : `<span class="explainer-language-gapped" lang="${escape(answerLang)}">${gapped(index, unit.parts, name)}</span>`;
            return [
              `<li class="explainer-language-unit" data-unit="${index}">`,
              unit.promptHtml === "" ? "" : `<p class="explainer-language-prompt">${unit.promptHtml}</p>`,
              `<p class="explainer-language-input">${input}</p>`,
              `<p class="explainer-language-verdict" role="status"></p>`,
              `</li>`,
            ].join("");
          })
          .join("")}</ol>`;
  const chars =
    data.chars.length === 0 || mode === "choice"
      ? ""
      : // a fallback, folded: every keyboard can type the characters; the toggle keeps the focus in the field
        [
          `<p class="explainer-language-chars-toggle"><button type="button" aria-expanded="false" aria-controls="${id}-chars">${escape(t("languageChars"))}</button></p>`,
          `<div class="explainer-language-chars" id="${id}-chars" role="group" aria-label="${escape(t("languageChars"))}" hidden>${data.chars
            .map(
              (char) =>
                `<button type="button" lang="${escape(answerLang)}" aria-label="${escape(t("languageCharInsert", { char }))}">${escape(char)}</button>`,
            )
            .join("")}</div>`,
        ].join("");
  live.innerHTML = [
    `<form class="explainer-language-form" novalidate>`,
    units,
    chars,
    options.assessment === true
      ? ""
      : [
          `<div class="question-feedback" role="status"></div>`,
          `<p class="question-actions"><button type="submit" class="question-check">${escape(t("check"))}</button>`,
          ` <button type="button" class="explainer-language-solve" hidden>${escape(t("showSolution"))}</button></p>`,
        ].join(""),
    `</form>`,
  ].join("");
  live.hidden = false;
  for (const part of element.querySelectorAll<HTMLElement>(".explainer-language-static")) part.hidden = true;
  const solution = element.querySelector<HTMLDetailsElement>(":scope > details.explainer-solution");
  if (solution) solution.hidden = true;

  const fields = (unit: number): Field[] =>
    (data.units[unit]?.slots ?? [])
      .map((_slot, slot) => live.querySelector<Field>(`#${CSS.escape(fieldId(unit, slot))}`))
      .filter((found): found is Field => found !== null);
  const inputs = (unit: number) => fields(unit).map((found) => found.value);
  const all = () => data.units.map((_unit, index) => inputs(index));
  const shown = () =>
    all()
      .map((unit) => unit.join(" | "))
      .join(" / ");

  // the bar inserts into the field the learner wrote in last, where the cursor was
  let last: HTMLInputElement | HTMLTextAreaElement | undefined;
  live.addEventListener("focusin", (event) => {
    const target = event.target;
    if (target instanceof HTMLInputElement || target instanceof HTMLTextAreaElement) last = target;
  });
  const toggle = live.querySelector<HTMLButtonElement>(".explainer-language-chars-toggle button");
  const bar = live.querySelector<HTMLElement>(".explainer-language-chars");
  if (toggle && bar) {
    toggle.addEventListener("mousedown", (event) => event.preventDefault());
    toggle.addEventListener("click", () => {
      bar.hidden = !bar.hidden;
      toggle.setAttribute("aria-expanded", String(!bar.hidden));
    });
  }
  for (const button of live.querySelectorAll<HTMLButtonElement>(".explainer-language-chars button")) {
    // the field keeps the focus and its cursor
    button.addEventListener("mousedown", (event) => event.preventDefault());
    button.addEventListener("click", () => {
      const target = last ?? live.querySelector<HTMLInputElement | HTMLTextAreaElement>("input, textarea") ?? undefined;
      if (target === undefined || target.disabled) return;
      const char = button.textContent ?? "";
      const start = target.selectionStart ?? target.value.length;
      const end = target.selectionEnd ?? start;
      target.setRangeText(char, start, end, "end");
      target.dispatchEvent(new Event("input", { bubbles: true }));
      target.focus();
    });
  }

  const result = (): LanguageTaskResult => {
    const answers = all();
    if (answers.some((unit) => unit.some((input) => input.trim() === ""))) return { ...empty(), input: shown() };
    const states = data.units.map((unit, index) => checkUnit(unit, answers[index] ?? [], answerLang, data.form).state);
    return { state: combined(states), input: shown() };
  };
  if (options.assessment === true) return { result };

  // the row of "Prüfen" is there now: the tutor's help moves into it (explainer.ts), as with every exercise
  element.dispatchEvent(new CustomEvent(SHOWN_EVENT, { bubbles: true }));

  const form = live.querySelector("form");
  const feedback = live.querySelector<HTMLElement>(".question-feedback");
  const check = live.querySelector<HTMLButtonElement>(".question-check");
  const solve = live.querySelector<HTMLButtonElement>(".explainer-language-solve");
  if (!form || !feedback || !check || !solve) return { result };
  let done = false;

  /** What the verdict on one input says: the class of form with the learner's words, or the mistake's message. */
  const reasons = (verdict: Verdict, messages: readonly string[]): string[] => {
    const said: string[] = [];
    for (const name of verdict.classes) {
      const words = verdict.words.length === 0 ? "" : `: ${verdict.words.join(", ")}`;
      said.push(`${t(`class_${name}`)}${words}.`);
    }
    if (verdict.mistake !== undefined) said.push(messages[verdict.mistake] ?? "");
    return said.filter((text) => text !== "");
  };

  const finish = () => {
    done = true;
    for (const found of live.querySelectorAll<Field>(".explainer-language-field")) found.disabled = true;
    for (const button of live.querySelectorAll<HTMLButtonElement>(
      ".explainer-language-chars button, .explainer-language-chars-toggle button",
    ))
      button.disabled = true;
    check.hidden = true;
    solve.hidden = true;
    if (solution) {
      solution.hidden = false;
      solution.open = true;
    }
  };

  form.addEventListener("submit", (event) => {
    event.preventDefault();
    if (done) return;
    const answers = all();
    if (answers.some((unit) => unit.some((input) => input.trim() === ""))) {
      feedback.className = "question-feedback";
      feedback.textContent = t("languageIncomplete");
      return;
    }
    const said: string[] = [];
    const rows = live.querySelector<HTMLElement>(".explainer-language-row-verdicts");
    rows?.replaceChildren();
    const states = data.units.map((unit, index) => {
      const { state, verdicts } = checkUnit(unit, answers[index] ?? [], answerLang, data.form);
      const place = live.querySelector<HTMLElement>(`.explainer-language-unit[data-unit="${index}"]`);
      const verdict = place?.querySelector<HTMLElement>(".explainer-language-verdict");
      const own = verdicts.flatMap((each) => reasons(each, unit.messages));
      if (
        state === "falsch" &&
        mode === "write" &&
        own.length === 0 &&
        (unit.slots[0]?.allowed[0] ?? "").split(" ").length > 2
      )
        own.push(t("languageOwnVersion"));
      if (unit.slots.length === 0) return state;
      if (place) place.dataset["state"] = state;
      const label = state === "richtig" ? "languageRight" : state === "teilweise" ? "languagePartly" : "languageWrong";
      // a unit by its number, a row of a table by its first cell
      const name = unit.cells === undefined ? String(index + 1) : (unit.cells[0] ?? String(index + 1));
      const text = [`${name}: ${t(label)}.`, ...own].join(" ");
      if (verdict) verdict.textContent = text;
      // under a table only the rows that are not right as written
      else if (rows && (state !== "richtig" || own.length > 0)) {
        const line = live.ownerDocument.createElement("li");
        line.dataset["state"] = state;
        line.textContent = text;
        rows.append(line);
      }
      if (own.length > 0) said.push(`${name}: ${own.join(" ")}`);
      return state;
    });
    // a row of a table without a gap asks nothing: it does not count
    const asked = states.filter((_state, index) => (data.units[index]?.slots.length ?? 0) > 0);
    const right = asked.filter((state) => state === "richtig").length;
    const allRight = right === asked.length;
    feedback.className = `question-feedback ${allRight ? "question-right" : "question-wrong"}`;
    feedback.textContent = allRight
      ? t("languageAllRight")
      : `${t("languageSomeRight", { right: String(right), total: String(asked.length) })} ${t("tryAgainOrSolution")}`;
    options.onAnswer?.(allRight, shown(), said.join(" "));
    if (allRight) finish();
    else solve.hidden = false;
    moveFocus(feedback);
  });
  solve.addEventListener("click", () => {
    if (done) return;
    finish();
    options.onReveal?.();
    if (solution) moveFocus(solution.querySelector<HTMLElement>("summary") ?? solution);
  });
  return { result };
}
