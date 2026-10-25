// The tutor prompt of an explainer and its entry point on the start page. The build writes tutor.md at the root of each
// language tree: a ready prompt for a KI tutor (its role and approach, the app's pages as a checklist with links to
// each page and its tutor file, the rules for the app's links, the app's own rules, how to start), adapted from the
// tutor prompt of Mathe-Karte and generic. The start page gets "Mit einem KI-Tutor lernen": a button that copies the
// prompt (to the clipboard, nothing goes over the network), a link per provider that opens the assistant with the
// prompt (Claude by default, more or none through tutor.providers in app.yaml), and a link to tutor.md. Without
// JavaScript the provider links are plain links to the assistant, and tutor.md is a page to copy from. Nothing loads
// before a click.
import { inLanguage, type Site, type Text } from "./content.ts";
import { contentPages, hiddenChapter } from "./routes.ts";
import { MAX_TASKS } from "./tasks.ts";
import { TUTOR_FILE, tutorFileOf, tutorRules } from "./tutor.ts";

/** The prompt's file at the root of each language tree: named as a page's tutor file, one folder up. */
export const PROMPT_FILE = TUTOR_FILE;

/** Where the prompt's links start: replaced by "" in tutor.md, by the app's address when the page copies it. */
export const BASE = "⟦base⟧";

/** An assistant the start page offers: its name, and its address with {prompt} where the prompt goes. */
export interface Provider {
  name: string;
  url: string;
}

/** The providers when the app names none: Claude, which takes the prompt in its address. */
export const DEFAULT_PROVIDERS: readonly Provider[] = [{ name: "Claude", url: "https://claude.ai/new?q={prompt}" }];

/**
 * The longest address a provider link may get with the whole prompt in it. Longer, and the link carries a short prompt
 * that points to tutor.md instead, and the page copies the whole prompt as well: servers refuse long addresses (8 kB
 * is a common limit), and a fetching assistant reads tutor.md itself.
 */
export const MAX_URL = 8000;

/** The providers of an app. */
export const providersOf = (site: Site): readonly Provider[] => site.app.tutor?.providers ?? DEFAULT_PROVIDERS;

const MARK = "lernapps-prompt";
/** A provider's address without the prompt, for the link without JavaScript: its parameter with {prompt} left out. */
export function plainAddress(url: string): string {
  const parsed = new URL(url.replace(/\{prompt\}/g, MARK));
  const keys = Array.from(parsed.searchParams.entries()).flatMap(([key, value]) => (value.includes(MARK) ? [key] : []));
  for (const key of keys) parsed.searchParams.delete(key);
  return parsed.href.replace(/\?$/, "");
}

interface Words {
  title: string;
  roleTitle: string;
  role: string[];
  approachTitle: string;
  approach: string[];
  checklistTitle: string;
  checklistIntro: string;
  page: string;
  tutorFile: string;
  perPage: string[];
  done: string;
  rulesTitle: string;
  readFirst: string;
  appRules: string;
  startTitle: string;
  start: string[];
  short: string;
  fetchable: string;
}

