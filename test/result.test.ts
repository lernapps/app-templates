// "Zurück" copies a result line (result.ts): the page, the exercise, its task number and how far the learner got with
// it, the last answer, the count of the session, and the absolute address of the page's tutor page with the position,
// which holds the task.
import { describe, expect, test } from "vite-plus/test";
import type { Question } from "../runtime/shared/questions/question.ts";
import { answerShown, Progress, resultLine, sessionLines } from "../runtime/explainer/result.ts";

const CHAPTER = "https://lernapps.net/mathe-karte/zufall/laplace/tutor/?laplace-zaehlen=6&uebung=laplace-zaehlen";

/** The line of the exercise laplace-zaehlen, task number 6, after `steps` on the progress. */
function line(steps: (progress: Progress) => void, lang = "de"): string {
  const progress = new Progress();
  steps(progress);
  return resultLine(
    {
      page: "Laplace-Formel",
      exercise: "laplace-zaehlen",
      number: 6,
      state: progress.state("laplace-zaehlen", 6),
      session: progress.session(),
      tutor: CHAPTER,
    },
    lang,
  );
}

describe("the result line", () => {
  test("a wrong answer: not solved yet, with the tries and the last input, the session and the tutor page", () => {
    expect(
      line((progress) => {
        progress.answered("laplace-zaehlen", 6, false, "3/20");
        progress.answered("andere", 2, true);
      }),
    ).toBe(
      [
        "Laplace-Formel, laplace-zaehlen, Nr. 6: noch nicht gelöst (1 Versuch, Eingabe 3/20). Sitzung: 1 von 2 richtig.",
        `Tutor-Seite: ${CHAPTER}`,
      ].join("\n"),
    );
  });

  test("right on the second try; what comes after the right answer does not count", () => {
    const text = line((progress) => {
      progress.answered("laplace-zaehlen", 6, false, "3/10");
      progress.answered("laplace-zaehlen", 6, true, "3/20");
      progress.answered("laplace-zaehlen", 6, false, "1");
      progress.revealed("laplace-zaehlen", 6);
    });
    expect(text).toContain("Nr. 6: richtig im 2. Versuch. Sitzung: 1 von 1 richtig.");
    // the right answer is the solution: the line does not repeat it
    expect(text).not.toContain("3/20");
  });

  test("the solution viewed, after a wrong try or without one; nothing done yet", () => {
    expect(
      line((progress) => {
        progress.answered("laplace-zaehlen", 6, false, "3/10");
        progress.revealed("laplace-zaehlen", 6);
      }),
    ).toContain("Nr. 6: Lösung angesehen (1 Versuch, Eingabe 3/10). Sitzung: 0 von 1 richtig.");
    expect(line((progress) => progress.revealed("laplace-zaehlen", 6))).toContain(
      "Nr. 6: Lösung angesehen. Sitzung: 0 von 1 richtig.",
    );
    // nothing answered: no session count either
    expect(line(() => undefined).split("\n")[0]).toBe("Laplace-Formel, laplace-zaehlen, Nr. 6: noch nicht gelöst.");
  });

  test("each task number counts on its own; the last exercise answered is known", () => {
    const progress = new Progress();
    progress.answered("laplace-zaehlen", 6, false, "1");
    progress.answered("laplace-zaehlen", 6, false, "2");
    progress.answered("laplace-zaehlen", 7, true);
    expect(progress.state("laplace-zaehlen", 6)).toEqual({ attempts: 2, revealed: false, input: "2" });
    expect(progress.state("laplace-zaehlen", 7)).toEqual({ attempts: 1, rightAt: 1, revealed: false });
    expect(progress.session()).toEqual({ right: 1, total: 2 });
    expect(progress.last).toBe("laplace-zaehlen");
    progress.answered("frage", undefined, false);
    expect(progress.last).toBe("frage");
  });

  test("the app's message belongs to the last wrong input; a hint alone counts for no session", () => {
    const progress = new Progress();
    const changed: string[] = [];
    progress.listen((id) => changed.push(id));
    progress.hinted("laplace-zaehlen", 6);
    expect(progress.session()).toEqual({ right: 0, total: 0 });
    progress.answered("laplace-zaehlen", 6, false, "3/10", "Zähl die günstigen Ergebnisse.");
    expect(progress.state("laplace-zaehlen", 6)).toEqual({
      attempts: 1,
      revealed: false,
      hint: true,
      input: "3/10",
      message: "Zähl die günstigen Ergebnisse.",
    });
    progress.answered("laplace-zaehlen", 6, true, "3/20", "");
    expect(progress.state("laplace-zaehlen", 6)).toEqual({ attempts: 2, rightAt: 2, revealed: false, hint: true });
    expect(progress.session()).toEqual({ right: 1, total: 1 });
    expect(changed, "each change is told").toEqual(["laplace-zaehlen", "laplace-zaehlen", "laplace-zaehlen"]);
  });

  test("in English; without a task number", () => {
    const progress = new Progress();
    progress.answered("frage", undefined, false, "true");
    progress.answered("frage", undefined, false, "false");
    expect(
      resultLine(
        {
          page: "Laplace",
          exercise: "frage",
          state: progress.state("frage", undefined),
          session: progress.session(),
          tutor: "https://app.example/en/k/tutor/",
        },
        "en",
      ),
    ).toBe(
      [
        "Laplace, frage: not solved yet (2 tries, input false). Session: 0 of 1 right.",
        "Tutor page: https://app.example/en/k/tutor/",
      ].join("\n"),
    );
  });
});

