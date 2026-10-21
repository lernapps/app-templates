// Renders one question at build time, for every archetype that has questions: its controls, the button to check
// it, the place of its feedback and, hidden until it is answered, its solution (the right answer, the background of
// every option, the explanation, further reading). Without JavaScript the button stays hidden and the page reads as a
// worksheet with its answer key; the engine (engine.ts) makes a question live. The engine and the end-to-end tests
// rely on the ids, classes and data attributes written here. A page embeds a question as
//
//   renderQuestion(question) +
//   `<details><summary>${messages.solution}</summary>${renderSolution(question)}</details>`
//
// Links to other sites are plain links with rel="noopener": nothing is loaded from another server before a click.
import { translator } from "@lernapps/tooling/i18n";
import de from "./messages/de.json" with { type: "json" };
import en from "./messages/en.json" with { type: "json" };
import { escape } from "../html.ts";
import { localeOf, textsIn, type Language } from "../languages.ts";
import { mixed, questionId, type Link, type Question } from "./question.ts";

export type QuestionMessages = typeof de;
/** The texts of a question for learners in each language it has them: an app may declare only these languages. */
export const QUESTION_MESSAGES: Readonly<Record<Language, QuestionMessages>> = { de, en };

/** The question's texts in `lang`; German for a language it does not have. */
export const questionMessagesIn = (lang: string): QuestionMessages => textsIn(QUESTION_MESSAGES, lang);

/** What rendering in one language needs: its texts and its numbers. */
export interface Words {
  t: (key: keyof QuestionMessages, params?: Readonly<Record<string, string | number>>) => string;
  numbers: Intl.NumberFormat;
}
const languages = new Map<string, Words>();
export function questionWords(lang = "de"): Words {
  let found = languages.get(lang);
  if (found === undefined) {
    const locale = localeOf(lang);
    found = {
      t: translator(questionMessagesIn(lang), locale),
      numbers: new Intl.NumberFormat(locale, { maximumFractionDigits: 10 }),
    };
    languages.set(lang, found);
  }
  return found;
}

/** How a learner text becomes HTML. */
export type Format = (text: string) => string;

function controls(question: Question, { t }: Words, format: Format): string {
  const name = questionId(question);
  switch (question.type) {
    case "single-choice":
    case "multiple-choice": {
      const type = question.type === "single-choice" ? "radio" : "checkbox";
      return question.options
        .map(
          (option, index) =>
            `<label class="question-option"><input type="${type}" name="${name}" value="${index}"> <span>${format(option.text)}</span></label>`,
        )
        .join("\n");
    }
    case "true-false":
      return [true, false]
        .map(
          (value) =>
            `<label class="question-option"><input type="radio" name="${name}" value="${value}"> <span>${t(value ? "true" : "false")}</span></label>`,
        )
        .join("\n");
    case "number":
      return [
        `<label class="question-number">${t("yourAnswer")}`,
        `<input type="text" inputmode="decimal" autocomplete="off" name="${name}"${question.unit === undefined ? "" : ` aria-describedby="${name}-unit"`}>`,
        question.unit === undefined ? "" : `<span id="${name}-unit">${format(question.unit)}</span>`,
        `</label>`,
      ].join(" ");
    case "ordering": {
      const places = question.items
        .map((_item, place) => `<option value="${place}">${t("place", { place: place + 1 })}</option>`)
        .join("");
      return [
        `<p class="question-hint">${t("orderHint")}</p>`,
        `<ul class="question-pairs">`,
        ...mixed(question.items.length, question.id).map(
          (index) =>
            `<li><label><span>${format(question.items[index] ?? "")}</span> <select name="${name}-${index}" data-item="${index}"><option value="">${t("choose")}</option>${places}</select></label></li>`,
        ),
        `</ul>`,
      ].join("\n");
    }
    case "matching": {
      const rights = mixed(question.pairs.length, question.id)
        .map((index) => `<option value="${index}">${escape(question.pairs[index]?.right ?? "")}</option>`)
        .join("");
      return [
        `<p class="question-hint">${t("matchHint")}</p>`,
        `<ul class="question-pairs">`,
        ...question.pairs.map(
          (pair, index) =>
            `<li><label><span>${format(pair.left)}</span> <select name="${name}-${index}" data-left="${index}"><option value="">${t("choose")}</option>${rights}</select></label></li>`,
        ),
        `</ul>`,
      ].join("\n");
    }
  }
}

/**
 * How one question renders: in a `div` on its own or an `li` of a list, with or without a button to the next one;
 * in which language (the question already in it, see questionIn); and, for a page that renders the question's text
 * itself (with formulas), its text as HTML.
 */
export interface RenderQuestionOptions {
  /** How a learner text becomes HTML, e.g. with its formulas; escaped as plain text by default. */
  format?: (text: string) => string;
  element?: "div" | "li";
  next?: boolean;
  lang?: string;
  textHtml?: string;
  /** The question's material as HTML, rendered by the page (renderMaterial of the blocks): shown after its text. */
  materialHtml?: string;
  explanationHtml?: string;
}

