// The logic of ProzentFeld.vue, a field of G squares, together 100 %, of which the learner colours p %: pure
// functions, which the build tests over fixed seeds (the exercise contract). A task is G and p; an answer is the
// number of squares coloured, whichever they are. describe states a task and its solution, about what the exercise
// is; template, params, mistakes and show give a tutor the task once and each number's inputs and outputs.

/** The props the logic needs: the task with {G} and {p}, and the app's message for each typical mistake. */
export interface Props {
  task: string;
  mistakes?: readonly string[];
}

export interface Task {
  /** The number of squares, the whole: 100 %. */
  G: number;
  /** The percentage to colour. */
  p: number;
}

/** The number of squares coloured. */
export type Answer = number;

/** The sizes of the field: never 100, so that p squares is a mistake. */
const SIZES = [20, 25, 40, 50];

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

/** The squares p % of the field are. */
const part = (task: Task) => (task.G * task.p) / 100;

/**
 * The percentages of a field of `G` squares: whole squares, neither 50 % (the rest would be as many) nor a p whose
 * rest is p squares (the two mistakes would give the same answer).
 */
const percentages = (G: number) =>
  Array.from({ length: 99 }, (_, i) => i + 1).filter(
    (p) => Number.isInteger((G * p) / 100) && p !== 50 && G - (G * p) / 100 !== p,
  );

/** The task of `seed`: a size and a percentage of it. */
export function generate(seed: number, _props?: Props): Task {
  const next = random(seed);
  const G = SIZES[Math.floor(next() * SIZES.length)] ?? 20;
  const choices = percentages(G);
  return { G, p: choices[Math.floor(next() * choices.length)] ?? 10 };
}

/** Whether `answer` squares are p % of the field. */
export function check(task: Task, answer: Answer): boolean {
  return answer === part(task);
}

/** The right answer. */
export function solution(task: Task): Answer {
  return part(task);
}

/** A wrong answer: the rest coloured. */
export function wrong(task: Task): Answer {
  return task.G - part(task);
}

/** The answer of each typical mistake of about.mistakes: p squares (none when p is more than the field), the rest. */
export function mistakes(task: Task): (Answer | undefined)[] {
  return [task.p < task.G ? task.p : undefined, wrong(task)];
}

/** A text of the props with {G}, {p} and {n} filled in. */
export const fill = (text: string, task: Task, n = 0) =>
  text.replace(/\{G\}/g, String(task.G)).replace(/\{p\}/g, String(task.p)).replace(/\{n\}/g, String(n));

/** The app's message for a wrong answer, from the props: that of its typical mistake, or none. */
export function reason(task: Task, answer: Answer, props: Props): string | undefined {
  const index = mistakes(task).findIndex((mistaken) => mistaken === answer);
  const message = index < 0 ? undefined : props.mistakes?.[index];
  return message === undefined ? undefined : fill(message, task, answer);
}

/** The task as a learner sees it, and its solution. */
export function describe(task: Task, props: Props, _lang: string): { task: string; solution: string } {
  return {
    task: fill(props.task, task),
    solution: `${show(part(task))}: ${task.G} · ${task.p} : 100 = ${part(task)}`,
  };
}

/** The task as a learner reads it, with {G} and {p}: the prop task. */
export function template(props: Props, _lang: string): string {
  return props.task;
}

/** What sets a task: the size of the field and the percentage. */
export function params(task: Task, _props: Props, _lang: string): Record<string, number> {
  return { G: task.G, p: task.p };
}

/** An answer as text. */
export function show(answer: Answer): string {
  return `${answer} Kästchen`;
}

/** What the exercise is, for a tutor. */
export const about = {
  task: "Ein Feld aus G Kästchen ist das Ganze, also 100 %. Das Kind färbt durch Antippen p % davon und drückt „Prüfen“. Wie das Hunderterfeld, nur hat das Feld nicht 100 Kästchen.",
  answer: "Die Zahl der gefärbten Kästchen; welche es sind, ist egal.",
  correct: "Richtig, wenn genau G · p : 100 Kästchen gefärbt sind.",
  mistakes: [
    "p Kästchen gefärbt, als hätte das Feld 100 Kästchen.",
    "Den Rest gefärbt: die Kästchen, die nicht zu den p % gehören.",
  ],
};
