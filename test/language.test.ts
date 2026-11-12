// The check of a language task (runtime/explainer/language.ts): variants and gaps as written, what is no mistake, the
// classes of mistakes of form and how the task counts them (strict by default), and the typical mistakes.
import { readFileSync } from "node:fs";
import { describe, expect, test } from "vite-plus/test";
import { keepWithGaps } from "../runtime/explainer/language-task.ts";
import {
  check,
  checkUnit,
  combined,
  gapsOf,
  languageTaskProblems,
  normalize,
  piecesOf,
  shownText,
  solutionOf,
  SyntaxProblem,
  unitsOf,
  variantsOf,
  wholeVariants,
} from "../runtime/explainer/language.ts";

describe("variants and gaps as written", () => {
  test("a group with | is a choice, one without is text, an empty alternative leaves a word out", () => {
    expect(variantsOf("Je (m'appelle|suis) Marie.")).toEqual(["Je m'appelle Marie.", "Je suis Marie."]);
    expect(variantsOf("Né en (1990).")).toEqual(["Né en (1990)."]);
    expect(variantsOf("C'est (très |)bien.")).toEqual(["C'est très bien.", "C'est bien."]);
  });

  test("an unclosed, nested or stray bracket is a syntax problem", () => {
    expect(() => variantsOf("Je (suis")).toThrow(SyntaxProblem);
    expect(() => variantsOf("(a|(b|c))")).toThrow(SyntaxProblem);
    expect(() => variantsOf("a) b")).toThrow(SyntaxProblem);
    expect(() => piecesOf("Je [suis")).toThrow(SyntaxProblem);
    expect(() => piecesOf("Je [] Marie")).toThrow(SyntaxProblem);
    expect(() => piecesOf("Je suis] Marie")).toThrow(SyntaxProblem);
  });

  test("more than 64 variants is a syntax problem", () => {
    expect(() => variantsOf("(a|b)(a|b)(a|b)(a|b)(a|b)(a|b)(a|b)")).toThrow(SyntaxProblem);
  });

  test("gaps: their variants, the text shown, and the whole answer", () => {
    const text = "Je [m'appelle|suis] Marie, j'[ai] douze ans.";
    expect(gapsOf(text)).toEqual([["m'appelle", "suis"], ["ai"]]);
    expect(shownText(text)).toBe("Je … Marie, j'… douze ans.");
    expect(shownText(text, (index) => `{${index}}`)).toBe("Je {0} Marie, j'{1} douze ans.");
    expect(wholeVariants(text)).toEqual(["Je m'appelle Marie, j'ai douze ans.", "Je suis Marie, j'ai douze ans."]);
  });
});

describe("what is no mistake", () => {
  test("spaces, typographic apostrophes and quotes, French spaces before punctuation", () => {
    expect(normalize("  Je  m’appelle Marie . ")).toBe(normalize("Je m'appelle Marie."));
    expect(normalize("Ça va ?")).toBe(normalize("Ça va?"));
    expect(normalize("Il dit « bonjour ».")).toBe(normalize('Il dit "bonjour".'));
    expect(normalize("élève")).toBe("élève");
  });

  test("right as written, and an empty input is wrong", () => {
    expect(check("Je m’appelle Marie.", ["Je m'appelle Marie."], "fr").state).toBe("richtig");
    expect(check("   ", ["oui"], "fr").state).toBe("falsch");
  });
});

