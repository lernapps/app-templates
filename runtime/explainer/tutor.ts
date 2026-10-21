// What an explainer gives a KI tutor, an assistant the learner brings and controls: static files only, because a chat
// assistant that fetches a URL runs no JavaScript, and a static host serves the same file for any query string. Per
// language tree, the build writes a tutor file for each page (<chapter>/<page>/tutor.md, plain Markdown): the page's
// sections, and each exercise with its id, type, task, answer format, solution, hint, typical mistakes with the
// messages the app shows, and for a seeded exercise (generated, exercise component) the tasks of the numbers 1 to
// N (its distinct tasks, at most MAX_TASKS; tasks.ts), each with its solution and its link ./?<id>=<n>#<id>, which
// opens exactly that task live. An exercise
// component contributes its about and its describe (plugin.ts). examples stay out: they are test cases. llms.txt gets
// a part with the generic rules for a tutor, the app's own (tutor.rules in app.yaml), the link to the tutor prompt
// (prompt.ts) and the links to the tutor files.
// Every link of llms.txt and of the tutor files is checked against the pages and anchors the build writes
// (linkProblems). The app itself collects nothing and sends nothing: the files only help a tutor guide.
import { questionIn, type Question } from "../shared/questions/question.ts";
import { answerText } from "../shared/questions/render.ts";
import {
  inLanguage,
  type Block,
  type BlockOf,
  type ComponentDescription,
  type Page,
  type Site,
  type Text,
  type Descriptions,
} from "./content.ts";
import { dataOf, taskSeeds, templatesOf } from "./exercises.ts";
import { fillSource, label, plainText } from "./generated/texts.ts";
import { generate } from "./generated/values.ts";
import { kindOf } from "./generated/comparator.ts";
import { questionFor } from "./generated/question.ts";
import { type Generated } from "./generated/types.ts";
import { allBlocks, contentPages } from "./routes.ts";
import { MAX_TASKS } from "./tasks.ts";

/** The name of a page's tutor file, in the page's folder. */
export const TUTOR_FILE = "tutor.md";

interface Words {
  tutorFile: string;
  forTutor: string;
  app: string;
  page: string;
  sections: string;
  exercises: string;
  inSection: string;
  link: string;
  task: string;
  answerFormat: string;
  solution: string;
  explanation: string;
  hint: string;
  mistakes: string;
  options: string;
  choices: string;
  steps: string;
  template: string;
  right: string;
  wrong: string;
  tasks: string;
  taskNumber: string;
  component: string;
  does: string;
  correct: string;
  formats: Record<string, string>;
  rulesTitle: string;
  rules: string[];
  appRules: string;
  prompt: string;
  files: string;
}

