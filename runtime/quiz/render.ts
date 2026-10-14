// Renders the quiz into the page at build time: every question with its controls and, hidden until it is answered,
// the background of every option, the explanation and further reading; the solutions with the same at the end; the
// sources; and the data the engine needs. Without JavaScript the page reads as a worksheet with its answer key; with
// JavaScript the engine (engine.ts) turns it into a quiz, one question at a time. The engine and the end-to-end tests
// rely on the ids, classes and data attributes written here. One question's controls (renderQuestion) and its
// solution (renderSolution) render on their own too, for another archetype that embeds the quiz's questions; the
// quiz is built from the same two. Links to other sites are plain links with rel="noopener", as in the site frame:
// nothing is loaded from another server before a click.
import { translator } from "@lernapps/tooling/i18n";
import de from "./messages/de.json" with { type: "json" };
import en from "./messages/en.json" with { type: "json" };
import { mixed, questionId, type Link, type Question, type Quiz } from "./quiz.ts";

export type QuizMessages = typeof de;
/** The quiz's texts for learners in each language it has them; the quiz itself is German. */
export const QUIZ_MESSAGES: Readonly<Record<string, QuizMessages>> = { de, en };
const LOCALES: Readonly<Record<string, string>> = { de: "de-DE", en: "en-GB" };

/** The quiz's texts in `lang`; German for a language it does not have. */
export const messagesIn = (lang: string): QuizMessages => QUIZ_MESSAGES[lang] ?? de;

/** What rendering in one language needs: its texts and its numbers. */
interface Language {
  t: (key: keyof QuizMessages, params?: Readonly<Record<string, string | number>>) => string;
  numbers: Intl.NumberFormat;
}
const languages = new Map<string, Language>();
function language(lang = "de"): Language {
  let found = languages.get(lang);
  if (found === undefined) {
    const locale = LOCALES[lang] ?? "de-DE";
    found = {
      t: translator(messagesIn(lang), locale),
      numbers: new Intl.NumberFormat(locale, { maximumFractionDigits: 10 }),
    };
    languages.set(lang, found);
  }
  return found;
}
const { t } = language("de");

/** What the engine reads from the page (script#quiz-data). */
export interface QuizData {
  quiz: Quiz;
  /** The name of the app's storage, when the quiz keeps the last result on the device. */
  storage?: string;
}

const escape = (text: string) =>
  text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

export const solutionId = (question: Question) => `loesung-${question.id}`;

