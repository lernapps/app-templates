// The contract between the runtime of an interactive app and the app's core (src/core/index.ts), and its
// playthroughs (src/playthroughs/*.yaml). The core is the app's logic: pure TypeScript without DOM, deterministic by
// its seed, its state plain JSON data. The runtime keeps the state: it starts it with start(seed, route), gives every
// input to step(state, input), a key the learner types or an input the app's root component emits, and calls
// tick(state, TICK) every TICK milliseconds when the core has it; the app's components only show the state. A
// playthrough is a seed, a route and a list of steps: inputs, then ticks (time passing), and the state (a part of it)
// or the announcement expected after them. The build plays each against the core (plugin.ts); the end-to-end tests
// play the same inputs and ticks in the browser (e2e.ts). Used in the browser and in Node alike.

/** A JSON value: what an action input carries. */
export type Json = null | boolean | number | string | readonly Json[] | { readonly [key: string]: Json };

/**
 * A key the learner typed, as the browser names it (KeyboardEvent.key: "a", "A", "Enter", " ", "ArrowLeft"); the
 * root component may emit one too.
 */
export interface KeyInput {
  kind: "key";
  key: string;
}

/**
 * An action the app's root component emits as input, for what the learner does with the pointer or by touch: the
 * name the app gives it (e.g. "again", "pick"), and a JSON value if it needs one (e.g. the cell picked).
 */
export interface ActionInput {
  kind: "action";
  name: string;
  value?: Json;
}

/**
 * An input to the core. Told apart by its kind; later versions of the runtime may add kinds, so a core handles the
 * kinds it knows and returns the state unchanged for any other.
 */
export type Input = KeyInput | ActionInput;

/**
 * The core of an interactive app, the exports of src/core/index.ts. `route` is the id of the hash route the app was
 * opened at (app/#<id>, a route of src/app.yaml), the first route when the address names none, "" when the app has
 * no routes. step returns the same state object for an input it ignores, so that a key keeps its default (Tab moves
 * the focus).
 */
export interface Core<S> {
  start(seed: number, route: string): S;
  step(state: S, input: Input): S;
  tick?(state: S, dt: number): S;
}

/** The milliseconds from one tick to the next: the runtime calls tick(state, TICK) every TICK ms. */
export const TICK = 20;

/** The property of the app's element that holds the state, for the end-to-end tests. */
export const STATE_PROPERTY = "lernappsState";

/**
 * The global of the end-to-end tests' clock: when the page has it (an object, set before the client module runs),
 * the runtime starts no interval and puts on it tick(count), which calls tick(state, TICK) count times, the same as
 * count intervals would. Only the tests set it; for a learner, time passes on its own.
 */
export const CLOCK_PROPERTY = "lernappsClock";

/**
 * One step of a playthrough: keys (the short form of key inputs) or inputs, then ticks, the time that passes after
 * them (ticks × TICK ms); then what is expected, the state (a part of it), the announcement, or both.
 */
export interface PlaythroughStep {
  keys?: readonly string[];
  inputs?: readonly Input[];
  ticks?: number;
  state?: unknown;
  announce?: string;
}

/** A playthrough: the route and seed it starts with, and its steps. */
export interface Playthrough {
  route?: string;
  seed: number;
  steps: readonly PlaythroughStep[];
}

/** The inputs of a step, its keys as key inputs. */
export function inputsOf(step: PlaythroughStep): Input[] {
  return step.inputs !== undefined ? [...step.inputs] : (step.keys ?? []).map((key): Input => ({ kind: "key", key }));
}

/** An input as a playthrough's problem names it: a key as its JSON text, an action with its name and value. */
export function inputText(input: Input): string {
  if (input.kind === "key") return JSON.stringify(input.key);
  return `action ${JSON.stringify(input.name)}${input.value === undefined ? "" : ` ${JSON.stringify(input.value)}`}`;
}

/** What a step does, as a playthrough's problem names it: its inputs, then its ticks. */
export function doingText(step: PlaythroughStep): string[] {
  const ticks = step.ticks === undefined ? [] : [`${step.ticks} tick${step.ticks === 1 ? "" : "s"}`];
  return [...inputsOf(step).map(inputText), ...ticks];
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

/**
 * Where `actual` differs from `expected`: the path of the first difference, with the value found there, or undefined
 * when it matches. An object expects only the fields it names (each compared in the same way); anything else, a list
 * too, is compared as a whole.
 */
export function mismatch(
  actual: unknown,
  expected: unknown,
  path: readonly (string | number)[] = [],
): { path: (string | number)[]; actual: unknown } | undefined {
  if (isRecord(expected)) {
    if (!isRecord(actual)) return { path: [...path], actual };
    for (const [key, value] of Object.entries(expected)) {
      const found = mismatch(actual[key], value, [...path, key]);
      if (found !== undefined) return found;
    }
    return undefined;
  }
  return JSON.stringify(actual) === JSON.stringify(expected) ? undefined : { path: [...path], actual };
}