const WORDS: Readonly<Record<string, Words>> = {
  de: {
    tutorFile: "Tutor-Datei",
    forTutor:
      "Diese Datei ist für einen KI-Tutor. Sie enthält die Lösungen: Nutze sie, um anzuleiten und Fehler zu erkennen, nicht um vorzusagen. Die Regeln stehen in llms.txt. Kannst du eine Datei der App nicht abrufen, bitte die lernende Person, den Text der Seite oder diese Datei einzufügen oder anzuhängen.",
    app: "App",
    page: "Seite",
    sections: "Abschnitte",
    exercises: "Übungen",
    inSection: "im Abschnitt",
    link: "Link",
    task: "Aufgabe",
    answerFormat: "Antwortformat",
    solution: "Lösung",
    explanation: "Erklärung",
    hint: "Tipp, den die App zeigt",
    mistakes: "Typische Fehler und die Meldung der App",
    options: "Antworten zur Wahl (✓ richtig, ✗ falsch, mit der Meldung der App)",
    choices: "Zur Wahl",
    steps: "Lösungsweg",
    template: "(Vorlage: {{…}} sind die Werte der Aufgabe)",
    right: "✓",
    wrong: "✗",
    tasks: "Aufgaben nach Nummer, 1 bis {n}: jede eine andere (die App zeigt „Aufgabe Nr. …“)",
    taskNumber: "Aufgabe Nr.",
    component: "interaktive Übung",
    does: "Was zu tun ist",
    correct: "Was als richtig zählt",
    formats: {
      "single-choice": "eine Antwort wählen",
      "multiple-choice": "alle richtigen Antworten wählen",
      "true-false": "„Stimmt“ oder „Stimmt nicht“ wählen",
      number: "eine Zahl eintippen",
      ordering: "die Einträge in die richtige Reihenfolge bringen (die App zeigt sie gemischt)",
      matching: "jedem Eintrag links den passenden rechts zuordnen",
      choice: "eine Antwort wählen",
      set: "alle richtigen Antworten wählen",
      order: "die Einträge in die richtige Reihenfolge bringen (die App zeigt sie gemischt)",
      pairs: "jedem Eintrag links den passenden rechts zuordnen",
    },
    rulesTitle: "Hinweise für einen KI-Tutor",
    rules: [
      "Die App ist das Arbeitsblatt, der Chat das Gespräch darüber. Gelöst wird in der App: Sie prüft die Ergebnisse, du erklärst.",
      "Verlinke immer eine konkrete Aufgabe, nie nur die Startseite. Jede Übung hat einen Anker (`#<id>`); eine Aufgabe mit Nummer öffnest du mit `<seite>?<id>=<nummer>#<id>`. Die Links stehen in der Tutor-Datei jeder Seite.",
      "Häng `von=tutor` an jeden Link, den du schickst, vor dem `#`: `<seite>?<id>=7&von=tutor#<id>`. Dann zeigt die Seite einen Knopf „Zurück zum Tutor“.",
      "Jede Aufgabe mit Zufallszahlen hat eine Nummer: „Aufgabe Nr. 7“. Frag nach der Nummer, die auf dem Bildschirm steht, und schlag die Aufgabe in der Tutor-Datei der Seite nach. Dort stehen alle Nummern jeder Übung, von 1 bis höchstens {n}, jede mit Aufgabe und Lösung; jede Nummer ist eine andere Aufgabe, und dieselbe Nummer zeigt in der App dieselbe Aufgabe.",
      "Die Adresse einer Seite hält die Aufgabennummer jeder Übung: `<seite>?<id1>=3&<id2>=12`. Wer den Link der Seite teilt, teilt genau diese Aufgaben. Willst du wissen, welche Aufgaben die lernende Person gerade vor sich hat, bitte sie um die Adresse aus ihrem Browser und lies die Nummern daraus.",
      "Verrate keine Lösung, bevor sich die lernende Person auf eine Antwort festgelegt hat. Die Tutor-Dateien enthalten die Lösungen: Nutze sie, um Fehler zu erkennen und gezielt Tipps zu geben, nicht um vorzusagen.",
      "Bei jeder Übung stehen typische Fehler mit der Meldung der App. Benenne die Idee hinter einem Fehler, nicht nur „falsch“.",
      "Die App sammelt nichts, sendet nichts und meldet dir nichts zurück. Ergebnisse kennst du nur, wenn die lernende Person sie dir sagt: Frag nach jeder verlinkten Aufgabe, was herauskam.",
      "Ein kleiner Schritt pro Antwort. Prüfe Verständnis mit einer Aufgabe, nicht mit „Verstanden?“.",
    ],
    appRules: "Regeln dieser App",
    prompt: "Ein fertiger Prompt für einen KI-Tutor (Rolle, Vorgehen, Checkliste der Seiten)",
    files: "Tutor-Dateien der Seiten (Aufbau, Übungen, Aufgaben nach Nummer mit Lösungen)",
  },
  en: {
    tutorFile: "tutor file",
    forTutor:
      "This file is for an AI tutor. It contains the solutions: use them to guide and to spot mistakes, not to give answers away. The rules are in llms.txt. If you cannot fetch a file of the app, ask the learner to paste or attach the page's text or this file.",
    app: "App",
    page: "Page",
    sections: "Sections",
    exercises: "Exercises",
    inSection: "in the section",
    link: "Link",
    task: "Task",
    answerFormat: "Answer format",
    solution: "Solution",
    explanation: "Explanation",
    hint: "Hint the app shows",
    mistakes: "Typical mistakes and the app's message",
    options: "Choices (✓ right, ✗ wrong, with the app's message)",
    choices: "Choices",
    steps: "Steps of the solution",
    template: "(template: {{…}} are the task's values)",
    right: "✓",
    wrong: "✗",
    tasks: "Tasks by number, 1 to {n}: each a different one (the app shows “Task no. …”)",
    taskNumber: "Task no.",
    component: "interactive exercise",
    does: "What to do",
    correct: "What counts as right",
    formats: {
      "single-choice": "choose one answer",
      "multiple-choice": "choose all right answers",
      "true-false": "choose “true” or “false”",
      number: "type a number",
      ordering: "put the items in the right order (the app shows them shuffled)",
      matching: "match each item on the left with one on the right",
      choice: "choose one answer",
      set: "choose all right answers",
      order: "put the items in the right order (the app shows them shuffled)",
      pairs: "match each item on the left with one on the right",
    },
    rulesTitle: "Notes for an AI tutor",
    rules: [
      "The app is the worksheet, the chat is the conversation about it. Tasks are solved in the app: it checks the results, you explain.",
      "Always link a concrete task, never just the start page. Every exercise has an anchor (`#<id>`); open a task by its number with `<page>?<id>=<number>#<id>`. The links are in each page's tutor file.",
      "Add `von=tutor` to every link you send, before the `#`: `<page>?<id>=7&von=tutor#<id>`. The page then shows a button “Back to the tutor”.",
      "Every task with random numbers has a number: “Task no. 7”. Ask for the number on the screen and look the task up in the page's tutor file. It lists all numbers of each exercise, from 1 to at most {n}, each with task and solution; each number is a different task, and the same number shows the same task in the app.",
      "A page's address holds the task number of each exercise: `<page>?<id1>=3&<id2>=12`. Whoever shares the page's link shares exactly these tasks. To learn which tasks the learner has in front of them, ask for the address from their browser and read the numbers from it.",
      "Never reveal a solution before the learner has committed to an answer. The tutor files contain the solutions: use them to spot mistakes and give targeted hints, not to give answers away.",
      "Each exercise lists typical mistakes with the app's message. Name the idea behind a mistake, not just “wrong”.",
      "The app collects nothing, sends nothing and reports nothing back to you. You know results only when the learner tells you: after each linked task, ask what came out.",
      "One small step per answer. Check understanding with a task, not with “Got it?”.",
    ],
    appRules: "Rules of this app",
    prompt: "A ready prompt for an AI tutor (role, approach, checklist of the pages)",
    files: "The pages' tutor files (structure, exercises, tasks by number with solutions)",
  },
};

