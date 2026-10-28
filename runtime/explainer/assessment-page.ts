// What the build writes for a self-assessment (assessment.ts): the offer on the start page or the chapter's page, and
// every part of its page but a line for a reader without JavaScript, each in a <template>, inert until the client
// module puts it into the page: without JavaScript the page shows no heading, button or exercise of it; and its tutor page, <assessment>/tutor/ with its Markdown beside it (index.md), the
// one source of what a tutor gets about a run. The page holds the intro, each of its pages with its exercises (a
// question of the question types rendered as the shared questions render it, without "Prüfen"; a generated one as the
// place of its live task, which the client module draws), the place of the result with the way to the tutor, and the
// data the client module needs (assessment-client.ts). The tutor page holds the guide of a tutor after a run, how to
// read the result in its address (?a1=17-falsch-F1), the content pages with their links and the exercises asked of
// each, and each exercise as the tutor page of its page has it: a generated one with its table of task numbers, its
// solutions and typical mistakes F1, F2 …
import { renderQuestion } from "../shared/questions/render.ts";
import { type MaterialContext, renderMaterial } from "../shared/blocks/index.ts";
import { plain, renderWithFormulas } from "../shared/text/markdown.ts";
import { type Assessment, titleOf } from "./assessment.ts";
import { inLanguage, type Site } from "./content.ts";
import { exerciseData, type ExerciseData } from "./exercises.ts";
import { message } from "./messages.ts";
import { PROVIDERS, placeholderPrompt } from "./prompt.ts";
import { TUTOR_PAGE, tutorPageOf } from "./tutor.ts";
import { exerciseLines, TUTOR_MARKDOWN, tutorDocument } from "./tutorpage.ts";

/** What rendering a part of a self-assessment needs of the page it is on (render.ts). */
export interface AssessmentContext {
  site: Site;
  lang: string;
  /** A link from this page to `local`, an address within the language tree. */
  to: (local: string) => string;
  /** Where a link inside a text leads. */
  resolve: (href: string) => string;
  material: MaterialContext;
  /** The app's assistants as the options of a select, and copying the text. */
  ways: string;
}

/** The address of a self-assessment's tutor page within its language tree. */
export const assessmentTutorOf = (assessment: Pick<Assessment, "local">): string => `${assessment.local}${TUTOR_PAGE}/`;

/** What the client module reads from a self-assessment's page (script.explainer-assessment-data). */
export interface AssessmentData {
  /** The key of its last result on the device, and the app's name for what it keeps there. */
  key: string;
  storage: string;
  steps: number;
  items: {
    key: string;
    ref: string;
    /** Its content page, <chapter>/<page>/. */
    page: string;
    exercise: string;
    step: number;
    data: ExerciseData;
  }[];
  /** The content pages it says something about, in order. */
  pages: { page: string; title: string; href: string }[];
  /** The root of the language tree, from this page; the tutor page and its Markdown from that root. */
  root: string;
  tutor: string;
  markdown: string;
  ways: { name: string; url: string; paste?: boolean }[];
  placeholder: string;
}

const json = (value: unknown) => JSON.stringify(value).replace(/</g, "\\u003c");

/**
 * The offer of a self-assessment on the start page or its chapter's page, in a <template> until the client module
 * puts it into the page; it says "Dein letztes Ergebnis ansehen" when the device keeps one.
 */
export function assessmentOffer(context: AssessmentContext, assessment: Assessment): string {
  const { lang, site } = context;
  const t = (key: Parameters<typeof message>[1], params?: Record<string, string>) => plain(message(lang, key, params));
  const offer = assessment.chapter === undefined ? "assessmentOfferApp" : "assessmentOfferChapter";
  return [
    `<template class="explainer-assessment-template">`,
    `<section class="explainer-assessment-offer" aria-labelledby="selbsteinschaetzung" hidden data-key="${plain(assessment.key)}" data-storage="${plain(site.storage ?? "explainer")}">`,
    `<h2 id="selbsteinschaetzung">${t("assessmentOfferTitle")}</h2>`,
    `<p>${t(offer, { count: String(assessment.items.length) })}</p>`,
    `<p><a class="explainer-assessment-link" href="${context.to(assessment.local)}" data-last="${t("assessmentOfferLast")}">${t("assessmentOfferStart")}</a></p>`,
    `</section>`,
    `</template>`,
  ].join("\n");
}

