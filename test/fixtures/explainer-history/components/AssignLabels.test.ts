import { expect, test } from "vite-plus/test";
import { check, describe, generate, reason, solution, wrong } from "./AssignLabels.ts";

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

test("describe states the task's choices in its order and the solution, in the props' language", () => {
  const task = generate(1, props);
  const described = describe(task, { ...props, question: "Welcher Stand?", level: "Stufe" }, "de");
  expect(described.task).toContain(task.order.map((label) => props.parts[label]).join("; "));
  expect(described.solution).toBe("Stufe 1: die Geistlichen; Stufe 2: der Adel; Stufe 3: alle anderen");
});

test("reason gives the message of a typical mistake, and none for another wrong answer", () => {
  const task = generate(1, props);
  const reasons = ["umgedreht", "zweimal"];
  expect(reason(task, [2, 1, 0], { ...props, reasons }, "de")).toBe("umgedreht");
  expect(reason(task, [0, 0, 2], { ...props, reasons }, "de")).toBe("zweimal");
  expect(reason(task, [1, 0, 2], { ...props, reasons }, "de")).toBeUndefined();
});