const wordsIn = (lang: string): Words => WORDS[lang] ?? (WORDS["de"] as Words);

/** A text on one line, as a list item holds it. */
const line = (text: string) => text.replace(/\s+/g, " ").trim();

/** The generic rules for a tutor, in `lang`. */
export function tutorRules(lang: string): string[] {
  return wordsIn(lang).rules.map((rule) => rule.replace("{n}", String(MAX_TASKS)));
}

/** The address of a page's tutor file within its language tree. */
export const tutorFileOf = (page: Page): string => `${page.chapter}/${page.id}/${TUTOR_FILE}`;

/** The part of llms.txt for a tutor: the generic rules, the app's own, and the links to the pages' tutor files. */
export function llmsTutorPart(site: Site, lang: string): string[] {
  const words = wordsIn(lang);
  const lines = [`## ${words.rulesTitle}`, "", ...tutorRules(lang).map((rule) => `- ${rule}`), ""];
  if (site.app.tutor?.rules !== undefined) {
    lines.push(`### ${words.appRules}`, "", inLanguage(site.app.tutor.rules, lang).trim(), "");
  }
  lines.push(`### ${words.prompt}`, "", `- [${TUTOR_FILE}](${TUTOR_FILE})`, "", `### ${words.files}`, "");
  for (const page of contentPages(site)) lines.push(`- [${line(inLanguage(page.title, lang))}](${tutorFileOf(page)})`);
  return [...lines, ""];
}

/** The answer format of a question of the question types, in `lang`. */
function questionFormat(question: Question, words: Words): string {
  const format = words.formats[question.type] ?? "";
  return question.type === "number" && question.unit !== undefined ? `${format} (${question.unit})` : format;
}

/** A question of the question types, in `lang`: its text, format, options, solution, explanation, hint, mistakes. */
function questionPart(question: Question, lang: string, words: Words): string[] {
  const lines = [
    `- ${words.task}: ${line(question.text)}`,
    `- ${words.answerFormat}: ${questionFormat(question, words)}`,
  ];
  if (question.type === "single-choice" || question.type === "multiple-choice") {
    lines.push(`- ${words.options}:`);
    for (const option of question.options) {
      const info = option.info.trim() === "" ? "" : ` – ${line(option.info)}`;
      lines.push(`  - ${option.correct ? words.right : words.wrong} ${line(option.text)}${info}`);
    }
  }
  lines.push(`- ${words.solution}: ${line(plainText(answerText(question, lang)))}`);
  if (question.explanation.trim() !== "") lines.push(`- ${words.explanation}: ${line(question.explanation)}`);
  if (question.hint !== undefined) lines.push(`- ${words.hint}: ${line(question.hint)}`);
  if (question.type === "number" && (question.mistakes ?? []).length > 0) {
    lines.push(`- ${words.mistakes}:`);
    for (const mistake of question.mistakes ?? []) lines.push(`  - ${mistake.answer}: ${line(mistake.message)}`);
  }
  return lines;
}

