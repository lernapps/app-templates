// The task numbers of the explainer's seeded exercises (tasks.ts): the seeds of the distinct tasks, in order, capped,
// and the numbers of an address wrapped into them.
import { expect, test } from "vite-plus/test";
import {
  addressOf,
  distinctSeeds,
  MAX_TASKS,
  nextTaskNumber,
  numberFromAddress,
  RESERVED_PARAMS,
  taskNumber,
} from "../runtime/explainer/tasks.ts";

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

test("the address holds one parameter per exercise; ?seed=<n>#<id> still names an exercise's task", () => {
  const page = "https://app.example/kapitel/seite/";
  expect(numberFromAddress(`${page}?a=3&b=12`, "a")).toBe(3);
  expect(numberFromAddress(`${page}?a=3&b=12`, "b")).toBe(12);
  expect(numberFromAddress(`${page}?a=3`, "b")).toBeUndefined();
  expect(numberFromAddress(`${page}?a=0`, "a")).toBeUndefined();
  expect(numberFromAddress(`${page}?a=x`, "a")).toBeUndefined();
  // the old form names the task of the exercise the anchor names, and no other
  expect(numberFromAddress(`${page}?seed=7#a`, "a")).toBe(7);
  expect(numberFromAddress(`${page}?seed=7#a`, "b")).toBeUndefined();
  expect(numberFromAddress(`${page}?seed=7`, "a")).toBeUndefined();
  // the exercise's own parameter wins over the old form
  expect(numberFromAddress(`${page}?seed=7&a=2#a`, "a")).toBe(2);
});

test("a task number is written into the address with the other parameters and the anchor kept", () => {
  const page = "https://app.example/kapitel/seite/";
  expect(addressOf(`${page}?a=3&via=tutor#b`, "b", 5)).toBe(`${page}?a=3&via=tutor&b=5#b`);
  expect(addressOf(`${page}?a=3`, "a", 4)).toBe(`${page}?a=4`);
  // the old form of the exercise becomes its own parameter
  expect(addressOf(`${page}?seed=7#a`, "a", 8)).toBe(`${page}?a=8#a`);
  expect(RESERVED_PARAMS).toEqual(["seed", "via", "uebung", "abschnitt"]);
});