/** How a solution renders: in which language, and, for a page that renders it itself, the explanation as HTML. */
export interface RenderSolutionOptions {
  format?: (text: string) => string;
  lang?: string;
  explanationHtml?: string;
}

/**
 * One question with its controls, the button to check it, the place of its feedback and, hidden until it is answered,
 * what the learner learns about it (the same as its solution). The engine's startQuestion makes it live; without
 * JavaScript the button stays hidden.
 */
export function renderQuestion(
  question: Question,
  {
    element = "div",
    next = false,
    lang = "de",
    textHtml,
    materialHtml,
    explanationHtml,
    format = escape,
  }: RenderQuestionOptions = {},
): string {
  const words = questionWords(lang);
  const { t } = words;
  const id = questionId(question);
  const nextButton = next ? ` <button type="button" class="question-next" hidden>${t("next")}</button>` : "";
  return [
    `<${element} class="question" id="${id}" data-id="${question.id}" data-type="${question.type}">`,
    `<form class="question-form" novalidate>`,
    `<fieldset>`,
    `<legend class="question-text">${textHtml ?? format(question.text)}</legend>`,
    ...(materialHtml === undefined || materialHtml === ""
      ? []
      : [`<div class="question-material">${materialHtml}</div>`]),
    controls(question, words, format),
    `</fieldset>`,
    `<div class="question-feedback" role="status"></div>`,
    `<div class="question-reveal" hidden>`,
    renderSolution(question, { lang, format, ...(explanationHtml === undefined ? {} : { explanationHtml }) }),
    `</div>`,
    `<p class="question-actions" hidden><button type="submit" class="question-check">${t("check")}</button>${nextButton}</p>`,
    `</form>`,
    `</${element}>`,
  ].join("\n");
}

/** The right answer as the solution states it, in `lang`: the right options, the number, the order, the pairs. */
export function answerText(question: Question, lang = "de", format: Format = escape): string {
  return rightAnswerText(question, questionWords(lang), format);
}

function rightAnswerText(question: Question, { t, numbers }: Words, format: Format): string {
  switch (question.type) {
    case "single-choice":
    case "multiple-choice":
      return question.options
        .filter((option) => option.correct)
        .map((option) => format(option.text))
        .join("; ");
    case "true-false":
      return t(question.answer ? "statementTrue" : "statementFalse");
    case "number": {
      const unit = question.unit === undefined ? "" : ` ${format(question.unit)}`;
      const tolerance =
        question.tolerance > 0
          ? ` ${t("tolerance", { tolerance: `${numbers.format(question.tolerance)}${unit}` })}`
          : "";
      return `${numbers.format(question.answer)}${unit}${tolerance}`;
    }
    case "ordering":
      return question.items.map((item, index) => `${index + 1}. ${format(item)}`).join(", ");
    case "matching":
      return question.pairs.map((pair) => `${format(pair.left)} – ${format(pair.right)}`).join("; ");
  }
}

/** A link to another site: opened like any link, never loaded before a click, without access to this page. */
export const external = (link: Link) => `<a href="${escape(link.url)}" rel="noopener">${escape(link.title)}</a>`;

/** Every option with its background, the right ones marked; the engine marks the learner's choice. */
function optionInfo(question: Question, words: Words, format: Format): string {
  const { t } = words;
  if (question.type !== "single-choice" && question.type !== "multiple-choice") {
    return `<p><strong>${t("rightAnswer")}</strong> ${rightAnswerText(question, words, format)}</p>`;
  }
  return [
    `<ul class="question-infos">`,
    ...question.options.map((option, index) =>
      [
        `<li class="question-info${option.correct ? " question-info-right" : ""}" data-option="${index}">`,
        `<p class="question-info-head"><strong>${format(option.text)}</strong>${option.correct ? ` <span class="question-badge question-badge-right">${t("rightOption")}</span>` : ""}</p>`,
        option.info === "" ? "" : `<p>${format(option.info)}</p>`,
        option.link === undefined ? "" : `<p>${external(option.link)}</p>`,
        `</li>`,
      ].join(""),
    ),
    `</ul>`,
  ].join("\n");
}

/**
 * What the learner learns about a question, its solution: the right answer (the right options marked), each option's
 * background, the explanation, further reading. A fragment without ids, e.g. for a <details>.
 */
export function renderSolution(
  question: Question,
  { lang = "de", explanationHtml, format = escape }: RenderSolutionOptions = {},
): string {
  const words = questionWords(lang);
  const links =
    question.links.length === 0
      ? []
      : [
          `<p class="question-more">${words.t("moreReading")}</p>`,
          `<ul class="question-links">`,
          ...question.links.map((link) => `<li>${external(link)}</li>`),
          `</ul>`,
        ];
  const explanation =
    explanationHtml ??
    (question.explanation === "" ? "" : `<p class="question-explanation">${format(question.explanation)}</p>`);
  return [optionInfo(question, words, format), explanation, ...links].filter((part) => part !== "").join("\n");
}