describe("the classes of mistakes of form", () => {
  const answer = ["L'élève est peut-être à l'école."];

  test("strict by default: each class is wrong, and named with the learner's words", () => {
    expect(check("l'élève est peut-être à l'école.", answer, "fr")).toEqual({
      state: "falsch",
      classes: ["case"],
      words: ["l'élève"],
    });
    expect(check("L'eleve est peut-être à l'école.", answer, "fr")).toEqual({
      state: "falsch",
      classes: ["accents"],
      words: ["L'eleve"],
    });
    expect(check("L'élève est peut être à l'école.", answer, "fr").classes).toEqual(["hyphen"]);
    expect(check("L'élève est peut-être à lécole.", answer, "fr").classes).toEqual(["apostrophe"]);
    expect(check("L élève est peut-être à l'école.", answer, "fr").classes).toEqual(["apostrophe"]);
    expect(check("L'élève est peut-être à l'école", answer, "fr").classes).toEqual(["punctuation"]);
  });

  test("the task counts each class: ok is right without a word, hint right with one, partly partly right", () => {
    const form = { case: "ok", accents: "partly", punctuation: "hint" } as const;
    expect(check("l'élève est peut-être à l'école.", answer, "fr", form)).toEqual({
      state: "richtig",
      classes: [],
      words: [],
    });
    expect(check("L'élève est peut-être à l'école", answer, "fr", form)).toMatchObject({
      state: "richtig",
      classes: ["punctuation"],
    });
    expect(check("L'eleve est peut-être à l'école.", answer, "fr", form)).toMatchObject({
      state: "teilweise",
      classes: ["accents"],
    });
    // two classes: the stricter counts
    expect(check("l'eleve est peut-être à l'école", answer, "fr", form)).toMatchObject({
      state: "teilweise",
      classes: ["case", "accents", "punctuation"],
    });
    // a class the task does not loosen is still wrong
    expect(check("L'élève est peut être à l'école.", answer, "fr", form).state).toBe("falsch");
  });

  test("œ is a matter of accents; a word that differs otherwise is wrong without a class", () => {
    expect(check("le coeur", ["le cœur"], "fr").classes).toEqual(["accents"]);
    expect(check("le chat", ["le chien"], "fr")).toEqual({ state: "falsch", classes: [], words: [] });
  });
});

describe("variants and typical mistakes", () => {
  test("any variant is right", () => {
    const allowed = variantsOf("Je (m'appelle|suis) Marie.");
    expect(check("Je suis Marie.", allowed, "fr").state).toBe("richtig");
  });

  test("a typical mistake is wrong with its index, even when only its form differs", () => {
    const verdict = check("Je appelle Marie.", ["Je m'appelle Marie."], "fr", {}, ["Je appelle Marie."]);
    expect(verdict).toEqual({ state: "falsch", classes: [], words: [], mistake: 0 });
    expect(check("je  appelle Marie", ["Je m'appelle Marie."], "fr", {}, ["(Je|je) appelle Marie."]).mistake).toBe(
      undefined,
    );
    expect(check("je appelle Marie.", ["Je m'appelle Marie."], "fr", {}, ["(Je|je) appelle Marie."]).mistake).toBe(0);
  });
});

describe("several parts together", () => {
  test("all right, none right, or partly", () => {
    expect(combined(["richtig", "richtig"])).toBe("richtig");
    expect(combined(["falsch", "falsch"])).toBe("falsch");
    expect(combined(["richtig", "falsch"])).toBe("teilweise");
    expect(combined(["teilweise"])).toBe("teilweise");
    // a row of a table without a gap asks nothing
    expect(combined([])).toBe("richtig");
  });
});

