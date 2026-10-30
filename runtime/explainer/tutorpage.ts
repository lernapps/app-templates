// The tutor page of each content page, <chapter>/<page>/tutor/, the one thing a KI tutor fetches and the one source
// of what it gets. A chat assistant fetches only addresses its user wrote into the conversation, not those it finds in
// a fetched file, and a static host serves the same file for any query: so the page holds every task of every
// exercise, and the address the learner's message names says where the learner is, the task number of each exercise
// as in the app's own address (?<exercise>=<n>), the exercise at hand and the section (position.ts). Two ways lead the
// learner to the tutor: the bar beside a page's title (way A, prompt.ts) and "Hilfe" at one task (way B, stuck.ts),
// both naming this page; the result line of "Zurück" names it again (result.ts).
//
// The tutor page is short, lean HTML without script or menu: parents and teachers open the same address and see what
// the tutor gets, and every word costs the tutor tokens and makes its answers longer. Its guide is visible, never
// hidden, as hidden instructions to an AI look like prompt injection: who the tutor helps and where the child is; how
// to guide (short answers, ask what is not understood, step by step from the topic to the task, the page's own tasks,
// nothing worked out by itself, no solution, practising in the app, never copying a task); how to read where the
// child is and how a task's link looks; the app's own rules; the learner's needs, a short section for each, which holds
// when the query names it in `bedarf=` (needs.ts). Then the page's content as context (tutor.ts,
// contentLines), and its exercises: a generated one once as its template, with hint, steps and its typical mistakes
// as F1, F2 …, and below a table of each task number's inputs and outputs, the values of its placeholders, the
// solution and what each mistake gives, all worked out; an exercise component by its about in prose, and with its
// table of tasks (template, params, mistakes and show of its logic) its task once as a template and the same table as
// a generated one, else each number's task and solution from its describe, as many numbers as fit into
// TUTOR_PAGE_BUDGET; a question without numbers in full. The build writes the page's Markdown beside it (index.md) for
// an assistant that fetches nothing, checks each of its links (tutor.ts, linkProblems) and notes a page beyond the
// budget or an exercise with numbers left out.
import { Marked } from "marked";
import { TABLE_CONTRACT } from "./components/exercise.ts";
import { escape } from "../shared/html.ts";
import { answerText } from "../shared/questions/render.ts";
import {
  inLanguage,
  type Block,
  type ComponentExercise,
  type Descriptions,
  type Page,
  type Site,
  type Text,
} from "./content.ts";
import { dataOf, taskSeeds, templatesOf } from "./exercises.ts";
import { questionFor } from "./generated/question.ts";
import { label, placeholderValue, placeholdersIn, plainText } from "./generated/texts.ts";
import { type Generated } from "./generated/types.ts";
import { generate } from "./generated/values.ts";
import { NEEDS, type Need } from "./needs.ts";
import { contentLines, exercisePart, tutorWords } from "./tutor.ts";

/** The name of a tutor page's Markdown, beside the page in its folder: for an assistant that fetches nothing. */
export const TUTOR_MARKDOWN = "index.md";

/** The size a tutor page stays within, in bytes: an exercise component gets as many numbers as fit; the build notes a larger page. */
export const TUTOR_PAGE_BUDGET = 64_000;

/** The size of a text in bytes, as UTF-8. */
export const bytesOf = (text: string): number => new TextEncoder().encode(text).length;

interface Words {
  title: string;
  tutorPage: string;
  forTutor: string;
  intro: string;
  parents: string;
  toPage: string;
  guideTitle: string;
  guide: string[];
  startTitle: string;
  start: string[];
  appRules: string;
  whereTitle: string;
  where: string[];
  /** The learner's needs (needs.ts): what holds when the query names them, then a short section for each. */
  needsTitle: string;
  needsIntro: string;
  needs: Readonly<Record<Need, string>>;
  contextTitle: string;
  exercise: string;
  steps: string;
  link: string;
  linkNumber: string;
  table: string;
  /** After an input of the table that the task's text does not show. */
  hidden: string;
  answerIs: string;
  number: string;
  choices: string;
  tasks: string;
  shown: string;
  none: string;
}

