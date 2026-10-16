// The task numbers of an explainer's seeded exercises (generated ones and exercise components), shared by the client
// module, the islands and the build. The build walks the seeds 1, 2, 3, … through an exercise's generator and keeps
// each seed whose task differs from every task before it (distinctSeeds), up to MAX_TASKS; the kept seeds, in order,
// are the tasks "Aufgabe Nr. 1" to "Aufgabe Nr. N". The number is the one identifier a learner, a tutor and the
// address share: ?seed=<n>#<exercise> opens task number n (the build ships each exercise's table of seeds, and the page
// draws the task from table[n - 1]); "Neue Aufgabe" moves to the next number, from N back to 1; a number outside 1 to N
// wraps around into it (taskNumber), so every address opens a task the tutor files list.

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

/** The task number the address `href` gives the exercise `id` (?seed=<n>#<id>), if it names one. */
export function numberFromAddress(href: string, id: string): number | undefined {
  const url = new URL(href);
  const n = Number(url.searchParams.get("seed"));
  return decodeURIComponent(url.hash.slice(1)) === id && Number.isInteger(n) && n > 0 ? n : undefined;
}

/** The address `href` of the task number `n` of the exercise `id`, its other parameters kept: ?…&seed=<n>#<id>. */
export function addressOf(href: string, id: string, n: number): string {
  const url = new URL(href);
  url.searchParams.set("seed", String(n));
  url.hash = id;
  return url.href;
}
