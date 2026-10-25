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
import { renderMaterial, type MaterialContext } from "../shared/blocks/index.ts";
import { alternateLinks, languageRoot, pageFooter, pageHeader, relative } from "../shared/pages.ts";
import { localeOf, textsIn, type Language } from "../shared/languages.ts";
import { QUESTION_MESSAGES } from "../shared/questions/render.ts";
import { questionId, type Question } from "../shared/questions/question.ts";
import { solutionId, type Quiz, type QuizData } from "./quiz.ts";
import { external, renderQuestion, renderSolution } from "../shared/questions/render.ts";
import { escape } from "../shared/html.ts";

/** The quiz's texts for learners: those of its page, and those of its questions. */
export type QuizMessages = typeof de & (typeof QUESTION_MESSAGES)["de"];
/** The quiz's texts for learners in each language it has them: a quiz may declare only these languages. */
export const QUIZ_MESSAGES: Readonly<Record<Language, QuizMessages>> = {
  de: { ...QUESTION_MESSAGES.de, ...de },
  en: { ...QUESTION_MESSAGES.en, ...en },
};

/** The quiz's texts in `lang`; German for a language it does not have. */
export const messagesIn = (lang: string): QuizMessages => textsIn(QUIZ_MESSAGES, lang);

/** What rendering in one language needs: its texts and its numbers. */
interface Words {
  t: (key: keyof QuizMessages, params?: Readonly<Record<string, string | number>>) => string;
}
const languages = new Map<string, Words>();
function wordsIn(lang = "de"): Words {
  let found = languages.get(lang);
  if (found === undefined) {
    found = { t: translator(messagesIn(lang), localeOf(lang)) };
    languages.set(lang, found);
  }
  return found;
}

function solutionItem(question: Question, lang: string): string {
  const { t } = wordsIn(lang);
  return [
    `<li class="quiz-solution" id="${solutionId(question)}">`,
    `<h3>${escape(question.text)}</h3>`,
    renderSolution(question, { lang }),
    `<p><a href="#${questionId(question)}">${t("toQuestion")}</a></p>`,
    `</li>`,
  ].join("\n");
}

function renderSources(quiz: Quiz, { t }: Words): string[] {
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
  /** Whether a bundled image has no size of its own (see MaterialContext); none is without one. */
  sizeless?: (image: string) => boolean;
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
function renderStart(total: number, t: Words["t"]): string {
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
export function renderQuiz(data: QuizData, { languages = ["de"], sizeless }: QuizPages = {}): RenderedQuiz {
  const { quiz } = data;
  const lang = data.lang ?? "de";
  const words = wordsIn(lang);
  const { t } = words;
  const where = { path: languageRoot(lang), local: "", languages };
  // the engine needs the questions to check the answers, not what they show
  const forEngine = {
    ...data,
    quiz: {
      ...data.quiz,
      questions: data.quiz.questions.map(({ material: _material, ...question }) => question as Question),
    },
  };
  const json = JSON.stringify(forEngine).replace(/</g, "\\u003c");
  const material: MaterialContext = {
    lang,
    href: (image) => relative(where.path, image),
    ...(sizeless === undefined ? {} : { sizeless }),
  };
  const body = [
    pageHeader({
      ...where,
      lang,
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
    ...quiz.questions.map((question) =>
      renderQuestion(question, {
        element: "li",
        next: true,
        lang,
        ...(question.material === undefined ? {} : { materialHtml: renderMaterial(question.material, material) }),
      }),
    ),
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
    pageFooter({ footer: t("footer"), imprint: t("imprint"), privacy: t("privacy") }),
    `<script type="application/json" id="quiz-data">${json}</script>`,
  ]
    .filter((part) => part !== "")
    .join("\n");
  const alternates = languages.length < 2 ? [] : alternateLinks(where);
  return { title: quiz.title, description: quiz.intro, alternates, body };
}