describe("what the build reports about a language task", () => {
  const base = { type: "language-task", id: "t", languages: { source: "de", target: "fr" } } as const;
  const messages = (task: Parameters<typeof languageTaskProblems>[0]) =>
    languageTaskProblems(task).map((problem) => `${problem.path.join(".")}: ${problem.message}`);

  test("a sound task has no problem", () => {
    expect(
      messages({
        ...base,
        items: [
          {
            source: "Ich heiße Paul.",
            target: "Je (m'appelle|suis) Paul.",
            mistakes: [{ answer: "Je appelle Paul.", message: "m'" }],
            examples: { accepted: ["Je suis Paul."], rejected: ["je suis Paul."] },
          },
        ],
      }),
    ).toEqual([]);
  });

  test("the same language twice, a missing answer, no or two things to start from", () => {
    expect(
      messages({
        type: "language-task",
        id: "t",
        languages: { source: "fr", target: "fr" },
        items: [{ source: "Ich" }, { target: "je" }, { source: "ich", cue: "je", target: "je" }],
      }),
    ).toEqual([
      "languages.target: the target language is the source language; name the language learners learn",
      "items.0: target is missing: it is what the learner writes (direction to-target)",
      "items.1: give exactly one thing to start from: source (a translation), cue (a form to build), marker (a label of the figure) or audio (a file of src/audio/)",
      "items.2: give exactly one thing to start from: source (a translation), cue (a form to build), marker (a label of the figure) or audio (a file of src/audio/)",
    ]);
  });

  test("gaps: needed in gap and choice, never in what the learner reads; distractors per gap, none right", () => {
    expect(messages({ ...base, mode: "gap", items: [{ source: "[Ich]", target: "je" }] })).toEqual([
      "items.0.source: source is what the learner reads; gaps [ ] belong to target",
      "items.0.target: a task of mode gap needs a gap [ … ] in each item's target",
    ]);
    expect(
      messages({
        ...base,
        mode: "choice",
        items: [{ source: "Das Brot", target: "[Le] pain", distractors: [["La", "Le"]] }],
      }),
    ).toEqual(["items.0.distractors.0.1: Le is a right answer of the gap, not a distractor"]);
    expect(messages({ ...base, mode: "choice", items: [{ source: "Das Brot", target: "[Le] pain" }] })).toEqual([
      "items.0.distractors: give the distractors of each gap: 1 list, one per gap in order",
    ]);
  });

  test("a marker names a label of a labelled figure without legend in the material", () => {
    const figure = {
      type: "labelled-figure",
      legend: false,
      labels: [{ marker: "A" }, { marker: "B" }],
    };
    expect(messages({ ...base, material: [figure], items: [{ marker: "C", target: "le pain" }] })).toEqual([
      "items.0.marker: C is no marker of the labelled figure in material; its markers are A, B",
    ]);
    expect(messages({ ...base, items: [{ marker: "A", target: "le pain" }] })).toEqual([
      "items.0.marker: A names no marker: add a labelled figure with legend: false to material",
    ]);
  });

  test("a table: rows as long as the first, a header as wide, at least one gap", () => {
    expect(messages({ ...base, mode: "table", table: { header: ["a"], rows: [["je", "suis"], ["tu"]] } })).toEqual([
      "table.rows.1: has 1 cells; every row has 2, as the first",
      "table.header: names 1 columns; the rows have 2",
      "table.rows: the table has no gap [ … ]; mark the forms the learner writes",
    ]);
  });

  test("a mistake that counts as right, and examples the check judges otherwise", () => {
    expect(
      messages({
        ...base,
        form: { case: "hint" },
        items: [
          {
            source: "Ich",
            target: "Je",
            mistakes: [{ answer: "je", message: "…" }],
            examples: { accepted: ["Jee"], rejected: ["JE"] },
          },
        ],
      }),
    ).toEqual([
      "items.0.mistakes.0.answer: je counts as right; a typical mistake must be wrong",
      "items.0.examples.accepted.0: the check takes Jee as wrong, but it is listed as accepted; add it as a variant or loosen form, else move it to rejected",
      "items.0.examples.rejected.0: the check takes JE as right, but it is listed as rejected; make form stricter or the answer narrower, else move it to accepted",
    ]);
  });
});