/** One exercise of a self-assessment: its number, and its question, or the place of its live task. */
function itemHtml(context: AssessmentContext, data: ExerciseData, n: number): string {
  const { lang } = context;
  const label = `<p class="explainer-assessment-label">${plain(message(lang, "assessmentTask", { n: String(n) }))}</p>`;
  if (data.kind === "generated") return `${label}<div class="explainer-assessment-live"></div>`;
  const { question, rendered } = data;
  return `${label}${renderQuestion(question, {
    lang,
    format: (text) => rendered[text] ?? renderWithFormulas(text),
    ...(question.material === undefined ? {} : { materialHtml: renderMaterial(question.material, context.material) }),
  })}`;
}

/**
 * The page of a self-assessment: the line for a reader without JavaScript, and, in a <template> until the client
 * module puts it into the page, the intro with its start button, each of its pages with its exercises and the buttons to move on, the place of the
 * result with the way to the tutor, and the client module's data.
 */
export function assessmentMain(context: AssessmentContext, assessment: Assessment): string {
  const { lang, site } = context;
  const t = (key: Parameters<typeof message>[1], params?: Record<string, string>) => plain(message(lang, key, params));
  const items = assessment.items.map((item) => {
    const data = exerciseData(item.block, lang, site.data, context.resolve);
    // the question by its key: the same id may be on two pages
    return { item, data: data.kind === "question" ? { ...data, question: { ...data.question, id: item.key } } : data };
  });
  const steps = Array.from({ length: assessment.steps }, (_step, index) => {
    const own = items.filter(({ item }) => item.step === index);
    const last = index === assessment.steps - 1;
    return [
      `<section class="explainer-assessment-step" data-step="${index}" aria-labelledby="teil-${index + 1}" hidden>`,
      `<h2 id="teil-${index + 1}" tabindex="-1">${t("assessmentStep", { n: String(index + 1), count: String(assessment.steps) })}</h2>`,
      `<ol class="explainer-assessment-items">`,
      ...own.map(
        ({ item, data }) =>
          `<li class="explainer-assessment-item" data-key="${item.key}">${itemHtml(context, data, items.findIndex((other) => other.item === item) + 1)}</li>`,
      ),
      `</ol>`,
      `<p class="explainer-assessment-nav">${index === 0 ? "" : `<button type="button" class="explainer-assessment-back">${t("assessmentBack")}</button> `}<button type="button" class="${last ? "explainer-assessment-finish" : "explainer-assessment-next"}">${t(last ? "assessmentFinish" : "assessmentNext")}</button></p>`,
      `</section>`,
    ].join("\n");
  });
  const tutor = assessmentTutorOf(assessment);
  const data: AssessmentData = {
    key: assessment.key,
    storage: site.storage ?? "explainer",
    steps: assessment.steps,
    items: items.map(({ item, data: exercise }) => ({
      key: item.key,
      ref: item.ref,
      page: `${item.page.chapter}/${item.page.id}/`,
      exercise: item.block.id,
      step: item.step,
      data: exercise,
    })),
    pages: assessment.pages.map((page) => ({
      page: `${page.chapter}/${page.id}/`,
      title: titleOf(page, lang),
      href: context.to(`${page.chapter}/${page.id}/`),
    })),
    root: context.to(""),
    tutor,
    markdown: `${tutor}${TUTOR_MARKDOWN}`,
    ways: PROVIDERS.map((provider) => ({
      name: provider.name,
      url: provider.url,
      ...(provider.paste === true ? { paste: true } : {}),
    })),
    placeholder: placeholderPrompt(lang),
  };
  const back = assessment.chapter === undefined ? "" : `${assessment.chapter.id}/`;
  return [
    `<h1>${t("assessmentTitle")}</h1>`,
    `<p class="explainer-assessment-nojs">${t("assessmentNojs")} <a href="${context.to(back)}">${plain(assessment.chapter === undefined ? message(lang, "start") : inLanguage(assessment.chapter.title, lang))}</a></p>`,
    `<template class="explainer-assessment-template">`,
    `<div class="explainer-assessment" hidden>`,
    `<div class="explainer-assessment-intro">`,
    `<p>${t("assessmentIntro", { count: String(assessment.items.length), steps: String(assessment.steps) })}</p>`,
    `<p>${t("assessmentPrivacy")}</p>`,
    `<p><button type="button" class="explainer-assessment-begin">${t("assessmentBegin")}</button></p>`,
    `</div>`,
    ...steps,
    `<section class="explainer-assessment-result" aria-labelledby="ergebnis" hidden>`,
    `<h2 id="ergebnis" tabindex="-1">${t("assessmentResultTitle")}</h2>`,
    `<p class="explainer-assessment-score"></p>`,
    `<p class="explainer-assessment-advice"></p>`,
    `<ol class="explainer-assessment-pages"></ol>`,
    `<div class="explainer-assessment-tutor">`,
    `<h3>${t("assessmentTutorTitle")}</h3>`,
    `<p>${t("assessmentTutorIntro")}</p>`,
    `<p class="explainer-assessment-tutor-actions"><select class="explainer-assessment-way" aria-label="${t("tutorWay")}">${context.ways}</select> <button type="button" class="explainer-assessment-go"></button></p>`,
    `<p class="explainer-tutor-hint" role="status" aria-live="polite" hidden></p>`,
    `<p class="explainer-assessment-tutor-status" role="status" aria-live="polite"></p>`,
    `<p class="explainer-tutor-note">${t("tutorAccount")}</p>`,
    `<p><a class="explainer-assessment-tutor-page" href="${context.to(tutor)}">${t("assessmentTutorPage")}</a></p>`,
    `</div>`,
    `<p class="explainer-assessment-again"><button type="button" class="explainer-assessment-restart">${t("assessmentRestart")}</button> <button type="button" class="explainer-assessment-delete">${t("assessmentDelete")}</button></p>`,
    `<p class="explainer-assessment-status" role="status" aria-live="polite"></p>`,
    `</section>`,
    `<script type="application/json" class="explainer-assessment-data">${json(data)}</script>`,
    `</div>`,
    `</template>`,
  ].join("\n");
}

