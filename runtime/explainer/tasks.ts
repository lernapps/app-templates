// The task numbers of an explainer's seeded exercises (generated ones and exercise components), shared by the client
// module, the islands and the build. The build walks the seeds 1, 2, 3, … through an exercise's generator and keeps
// each seed whose task differs from every task before it (distinctSeeds), up to MAX_TASKS; the kept seeds, in order,
// are the tasks "Aufgabe Nr. 1" to "Aufgabe Nr. N". The number is the one identifier a learner, a tutor and the
// address share: ?seed=<n>#<exercise> opens task number n (the build ships each exercise's table of seeds, and the page
// draws the task from table[n - 1]); "Neue Aufgabe" moves to the next number, from N back to 1; a number outside 1 to N
// wraps around into it (taskNumber), so every address opens a task the tutor page lists (tutorpage.ts).

/** The most tasks an exercise numbers. */
export const MAX_TASKS = 67;
/** How many seeds the build tries at most to find MAX_TASKS distinct tasks. */
export const SEED_TRIES = MAX_TASKS * 20;

/**
 * The seeds of the distinct tasks, in order: seed 1, 2, 3, … kept when `key(seed)` (what the learner sees of its task,
 * language-independent) differs from every kept one's, until `max` are kept or `tries` seeds are tried; a seed whose
 * key is undefined (its task cannot be drawn) is skipped.
 */
export function distinctSeeds(
  key: (seed: number) => string | undefined,
  max = MAX_TASKS,
  tries = SEED_TRIES,
): number[] {
  const seen = new Set<string>();
  const seeds: number[] = [];
  for (let seed = 1; seed <= tries && seeds.length < max; seed++) {
    const found = key(seed);
    if (found === undefined || seen.has(found)) continue;
    seen.add(found);
    seeds.push(seed);
  }
  return seeds;
}

/** The task number `n` within 1 to `count`: a number outside wraps around into it (68 of 67 is 1). */
export const taskNumber = (n: number, count: number): number => ((((Math.trunc(n) - 1) % count) + count) % count) + 1;

/** The task number after `n`, for "Neue Aufgabe": the next one, from `count` back to 1. */
export const nextTaskNumber = (n: number, count: number): number => (n % count) + 1;

/** A task number to start with when the address names none. */
export const randomTaskNumber = (count: number): number => 1 + Math.floor(Math.random() * count);

/**
 * Address parameters that are no exercise's: the page's (seed, via) and those of its tutor page, whose address holds
 * the page's task numbers beside them (uebung, abschnitt; position.ts). An exercise id must not be one of them (the
 * build checks).
 */
export const RESERVED_PARAMS: readonly string[] = ["seed", "via", "uebung", "abschnitt"];

/**
 * The task number the address `href` gives the exercise `id`: the parameter named by its id (?<id>=<n>, one per
 * exercise, so that the address holds the task of every exercise of the page), or, as before, ?seed=<n>#<id>.
 */
export function numberFromAddress(href: string, id: string): number | undefined {
  const url = new URL(href);
  const asNumber = (text: string | null) => {
    const n = Number(text);
    return text !== null && Number.isInteger(n) && n > 0 ? n : undefined;
  };
  const own = asNumber(url.searchParams.get(id));
  if (own !== undefined) return own;
  return decodeURIComponent(url.hash.slice(1)) === id ? asNumber(url.searchParams.get("seed")) : undefined;
}

/**
 * The address `href` with the task number `n` of the exercise `id`: ?…&<id>=<n>, its other parameters and its anchor
 * kept. A ?seed=<n> that named this exercise's task (it is the anchor) becomes the exercise's own parameter.
 */
export function addressOf(href: string, id: string, n: number): string {
  const url = new URL(href);
  if (decodeURIComponent(url.hash.slice(1)) === id) url.searchParams.delete("seed");
  url.searchParams.set(id, String(n));
  return url.href;
}

/** How many worked tasks a page shows without JavaScript: the task numbers 1 to 3. */
export const WORKED_TASKS = 3;

/** "Neue Aufgabe" as a symbol beside the task number: a circular arrow; the button's label is its name. */
export const NEW_TASK_ICON =
  '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false"><path d="M21 12a9 9 0 1 1-2.6-6.4"/><path d="M21 3v6h-6"/></svg>';

/** The event an exercise sends on its element once it shows a task: the tutor's help button takes its place again. */
export const SHOWN_EVENT = "explainer-shown";

/**
 * The events between a self-assessment (assessment-client.ts) and the islands (islands.ts): the self-assessment put
 * its exercises into the page (on the document); it gives an exercise component the task of `seed` (on its element);
 * the component's answer changed, as { correct, answer?, message?, mistake? }, with mistake the index of the typical
 * mistake it makes from 0, or null when it has none: emptied, incomplete, or one its logic cannot read (on its
 * element, bubbling).
 */
export const ASSESSMENT_UNPACKED_EVENT = "explainer-assessment-unpacked";
export const ASSESSMENT_TASK_EVENT = "explainer-assessment-task";
export const ASSESSMENT_ANSWER_EVENT = "explainer-assessment-answer";

/** What an exercise component of a self-assessment says of the answer it has now (ASSESSMENT_ANSWER_EVENT). */
export interface AssessmentAnswer {
  correct: boolean;
  /** The answer as text. */
  answer?: string;
  message?: string;
  mistake?: number;
}