describe("the units of a task", () => {
  test("a gap task checks each gap; a choice offers the answer and its distractors in order", () => {
    const [unit] = unitsOf({
      type: "language-task",
      id: "t",
      languages: { source: "de", target: "fr" },
      mode: "choice",
      items: [{ source: "Das Brot", target: "[Le] pain", distractors: [["La", "L'"]] }],
    });
    expect(unit?.slots).toEqual([{ allowed: ["Le"], mistakes: [], options: ["L'", "La", "Le"] }]);
    expect(checkUnit(unit!, ["Le"], "fr").state).toBe("richtig");
    expect(checkUnit(unit!, ["le"], "fr").state).toBe("falsch");
  });

  test("a choice that is a typical mistake says so, as a gap does (#151)", () => {
    const [unit] = unitsOf({
      type: "language-task",
      id: "t",
      languages: { source: "de", target: "fr" },
      mode: "choice",
      items: [
        {
          source: "die Bluse",
          target: "le ch[e]misier",
          distractors: [["u", "au"]],
          mistakes: [{ answer: "u", message: "Im Französischen schreibt man hier e." }],
        },
      ],
    });
    expect(checkUnit(unit!, ["u"], "fr").verdicts).toEqual([{ state: "falsch", classes: [], words: [], mistake: 0 }]);
    expect(checkUnit(unit!, ["au"], "fr").verdicts).toEqual([{ state: "falsch", classes: [], words: [] }]);
    expect(checkUnit(unit!, ["e"], "fr").verdicts).toEqual([{ state: "richtig", classes: [], words: [] }]);
  });

  test("a row of a table: a slot per gap, its solution with every cell", () => {
    const units = unitsOf({
      type: "language-task",
      id: "t",
      languages: { source: "de", target: "fr" },
      mode: "table",
      table: {
        rows: [
          ["je", "suis"],
          ["tu", "[es]"],
        ],
      },
    });
    expect(units.map((unit) => unit.slots.length)).toEqual([0, 1]);
    expect(units.map(solutionOf)).toEqual(["je · suis", "tu · es"]);
  });

  test("to-source: the learner writes the source, starting from the target", () => {
    const [unit] = unitsOf({
      type: "language-task",
      id: "t",
      languages: { source: "de", target: "fr" },
      direction: "to-source",
      items: [{ source: "Ich (heiße|bin) Paul.", target: "Je (m'appelle|suis) Paul." }],
    });
    expect(unit?.prompt).toEqual({ kind: "text", text: "Je m'appelle Paul.", lang: "fr" });
    expect(unit?.slots[0]?.allowed).toEqual(["Ich heiße Paul.", "Ich bin Paul."]);
  });
});

describe("the table of a language task fits at 360 px (#151)", () => {
  const css = readFileSync(new URL("../runtime/explainer/explainer.css", import.meta.url), "utf8");
  const rule = (selector: string) => {
    const start = css.indexOf(`\n${selector} {`);
    expect(start, `a rule for ${selector}`).toBeGreaterThan(-1);
    return css.slice(start, css.indexOf("}", start));
  };

  test("the table is as wide as the text and does not scroll sideways", () => {
    const table = rule(".explainer-language-table");
    expect(table).toContain("width: 100%");
    expect(table).not.toMatch(/overflow-x|display: block/);
  });

  test("its fields take the width of their cell, not that of the longest answer", () => {
    const field = rule(".explainer-language-table .explainer-language-field");
    expect(field).toContain("width: 100%");
    expect(field).toContain("box-sizing: border-box");
  });
});

describe("the text of a gap task as pieces (language-task.ts)", () => {
  test("the word before a gap and the full stop behind it go with the gap", () => {
    expect(keepWithGaps(["Je ", 0, " de ", 1, "."])).toEqual([
      { gap: 0, word: "Je ", after: "" },
      { text: " " },
      { gap: 1, word: "de ", after: "." },
    ]);
  });

  test("the rest of a word after an apostrophe goes with its gap, and the part before it", () => {
    expect(keepWithGaps(["Je bois ", 0, "eau."])).toEqual([{ text: "Je " }, { gap: 0, word: "bois ", after: "eau." }]);
    expect(keepWithGaps(["l'", 0, "eau"])).toEqual([{ gap: 0, word: "l'", after: "eau" }]);
  });

  test("a gap at the start or next to another gap has nothing to take", () => {
    expect(keepWithGaps([0, " est ", 1])).toEqual([
      { gap: 0, word: "", after: "" },
      { text: " " },
      { gap: 1, word: "est ", after: "" },
    ]);
    expect(keepWithGaps([0, 1])).toEqual([
      { gap: 0, word: "", after: "" },
      { gap: 1, word: "", after: "" },
    ]);
  });

  test("a text without gaps is one piece", () => {
    expect(keepWithGaps(["Je suis de Berlin."])).toEqual([{ text: "Je suis de Berlin." }]);
  });
});
