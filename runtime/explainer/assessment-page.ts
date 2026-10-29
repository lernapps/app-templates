// What the build writes for a self-assessment (assessment.ts): the offer on the start page or the chapter's page, and
// every part of its page but a line for a reader without JavaScript, each in a <template>, inert until the client
// module puts it into the page: without JavaScript the page shows no heading, button or exercise of it; and its tutor page, <assessment>/tutor/ with its Markdown beside it (index.md), the
// one source of what a tutor gets about a run. The page holds the intro, each of its pages with its exercises (a
// question of the question types rendered as the shared questions render it, without "Prüfen"; a generated one as the
// place of its live task, which the client module draws), the place of the result with the way to the tutor, and the
// data the client module needs (assessment-client.ts). The tutor page makes the tutor a guide: chapter by chapter to
// the pages that do not stick (opened with via=tutor, each ends in "Zurück zum Tutor"), then into a new round of the
// chapter's self-assessment, whose "Zurück zum Tutor" copies its result; after each round the tutor decides on the next
// chapter or another round. It holds how to read a result (?a1=17-falsch-F1), every chapter with its pages and the
// link to its self-assessment, and the exercise behind each key; explaining is left to the pages' own tutor pages.
import { renderQuestion } from "../shared/questions/render.ts";
import { type MaterialContext, renderMaterial } from "../shared/blocks/index.ts";
import { plain, renderWithFormulas } from "../shared/text/markdown.ts";
import {
  assessments,
  drawsTasks,
  type Assessment,
  type AssessmentItem,
  type LinkChapter,
  titleOf,
} from "./assessment.ts";
import { inLanguage, type BlockOf, type Site, type Text } from "./content.ts";
import { exerciseData, type ExerciseData } from "./exercises.ts";
import { message } from "./messages.ts";
import { PROVIDERS, placeholderPrompt } from "./prompt.ts";
import { TUTOR_PAGE } from "./tutor.ts";
import { TUTOR_MARKDOWN, tutorDocument } from "./tutorpage.ts";

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
  /** An exercise component as the exercise `key` of the self-assessment, with its task numbers' seeds. */
  component: (block: BlockOf<"vue-component">, key: string) => { html: string; seeds: number[] } | undefined;
}

/**
 * What the browser reads of one exercise of a self-assessment: a question or a generated exercise as on its page, or
 * an exercise component, whose task the islands show (islands.ts), with the seed of each task number.
 */
export type AssessmentItemData = ExerciseData | { kind: "component"; seeds: number[] };

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
    data: AssessmentItemData;
  }[];
  /** The content pages it says something about, in order. */
  pages: { page: string; title: string; href: string }[];
  /** Every chapter of the app with its pages and its self-assessment, for the links a tutor gets (assessment.ts). */
  chapters: LinkChapter[];
  /** The address of the app's self-assessment, within the language tree. */
  whole: string;
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

/**
 * One exercise of a self-assessment: its number, and its question, the place of its live task, or the component
 * (`component`, its markup).
 */