const WORDS: Readonly<Record<string, Words>> = {
  de: {
    title: "{page} – für deinen KI-Tutor",
    tutorPage: "Tutor-Seite",
    forTutor: "Was ein KI-Tutor zur Seite „{page}“ bekommt.",
    intro:
      "Du hilfst einem Kind beim Lernen. Es arbeitet mit der Lern-App „{app}“ von lernapps.net, gerade auf der Seite „{page}“, und steckt dort in einer Übung. Gelöst wird in der App, sie prüft die Antworten. Du erklärst.",
    parents: "Eltern und Lehrkräfte sehen hier, was der Tutor bekommt.",
    toPage: "Zur Seite",
    guideTitle: "So leitest du an",
    guide: [
      "Antworte kurz: höchstens drei Sätze und eine Frage. Keine Überschriften, keine Listen.",
      "Nimm die Beispiele und Aufgaben dieser Seite. Erfinde keine eigenen. Rechne nichts selbst aus: Lösungen und Fehler stehen unten bei jeder Nummer.",
      "Im Chat erklärst du, am Beispiel der Seite. Gerechnet wird in der App: Die Aufgaben löst das Kind dort. Rechnet es eine Aufgabe im Chat, schick ihm sofort den Link zu ihr.",
      "Verrate keine Lösung. Ein Wert, der in der Tabelle einer Übung „(verdeckt)“ heißt, steht nicht im Text der Aufgabe: Das Kind sieht ihn nicht, nenn ihn nicht.",
      "Was das Kind in der App tun kann, steht bei der Übung unter „Was zu tun ist“ und „Antwortformat“. Beschreib keine anderen Knöpfe oder Schritte.",
      "Bitte das Kind nie, eine Aufgabe abzuschreiben. Du kennst sie aus dem Kontext unten.",
    ],
    startTitle: "So beginnst du",
    start: [
      "„Sei mein Tutor“: Frag zuerst, was das Kind über das Thema schon weiß. Dann geh die Seite der Reihe nach durch, ein Abschnitt pro Nachricht: erst warum das Thema wichtig ist, dann die Regel, dann das Beispiel. Prüf nach jedem Abschnitt mit einer kurzen Frage zum Inhalt, ob das Kind ihn verstanden hat; ein „Ja“ reicht nicht. Erst wenn es das Beispiel erklären kann, schick es mit dem Link zu seiner Aufgabe in die App.",
      "„Hilf mir bei Übung …, Nr. …“ (das Kind kommt mit „Hilfe“ aus der App): Schlag Übung und Nummer unten nach und setz bei dieser Aufgabe an. Steht da „Die App sagt: …“, such den Fehler (F1, F2 …) der Übung, zu dem die Meldung passt: Das ist der Fehler des Kindes. Nennt die Nachricht eine Eingabe und steht sie bei dieser Nummer in einer Spalte F…, bestätigt das den Fehler. Sag in einem Satz, was an genau dieser Eingabe nicht zur Aufgabe passt, und wiederhol die Meldung nicht. Fehlt beides, frag, was das Kind eingegeben oder gebaut hat und wo es hängt. Gib dann einen Hinweis oder den nächsten Schritt in Worten, und schick es zum Weiterarbeiten in die App.",
    ],
    appRules: "Regeln dieser App",
    whereTitle: "Wo das Kind gerade ist",
    where: [
      "Die erste Nachricht des Kindes nennt diese Seite und je Übung die Nummer der Aufgabe, die das Kind gerade vor sich hat, z. B. `?{example}`. Schlag die Nummern unten bei den Übungen nach. Kommt das Kind mit „Hilfe“, nennt `uebung=` die Übung und `abschnitt=` ihren Abschnitt.",
      "Steht in der Nachricht „Die App sagt: …“, hat die App das zur Eingabe des Kindes gemeldet. Setz dort an, ohne es zu wiederholen.",
      "Eine Zeile wie „…, Nr. 16: richtig im 2. Versuch.“ kommt von „Zurück“ in der App: Übung, Nummer und wie weit das Kind damit kam.",
      "„Ich habe auf … geübt:“ kommt von „Zurück zum Tutor“: diese Seite mit den Nummern, dann je geübter Aufgabe, wie es lief, bei einer falschen mit Eingabe und Meldung der App. Setz bei den falschen an, eine nach der anderen.",
      "Jede Aufgabe hat einen Link: die Adresse der Seite, also dieser Tutor-Seite ohne `tutor/` und ohne `?…`, mit der Nummer und `via=tutor`, z. B. `{link}`. Schick ihn immer als volle Adresse, mit Schema und Host dieser Tutor-Seite (z. B. `https://`). Für eine weitere Aufgabe nimm eine andere Nummer der Übung und nenn ihren Text. Sag dazu: „Löse sie in der App und drück dann ‚Zurück‘. Füg die Zeile hier ein.“",
    ],
    needsTitle: "Besondere Anforderungen",
    needsIntro:
      "Nennt die Adresse dieser Seite `bedarf=`, gilt jeder Abschnitt, den sie nennt, mehrere durch Komma getrennt. Er geht dem oben Gesagten vor; widersprechen sich zwei, gilt der strengere. Ohne `bedarf=` gilt keiner.",
    needs: {
      "kurze-schritte":
        "Im Gegensatz zu oben: höchstens zwei kurze Sätze, ein Gedanke pro Nachricht, jeder Teil eines Abschnitts mit eigener Frage. Sag, wie weit es noch ist.",
      "wenig-lesen":
        "Im Gegensatz zu oben: höchstens zwei kurze Sätze ohne Nebensätze; sag den Kern eines Abschnitts selbst, statt ihn lesen zu lassen. Erklär jedes Fachwort einmal, korrigier keine Rechtschreibung.",
      "mehr-tiefe":
        "Hak sichere Abschnitte mit einer Prüffrage ab. Im Gegensatz zu oben darfst du an den Beispielen der Seite Warum- und Was-wäre-wenn-Fragen stellen; erfinde aber keine Rechenaufgaben.",
      "andere-muttersprache":
        "Antworte in einfachem Deutsch; nenn ein neues Fachwort mit Artikel, Mehrzahl und, wenn du sie sicher kennst, der Übersetzung in Klammern. Versteht das Kind zweimal nicht, erklär einen Satz in seiner Sprache.",
      "klar-und-woertlich":
        "Schreib wörtlich: keine Ironie, keine Redewendungen. Im Gegensatz zu oben fragst du am Anfang mit zwei oder drei Antworten zur Auswahl und nennst immer „Abschnitt x von y“.",
      "rechnen-anschaulich":
        "Zeig Zahlen der Seite als Menge, z. B. „37 sind 3 Zehner und 7 Einer“, aber nie das Ergebnis einer Aufgabe. Ein Schritt pro Nachricht, nie Zeitdruck.",
    },
    contextTitle: "Kontext: die Seite „{page}“",
    exercise: "Übung",
    steps: "Lösungsweg",
    link: "Link",
    linkNumber: "Link zu Nummer n",
    table:
      "Aufgaben nach Nummer: die Werte für `{…}`, die Lösung und was bei den Fehlern herauskommt. Ein Fehler ohne Spalte hat keinen festen Wert; die Meldung der App sagt, ob er vorliegt.",
    hidden: "(verdeckt)",
    answerIs: "`{answer}` ist die Lösung.",
    number: "Nr.",
    choices: "Zur Wahl",
    tasks: "Aufgaben nach Nummer, mit Lösung",
    shown:
      "Hier stehen die Nummern 1 bis {shown} von {count}. Sitzt das Kind an einer anderen Nummer, schick ihm den Link zu einer Nummer von hier.",
    none: "Die Nummern dieser Übung passen nicht auf diese Seite. Was das Kind dort tut, erfährst du aus seinen Zeilen von „Hilfe“ und „Zurück“.",
  },
  en: {
    title: "{page} – for your AI tutor",
    tutorPage: "tutor page",
    forTutor: "What an AI tutor gets for the page “{page}”.",
    intro:
      "You help a child learn. It works with the learning app “{app}” of lernapps.net, right now on the page “{page}”, and is in an exercise there. Tasks are solved in the app, which checks the answers. You explain.",
    parents: "Parents and teachers see here what the tutor gets.",
    toPage: "To the page",
    guideTitle: "How you guide",
    guide: [
      "Answer briefly: three sentences and one question at most. No headings, no lists.",
      "Use the examples and tasks of this page. Do not make up your own. Work nothing out yourself: solutions and mistakes are below with each number.",
      "In the chat you explain, with the page's example. Tasks are worked out in the app: the child solves them there. If it works a task out in the chat, send it the link to the task at once.",
      "Do not give a solution away. A value the table of an exercise calls “(hidden)” is not in the task's text: the child does not see it, do not name it.",
      "What the child can do in the app is under “What to do” and “Answer format” with the exercise. Do not describe other buttons or steps.",
      "Never ask the child to copy a task. You know it from the context below.",
    ],
    startTitle: "How you start",
    start: [
      "“Be my tutor”: first ask what the child already knows about the topic. Then go through the page in order, one section per message: first why the topic matters, then the rule, then the example. After each section check with a short question on its content that the child understood it; a “yes” is not enough. Only once it can explain the example, send it to the app with the link to its task.",
      "“Help me with exercise …, no. …” (the child comes from “Help” in the app): look the exercise and the number up below and start right at this task. If it says “The app says: …”, find the mistake (F1, F2 …) of the exercise that the message fits: that is the child's mistake. If the message names an input and it is in a column F… for this number, that confirms the mistake. Say in one sentence what about exactly this input does not fit the task, and do not repeat the message. If both are missing, ask what the child entered or built and where it is stuck. Then give a hint or the next step in words, and send it back to the app to go on.",
    ],
    appRules: "Rules of this app",
    whereTitle: "Where the child is",
    where: [
      "The child's first message names this page and, for each exercise, the number of the task the child has in front of it, e.g. `?{example}`. Look the numbers up below with the exercises. If the child comes with “Help”, `uebung=` names the exercise and `abschnitt=` its section.",
      "If the message says “The app says: …”, the app showed that for the child's input. Build on it without repeating it.",
      "A line like “…, no. 16: right on try 2.” comes from “Back” in the app: the exercise, the number and how far the child got with it.",
      "“I practised on …:” comes from “Back to the tutor”: this page with the numbers, then for each task practised how it went, a wrong one with the input and the app's message. Start with the wrong ones, one after the other.",
      "Every task has a link: the address of the page, that is of this tutor page without `tutor/` and without `?…`, with the number and `via=tutor`, e.g. `{link}`. Always send it as a full address, with the scheme and host of this tutor page (e.g. `https://`). For a further task take another number of the exercise and say its text. Add: “Solve it in the app, then press ‘Back’. Paste the line here.”",
    ],
    needsTitle: "Special requirements",
    needsIntro:
      "If the address of this page names `bedarf=`, each section it names holds, several separated by commas. It goes before what is said above; if two contradict each other, the stricter one holds. Without `bedarf=` none holds.",
    needs: {
      "kurze-schritte":
        "Unlike above: two short sentences at most, one thought per message, each part of a section with a question of its own. Say how far there is still to go.",
      "wenig-lesen":
        "Unlike above: two short sentences at most, without subordinate clauses; say the core of a section yourself instead of having it read. Explain every technical term once, do not correct spelling.",
      "mehr-tiefe":
        "Tick off sections the child knows with one checking question. Unlike above you may ask why and what-if questions about the page's examples; but do not make up tasks to work out.",
      "andere-muttersprache":
        "Answer in simple language, in the language of this page; give a new technical term with its article and plural, if any, and, if you know it for sure, its translation in brackets. If the child does not understand twice, explain one sentence in its language.",
      "klar-und-woertlich":
        "Write literally: no irony, no idioms. Unlike above, at the start you ask with two or three answers to choose from, and you always say “section x of y”.",
      "rechnen-anschaulich":
        "Show numbers of the page as amounts, e.g. “37 is 3 tens and 7 ones”, but never the result of a task. One step per message, never time pressure.",
    },
    contextTitle: "Context: the page “{page}”",
    exercise: "Exercise",
    steps: "Steps of the solution",
    link: "Link",
    linkNumber: "Link to number n",
    table:
      "Tasks by number: the values for `{…}`, the solution and what the mistakes give. A mistake without a column has no fixed value; the app's message says whether it is there.",
    hidden: "(hidden)",
    answerIs: "`{answer}` is the solution.",
    number: "No.",
    choices: "Choices",
    tasks: "Tasks by number, with solution",
    shown:
      "Here are the numbers 1 to {shown} of {count}. If the child is at another number, send it the link to a number from here.",
    none: "The numbers of this exercise do not fit on this page. What the child does there you learn from its lines of “Help” and “Back”.",
  },
};

