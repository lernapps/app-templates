// The task numbers of the explainer's seeded exercises (tasks.ts): the seeds of the distinct tasks, in order, capped,
// and the numbers of an address wrapped into them.
import { expect, test } from "vite-plus/test";
import { distinctSeeds, MAX_TASKS, nextTaskNumber, taskNumber } from "../runtime/explainer/tasks.ts";

test("a seed whose task came before is skipped, and the numbers stop at the cap", () => {
  // the task of seed s is s mod 5: seeds 1 to 5 are distinct, every later one repeats one of them
  expect(distinctSeeds((seed) => String(seed % 5))).toEqual([1, 2, 3, 4, 5]);
  // every seed a new task: the first MAX_TASKS
  const all = distinctSeeds((seed) => String(seed));
  expect(all).toHaveLength(MAX_TASKS);
  expect(all.at(-1)).toBe(MAX_TASKS);
  // duplicates in between, a seed that cannot be drawn, and the bound of seeds tried
  expect(distinctSeeds((seed) => (seed === 2 ? undefined : String(Math.ceil(seed / 2))), 3)).toEqual([1, 3, 5]);
  expect(distinctSeeds((seed) => String(seed), 10, 4)).toEqual([1, 2, 3, 4]);
});

test("a number outside 1 to N wraps into it; the next one after N is 1", () => {
  expect(taskNumber(3, 5)).toBe(3);
  expect(taskNumber(6, 5)).toBe(1);
  expect(taskNumber(68, 67)).toBe(1);
  expect(nextTaskNumber(5, 5)).toBe(1);
  expect(nextTaskNumber(2, 5)).toBe(3);
});