/** A value as the learner reads it, or undefined when it cannot be shown (a record). */
function shown(value: Parameters<typeof label>[0], lang: string): string | undefined {
  try {
    return label(value, lang);
  } catch {
    return undefined;
  }
}

/** A generated exercise: its format, and each task number's task, choices, solution and typical mistakes. */
function generatedPart(spec: Generated, site: Site, lang: string, words: Words, id: string): string[] {
  const kind = kindOf(spec.answer.compare);
  const unit = kind.kind === "number" && kind.unit !== undefined ? ` (${inLanguage(kind.unit, lang)})` : "";
  const lines = [`- ${words.answerFormat}: ${words.formats[kind.kind === "number" ? "number" : kind.kind]}${unit}`];
  if (spec.hint !== undefined) lines.push(`- ${words.hint} ${words.template}: ${line(inLanguage(spec.hint, lang))}`);
  if (spec.steps !== undefined) {
    lines.push(
      `- ${words.steps} ${words.template}:`,
      ...spec.steps.map((step) => `  - ${line(inLanguage(step, lang))}`),
    );
  }
  const data = dataOf(spec, site.data);
  lines.push(`- ${words.tasks.replace("{n}", String(taskSeeds(spec, data).length))}:`);
  const templates = templatesOf(spec, [lang]);
  for (const [index, seed] of taskSeeds(spec, data).entries()) {
    const number = index + 1;
    const task = generate(spec, seed, data);
    const text = line(fillSource(spec.task.text, spec, task, lang));
    const question = questionFor(spec, task, lang, templates);
    const options =
      question.type === "single-choice" || question.type === "multiple-choice"
        ? ` ${words.choices}: ${question.options.map((option) => line(option.text)).join("; ")}.`
        : "";
    const answer = line(plainText(answerText(question, lang)));
    lines.push(
      `  - [${words.taskNumber} ${number}](./?${id}=${number}#${id}): ${text}${options} → ${words.solution}: ${answer}`,
    );
    (spec.mistakes ?? []).forEach((mistake, index) => {
      const value = shown(task.mistakes[index] ?? "", lang);
      if (value !== undefined) {
        lines.push(`    - ${words.wrong} ${value}: ${line(fillSource(mistake.message, spec, task, lang))}`);
      }
    });
  }
  return lines;
}

/** An exercise component: what it says about itself, and each task number's task and solution from its describe. */
function componentPart(description: ComponentDescription, lang: string, words: Words, id: string): string[] {
  const { about } = description;
  const t = (text: Text) => line(inLanguage(text, lang));
  const lines = [
    `- ${words.does}: ${t(about.task)}`,
    `- ${words.answerFormat}: ${t(about.answer)}`,
    `- ${words.correct}: ${t(about.correct)}`,
  ];
  if (about.mistakes.length > 0) {
    lines.push(`- ${words.mistakes}:`, ...about.mistakes.map((mistake) => `  - ${t(mistake)}`));
  }
  lines.push(`- ${words.tasks.replace("{n}", String(description.seeds.length))}:`);
  for (const task of description.tasks[lang] ?? []) {
    lines.push(
      `  - [${words.taskNumber} ${task.number}](./?${id}=${task.number}#${id}): ${line(task.task)} → ${words.solution}: ${line(task.solution)}`,
    );
  }
  return lines;
}