const wordsIn = (lang: string): Words => WORDS[lang] ?? (WORDS["de"] as Words);

/** A text on one line, as a list item holds it, for the page's Markdown (formulas). */
const line = (text: string) => formulas(text.replace(/\s+/g, " ").trim());

/**
 * A text for the page's Markdown, its lines kept: no HTML in it, and each formula $…$ on one line, which the page's
 * Markdown keeps as written (FORMULA).
 */
const formulas = (text: string) =>
  text
    .split(/(\$[^$]+\$)/)
    .map((part, index) => (index % 2 === 1 ? part.replace(/\s+/g, " ") : part.replace(/</g, "&lt;")))
    .join("");

/** The types of the question blocks, exercises without numbers. */
const QUESTIONS: ReadonlySet<string> = new Set([
  "single-choice",
  "multiple-choice",
  "true-false",
  "number",
  "ordering",
  "matching",
]);

/** An exercise of a page, where it is, and how many numbered tasks it has (0 for one without numbers). */
export interface PageExercise {
  id: string;
  block: Block;
  /** The anchor of the section it is in (<section>/<subsection>), if any. */
  section?: string;
  sectionTitle?: Text;
  count: number;
}

/** The exercises of `page` in order, each with its section and the number of its numbered tasks. */
export function pageExercises(site: Site, page: Page, descriptions: Descriptions): PageExercise[] {
  const found: PageExercise[] = [];
  const walk = (blocks: readonly Block[], anchor: string[], title: Text | undefined): void => {
    for (const block of blocks) {
      if (block.type === "section") walk(block.blocks, [...anchor, block.id], block.title);
      else if (block.type === "example" || block.type === "note") walk(block.blocks, anchor, title);
      else {
        const where =
          anchor.length === 0
            ? {}
            : { section: anchor.join("/"), ...(title === undefined ? {} : { sectionTitle: title }) };
        if (block.type === "generated") {
          found.push({ id: block.id, block, ...where, count: taskSeeds(block, dataOf(block, site.data)).length });
        } else if (block.type === "vue-component") {
          const use = site.components.find((candidate) => candidate.block === block);
          const description = descriptions.get(block);
          if (use?.id !== undefined && use.component.exercise) {
            found.push({ id: use.id, block, ...where, count: description?.seeds.length ?? 0 });
          }
        } else if (QUESTIONS.has(block.type) && "id" in block && typeof block.id === "string") {
          found.push({ id: block.id, block, ...where, count: 0 });
        }
      }
    }
  };
  walk(page.blocks, [], undefined);
  return found;
}

