import { expect, test } from "vite-plus/test";
import { check, describe, generate, mistakes, reason, solution, wrong } from "./ProzentFeld.ts";

const props = {
  task: "Das Feld hat {G} Kästchen. Färbe {p} % davon.",
  mistakes: ["{p} Kästchen sind {p} % von 100.", "Das ist der Rest."],
};

test("p % of the field is right; p squares and the rest are wrong", () => {
  for (let seed = 1; seed <= 50; seed++) {
    const task = generate(seed, props);
    expect([20, 25, 40, 50]).toContain(task.G);
    expect(Number.isInteger((task.G * task.p) / 100)).toBe(true);
    expect(check(task, solution(task))).toBe(true);
    expect(check(task, wrong(task))).toBe(false);
    for (const answer of mistakes(task)) if (answer !== undefined) expect(check(task, answer)).toBe(false);
    expect(new Set(mistakes(task)).size).toBe(2);
  }
});

test("describe fills in the task; each typical mistake gets its message", () => {
  const task = { G: 20, p: 15 };
  expect(describe(task, props, "de")).toEqual({
    task: "Das Feld hat 20 Kästchen. Färbe 15 % davon.",
    solution: "3 Kästchen: 20 · 15 : 100 = 3",
  });
  expect(reason(task, 15, props)).toBe("15 Kästchen sind 15 % von 100.");
  expect(reason(task, 17, props)).toBe("Das ist der Rest.");
  expect(reason(task, 4, props)).toBeUndefined();
});
