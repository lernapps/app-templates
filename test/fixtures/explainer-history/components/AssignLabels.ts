// The logic of AssignLabels.vue, a figure whose parts the learner labels: pure functions, which the build tests over
// fixed seeds (the exercise contract). A task is the order in which the labels are offered; an answer gives each part,
// from the top, the index of the label chosen for it (-1 for none); the right answer gives each part its own label.

/** The props the logic needs: the labels of the parts, from the top, the right answer. */
export interface Props {
  parts: readonly string[];
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