/** The anchors of the sections of `page`, nested as <section>/<subsection>. */
export function sectionsOf(page: Page): string[] {
  const walk = (blocks: readonly Block[], anchor: string[]): string[] =>
    blocks.flatMap((block) =>
      block.type === "section" ? [[...anchor, block.id].join("/"), ...walk(block.blocks, [...anchor, block.id])] : [],
    );
  return walk(page.blocks, []);
}

/** A template of the content with each placeholder {{x}} as {x}, on one line, for the page's Markdown. */
const template = (text: Text, lang: string) => line(inLanguage(text, lang).replace(/\{\{\s*([\w.]+)\s*\}\}/g, "{$1}"));

/** The placeholders of a generated exercise's texts in `lang`, in order and each once, but {{answer}}, the solution. */
function placeholdersOf(spec: Generated, lang: string): { paths: string[]; answer: boolean } {
  const texts = [
    spec.task.text,
    ...(spec.hint === undefined ? [] : [spec.hint]),
    ...(spec.steps ?? []),
    ...(spec.mistakes ?? []).map((mistake) => mistake.message),
  ];
  const all = [...new Set(texts.flatMap((text) => placeholdersIn(inLanguage(text, lang))))];
  return { paths: all.filter((path) => path !== "answer"), answer: all.includes("answer") };
}

