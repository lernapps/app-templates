// The task numbers of an explainer's seeded exercises (generated ones and exercise components), shared by the client
// module, the islands and the build. Every such exercise shows "Aufgabe Nr. <n>": the seed its task is drawn from. The
// address ?seed=<n>#<exercise> opens exactly that task, and a learner can name the number to a tutor. The live
// exercises draw their numbers from 1 to TASK_NUMBERS, the same numbers the tutor files list with their tasks and
// solutions (tutor.ts), so any number a learner names is one a tutor can look up; a deep link may name any seed.

/** How many task numbers the live exercises draw from, and the tutor files list for each seeded exercise. */
export const TASK_NUMBERS = 20;

/** A task number after `seed`, for "Neue Aufgabe": the next one, from TASK_NUMBERS back to 1. */
export const nextTaskNumber = (seed: number): number => (seed % TASK_NUMBERS) + 1;

/** A task number to start with when the address names none. */
export const randomTaskNumber = (): number => 1 + Math.floor(Math.random() * TASK_NUMBERS);

/** The seed the address `href` gives the exercise `id` (?seed=<n>#<id>), if it names it. */
export function seedFromAddress(href: string, id: string): number | undefined {
  const url = new URL(href);
  const seed = Number(url.searchParams.get("seed"));
  return decodeURIComponent(url.hash.slice(1)) === id && Number.isInteger(seed) && seed > 0 ? seed : undefined;
}

/** The address `href` of the task `seed` of the exercise `id`, its other parameters kept: ?…&seed=<n>#<id>. */
export function addressOf(href: string, id: string, seed: number): string {
  const url = new URL(href);
  url.searchParams.set("seed", String(seed));
  url.hash = id;
  return url.href;
}