const WORDS: Readonly<Record<string, Words>> = {
  de: {
    title: "KI-Tutor",
    roleTitle: "Rolle",
    role: [
      "Du bist ein geduldiger Tutor für die Lern-App „{app}“: {intro}",
      "Du duzt. Kurze Sätze. Keine Fachwörter ohne Erklärung. Du lobst konkret, nicht pauschal.",
    ],
    approachTitle: "Vorgehen",
    approach: [
      "Du führst ein Gespräch, keinen Vortrag. Das Ziel ist nicht, dass du alles erklärt hast, sondern dass die lernende Person es danach selbst kann.",
      "Fang damit an, was sie schon weiß. Füll nur die Lücke, lieber mit Fragen als mit Antworten. Will sie es kürzer oder einfacher, pass dich an.",
      "Ein kleiner Schritt pro Antwort: Stell eine Frage, oder erklär das nächste kleine Stück in wenigen Sätzen und prüf es dann mit einer Frage. Dann hör auf und warte.",
      "Sag zuerst, warum etwas wichtig ist, dann wie es geht.",
      "Prüfe mit Aufgaben, nie mit „Verstanden?“. Bei Multiple Choice steht die richtige Antwort mal bei A, mal bei B, mal bei C. Verrate die Lösung erst, wenn sich die lernende Person festgelegt hat.",
      "Reagiere auf die echte Antwort: Richtig → weiter. Falsch → kurzer, gezielter Tipp, dann noch ein Versuch. Gib nicht die Lösung.",
      "„Verstanden“ heißt: Sie erklärt es in eigenen Worten und löst eine neue, ähnliche Aufgabe. Geh erst dann weiter.",
      "Erklär deine Methode nicht; sie prägt dein Handeln, nicht dein Reden. Sagt die lernende Person „Sag es mir einfach“, erklärst du direkt und knapp und prüfst danach mit einer kleinen Aufgabe.",
    ],
    checklistTitle: "Checkliste",
    checklistIntro: "Die Seiten der App, der Reihe nach. Arbeite eine nach der anderen ab:",
    page: "Seite",
    tutorFile: "Tutor-Datei",
    perPage: [
      "Vorwissen erfragen: „Was weißt du schon über …?“",
      "Die Seite verlinken, mit dem passenden Abschnitt (`#<abschnitt>`), und am Inhalt der Seite erklären.",
      "Die lernende Person erklären lassen, in eigenen Worten.",
      "Üben in der App: Schick eine Aufgabe mit Nummer (`?<übung>=<n>&von=tutor#<übung>`). Richtig → zwei weitere mit anderen Nummern. Falsch → gezielter Tipp, dann eine ähnliche Aufgabe.",
      "Besprechen: Was war schwer?",
    ],
    done: "Eine Seite ist abgehakt, wenn drei Aufgaben der Seite in der App richtig waren und die lernende Person eine davon erklären kann.",
    rulesTitle: "App-Regeln",
    readFirst:
      "Lies zuerst {llms}: alle Seiten mit ihren Abschnitten und die Regeln. Alle Adressen in dieser Anleitung darfst du abrufen. Die Tutor-Datei jeder Seite enthält ihre Übungen mit Aufgaben, Lösungen und typischen Fehlern, für Aufgaben mit Zufallszahlen alle ihre Nummern (höchstens {n}, jede eine andere Aufgabe).",
    appRules: "Regeln dieser App:",
    startTitle: "Start",
    start: [
      "Frag zuerst, woran die lernende Person gerade arbeitet und was sie schon kann. Beginne bei der ersten Seite der Checkliste, die sie noch nicht sicher kann.",
      "Ein Schritt pro Antwort. Keine Einleitung über dich, keine Zusammenfassung.",
    ],
    short: "Lies {prompt} und sei mein Tutor für die Lern-App „{app}“, genau nach dieser Anleitung.",
    fetchable: "Diese Adressen darfst du bei Bedarf abrufen, weil ich sie dir hier nenne (andere nicht):",
  },
  en: {
    title: "AI tutor",
    roleTitle: "Role",
    role: [
      "You are a patient tutor for the learning app “{app}”: {intro}",
      "Use plain words and short sentences. Explain every technical term. Praise specifically, not in general.",
    ],
    approachTitle: "Approach",
    approach: [
      "You lead a conversation, not a lecture. The goal is not that you have explained everything, but that the learner can do it on their own afterwards.",
      "Start with what the learner already knows. Fill only the gap, with questions rather than answers. If they want it shorter or simpler, adapt.",
      "One small step per answer: ask a question, or explain the next small piece in a few sentences and then check it with a question. Then stop and wait.",
      "Say first why something matters, then how it works.",
      "Check with tasks, never with “Got it?”. In multiple choice, put the right answer sometimes at A, sometimes at B, sometimes at C. Reveal the solution only once the learner has committed to an answer.",
      "React to the actual answer: right → go on. Wrong → a short, targeted hint, then another try. Do not give the solution.",
      "“Understood” means: the learner explains it in their own words and solves a new, similar task. Only then go on.",
      "Do not explain your method; it shapes what you do, not what you say. If the learner says “Just tell me”, explain directly and briefly, then check with a small task.",
    ],
    checklistTitle: "Checklist",
    checklistIntro: "The app's pages, in order. Work through them one by one:",
    page: "page",
    tutorFile: "tutor file",
    perPage: [
      "Ask what the learner already knows: “What do you know about …?”",
      "Link the page, with the right section (`#<section>`), and explain with the page's content.",
      "Let the learner explain, in their own words.",
      "Practise in the app: send a task with its number (`?<exercise>=<n>&von=tutor#<exercise>`). Right → two more with other numbers. Wrong → a targeted hint, then a similar task.",
      "Talk it over: what was hard?",
    ],
    done: "A page is done when three of its tasks were right in the app and the learner can explain one of them.",
    rulesTitle: "Rules for the app",
    readFirst:
      "First read {llms}: every page with its sections, and the rules. You may fetch every address in this guide. Each page's tutor file holds its exercises with tasks, solutions and typical mistakes, for tasks with random numbers all their numbers (at most {n}, each a different task).",
    appRules: "Rules of this app:",
    startTitle: "Start",
    start: [
      "First ask what the learner is working on and what they can already do. Start at the first page of the checklist they are not yet sure of.",
      "One step per answer. No introduction about yourself, no summary.",
    ],
    short: "Read {prompt} and be my tutor for the learning app “{app}”, exactly as it says.",
    fetchable: "You may fetch these addresses when you need them, because I name them here (no others):",
  },
};

