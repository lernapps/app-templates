// The game's logic: a round of letters from the lesson of the route, drawn from the seed; each letter typed right
// scores, a wrong key or a letter not typed in time is a miss; after the round, Enter or the action "again" (the button
// of the component) starts the next. Pure TypeScript without DOM; the runtime keeps the state and calls start, step
// and tick (@lernapps/app-templates/interactive).
import type { Input } from "@lernapps/app-templates/interactive";
import lessons from "../data/lessons.json" with { type: "json" };

/** A lesson of src/data/lessons.json: the letters it draws from, how many a round has, the seconds for each. */
export interface Lesson {
  letters: string;
  count: number;
  seconds: number;
}

export interface State {
  seed: number;
  route: string;
  /** The letters of the round, in order. */
  letters: string;
  /** The position of the letter to type now. */
  index: number;
  score: number;
  misses: number;
  /** Milliseconds left for the letter to type now. */
  left: number;
  /** What the last change was. */
  last: "start" | "hit" | "miss" | "late";
  done: boolean;
}

const LESSONS: Readonly<Record<string, Lesson>> = lessons;

/** The lesson of a route. */
export function lessonOf(route: string): Lesson {
  const lesson = LESSONS[route];
  if (lesson === undefined) throw new Error(`no lesson ${route} in src/data/lessons.json`);
  return lesson;
}

/** A random number from 0 to 1 for each call, the same sequence for the same seed (mulberry32). */
function random(seed: number): () => number {
  let value = seed >>> 0;
  return () => {
    value = (value + 0x6d2b79f5) >>> 0;
    let mixed = Math.imul(value ^ (value >>> 15), 1 | value);
    mixed = (mixed + Math.imul(mixed ^ (mixed >>> 7), 61 | mixed)) ^ mixed;
    return ((mixed ^ (mixed >>> 14)) >>> 0) / 4_294_967_296;
  };
}

export function start(seed: number, route: string): State {
  const lesson = lessonOf(route);
  const next = random(seed);
  const letters = Array.from(
    { length: lesson.count },
    () => lesson.letters[Math.floor(next() * lesson.letters.length)] ?? "",
  ).join("");
  return {
    seed,
    route,
    letters,
    index: 0,
    score: 0,
    misses: 0,
    left: lesson.seconds * 1000,
    last: "start",
    done: false,
  };
}

/** The state with the next letter to type, after a hit or a late one. */
function advance(state: State, change: Partial<State>): State {
  const index = state.index + 1;
  return {
    ...state,
    ...change,
    index,
    left: lessonOf(state.route).seconds * 1000,
    done: index >= state.letters.length,
  };
}

/** Whether `input` asks for the next round: Enter, or the component's action "again". */
const again = (input: Input): boolean =>
  (input.kind === "key" && input.key === "Enter") || (input.kind === "action" && input.name === "again");

export function step(state: State, input: Input): State {
  if (state.done) return again(input) ? start(state.seed + 1, state.route) : state;
  // only a typed letter counts: no Shift, Tab or other named key, no action
  if (input.kind !== "key" || input.key.length !== 1) return state;
  const key = input.key;
  if (key.toLowerCase() === state.letters[state.index]) return advance(state, { score: state.score + 1, last: "hit" });
  return { ...state, misses: state.misses + 1, last: "miss" };
}

export function tick(state: State, dt: number): State {
  if (state.done) return state;
  const left = state.left - dt;
  if (left > 0) return { ...state, left };
  return advance(state, { misses: state.misses + 1, last: "late" });
}