describe("the last answer as text", () => {
  const base = { id: "q", text: "Frage?", explanation: "", furtherReading: [] };
  test("each question type", () => {
    const single = {
      ...base,
      type: "single-choice",
      options: [
        { text: "A", correct: false, info: "" },
        { text: "B", correct: true, info: "" },
      ],
    } as unknown as Question;
    expect(answerShown(single, 1, "de")).toBe("B");
    const multiple = { ...single, type: "multiple-choice" } as unknown as Question;
    expect(answerShown(multiple, [0, 1], "de")).toBe("A; B");
    const trueFalse = { ...base, type: "true-false", answer: true } as unknown as Question;
    expect(answerShown(trueFalse, false, "de")).toBe("stimmt nicht");
    expect(answerShown(trueFalse, true, "en")).toBe("true");
    const number = { ...base, type: "number", answer: 3 } as unknown as Question;
    expect(answerShown(number, "  3,5 € ", "de")).toBe("3,5 €");
    const ordering = { ...base, type: "ordering", items: ["eins", "zwei", "drei"] } as unknown as Question;
    // the place the learner gave each item: zwei first, then drei, then eins
    expect(answerShown(ordering, [2, 0, 1], "de")).toBe("zwei → drei → eins");
    const matching = {
      ...base,
      type: "matching",
      pairs: [
        { left: "a", right: "x" },
        { left: "b", right: "y" },
      ],
    } as unknown as Question;
    expect(answerShown(matching, [1, -1], "de")).toBe("a → y; b → ?");
  });
});

describe("what Zurück zum Tutor copies", () => {
  const TUTOR = "https://lernapps.net/mathe-karte/zufall/laplace/tutor/?laplace-zaehlen=6&wuerfel=2";

  test("the tutor page with the page's task numbers, a line per task of the session, the count last", () => {
    const progress = new Progress();
    progress.answered("laplace-zaehlen", 6, false, "3/20", "Zähl die günstigen Fälle noch einmal.");
    progress.answered("wuerfel", 2, false, "1/3");
    progress.answered("wuerfel", 2, true);
    progress.hinted("andere", undefined);
    expect(sessionLines(TUTOR, progress.tasks(), progress.session(), "de").split("\n")).toEqual([
      `Ich habe auf ${TUTOR} geübt:`,
      "- laplace-zaehlen, Nr. 6: noch nicht gelöst (1 Versuch, Eingabe 3/20). Die App sagt: „Zähl die günstigen Fälle noch einmal.“",
      "- wuerfel, Nr. 2: richtig im 2. Versuch.",
      "Sitzung: 1 von 2 richtig.",
    ]);
  });

  test("nothing done yet: one line with the tutor page", () => {
    const progress = new Progress();
    expect(sessionLines(TUTOR, progress.tasks(), progress.session(), "de")).toBe(
      `Ich habe auf ${TUTOR} noch keine Aufgabe gelöst.`,
    );
  });
});