function itemHtml(context: AssessmentContext, data: AssessmentItemData, n: number, component = ""): string {
  const { lang } = context;
  const label = `<p class="explainer-assessment-label">${plain(message(lang, "assessmentTask", { n: String(n) }))}</p>`;
  if (data.kind === "generated") return `${label}<div class="explainer-assessment-live"></div>`;
  if (data.kind === "component") return `${label}${component}`;
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
  const items = assessment.items.map((item): { item: AssessmentItem; data: AssessmentItemData; html?: string } => {
    if (item.block.type === "vue-component") {
      const component = context.component(item.block, item.key);
      return { item, data: { kind: "component", seeds: component?.seeds ?? [1] }, html: component?.html ?? "" };
    }
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
        ({ item, data, html }) =>
          `<li class="explainer-assessment-item" data-key="${item.key}">${itemHtml(context, data, items.findIndex((other) => other.item === item) + 1, html)}</li>`,
      ),
      `</ol>`,
      `<p class="explainer-assessment-nav">${index === 0 ? "" : `<button type="button" class="explainer-assessment-back">${t("assessmentBack")}</button> `}<button type="button" class="${last ? "explainer-assessment-finish" : "explainer-assessment-next"}">${t(last ? "assessmentFinish" : "assessmentNext")}</button></p>`,
      `</section>`,
    ].join("\n");
  });
  const tutor = assessmentTutorOf(assessment);
  const all = assessments(site);
  const whole = all.find((candidate) => candidate.chapter === undefined);
  const data: AssessmentData = {
    key: assessment.key,
    storage: site.storage ?? "explainer",
    steps: assessment.steps,
    items: items.map(({ item, data: exercise }) => ({
      key: item.key,
      ref: item.ref,
      page: `${item.page.chapter}/${item.page.id}/`,
      exercise: item.exercise,
      step: item.step,
      data: exercise,
    })),
    pages: assessment.pages.map((page) => ({
      page: `${page.chapter}/${page.id}/`,
      title: titleOf(page, lang),
      href: context.to(`${page.chapter}/${page.id}/`),
    })),
    chapters: site.chapters.map((chapter) => {
      const own =
        all.find((candidate) => candidate.chapter === chapter) ?? (site.chapters.length === 1 ? whole : undefined);
      return {
        title: inLanguage(chapter.title, lang).replace(/\s+/g, " ").trim(),
        ...(own === undefined ? {} : { assessment: own.local }),
        pages: chapter.pages.map((page) => ({ title: titleOf(page, lang), local: `${page.chapter}/${page.id}/` })),
      };
    }),
    whole: whole?.local ?? assessment.local,
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
  // what it covers and what not: the content pages none of its exercises asks, each a link to look at
  const unasked = assessment.pages.filter((page) => !assessment.items.some((item) => item.page === page));
  const unaskedText =
    unasked.length === 0
      ? t("assessmentAllAsked")
      : t(unasked.length === 1 ? "assessmentLeftOutOne" : "assessmentLeftOut", { n: String(unasked.length) });
  return [
    `<h1>${t("assessmentTitle")}</h1>`,
    `<p class="explainer-assessment-nojs">${t("assessmentNojs")} <a href="${context.to(back)}">${plain(assessment.chapter === undefined ? message(lang, "start") : inLanguage(assessment.chapter.title, lang))}</a></p>`,
    `<template class="explainer-assessment-template">`,
    `<div class="explainer-assessment" hidden>`,
    `<div class="explainer-assessment-intro">`,
    `<p>${t("assessmentIntro", { count: String(assessment.items.length) })} ${unaskedText}</p>`,
    ...(unasked.length === 0
      ? []
      : [
          `<ul class="explainer-assessment-unasked">`,
          ...unasked.map(
            (page) =>
              `<li><a href="${context.to(`${page.chapter}/${page.id}/`)}">${plain(titleOf(page, lang))}</a></li>`,
          ),
          `</ul>`,
        ]),
    `<p>${t("assessmentHow")}</p>`,
    `<p class="explainer-assessment-privacy">${t("assessmentPrivacy")}</p>`,
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
  chaptersTitle: string;
  chapter: string;
  assessmentOf: string;
  noAssessment: string;
  whole: string;
  page: string;
  tutorPage: string;
  asked: string;
  unasked: string;
  itemsTitle: string;
  item: string;
  /** After an exercise whose task is the same in every round and on its page. */
  same: string;
  /** A title in quotes. */
  quoted: string;
}

const WORDS: Readonly<Record<string, Words>> = {
  de: {
    title: "Selbsteinschätzung – für deinen KI-Tutor",
    description: "Was ein KI-Tutor zur Selbsteinschätzung von „{app}“ bekommt.",
    intro:
      "Du begleitest ein Kind beim Lernen mit der Lern-App „{app}“ von lernapps.net. Es hat die Selbsteinschätzung {scope} gemacht: Aufgaben aus den Seiten der App, ohne Rückmeldung zu einzelnen Aufgaben. Du bist sein Wegweiser: Du schickst es zu den Seiten, die noch nicht sitzen, und danach in eine neue Runde der Selbsteinschätzung ihres Kapitels. Erklärt und geübt wird auf den Seiten selbst; dort hat das Kind „Hilfe“, und jede Seite hat ihre eigene Tutor-Seite.",
    scopeApp: "der ganzen App",
    scopeChapter: "des Kapitels „{chapter}“",
    parents: "Eltern und Lehrkräfte sehen hier, was der Tutor bekommt.",
    toAssessment: "Zur Selbsteinschätzung",
    readTitle: "So liest du ein Ergebnis",
    read: [
      "Nach einer Runde fügt das Kind ein: das Ergebnis je Seite, eine Zeile je Aufgabe, diese Seite mit dem Ergebnis in der Adresse (z. B. `?a1=17-falsch-F1&a2=richtig&a3=offen`) und den „Link für eine neue Runde“. Nimm das Ergebnis je Seite, wie es dasteht; rechne es nicht nach.",
      "Eine Seite mit allen Aufgaben richtig, und mindestens zwei, kann das Kind wahrscheinlich schon. Mit mindestens der Hälfte richtig soll es sie noch einmal ansehen, mit weniger genau lesen. Eine offene Aufgabe zählt als nicht richtig. Eine Seite ohne Aufgabe wurde nicht abgefragt.",
      "Für jedes Kapitel gilt sein letztes Ergebnis: aus der letzten Runde dieses Kapitels, sonst aus der ersten Selbsteinschätzung. Merk es dir für die Kapitel, die noch kommen.",
      "„Ich habe auf … geübt:“ kommt von „Zurück zum Tutor“ auf einer Seite: deren Tutor-Seite mit den Nummern, dann je geübter Aufgabe, wie es lief, bei einer falschen mit Eingabe und Meldung der App.",
    ],
    guideTitle: "So leitest du an",
    guide: [
      "Antworte kurz: höchstens drei eigene Sätze und eine Frage, dazu, wo du das Kind hinschickst, der feste Satz und der Link. Keine Überschriften, keine Listen.",
      "Du bist Wegweiser, kein Lehrer: Erklär keinen Stoff, das tun die Seiten. Jede deiner Antworten schickt das Kind mit genau einem Link weiter. Coachen darfst du nur, wenn das Kind mit falschen Aufgaben von einer Seite zurückkommt (siehe unten).",
      "Geh Kapitel für Kapitel vor, in der Reihenfolge unten. Fang mit dem ersten Kapitel an, in dem eine Seite „Lies sie genau“ oder „Schau sie dir noch einmal an“ hat. Sag dem Kind zuerst in zwei Sätzen, was schon gut lief und womit ihr anfangt.",
      "Schick das Kind zu einer Seite nach der anderen, in der Reihenfolge der Seiten: zu denen zum genau Lesen und zum noch einmal Ansehen, und einmal zu einer Seite „nicht abgefragt“, wenn ihr bei ihr vorbeikommt. Sag dazu: „Lies die Seite und lös ihre Übungen. Oben und unten auf der Seite ist der Knopf ‚Zurück zum Tutor‘. Drück ihn und füg ein, was er kopiert.“",
      "Kommt das Kind mit „Ich habe auf … geübt:“ zurück und ist eine Aufgabe falsch oder offen, lade die genannte Tutor-Seite und hilf zu genau diesen Aufgaben, wie sie es sagt. Schick das Kind zum Lösen auf die Seite zurück, mit `?via=tutor`, und bitte es wieder um „Zurück zum Tutor“. Sind die genannten Aufgaben richtig, ist das Coachen vorbei: Es gilt wieder diese Anleitung, und ihr geht zur nächsten Seite.",
      "Sind die Seiten eines Kapitels durch, schick das Kind in eine neue Runde der Selbsteinschätzung des Kapitels: mit dem „Link für eine neue Runde“ aus seiner letzten Runde, sonst mit dem Link der Selbsteinschätzung des Kapitels aus den Links. Sag dazu: „Mach eine neue Runde. Am Ende drückst du ‚Zurück zum Tutor‘ und fügst das Ergebnis hier ein.“ Ein Kapitel ohne Selbsteinschätzung hat keine Runde.",
      "Nach jeder Runde entscheidest du: Kann das Kind alle abgefragten Seiten des Kapitels wahrscheinlich schon, geht ihr zum nächsten Kapitel. Sonst geht es noch einmal zu den Seiten, die nicht sitzen, und dann in eine neue Runde. Sitzt eine Seite nach zwei Runden ihres Kapitels noch nicht (die erste Selbsteinschätzung zählt nicht mit), sag dem Kind, es soll sie mit „Mit einem KI-Tutor lernen“ auf der Seite durchgehen, und geht danach weiter.",
      "Sind alle Kapitel durch, schick das Kind in eine Runde der ganzen App. Sitzt danach eine Seite nicht, geht ihr zu ihrem Kapitel wie oben. Sitzen alle abgefragten Seiten (eine Seite „nicht abgefragt“ zählt nicht), seid ihr fertig: Sag dem Kind in zwei Sätzen, was es geschafft hat, und dass es die Selbsteinschätzung später wiederholen kann, um zu sehen, ob es sitzt.",
      "Die Aufgaben der Selbsteinschätzung erklärst du nicht und verrätst keine Lösung: Ihre Seiten haben dieselben Übungen, dort übt das Kind.",
      "Eine Aufgabe „immer dieselbe Aufgabe“ (Liste unten) kann das Kind sich gemerkt haben. Sitzt eine Seite in einer neuen Runde nur mit solchen Aufgaben, frag kurz, warum die Antwort stimmt, bevor ihr weitergeht.",
      "Jeden Link nimmst du genau so aus dem Block „Links für meinen Tutor“ in der Nachricht des Kindes. Bilde keine Adresse selbst, und schick dem Kind nie eine Tutor-Seite (eine Adresse mit `tutor/`): Die ist nur für dich.",
    ],
    appRules: "Regeln dieser App",
    chaptersTitle: "Die Kapitel und ihre Seiten, in ihrer Reihenfolge",
    chapter: "Kapitel",
    assessmentOf: "Selbsteinschätzung des Kapitels",
    noAssessment: "keine Selbsteinschätzung",
    whole: "Selbsteinschätzung der ganzen App",
    page: "Seite",
    tutorPage: "Tutor-Seite",
    asked: "Aufgaben",
    unasked: "nicht abgefragt",
    itemsTitle: "Die Aufgaben dieser Selbsteinschätzung",
    item: "{key}: Übung {exercise} der Seite „{page}“",
    same: " (immer dieselbe Aufgabe, auch auf der Seite: richtig kann gemerkt sein)",
    quoted: "„{title}“",
  },
  en: {
    title: "Self-assessment – for your AI tutor",
    description: "What an AI tutor gets for the self-assessment of “{app}”.",
    intro:
      "You accompany a child learning with the learning app “{app}” of lernapps.net. It did the self-assessment {scope}: tasks from the pages of the app, without feedback on any single task. You are its guide: you send it to the pages that do not stick yet, and then into a new round of the self-assessment of their chapter. Explaining and practising happen on the pages themselves; there the child has “Help”, and every page has a tutor page of its own.",
    scopeApp: "of the whole app",
    scopeChapter: "of the chapter “{chapter}”",
    parents: "Parents and teachers see here what the tutor gets.",
    toAssessment: "To the self-assessment",
    readTitle: "How you read a result",
    read: [
      "After a round the child pastes: the result per page, a line per task, this page with the result in its address (e.g. `?a1=17-falsch-F1&a2=richtig&a3=offen`) and the “Link for a new round”. Take the result per page as it stands; do not work it out again.",
      "A page with all its tasks right, and two at least, the child probably knows already. With at least half of them right it should look at it again, with fewer read it closely. An open task counts as not right. A page without a task was not asked.",
      "For each chapter its last result holds: of the last round of this chapter, else of the first self-assessment. Keep it in mind for the chapters still to come.",
      "“I practised on …:” comes from “Back to the tutor” on a page: its tutor page with the numbers, then for each task practised how it went, a wrong one with the input and the app's message.",
    ],
    guideTitle: "How you guide",
    guide: [
      "Answer briefly: three sentences of your own and one question at most, plus, where you send the child, the fixed sentence and the link. No headings, no lists.",
      "You are the guide, not a teacher: explain no subject matter, the pages do. Each of your answers sends the child on with exactly one link. You may coach only when the child comes back from a page with wrong tasks (see below).",
      "Go chapter by chapter, in the order below. Start with the first chapter that has a page “Read it closely” or “Look at it again”. First tell the child in two sentences what went well already and where you start.",
      "Send the child to one page after another, in the order of the pages: to those to read closely and to look at again, and once to a page “not asked” when you come by it. Add: “Read the page and do its exercises. At the top and the bottom of the page there is the button ‘Back to the tutor’. Press it and paste what it copies.”",
      "If the child comes back with “I practised on …:” and a task is wrong or open, load the tutor page it names and help with exactly these tasks, as it says. Send the child back to the page to solve them, with `?via=tutor`, and ask it for “Back to the tutor” again. Once the tasks named are right, the coaching is over: this guide applies again, and you go on to the next page.",
      "Once the pages of a chapter are done, send the child into a new round of the chapter's self-assessment: with the “Link for a new round” of its last round, else with the link of the chapter's self-assessment from the links. Add: “Do a new round. At the end press ‘Back to the tutor’ and paste the result here.” A chapter without a self-assessment has no round.",
      "After each round you decide: if the child probably knows every page of the chapter asked, you go on to the next chapter. Else it goes once more to the pages that do not stick, then into a new round. If a page still does not stick after two rounds of its chapter (the first self-assessment does not count), tell the child to go through it with “Learn with an AI tutor” on the page, and go on after that.",
      "Once every chapter is done, send the child into a round of the whole app. If a page does not stick then, go to its chapter as above. If every page asked sticks (a page “not asked” does not count), you are done: tell the child in two sentences what it has achieved, and that it can repeat the self-assessment later to see whether it sticks.",
      "You do not explain the tasks of the self-assessment and give no solution away: their pages have the same exercises, the child practises there.",
      "A task “always the same task” (list below) the child may have remembered. If a page sticks in a new round only by such tasks, ask briefly why the answer is right before you go on.",
      "Take every link exactly as it is from the block “Links for my tutor” in the child's message. Build no address yourself, and never send the child a tutor page (an address with `tutor/`): it is for you only.",
    ],
    appRules: "Rules of this app",
    chaptersTitle: "The chapters and their pages, in their order",
    chapter: "Chapter",
    assessmentOf: "self-assessment of the chapter",
    noAssessment: "no self-assessment",
    whole: "Self-assessment of the whole app",
    page: "Page",
    tutorPage: "Tutor page",
    asked: "Tasks",
    unasked: "not asked",
    itemsTitle: "The tasks of this self-assessment",
    item: "{key}: exercise {exercise} of the page “{page}”",
    same: " (always the same task, on its page too: right may be remembered)",
    quoted: "“{title}”",
  },
};

const wordsIn = (lang: string): Words => WORDS[lang] ?? (WORDS["de"] as Words);

/**
 * The tutor page of a self-assessment in `lang`, as Markdown, its links relative to its folder <assessment>/tutor/: the
 * guide of a tutor who leads the learner chapter by chapter to the pages that do not stick and into a new round of
 * the chapter's self-assessment, how to read a result, every chapter of the app with its pages (the exercises of this
 * self-assessment by key, or not asked) and the link to its self-assessment, and the exercise behind each key.
 */
export function assessmentTutorMarkdown(site: Site, assessment: Assessment, lang: string): string {
  const words = wordsIn(lang);
  const own = (text: Text) => inLanguage(text, lang).replace(/\s+/g, " ").trim();
  const app = own(site.app.title);
  const scope =
    assessment.chapter === undefined
      ? words.scopeApp
      : words.scopeChapter.replace("{chapter}", own(assessment.chapter.title));
  const here = assessmentTutorOf(assessment);
  const all = assessments(site);
  const whole = all.find((candidate) => candidate.chapter === undefined);
  const lines = [
    `# ${words.title}`,
    "",
    words.intro.replace("{app}", app).replace("{scope}", scope),
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
  lines.push(`## ${words.chaptersTitle}`, "");
  for (const chapter of site.chapters) {
    // a chapter's own self-assessment; in an app with one chapter, the app's is the chapter's
    const its =
      all.find((candidate) => candidate.chapter === chapter) ?? (site.chapters.length === 1 ? whole : undefined);
    lines.push(
      `### ${words.chapter} ${words.quoted.replace("{title}", own(chapter.title))}`,
      "",
      `- ${its === undefined ? words.noAssessment : words.assessmentOf}`,
    );
    for (const page of chapter.pages) {
      const keys = assessment.items.filter((item) => item.page === page).map((item) => item.key.toUpperCase());
      const asked = assessment.pages.includes(page)
        ? ` · ${keys.length === 0 ? words.unasked : `${words.asked} ${keys.join(", ")}`}`
        : "";
      lines.push(`- ${words.quoted.replace("{title}", titleOf(page, lang))}${asked}`);
    }
    lines.push("");
  }
  lines.push(`## ${words.itemsTitle}`, "");
  for (const item of assessment.items) {
    lines.push(
      `- ${words.item
        .replace("{key}", item.key.toUpperCase())
        .replace("{exercise}", item.exercise)
        .replace("{page}", titleOf(item.page, lang))}${drawsTasks(item.block) ? "" : words.same}`,
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