/** A cell of a table of tasks: on one line, without the table's separator. */
const cell = (text: string) => text.replace(/\s+/g, " ").replace(/\|/g, "/").trim() || "–";

/**
 * A generated exercise for the tutor, once: its task as a template ({G} for the value of G), its answer format, hint
 * and steps, its typical mistakes as F1, F2 … with the app's message, and the link to a number; then a table of each
 * task number's inputs and outputs: the values of the placeholders, the choices of a choice, the solution and what
 * each mistake gives, all as the learner reads them, so that the tutor fills in and works nothing out. The examples
 * stay out: they are test cases. The link leads to the exercise's page at `page`, from where the tutor page is.
 */
export function generatedLines(spec: Generated, site: Site, lang: string, format: string[], page = "../"): string[] {
  const words = wordsIn(lang);
  const shared = tutorWords(lang);
  const lines = [`- ${shared.task}: „${template(spec.task.text, lang)}“`, ...format];
  if (spec.hint !== undefined) lines.push(`- ${shared.hint}: „${template(spec.hint, lang)}“`);
  if (spec.steps !== undefined) {
    lines.push(`- ${words.steps}:`, ...spec.steps.map((step) => `  - ${template(step, lang)}`));
  }
  const mistakes = spec.mistakes ?? [];
  if (mistakes.length > 0) {
    lines.push(
      `- ${shared.mistakes}:`,
      ...mistakes.map((mistake, index) => `  - F${index + 1}: „${template(mistake.message, lang)}“`),
    );
  }
  lines.push(`- ${words.linkNumber}: \`${page}?${spec.id}=n&via=tutor#${spec.id}\``);
  const { paths, answer } = placeholdersOf(spec, lang);
  const data = dataOf(spec, site.data);
  const templates = templatesOf(spec, [lang]);
  let choices = false;
  const rows = taskSeeds(spec, data).map((seed, index) => {
    const task = generate(spec, seed, data);
    const question = questionFor(spec, task, lang, templates);
    const options =
      question.type === "single-choice" || question.type === "multiple-choice"
        ? [cell(question.options.map((option) => plainText(option.text)).join("; "))]
        : [];
    if (options.length > 0) choices = true;
    const wrong = mistakes.map((_mistake, at) => {
      try {
        return cell(label(task.mistakes[at] ?? "", lang));
      } catch {
        return "–";
      }
    });
    return [
      String(index + 1),
      ...paths.map((path) => cell(placeholderValue(spec, task, path, lang)?.text ?? "")),
      ...options,
      cell(plainText(answerText(question, lang))),
      ...wrong,
    ].join(" | ");
  });
  const header = [
    words.number,
    ...paths,
    ...(choices ? [words.choices] : []),
    shared.solution,
    ...mistakes.map((_mistake, index) => `F${index + 1}`),
  ].join(" | ");
  lines.push(`- ${words.table}${answer ? ` ${words.answerIs}` : ""}`, "", "```", header, ...rows, "```");
  return lines;
}

