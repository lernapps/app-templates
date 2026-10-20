// Renders the quiz into the page at build time: every question (shared/questions/render.ts) with its controls and,
// hidden until it is answered, the background of every option, the explanation and further reading; the solutions
// with the same at the end; the sources; and the data the engine needs. Without JavaScript the page reads as a
// worksheet with its answer key; with JavaScript the engine (engine.ts) turns it into a quiz, one question at a time.
// The engine and the end-to-end tests rely on the ids, classes and data attributes written here. A quiz in several
// languages renders a page per language (renderQuiz with the page's `lang` in its data and the quiz's languages): its
// texts, the quiz's own texts in that language, and a language switch of plain links before the quiz; German is at the
// root, every other language below /<language>/. Links to other sites are plain links with rel="noopener", as in the
// site frame: nothing is loaded from another server before a click.
import { translator } from "@lernapps/tooling/i18n";
import de from "./messages/de.json" with { type: "json" };
import en from "./messages/en.json" with { type: "json" };
import { alternateLinks, languageRoot, languageSwitch } from "../shared/pages.ts";
import { QUESTION_MESSAGES, LOCALES } from "../shared/questions/render.ts";
import { questionId, type Question, type Quiz } from "./quiz.ts";
import { escape, external, renderQuestion, renderSolution } from "../shared/questions/render.ts";

export {
  answerText,
  QUESTION_MESSAGES,
  questionMessagesIn,
  renderQuestion,
  renderSolution,
  type QuestionMessages,
  type RenderQuestionOptions,
  type RenderSolutionOptions,
} from "../shared/questions/render.ts";

/** The quiz's texts for learners: those of its page, and those of its questions. */
export type QuizMessages = typeof de & (typeof QUESTION_MESSAGES)["de"];
/** The quiz's texts for learners in each language it has them: a quiz may declare only these languages. */
export const QUIZ_MESSAGES: Readonly<Record<string, QuizMessages>> = {
  de: { ...QUESTION_MESSAGES["de"]!, ...de },
  en: { ...QUESTION_MESSAGES["en"]!, ...en },
};

/** The quiz's texts in `lang`; German for a language it does not have. */
export const messagesIn = (lang: string): QuizMessages => QUIZ_MESSAGES[lang] ?? QUIZ_MESSAGES["de"]!;

/** What rendering in one language needs: its texts and its numbers. */
interface Language {
  t: (key: keyof QuizMessages, params?: Readonly<Record<string, string | number>>) => string;
}
const languages = new Map<string, Language>();
function language(lang = "de"): Language {
  let found = languages.get(lang);
  if (found === undefined) {
    found = { t: translator(messagesIn(lang), LOCALES[lang] ?? "de-DE") };
    languages.set(lang, found);
  }
  return found;
}

/** What the engine reads from the page (script#quiz-data). */
export interface QuizData {
  /** The quiz in the page's language. */
  quiz: Quiz;
  /** The name of the app's storage, when the quiz keeps the last result on the device. */
  storage?: string;
  /** The page's language, when it is not German. */
  lang?: string;
}

export const solutionId = (question: Question) => `loesung-${question.id}`;

function solutionItem(question: Question, lang: string): string {
  const { t } = language(lang);
  return [
    `<li class="quiz-solution" id="${solutionId(question)}">`,
    `<h3>${escape(question.text)}</h3>`,
    renderSolution(question, { lang }),
    `<p><a href="#${questionId(question)}">${t("toQuestion")}</a></p>`,
    `</li>`,
  ].join("\n");
}

function renderSources(quiz: Quiz, { t }: Language): string[] {
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

/** The pages of a quiz: its languages, German first. */
export interface QuizPages {
  languages?: readonly string[];
}

/** One page of the quiz: its title and description, its alternates in its languages for <head>, and its body. */
export interface RenderedQuiz {
  title: string;
  description: string;
  /** The page in each of the quiz's languages; none while it has one. */
  alternates: string[];
  body: string;
}

/** The form with which the learner chooses how many questions to answer; the engine shows it (none for one question). */
function renderStart(total: number, t: Language["t"]): string {
  if (total < 2) return "";
  return [
    `<form class="quiz-start" hidden>`,
    `<p><label for="quiz-count">${t("countLabel")}</label> `,
    `<input id="quiz-count" type="number" inputmode="numeric" min="1" max="${total}" value="${total}" required> `,
    `<span>${t("countOf", { total })}</span></p>`,
    `<p><button type="submit">${t("start")}</button></p>`,
    `</form>`,
  ].join("");
}

/**
 * The page of the quiz in its data's language (German without one): its title and description, its alternates, and
 * the quiz itself for the page's body, after a language switch when the quiz has several `languages`.
 */
export function renderQuiz(data: QuizData, { languages = ["de"] }: QuizPages = {}): RenderedQuiz {
  const { quiz } = data;
  const lang = data.lang ?? "de";
  const words = language(lang);
  const { t } = words;
  const where = { path: languageRoot(lang), local: "", languages };
  const json = JSON.stringify(data).replace(/</g, "\\u003c");
  const body = [
    languageSwitch({
      ...where,
      lang,
      className: "quiz-languages",
      label: escape(t("languages")),
      name: (other) => escape(messagesIn(other).language),
    }),
    `<main class="quiz" id="quiz">`,
    `<h1>${escape(quiz.title)}</h1>`,
    `<p class="quiz-intro">${escape(quiz.intro)}</p>`,
    `<p class="quiz-howto">${t("howto")}</p>`,
    `<noscript><p>${t("noscript")}</p></noscript>`,
    `<h2 class="quiz-heading">${t("questions")}</h2>`,
    renderStart(quiz.questions.length, t),
    `<p class="quiz-progress" hidden></p>`,
    `<ol class="quiz-questions">`,
    ...quiz.questions.map((question) => renderQuestion(question, { element: "li", next: true, lang })),
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
    ...quiz.questions.map((question) => solutionItem(question, lang)),
    `</ol>`,
    `</section>`,
    ...renderSources(quiz, words),
    `</main>`,
    `<footer class="quiz-footer"><p>${t("footer")} · <a href="https://lernapps.net/imprint/">${t("imprint")}</a> · <a href="https://lernapps.net/privacy/">${t("privacy")}</a></p></footer>`,
    `<script type="application/json" id="quiz-data">${json}</script>`,
  ]
    .filter((part) => part !== "")
    .join("\n");
  const alternates = languages.length < 2 ? [] : alternateLinks(where);
  return { title: quiz.title, description: quiz.intro, alternates, body };
}
