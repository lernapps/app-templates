// The logic of AssignLabels.vue, a figure whose parts the learner labels: pure functions, which the build tests over
// fixed seeds (the exercise contract). A task is the order in which the labels are offered; an answer gives each part,
// from the top, the index of the label chosen for it (-1 for none); the right answer gives each part its own label.
// describe states a task and its solution as a learner reads them, about what the exercise is: both for readers
// without JavaScript and for a tutor; template, params, mistakes and show give a tutor the task once and a table of
// each number's inputs and outputs.

/** The props the logic needs: the labels of the parts, from the top, the right answer; the question and a level's name. */
export interface Props {
  parts: readonly string[];
  question?: string;
  level?: string;
}

export interface Task {
  /** The indices of the labels in the order the choices offer them. */
  order: number[];
}

/** For each part, from the top, the index of the label chosen (-1 for none). */
export type Answer = number[];

/** A small seeded random generator (mulberry32). */
function random(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** The task of `seed`: the labels in an order of the seed, never their own order when there are two or more. */
export function generate(seed: number, props: Props): Task {
  const next = random(seed);
  const order = props.parts.map((_part, index) => index);
  do {
    for (let i = order.length - 1; i > 0; i--) {
      const j = Math.floor(next() * (i + 1));
      [order[i], order[j]] = [order[j] ?? j, order[i] ?? i];
    }
  } while (order.length > 1 && order.every((label, index) => label === index));
  return { order };
}

/** Whether `answer` gives every part its own label. */
export function check(task: Task, answer: Answer): boolean {
  return answer.length === task.order.length && answer.every((label, part) => label === part);
}

/** The right answer. */
export function solution(task: Task): Answer {
  return task.order.map((_label, part) => part);
}

/** A wrong answer: the labels from the bottom up; no label at all for a single part. */
export function wrong(task: Task): Answer {
  return task.order.length > 1 ? solution(task).reverse() : [-1];
}

const GERMAN = {
  choices: "Zur Wahl stehen, in dieser Reihenfolge",
  levels: "Die Stufen, von oben nach unten",
  input: "Wahl",
};
const WORDS: Readonly<Record<string, { choices: string; levels: string; input: string }>> = {
  de: GERMAN,
  en: { choices: "The choices, in this order", levels: "The levels, from the top down", input: "choices" },
};

/** The name of the level of `part`, from 0 at the top: "Stufe 1". */
const level = (props: Props, part: number) => `${props.level ?? ""} ${part + 1}`.trim();

/** The task with `choices` for its choices, in `lang` (the props come in that language). */
function taskText(props: Props, lang: string, choices: string): string {
  const words = WORDS[lang] ?? GERMAN;
  const levels = props.parts.map((_part, index) => level(props, index)).join(", ");
  return `${props.question ?? ""} ${words.levels}: ${levels}. ${words.choices}: ${choices}.`.trim();
}

/** The choices of a task in their order. */
const choicesOf = (task: Task, props: Props) => task.order.map((label) => props.parts[label] ?? "").join("; ");

/** The task as a learner sees it, and its solution, in `lang` (the props come in that language). */
export function describe(task: Task, props: Props, lang: string): { task: string; solution: string } {
  return { task: taskText(props, lang, choicesOf(task, props)), solution: show(solution(task), task, props, lang) };
}

// For a tutor, what sets a task and what each answer gives: the build writes the task once, with a placeholder for
// the choices, and a table of each number's choices, solution and typical mistakes, and checks each mistake against
// check.

/** The task as a learner reads it, with the placeholder {Wahl} for the choices, in `lang`. */
export function template(props: Props, lang: string): string {
  return taskText(props, lang, `{${(WORDS[lang] ?? GERMAN).input}}`);
}

/** What sets a task: its choices in their order, by the name of template's placeholder. */
export function params(task: Task, props: Props, lang: string): Record<string, string> {
  return { [(WORDS[lang] ?? GERMAN).input]: choicesOf(task, props) };
}

/** The answer of each typical mistake of about.mistakes: the order upside down, the first label twice. */
export function mistakes(task: Task): (Answer | undefined)[] {
  const right = solution(task);
  if (right.length < 2) return [undefined, undefined];
  return [[...right].reverse(), right.map((label, part) => (part === 1 ? (right[0] ?? label) : label))];
}

/** An answer as text: each level with the label chosen for it. */
export function show(answer: Answer, _task: Task, props: Props, _lang: string): string {
  return answer.map((label, part) => `${level(props, part)}: ${props.parts[label] ?? "–"}`).join("; ");
}

/** What the exercise is, for a tutor. */
export const about = {
  task: {
    de: "Jede Stufe einer Pyramide, von oben nach unten nummeriert, bekommt aus einer Auswahlliste ihre Beschriftung.",
    en: "The learner gives each level of a pyramid, numbered from the top down, its label from a list of choices.",
  },
  answer: {
    de: "Für jede Stufe eine Auswahl aus der Liste, dann „Prüfen“.",
    en: "A choice from the list for each level, then “Check”.",
  },
  correct: {
    de: "Richtig ist es nur, wenn jede Stufe ihre eigene Beschriftung hat.",
    en: "It is right only when every level has its own label.",
  },
  mistakes: [
    { de: "Die Reihenfolge umgedreht: unten, was oben hingehört.", en: "The order turned upside down." },
    { de: "Eine Beschriftung zweimal gewählt.", en: "One label chosen twice." },
  ],
};