/** The tutor file of `page` in `lang`: its sections, and every exercise with tasks, solutions and typical mistakes. */
export function tutorFile(site: Site, page: Page, lang: string, descriptions: Descriptions): string {
  const words = wordsIn(lang);
  const own = (text: Text) => line(inLanguage(text, lang));
  const lines = [`# ${own(page.title)} – ${words.tutorFile}`, ""];
  if (page.description !== undefined) lines.push(`> ${own(page.description)}`, "");
  lines.push(`${words.app}: ${own(site.app.title)}. ${words.page}: [${own(page.title)}](./)`, "", words.forTutor, "");
  const sections: string[] = [];
  const exercises: string[] = [];
  const walk = (blocks: readonly Block[], anchor: string[], depth: number, section: string | undefined): void => {
    for (const block of blocks) {
      if (block.type === "section") {
        const id = [...anchor, block.id].join("/");
        sections.push(`${"  ".repeat(depth)}- [${own(block.title)}](./#${id})`);
        walk(block.blocks, [...anchor, block.id], depth + 1, own(block.title));
      } else if (block.type === "example" || block.type === "note") {
        walk(block.blocks, anchor, depth, section);
      } else {
        const part = exercisePart(site, block, lang, words, descriptions);
        if (part === undefined) continue;
        const where = section === undefined ? "" : `, ${words.inSection} „${section}“`;
        exercises.push(
          `### ${part.id} (${part.type})`,
          "",
          `- ${words.link}: [./#${part.id}](./#${part.id})${where}`,
          ...part.lines,
          "",
        );
      }
    }
  };
  walk(page.blocks, [], 0, undefined);
  if (sections.length > 0) lines.push(`## ${words.sections}`, "", ...sections, "");
  if (exercises.length > 0) lines.push(`## ${words.exercises}`, "", ...exercises);
  return `${lines.join("\n").trimEnd()}\n`;
}

/** An exercise's part of a tutor file, or undefined for a block that is none. */
function exercisePart(
  site: Site,
  block: Block,
  lang: string,
  words: Words,
  descriptions: Descriptions,
): { id: string; type: string; lines: string[] } | undefined {
  switch (block.type) {
    case "generated":
      return {
        id: block.id,
        type: `generated, ${kindOf(block.answer.compare).kind}`,
        lines: generatedPart(block, site, lang, words, block.id),
      };
    case "vue-component": {
      const use = site.components.find((candidate) => candidate.block === block);
      const description = descriptions.get(block);
      if (use?.id === undefined || description === undefined) return undefined;
      return {
        id: use.id,
        type: `${words.component} ${block.component}`,
        lines: componentPart(description, lang, words, use.id),
      };
    }
    case "single-choice":
    case "multiple-choice":
    case "true-false":
    case "number":
    case "ordering":
    case "matching":
      return { id: block.id, type: block.type, lines: questionPart(questionIn(block, lang), lang, words) };
    default:
      return undefined;
  }
}

/** The anchors of a page: its sections (nested as <section>/<subsection>), exercises and components with an id. */
export function anchorsOf(site: Site, page: Page): Set<string> {
  const anchors = new Set<string>();
  const walk = (blocks: readonly Block[], anchor: string[]): void => {
    for (const block of blocks) {
      if (block.type === "section") {
        anchors.add([...anchor, block.id].join("/"));
        walk(block.blocks, [...anchor, block.id]);
      } else if (block.type === "example" || block.type === "note") walk(block.blocks, anchor);
    }
  };
  walk(page.blocks, []);
  for (const block of allBlocks(page.blocks)) {
    if ("id" in block && typeof block.id === "string" && block.type !== "section") anchors.add(block.id);
  }
  for (const use of site.components) {
    if (use.id !== undefined && [...allBlocks(page.blocks)].includes(use.block as BlockOf<"vue-component">)) {
      anchors.add(use.id);
    }
  }
  return anchors;
}

/**
 * The links of a Markdown file at `file` (an address within a language tree, e.g. "llms.txt",
 * "prozent/grundwert/tutor.md") that lead nowhere: a relative link must name a file the build writes or a page's
 * folder, and its anchor must be on that page. `files` are the files and page folders of the tree, `anchors` each
 * page folder's anchors. One line per broken link.
 */
export function linkProblems(
  file: string,
  text: string,
  files: ReadonlySet<string>,
  anchors: ReadonlyMap<string, ReadonlySet<string>>,
): string[] {
  const problems: string[] = [];
  const base = new URL(file, "https://app.invalid/");
  for (const [, target = ""] of text.matchAll(/\]\(([^)\s]+)\)/g)) {
    if (/^[a-z][a-z0-9+.-]*:/i.test(target)) continue;
    const url = new URL(target, base);
    const path = decodeURIComponent(url.pathname.slice(1));
    if (!files.has(path)) {
      problems.push(`${file}: the link ${target} leads to ${path || "./"}, which the build does not write`);
      continue;
    }
    const id = decodeURIComponent(url.hash.slice(1));
    if (id !== "" && !(anchors.get(path)?.has(id) ?? false)) {
      problems.push(`${file}: the link ${target} names the anchor #${id}, which ${path || "./"} does not have`);
    }
  }
  return problems;
}