const wordsIn = (lang: string): Words => WORDS[lang] ?? (WORDS["de"] as Words);
const line = (text: string) => text.replace(/\s+/g, " ").trim();

/**
 * The tutor prompt of a language tree, in Markdown; every link of the app starts with BASE, which tutor.md replaces by
 * "" (its links are relative to it, at the tree's root) and the start page by the tree's address.
 */
export function tutorPrompt(site: Site, lang: string): string {
  const words = wordsIn(lang);
  const own = (text: Text) => line(inLanguage(text, lang));
  const fill = (text: string) =>
    text
      .replace("{app}", own(site.app.title))
      .replace("{intro}", own(site.app.intro))
      .replace("{llms}", `${BASE}llms.txt`)
      .replace("{n}", String(MAX_TASKS));
  const lines = [`# ${words.title}: ${own(site.app.title)}`, "", `## 1. ${words.roleTitle}`, ""];
  lines.push(...words.role.map(fill), "", `## 2. ${words.approachTitle}`, "");
  lines.push(
    ...words.approach.map((item) => `- ${item}`),
    "",
    `## 3. ${words.checklistTitle}`,
    "",
    words.checklistIntro,
    "",
  );
  contentPages(site).forEach((page, index) => {
    const chapter = site.chapters.find((candidate) => candidate.id === page.chapter);
    const prefix = hiddenChapter(site) || chapter === undefined ? "" : `${own(chapter.title)}: `;
    const description = page.description === undefined ? "" : ` – ${own(page.description)}`;
    lines.push(
      `${index + 1}. ${prefix}${own(page.title)}${description} ([${words.page}](${BASE}${page.chapter}/${page.id}/), [${words.tutorFile}](${BASE}${tutorFileOf(page)}))`,
    );
  });
  lines.push("", ...words.perPage.map((item, index) => `${index + 1}. ${item}`), "", words.done, "");
  lines.push(
    `## 4. ${words.rulesTitle}`,
    "",
    `- ${fill(words.readFirst)}`,
    ...tutorRules(lang).map((rule) => `- ${rule}`),
  );
  if (site.app.tutor?.rules !== undefined) {
    lines.push("", words.appRules, "", inLanguage(site.app.tutor.rules, lang).trim());
  }
  lines.push("", `## 5. ${words.startTitle}`, "", ...words.start, "");
  return `${lines.join("\n").trimEnd()}\n`;
}

/**
 * The short prompt a provider link carries when the whole one is too long: it points to tutor.md, and it names every
 * address the tutor may fetch (llms.txt, the tutor file of each page). An assistant fetches only addresses the user
 * wrote into the conversation, not those it finds in a fetched file, so the prompt itself must list them.
 */
export function shortPrompt(site: Site, lang: string): string {
  const words = wordsIn(lang);
  const first = words.short
    .replace("{prompt}", `${BASE}${PROMPT_FILE}`)
    .replace("{app}", line(inLanguage(site.app.title, lang)));
  const addresses = [
    `${BASE}${PROMPT_FILE}`,
    `${BASE}llms.txt`,
    ...contentPages(site).map((page) => `${BASE}${tutorFileOf(page)}`),
  ];
  return [first, "", words.fetchable, ...addresses.map((address) => `- ${address}`)].join("\n");
}

/** The prompt with its links from `base`: "" for tutor.md, the language tree's address for the copied prompt. */
export const withBase = (prompt: string, base: string): string => prompt.split(BASE).join(base);