/**
 * The table of tasks of an exercise component, as a generated exercise has it: each task number's inputs, its
 * solution and what each typical mistake gives, all as the learner reads them ("–" for a mistake without one answer).
 */
function componentTable(exercise: ComponentExercise, lang: string): string[] {
  const words = wordsIn(lang);
  const count = exercise.tasks[0]?.mistakes.length ?? 0;
  // a typical mistake without a single answer for any number has no column: its description above says what it is
  const columns = Array.from({ length: count }, (_mistake, index) => index).filter((index) =>
    exercise.tasks.some((row) => (row.mistakes[index] ?? "") !== ""),
  );
  // an input the task's text does not show is hidden from the child
  const shown = new Set([...exercise.template.matchAll(/\{([^{}\s]+)\}/g)].map((match) => match[1]));
  const header = [
    words.number,
    ...exercise.inputs.map((input) => (shown.has(input) ? input : `${input} ${words.hidden}`)),
    tutorWords(lang).solution,
    ...columns.map((index) => `F${index + 1}`),
  ].join(" | ");
  const rows = exercise.tasks.map((row, index) =>
    [String(index + 1), ...row.inputs, row.solution, ...columns.map((column) => row.mistakes[column] ?? "")]
      .map(cell)
      .join(" | "),
  );
  return [`- ${words.table}`, "", "```", header, ...rows, "```"];
}

/**
 * The hint of the build for the exercise components that declare no table of tasks (TABLE_CONTRACT), each by its
 * place, or none: their tutor pages have their tasks only as text from describe, as many as fit. A hint for now;
 * rule vue-component-tutor-table.
 */
export function tableHint(site: Site, descriptions: Descriptions): string | undefined {
  const without = site.components.filter((use) => {
    const description = descriptions.get(use.block);
    return description !== undefined && description.exercise === undefined;
  });
  if (without.length === 0) return undefined;
  const one = without.length === 1;
  return `lernapps explainer: ${without.length} exercise component${one ? " declares" : "s declare"} no table of tasks, so ${one ? "its tutor page has its" : "their tutor pages have their"} tasks only as text, as many as fit; export ${TABLE_CONTRACT} from ${one ? "its" : "their"} logic module: ${without.map((use) => `${use.place}: ${use.component.name}`).join(", ")} (vue-component-tutor-table)`;
}

/** An exercise with numbers left out of a tutor page for its size: how many of its numbers it shows. */
export interface Cut {
  id: string;
  shown: number;
  count: number;
}

/**
 * The tutor page of `page` in `lang`, as Markdown, its links relative to the page's folder <chapter>/<page>/tutor/,
 * which the build checks: who the tutor helps, how to guide, where the child is, the app's own rules; then the page's
 * content as context, and its exercises. An exercise component shows its table of tasks with every number, or without
 * one each number's task and solution; when the page would grow beyond `budget`, the components without a table share
 * what is left, number by number in turn, and `cut` names those with numbers left out.
 */
