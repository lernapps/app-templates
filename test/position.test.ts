// Where the learner is, as the query of the page's tutor page (position.ts): the page's task numbers as its own
// address has them, the exercise the learner is at and its section.
import { describe, expect, test } from "vite-plus/test";
import { currentExercise, pageQuery, taskQuery } from "../runtime/explainer/position.ts";

describe("the learner's position in the prompts", () => {
  const page = {
    id: "reihenschaltung",
    exercises: [
      { id: "wahl", section: "regel", numbered: false },
      { id: "rr-strom", section: "uebung", numbered: true },
      { id: "rr-teilspannung", section: "uebung", numbered: true },
    ],
    sections: ["regel", "uebung"],
  };
  const at = "https://app.example/schaltungen/reihenschaltung/";

  test("the exercise the learner is at: the one answered last, else the anchor's, else the page's only one", () => {
    expect(currentExercise(`${at}?rr-strom=5&von=tutor#rr-strom`, page)?.id).toBe("rr-strom");
    expect(currentExercise(`${at}?rr-strom=5#wahl`, page, "rr-strom")?.id).toBe("rr-strom");
    expect(currentExercise(`${at}?rr-strom=5`, page)).toBeUndefined();
    expect(currentExercise(`${at}?rr-strom=7`, { ...page, exercises: page.exercises.slice(1, 2) })?.id).toBe(
      "rr-strom",
    );
  });

  test("way A: every task number of the page, in the page's order, and nothing else", () => {
    const numbers = "rr-strom=16&rr-teilspannung=7";
    expect(pageQuery(`${at}?rr-teilspannung=7&rr-strom=16&von=tutor#rr-strom`, page)).toBe(`?${numbers}`);
    expect(pageQuery(`${at}?${numbers}#wahl`, page)).toBe(`?${numbers}`);
    expect(pageQuery(`${at}?rr-teilspannung=7#uebung`, page)).toBe("?rr-teilspannung=7");
    // a page without numbers in its address
    expect(pageQuery(`${at}#regel`, page)).toBe("");
  });

  test("way B: every task number of the page, and the exercise of the button with its section", () => {
    expect(taskQuery(`${at}?rr-strom=16&rr-teilspannung=7&von=tutor#wahl`, page, "rr-teilspannung")).toBe(
      "?rr-strom=16&rr-teilspannung=7&uebung=rr-teilspannung&abschnitt=uebung",
    );
    expect(taskQuery(at, page, "wahl")).toBe("?uebung=wahl&abschnitt=regel");
  });
});
