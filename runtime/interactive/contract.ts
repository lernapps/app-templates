// The contract between the runtime of an interactive app and the app's core (src/core/index.ts), and its
// playthroughs (src/playthroughs/*.yaml). The core is the app's logic: pure TypeScript without DOM, deterministic by
// its seed, its state plain JSON data. The runtime keeps the state: it starts it with start(seed, route), gives every
// key the learner types to step(state, key), and calls tick(state, TICK) every TICK milliseconds when the core has
// it; the app's components only show the state. A playthrough is a seed, a route and a list of steps: keys, and the
// state (a part of it) or the announcement expected after them. The build plays each against the core (plugin.ts);
// the end-to-end tests play the same keys in the browser (e2e.ts). Used in the browser and in Node alike.

/**
 * The core of an interactive app, the exports of src/core/index.ts. `route` is the id of the hash route the app was
 * opened at (app/#<id>, a route of src/app.yaml), the first route when the address names none, "" when the app has
 * no routes. `key` is a key as the browser names it (KeyboardEvent.key: "a", "A", "Enter", " ", "ArrowLeft"). step
 * returns the same state object for a key it ignores, so that the key keeps its default (Tab moves the focus).
 */
export interface Core<S> {
  start(seed: number, route: string): S;
  step(state: S, key: string): S;
  tick?(state: S, dt: number): S;
}

/** The milliseconds from one tick to the next: the runtime calls tick(state, TICK) every TICK ms. */
export const TICK = 20;

/** The property of the app's element that holds the state, for the end-to-end tests. */
export const STATE_PROPERTY = "lernappsState";

/** One step of a playthrough: keys, then what is expected, the state (a part of it), the announcement, or both. */
export interface PlaythroughStep {
  keys: readonly string[];
  state?: unknown;
  announce?: string;
}

/** A playthrough: the route and seed it starts with, and its steps. */
export interface Playthrough {
  route?: string;
  seed: number;
  steps: readonly PlaythroughStep[];
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