function controls(question: Question, { t }: Language): string {
  const name = questionId(question);
  switch (question.type) {
    case "single-choice":
    case "multiple-choice": {
      const type = question.type === "single-choice" ? "radio" : "checkbox";
      return question.options
        .map(
          (option, index) =>
            `<label class="quiz-option"><input type="${type}" name="${name}" value="${index}"> <span>${escape(option.text)}</span></label>`,
        )
        .join("\n");
    }
    case "true-false":
      return [true, false]
        .map(
          (value) =>
            `<label class="quiz-option"><input type="radio" name="${name}" value="${value}"> <span>${t(value ? "true" : "false")}</span></label>`,
        )
        .join("\n");
    case "number":
      return [
        `<label class="quiz-number">${t("yourAnswer")}`,
        `<input type="text" inputmode="decimal" autocomplete="off" name="${name}"${question.unit === undefined ? "" : ` aria-describedby="${name}-unit"`}>`,
        question.unit === undefined ? "" : `<span id="${name}-unit">${escape(question.unit)}</span>`,
        `</label>`,
      ].join(" ");
    case "ordering": {
      const places = question.items
        .map((_item, place) => `<option value="${place}">${t("place", { place: place + 1 })}</option>`)
        .join("");
      return [
        `<p class="quiz-hint">${t("orderHint")}</p>`,
        `<ul class="quiz-pairs">`,
        ...mixed(question.items.length, question.id).map(
          (index) =>
            `<li><label><span>${escape(question.items[index] ?? "")}</span> <select name="${name}-${index}" data-item="${index}"><option value="">${t("choose")}</option>${places}</select></label></li>`,
        ),
        `</ul>`,
      ].join("\n");
    }
    case "matching": {
      const rights = mixed(question.pairs.length, question.id)
        .map((index) => `<option value="${index}">${escape(question.pairs[index]?.right ?? "")}</option>`)
        .join("");
      return [
        `<p class="quiz-hint">${t("matchHint")}</p>`,
        `<ul class="quiz-pairs">`,
        ...question.pairs.map(
          (pair, index) =>
            `<li><label><span>${escape(pair.left)}</span> <select name="${name}-${index}" data-left="${index}"><option value="">${t("choose")}</option>${rights}</select></label></li>`,
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
  element?: "div" | "li";
  next?: boolean;
  lang?: string;
  textHtml?: string;
  explanationHtml?: string;
}

/** How a solution renders: in which language, and, for a page that renders it itself, the explanation as HTML. */
export interface RenderSolutionOptions {
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
  { element = "div", next = false, lang = "de", textHtml, explanationHtml }: RenderQuestionOptions = {},
): string {
  const words = language(lang);
  const { t } = words;
  const id = questionId(question);
  const nextButton = next ? ` <button type="button" class="quiz-next" hidden>${t("next")}</button>` : "";
  return [
    `<${element} class="quiz-question" id="${id}" data-id="${question.id}" data-type="${question.type}">`,
    `<form class="quiz-form" novalidate>`,
    `<fieldset>`,
    `<legend class="quiz-text">${textHtml ?? escape(question.text)}</legend>`,
    controls(question, words),
    `</fieldset>`,
    `<div class="quiz-feedback" role="status"></div>`,
    `<div class="quiz-reveal" hidden>`,
    renderSolution(question, explanationHtml === undefined ? { lang } : { lang, explanationHtml }),
    `</div>`,
    `<p class="quiz-actions" hidden><button type="submit" class="quiz-check">${t("check")}</button>${nextButton}</p>`,
    `</form>`,
    `</${element}>`,
  ].join("\n");
}

/** The right answer as the solution states it, in `lang`: the right options, the number, the order, the pairs. */
export function answerText(question: Question, lang = "de"): string {
  return rightAnswerText(question, language(lang));
}

function rightAnswerText(question: Question, { t, numbers }: Language): string {
  switch (question.type) {
    case "single-choice":
    case "multiple-choice":
      return question.options
        .filter((option) => option.correct)
        .map((option) => escape(option.text))
        .join("; ");
    case "true-false":
      return t(question.answer ? "statementTrue" : "statementFalse");
    case "number": {
      const unit = question.unit === undefined ? "" : ` ${escape(question.unit)}`;
      const tolerance =
        question.tolerance > 0
          ? ` ${t("tolerance", { tolerance: `${numbers.format(question.tolerance)}${unit}` })}`
          : "";
      return `${numbers.format(question.answer)}${unit}${tolerance}`;
    }
    case "ordering":
      return question.items.map((item, index) => `${index + 1}. ${escape(item)}`).join(", ");
    case "matching":
      return question.pairs.map((pair) => `${escape(pair.left)} – ${escape(pair.right)}`).join("; ");
  }
}

/** A link to another site: opened like any link, never loaded before a click, without access to this page. */
const external = (link: Link) => `<a href="${escape(link.url)}" rel="noopener">${escape(link.title)}</a>`;

/** Every option with its background, the right ones marked; the engine marks the learner's choice. */
function optionInfo(question: Question, words: Language): string {
  const { t } = words;
  if (question.type !== "single-choice" && question.type !== "multiple-choice") {
    return `<p><strong>${t("rightAnswer")}</strong> ${rightAnswerText(question, words)}</p>`;
  }
  return [
    `<ul class="quiz-infos">`,
    ...question.options.map((option, index) =>
      [
        `<li class="quiz-info${option.correct ? " quiz-info-right" : ""}" data-option="${index}">`,
        `<p class="quiz-info-head"><strong>${escape(option.text)}</strong>${option.correct ? ` <span class="quiz-badge quiz-badge-right">${t("rightOption")}</span>` : ""}</p>`,
        option.info === "" ? "" : `<p>${escape(option.info)}</p>`,
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
  { lang = "de", explanationHtml }: RenderSolutionOptions = {},
): string {
  const words = language(lang);
  const links =
    question.links.length === 0
      ? []
      : [
          `<p class="quiz-more">${words.t("moreReading")}</p>`,
          `<ul class="quiz-links">`,
          ...question.links.map((link) => `<li>${external(link)}</li>`),
          `</ul>`,
        ];
  const explanation =
    explanationHtml ??
    (question.explanation === "" ? "" : `<p class="quiz-explanation">${escape(question.explanation)}</p>`);
  return [optionInfo(question, words), explanation, ...links].filter((part) => part !== "").join("\n");
}

function solutionItem(question: Question): string {
  return [
    `<li class="quiz-solution" id="${solutionId(question)}">`,
    `<h3>${escape(question.text)}</h3>`,
    renderSolution(question),
    `<p><a href="#${questionId(question)}">${t("toQuestion")}</a></p>`,
    `</li>`,
  ].join("\n");
}

function renderSources(quiz: Quiz): string[] {
  if (quiz.sources === undefined) return [];
  return [
    `<section class="quiz-sources" id="quellen">`,
    `<h2>${t("sources")}</h2>`,
    `<p>${t("sourcesIntro")}</p>`,
    `<ul>`,
    ...quiz.sources.map(
      (source) =>
        `<li>${source.url === undefined ? escape(source.title) : external({ title: source.title, url: source.url })}</li>`,
    ),
    `</ul>`,
    `</section>`,
  ];
}

/** The page's title and description, and the quiz itself for the page's body. */
export function renderQuiz(data: QuizData): { title: string; description: string; body: string } {
  const { quiz } = data;
  const json = JSON.stringify(data).replace(/</g, "\\u003c");
  const body = [
    `<main class="quiz" id="quiz">`,
    `<h1>${escape(quiz.title)}</h1>`,
    `<p class="quiz-intro">${escape(quiz.intro)}</p>`,
    `<p class="quiz-howto">${t("howto")}</p>`,
    `<noscript><p>${t("noscript")}</p></noscript>`,
    `<h2 class="quiz-heading">${t("questions")}</h2>`,
    `<p class="quiz-progress" hidden></p>`,
    `<ol class="quiz-questions">`,
    ...quiz.questions.map((question) => renderQuestion(question, { element: "li", next: true })),
    `</ol>`,
    `<section class="quiz-result" id="ergebnis" hidden tabindex="-1">`,
    `<h2>${t("result")}</h2>`,
    `<p class="quiz-score"></p>`,
    `<p class="quiz-last" hidden></p>`,
    `<p><a class="quiz-restart" href="./">${t("restart")}</a></p>`,
    `</section>`,
    `<section class="quiz-solutions" id="loesungen">`,
    `<h2>${t("solutions")}</h2>`,
    `<ol>`,
    ...quiz.questions.map(solutionItem),
    `</ol>`,
    `</section>`,
    ...renderSources(quiz),
    `</main>`,
    `<footer class="quiz-footer"><p>${t("footer")} · <a href="https://lernapps.net/imprint/">${t("imprint")}</a> · <a href="https://lernapps.net/privacy/">${t("privacy")}</a></p></footer>`,
    `<script type="application/json" id="quiz-data">${json}</script>`,
  ].join("\n");
  return { title: quiz.title, description: quiz.intro, body };
}