export function tutorPage(
  site: Site,
  page: Page,
  lang: string,
  descriptions: Descriptions,
  budget: number = TUTOR_PAGE_BUDGET,
): { markdown: string; cut: Cut[] } {
  const words = wordsIn(lang);
  const exercises = pageExercises(site, page, descriptions);
  // the task of each number of each exercise component, from its describe
  const rows = new Map<string, string[]>();
  for (const exercise of exercises) {
    if (exercise.block.type !== "vue-component" || exercise.count === 0) continue;
    // a component with its table of tasks has all its numbers there
    if (descriptions.get(exercise.block)?.exercise?.[lang] !== undefined) continue;
    const tasks = descriptions.get(exercise.block)?.tasks[lang] ?? [];
    rows.set(
      exercise.id,
      tasks.map(
        (task) =>
          `  - ${words.number} ${task.number}: ${line(task.task)} → ${tutorWords(lang).solution}: ${line(task.solution)}`,
      ),
    );
  }
  const shown = new Map<string, number>();
  const build = () => pageMarkdown(site, page, lang, descriptions, exercises, rows, shown);
  const size = (text: string) => bytesOf(tutorPageDocument(text, site, page, lang));
  let markdown = build();
  if (size(markdown) > budget && rows.size > 0) {
    for (const id of rows.keys()) shown.set(id, 0);
    let room = budget - size(build());
    // a row's share of the page: its HTML, a list item
    const cost = (row: string) => bytesOf(escape(row)) + "<li></li>\n".length;
    for (let more = true; more;) {
      more = false;
      for (const [id, all] of rows) {
        const next = all[shown.get(id) ?? 0];
        if (next === undefined || cost(next) > room) continue;
        room -= cost(next);
        shown.set(id, (shown.get(id) ?? 0) + 1);
        more = true;
      }
    }
    markdown = build();
    // the cost of a row is a guess: one row less of the largest until the page fits
    while (size(markdown) > budget) {
      const [largest] = [...shown.entries()].sort((a, b) => b[1] - a[1]);
      if (largest === undefined || largest[1] === 0) break;
      shown.set(largest[0], largest[1] - 1);
      markdown = build();
    }
  }
  const cut = [...rows].flatMap(([id, all]) => {
    const n = shown.get(id) ?? all.length;
    return n < all.length ? [{ id, shown: n, count: all.length }] : [];
  });
  return { markdown, cut };
}

/**
 * The learner's needs on a tutor page, in `lang`, after its guide (dec-tutor-needs): what holds when the query names
 * them in `bedarf=`, then a short section for each, as Markdown lines.
 */
export function needsLines(lang: string): string[] {
  const words = wordsIn(lang);
  return [
    `## ${words.needsTitle}`,
    "",
    words.needsIntro,
    "",
    ...NEEDS.map((need) => `- \`${need}\`: ${words.needs[need]}`),
    "",
  ];
}

/** The tutor page of `page` in `lang`, as Markdown (tutorPage). */
export const tutorPageMarkdown = (site: Site, page: Page, lang: string, descriptions: Descriptions): string =>
  tutorPage(site, page, lang, descriptions).markdown;