interface Words {
  title: string;
  description: string;
  intro: string;
  scopeApp: string;
  scopeChapter: string;
  parents: string;
  toAssessment: string;
  readTitle: string;
  read: string[];
  guideTitle: string;
  guide: string[];
  appRules: string;
  pagesTitle: string;
  page: string;
  tutorPage: string;
  asked: string;
  unasked: string;
  itemsTitle: string;
  item: string;
}

const WORDS: Readonly<Record<string, Words>> = {
  de: {
    title: "Selbsteinschätzung – für deinen KI-Tutor",
    description: "Was ein KI-Tutor zur Selbsteinschätzung von „{app}“ bekommt.",
    intro:
      "Du begleitest ein Kind beim Lernen mit der Lern-App „{app}“ von lernapps.net. Es hat gerade die Selbsteinschätzung {scope} gemacht: {count} Aufgaben aus den Seiten der App, ohne Rückmeldung zu einzelnen Aufgaben. Am Ende sah es nur, welche Seiten es wahrscheinlich schon kann, noch einmal ansehen oder genau lesen sollte. Jetzt lernt es die Seiten, die noch nicht sitzen. Du begleitest es dabei.",
    scopeApp: "der ganzen App",
    scopeChapter: "des Kapitels „{chapter}“",
    parents: "Eltern und Lehrkräfte sehen hier, was der Tutor bekommt.",
    toAssessment: "Zur Selbsteinschätzung",
    readTitle: "So liest du das Ergebnis",
    read: [
      "Die erste Nachricht des Kindes nennt diese Seite mit dem Ergebnis, z. B. `?a1=17-falsch-F1&a2=richtig&a3=offen`, dann das Ergebnis je Seite, wie das Kind es sah, und eine Zeile je Aufgabe mit der Eingabe einer falschen. Nimm das Ergebnis je Seite, wie es dasteht; rechne es nicht nach.",
      "`a1` ist die Aufgabe A1 unten. Eine Zahl davor ist die Nummer der Aufgabe in ihrer Übung: Schlag sie in der Tabelle der Übung nach. Dann `richtig`, `falsch` oder `offen` (nicht beantwortet). `F1` ist der typische Fehler F1 der Übung, zu dem die Eingabe passt.",
      "Eine Seite mit allen Aufgaben richtig kann das Kind wahrscheinlich schon. Mit mindestens der Hälfte richtig soll es sie noch einmal ansehen, mit weniger genau lesen. Eine offene Aufgabe zählt als nicht richtig. Eine Seite ohne Aufgabe wurde nicht abgefragt.",
    ],
    guideTitle: "So leitest du an",
    guide: [
      "Antworte kurz: höchstens drei Sätze und eine Frage. Keine Überschriften, keine Listen.",
      "Sag zuerst in zwei Sätzen, was schon gut lief und mit welcher Seite ihr anfangt: der ersten unten, die das Kind genau lesen soll, sonst der ersten zum noch einmal Ansehen.",
      "Gelernt wird in der App: Schick das Kind mit dem Link zur Seite dorthin. Jeder Link ist eine volle Adresse mit `https://`: die Adresse dieser Seite ohne `{here}` und ohne `?…`, mit dem Pfad der Seite und `?von=tutor`.",
      "Zu jeder Seite gibt es eine Tutor-Seite mit ihrem Inhalt und ihren Übungen. Kannst du Adressen laden, lade sie, bevor du die Seite erklärst; sonst bitte das Kind, auf der Seite „Mit einem KI-Tutor lernen“ zu nutzen.",
      "Lädst du die Tutor-Seite einer Seite, nimm ihren Inhalt und ihre Aufgaben als Kontext. Es gelten weiter die Regeln hier.",
      "Besprich eine falsche Aufgabe erst, wenn das Kind ihre Seite gelesen hat: Sag, was an seiner Eingabe nicht passt, ohne die Lösung zu verraten. Passt die Eingabe zu keinem Fehler F…, frag, wie das Kind gerechnet hat. Rechne nichts selbst aus: Lösungen und Fehler stehen unten bei jeder Aufgabe.",
      "Fragt das Kind nach einer Aufgabe einer anderen Seite, antworte kurz und schick es zu ihrer Seite. Dann geht es in der Reihenfolge weiter.",
      "Erfinde keine Aufgaben. Zum Üben schick das Kind zu einer Übung der Seite.",
    ],
    appRules: "Regeln dieser App",
    pagesTitle: "Die Seiten, in ihrer Reihenfolge",
    page: "Seite",
    tutorPage: "Tutor-Seite",
    asked: "Aufgaben",
    unasked: "nicht abgefragt",
    itemsTitle: "Die Aufgaben",
    item: "{key}: Übung {exercise} der Seite „{page}“",
  },
  en: {
    title: "Self-assessment – for your AI tutor",
    description: "What an AI tutor gets for the self-assessment of “{app}”.",
    intro:
      "You accompany a child learning with the learning app “{app}” of lernapps.net. It has just done the self-assessment {scope}: {count} tasks from the pages of the app, without feedback on any single task. At the end it saw only which pages it probably knows already, should look at again or should read closely. Now it learns the pages that do not stick yet. You accompany it.",
    scopeApp: "of the whole app",
    scopeChapter: "of the chapter “{chapter}”",
    parents: "Parents and teachers see here what the tutor gets.",
    toAssessment: "To the self-assessment",
    readTitle: "How you read the result",
    read: [
      "The child's first message names this page with the result, e.g. `?a1=17-falsch-F1&a2=richtig&a3=offen`, then the result per page as the child saw it, and a line per task with the input of a wrong one. Take the result per page as it stands; do not work it out again.",
      "`a1` is the task A1 below. A number before is the number of the task in its exercise: look it up in the exercise's table. Then `richtig` (right), `falsch` (wrong) or `offen` (not answered). `F1` is the typical mistake F1 of the exercise that the input fits.",
      "A page with all its tasks right the child probably knows already. With at least half of them right it should look at it again, with fewer read it closely. An open task counts as not right. A page without a task was not asked.",
    ],
    guideTitle: "How you guide",
    guide: [
      "Answer briefly: three sentences and one question at most. No headings, no lists.",
      "First say in two sentences what went well already and which page you start with: the first one below the child should read closely, else the first one to look at again.",
      "Learning happens in the app: send the child there with the link to the page. Every link is a full address with `https://`: the address of this page without `{here}` and without `?…`, with the path of the page and `?von=tutor`.",
      "Every page has a tutor page with its content and its exercises. If you can load addresses, load it before you explain the page; else ask the child to use “Learn with an AI tutor” on the page.",
      "If you load the tutor page of a page, take its content and tasks as context. The rules here still apply.",
      "Talk a wrong task over only once the child has read its page: say what about its input does not fit, without giving the solution away. If the input fits no mistake F…, ask how the child worked it out. Work nothing out yourself: solutions and mistakes are below with each task.",
      "If the child asks about a task of another page, answer briefly and send it to that page. Then go on in the order.",
      "Do not make up tasks. To practise, send the child to an exercise of the page.",
    ],
    appRules: "Rules of this app",
    pagesTitle: "The pages, in their order",
    page: "Page",
    tutorPage: "Tutor page",
    asked: "Tasks",
    unasked: "not asked",
    itemsTitle: "The tasks",
    item: "{key}: exercise {exercise} of the page “{page}”",
  },
};

