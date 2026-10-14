import { expect, test } from "vite-plus/test";
import { check, generate, solution, wrong } from "./AssignLabels.ts";

const props = { parts: ["die Geistlichen", "der Adel", "alle anderen"] };

test("each part with its own label is right, any other assignment is wrong", () => {
  const task = generate(1, props);
  expect([...task.order].sort((a, b) => a - b)).toEqual([0, 1, 2]);
  expect(task.order).not.toEqual([0, 1, 2]);
  expect(check(task, solution(task))).toBe(true);
  expect(check(task, wrong(task))).toBe(false);
  expect(check(task, [0, 1])).toBe(false);
  expect(check(task, [0, 1, -1])).toBe(false);
});