/** The Markdown of a tutor page, with of each exercise component the rows by number `shown` names (all if none). */
function pageMarkdown(
  site: Site,
  page: Page,
  lang: string,
  descriptions: Descriptions,
  exercises: readonly PageExercise[],
  rows: ReadonlyMap<string, readonly string[]>,
  shown: ReadonlyMap<string, number>,
): string {
  const words = wordsIn(lang);
  const own = (text: Text) => line(inLanguage(text, lang));
  const title = own(page.title);
  const fill = (text: string) => text.replace("{page}", title).replace("{app}", own(site.app.title));
  const lines = [
    `# ${fill(words.title)}`,
    "",
    fill(words.intro),
    "",
    `${words.parents} [${words.toPage}](../)`,
    "",
    `## ${words.guideTitle}`,
    "",
    ...words.guide.map((text) => `- ${text}`),
    "",
    `## ${words.startTitle}`,
    "",
    ...words.start.map((text) => `- ${text}`),
    "",
  ];
  if (site.app.tutor?.rules !== undefined) {
    lines.push(`## ${words.appRules}`, "", inLanguage(site.app.tutor.rules, lang).trim(), "");
  }
  // where the child is and the link of a task, as examples: of the page's first exercise with numbers if any
  const first = exercises.find((exercise) => exercise.count > 0) ?? exercises[0];
  const example =
    first === undefined
      ? undefined
      : first.count > 0
        ? { query: `${first.id}=12`, link: `…/${page.chapter}/${page.id}/?${first.id}=12&via=tutor#${first.id}` }
        : { query: `uebung=${first.id}`, link: `…/${page.chapter}/${page.id}/?via=tutor#${first.id}` };
  lines.push(
    `## ${words.whereTitle}`,
    "",
    ...words.where.flatMap((text) =>
      !text.includes("{example}") && !text.includes("{link}")
        ? [`- ${text}`]
        : example === undefined
          ? []
          : [`- ${text.replace("{example}", example.query).replace("{link}", example.link)}`],
    ),
    "",
    ...needsLines(lang),
    `## ${fill(words.contextTitle)}`,
    "",
  );
  if (page.description !== undefined) lines.push(own(page.description), "");
  lines.push(
    ...contentLines(
      site,
      page.blocks,
      lang,
      formulas,
      (heading, _anchor, depth) => `${"#".repeat(Math.min(3 + depth, 6))} ${heading}`,
    ),
  );
  for (const exercise of exercises) {
    const part = exercisePart(site, exercise.block, lang, descriptions);
    if (part === undefined) continue;
    lines.push(`### ${words.exercise} ${part.id}`, "");
    if (exercise.block.type === "generated") {
      const format = part.lines.filter((text) => text.startsWith(`- ${tutorWords(lang).answerFormat}:`)).map(line);
      lines.push(...generatedLines(exercise.block, site, lang, format));
    } else {
      lines.push(
        ...part.lines.map((text) => {
          const [, indent = "", rest = ""] = /^(\s*- )?(.*)$/.exec(text) ?? [];
          return `${indent}${line(rest)}`;
        }),
      );
      const declared = descriptions.get(exercise.block)?.exercise?.[lang];
      if (exercise.count > 0) {
        lines.push(`- ${words.linkNumber}: \`../?${exercise.id}=n&via=tutor#${exercise.id}\``);
        const all = rows.get(exercise.id) ?? [];
        const n = shown.get(exercise.id) ?? all.length;
        if (declared !== undefined) lines.push(...componentTable(declared, lang));
        else if (n > 0) lines.push(`- ${words.tasks}:`, ...all.slice(0, n));
        if (n === 0 && all.length > 0) lines.push(`- ${words.none}`);
        else if (n < all.length) {
          lines.push(`- ${words.shown.replace("{shown}", String(n)).replace("{count}", String(all.length))}`);
        }
      } else lines.push(`- ${words.link}: [../?via=tutor#${exercise.id}](../?via=tutor#${exercise.id})`);
    }
    lines.push("");
  }
  return `${lines.join("\n").trimEnd()}\n`;
}

/** A formula $…$ of the page's Markdown, kept as written: neither emphasis nor escapes inside it. */
const FORMULA = {
  name: "formula",
  level: "inline" as const,
  start: (source: string) => {
    const at = source.indexOf("$");
    return at < 0 ? undefined : at;
  },
  tokenizer: (source: string) => {
    const match = /^\$(?:\\.|[^\\$\n])+?\$/.exec(source);
    return match === null ? undefined : { type: "formula", raw: match[0] };
  },
  renderer: (token: { raw: string }) => escape(token.raw),
};

const markdown = new Marked({ gfm: true, extensions: [FORMULA] });

/** The tutor page of `page` in `lang` as a whole HTML document: lean, readable at any width, without script. */
export function tutorPageHtml(site: Site, page: Page, lang: string, descriptions: Descriptions): string {
  return tutorPageDocument(tutorPageMarkdown(site, page, lang, descriptions), site, page, lang);
}

/** The HTML document of a tutor page's Markdown `text`. */
export function tutorPageDocument(text: string, site: Site, page: Page, lang: string): string {
  const words = wordsIn(lang);
  const own = (value: Text) => inLanguage(value, lang).replace(/\s+/g, " ").trim();
  return tutorDocument(
    text,
    `${own(page.title)} – ${words.tutorPage} – ${own(site.app.title)}`,
    words.forTutor.replace("{page}", own(page.title)),
    lang,
  );
}

/** The HTML document of a tutor page's Markdown `text`, with its `title` and `description`: lean, without script. */
export function tutorDocument(text: string, title: string, description: string, lang: string): string {
  const body = markdown.parse(text, { async: false }).trim();
  return [
    "<!doctype html>",
    `<html lang="${lang}">`,
    "<head>",
    '<meta charset="utf-8" />',
    '<meta name="viewport" content="width=device-width, initial-scale=1" />',
    `<title>${escape(title)}</title>`,
    `<meta name="description" content="${escape(description)}" />`,
    "<style>body{margin:0 auto;max-width:48rem;padding:1rem;font:1rem/1.5 system-ui,sans-serif;color:#1a1a1a;background:#fff;overflow-wrap:anywhere}pre{white-space:pre-wrap}code,pre{font-size:.95em}</style>",
    "</head>",
    "<body>",
    '<main id="anleitung">',
    body,
    "</main>",
    "</body>",
    "</html>",
    "",
  ].join("\n");
}