const wordsIn = (lang: string): Words => WORDS[lang] ?? (WORDS["de"] as Words);

/** The tutor page of a self-assessment in `lang`, as Markdown, its links relative to its folder <assessment>/tutor/. */
export function assessmentTutorMarkdown(site: Site, assessment: Assessment, lang: string): string {
  const words = wordsIn(lang);
  const app = inLanguage(site.app.title, lang).replace(/\s+/g, " ").trim();
  const scope =
    assessment.chapter === undefined
      ? words.scopeApp
      : words.scopeChapter.replace("{chapter}", inLanguage(assessment.chapter.title, lang).replace(/\s+/g, " ").trim());
  const here = assessmentTutorOf(assessment);
  // from the tutor page to the root of the language tree
  const root = "../".repeat(here.split("/").filter((part) => part !== "").length);
  const lines = [
    `# ${words.title}`,
    "",
    words.intro.replace("{app}", app).replace("{scope}", scope).replace("{count}", String(assessment.items.length)),
    "",
    `${words.parents} [${words.toAssessment}](../)`,
    "",
    `## ${words.readTitle}`,
    "",
    ...words.read.map((text) => `- ${text}`),
    "",
    `## ${words.guideTitle}`,
    "",
    ...words.guide.map((text) => `- ${text.replace("{here}", here)}`),
    "",
  ];
  if (site.app.tutor?.rules !== undefined) {
    lines.push(`## ${words.appRules}`, "", inLanguage(site.app.tutor.rules, lang).trim(), "");
  }
  lines.push(`## ${words.pagesTitle}`, "");
  for (const page of assessment.pages) {
    const local = `${page.chapter}/${page.id}/`;
    const keys = assessment.items.filter((item) => item.page === page).map((item) => item.key.toUpperCase());
    lines.push(
      `- „${titleOf(page, lang)}“: [${words.page}](${root}${local}?von=tutor) · [${words.tutorPage}](${root}${tutorPageOf(page)}) · ${keys.length === 0 ? words.unasked : `${words.asked} ${keys.join(", ")}`}`,
    );
  }
  lines.push("", `## ${words.itemsTitle}`, "");
  for (const item of assessment.items) {
    lines.push(
      `### ${words.item
        .replace("{key}", item.key.toUpperCase())
        .replace("{exercise}", item.block.id)
        .replace("{page}", titleOf(item.page, lang))}`,
      "",
      ...exerciseLines(site, item.block, lang, `${root}${item.page.chapter}/${item.page.id}/`),
      "",
    );
  }
  return `${lines.join("\n").trimEnd()}\n`;
}

/** The tutor page of a self-assessment in `lang` as a whole HTML document. */
export function assessmentTutorDocument(markdown: string, site: Site, lang: string): string {
  const words = wordsIn(lang);
  const app = inLanguage(site.app.title, lang).replace(/\s+/g, " ").trim();
  return tutorDocument(markdown, `${words.title} – ${app}`, words.description.replace("{app}", app), lang);
}
