// Generated exercises (`generated`), without a build: the arbitraries drawn from a seed, `where`, the task and its
// placeholders, the answer mapped onto the quiz's answer kinds, the mistakes diagnosed, and the property test over
// fixed seeds with its messages.
import { describe, expect, test } from "vite-plus/test";
import {
  answerFor,
  diagnose,
  generate,
  questionFor,
  soundness,
  taskText,
  tokenize,
  type Generated,
  type Templates,
} from "../runtime/explainer/generated.ts";
import { isCorrect, rightAnswer, wrongAnswer } from "../runtime/quiz/quiz.ts";
import type { DataRecord } from "../runtime/explainer/content.ts";
import { Fraction } from "../runtime/explainer/fraction.ts";

/** The templates as the build makes them, without Markdown: the placeholders as tokens. */
function templates(spec: Generated, languages: readonly string[] = ["de"]): Templates {
  const pick = (text: unknown, lang: string) =>
    typeof text === "string" ? text : ((text as Record<string, string>)[lang] ?? "");
  return Object.fromEntries(
    languages.map((lang) => [
      lang,
      {
        task: tokenize(pick(spec.task.text, lang)),
        steps: (spec.steps ?? []).map((step) => tokenize(pick(step, lang))),
        hint: spec.hint === undefined ? undefined : tokenize(pick(spec.hint, lang)),
        messages: (spec.mistakes ?? []).map((mistake) => tokenize(pick(mistake.message, lang))),
        alt: tokenize("Ein Hunderterfeld, {{figure.filled}} Kästchen sind gefärbt."),
      },
    ]),
  ) as Templates;
}

const prozentwert: Generated = {
  type: "generated",
  id: "prozentwert-ueben",
  given: { G: { int: [150, 1500], step: 5 }, p: { oneOf: [5, 10, 12, 15, 20, 25, 30, 40] } },
  where: ["decimals(G * p / 100) <= 2"],
  task: {
    text: "Ein Fahrrad kostet {{G}} €. Im Angebot gibt es {{p}} % Rabatt. Wie viel Euro sparst du?",
    figure: { kind: "hundred-grid", filled: "p" },
  },
  answer: { value: "G * p / 100", compare: { number: { format: "money" } } },
  mistakes: [
    { value: "G * p", message: "Du hast vergessen, durch 100 zu teilen." },
    { value: "G - G * p / 100", message: "Das ist der neue Preis, nicht der Rabatt." },
  ],
  hint: "Rechne erst 1 % aus: {{G}} geteilt durch 100.",
  steps: ["$W = {{G}} \\cdot {{p}} : 100 = {{answer}}$"],
};

const ereignisse: DataRecord[] = [
  { date: "1789-05-05", title: { de: "Generalstände", en: "Estates-General" } },
  { date: "1789-06-20", title: { de: "Ballhausschwur", en: "Tennis Court Oath" } },
  { date: "1789-07-14", title: { de: "Bastille", en: "Bastille" } },
  { date: "1789-08-26", title: { de: "Menschenrechte", en: "Rights of man" } },
];

const ordnen: Generated = {
  type: "generated",
  id: "ereignisse-ordnen",
  given: { events: { pick: 3, distinct: true, from: { data: "ereignisse" } } },
  where: ["distinct(map(events, date))"],
  task: { text: { de: "Bringe die Ereignisse in die richtige Reihenfolge.", en: "Put the events in order." } },
  answer: { value: "map(sortBy(events, date), title)", compare: "order" },
  mistakes: [
    {
      value: "map(reverse(sortBy(events, date)), title)",
      message: { de: "Umgekehrt: Das früheste kommt zuerst.", en: "Reversed: the earliest comes first." },
    },
  ],
};

describe("a task from a seed", () => {
  test("the same seed gives the same task, other seeds others", () => {
    const one = generate(prozentwert, 7, {});
    expect(generate(prozentwert, 7, {})).toEqual(one);
    const texts = new Set(
      [1, 2, 3, 4, 5].map((seed) =>
        taskText(prozentwert, generate(prozentwert, seed, {}), "de", templates(prozentwert)),
      ),
    );
    expect(texts.size).toBeGreaterThan(1);
  });

  test("the values are in their ranges and where holds", () => {
    for (let seed = 1; seed <= 50; seed++) {
      const task = generate(prozentwert, seed, {});
      const G = (task.values["G"] as Fraction).toNumber();
      expect(G).toBeGreaterThanOrEqual(150);
      expect(G).toBeLessThanOrEqual(1500);
      expect(G % 5).toBe(0);
      expect((task.answer as Fraction).toNumber()).toBeLessThanOrEqual(G);
    }
  });

  test("a number answer is the quiz's number question, with its checker", () => {
    const task = generate(prozentwert, 3, {});
    const question = questionFor(prozentwert, task, "de", templates(prozentwert));
    expect(question.type).toBe("number");
    expect(isCorrect(question, rightAnswer(question))).toBe(true);
    expect(isCorrect(question, wrongAnswer(question))).toBe(false);
    expect(question.id).toBe("prozentwert-ueben-3");
    expect(taskText(prozentwert, task, "de", templates(prozentwert))).not.toMatch(/[{}⟦⟧]/);
  });

  test("a mistake is diagnosed with its message", () => {
    const task = generate(prozentwert, 3, {});
    const question = questionFor(prozentwert, task, "de", templates(prozentwert));
    const mistake = answerFor(prozentwert, task, question, 0);
    expect(isCorrect(question, mistake)).toBe(false);
    expect(diagnose(prozentwert, task, question, mistake, "de", templates(prozentwert))).toBe(
      "Du hast vergessen, durch 100 zu teilen.",
    );
    expect(diagnose(prozentwert, task, question, rightAnswer(question), "de", templates(prozentwert))).toBeUndefined();
  });

  test("an order from a data file is the quiz's ordering question, in each language", () => {
    const data = { ereignisse };
    const task = generate(ordnen, 11, data);
    const de = questionFor(ordnen, task, "de", templates(ordnen, ["de", "en"]));
    const en = questionFor(ordnen, task, "en", templates(ordnen, ["de", "en"]));
    expect(de.type).toBe("ordering");
    if (de.type !== "ordering" || en.type !== "ordering") return;
    expect(de.items).toHaveLength(3);
    expect(en.items.join()).not.toBe(de.items.join());
    const mistake = answerFor(ordnen, task, de, 0);
    expect(diagnose(ordnen, task, de, mistake, "de", templates(ordnen, ["de", "en"]))).toBe(
      "Umgekehrt: Das früheste kommt zuerst.",
    );
    expect(diagnose(ordnen, task, en, answerFor(ordnen, task, en, 0), "en", templates(ordnen, ["de", "en"]))).toBe(
      "Reversed: the earliest comes first.",
    );
  });

  test("choice, set and pairs are the quiz's single-choice, multiple-choice and matching", () => {
    const elemente: DataRecord[] = [
      { symbol: "Na", name: "Natrium", group: 1, period: 3 },
      { symbol: "Mg", name: "Magnesium", group: 2, period: 3 },
      { symbol: "Cl", name: "Chlor", group: 7, period: 3 },
      { symbol: "O", name: "Sauerstoff", group: 6, period: 2 },
    ];
    const base = { type: "generated", given: { e: { pick: 1, from: { data: "elemente" } } } } as const;
    const choice: Generated = {
      ...base,
      id: "hauptgruppe",
      where: ["e.group != e.period"],
      task: { text: "In welcher Hauptgruppe steht {{e.name}} ({{e.symbol}})?" },
      answer: { value: "e.group", compare: { choice: [1, 2, 3, 4, 5, 6, 7, 8] } },
      mistakes: [{ value: "e.period", message: "Das ist die Periode." }],
    };
    const set: Generated = {
      type: "generated",
      id: "gerade",
      given: { xs: { shuffle: [1, 2, 3, 4, 5, 6] } },
      task: { text: "Welche Zahlen sind gerade?" },
      answer: { value: "[2, 4, 6]", compare: { set: "xs" } },
    };
    const pairs: Generated = {
      type: "generated",
      id: "symbole",
      given: { es: { pick: 3, distinct: true, from: { data: "elemente" } } },
      task: { text: "Ordne jedem Element sein Symbol zu." },
      answer: { value: "es", compare: { pairs: { left: "name", right: "symbol" } } },
    };
    const data = { elemente };
    for (const [spec, type] of [
      [choice, "single-choice"],
      [set, "multiple-choice"],
      [pairs, "matching"],
    ] as const) {
      const task = generate(spec, 5, data);
      const question = questionFor(spec, task, "de", templates(spec));
      expect(question.type).toBe(type);
      expect(isCorrect(question, rightAnswer(question))).toBe(true);
      expect(isCorrect(question, wrongAnswer(question))).toBe(false);
      expect(soundness(spec, data, templates(spec), ["de"], 50)).toEqual([]);
    }
  });
});

describe("the property test over fixed seeds", () => {
  test("passes on a sound exercise", () => {
    expect(soundness(prozentwert, {}, templates(prozentwert), ["de"])).toEqual([]);
    expect(soundness(ordnen, { ereignisse }, templates(ordnen, ["de", "en"]), ["de", "en"])).toEqual([]);
  });

  test("a mistake equal to the answer", () => {
    const spec = { ...prozentwert, mistakes: [{ value: "G * p / 100 * 1", message: "Gleich." }] };
    expect(soundness(spec, {}, templates(spec), ["de"])).toEqual([
      {
        path: ["mistakes", 0, "value"],
        message: expect.stringMatching(
          /^for seed 1 the mistake equals the answer \(\d+(,\d+)?\); a mistake is a wrong answer/,
        ),
      },
    ]);
  });

  test("a where that starves", () => {
    const spec = { ...prozentwert, where: ["G == 155"] };
    expect(soundness(spec, {}, templates(spec), ["de"])).toEqual([
      {
        path: ["where"],
        message: expect.stringMatching(/^where holds in \d+ of 200 draws; it must hold in at least 1 of 10/),
      },
    ]);
  });

  test("a placeholder left in the task", () => {
    const spec = { ...prozentwert, task: { text: "Ein Rad kostet {{Q}} €. Wie viel sparst du bei {{p}} %?" } };
    expect(soundness(spec, {}, templates(spec), ["de"])).toEqual([
      {
        path: ["task", "text"],
        message: "for seed 1 the task still has the placeholder {{Q}}; declare Q in given, or remove the braces",
      },
    ]);
  });

  test("an answer outside its format", () => {
    const spec = {
      ...prozentwert,
      where: [],
      answer: { value: "G / 7", compare: { number: { format: "money" } } },
    } as Generated;
    const problems = soundness(spec, {}, templates(spec), ["de"]);
    expect(problems[0]?.path).toEqual(["answer", "value"]);
    expect(problems[0]?.message).toMatch(/has more than 2 decimals; round it in the answer, or narrow given or where/);
  });

  test("a figure that shows the answer", () => {
    const spec = {
      ...prozentwert,
      task: { ...prozentwert.task, figure: { kind: "hundred-grid", filled: "G * p / 100" } },
      where: ["decimals(G * p / 100) == 0", "G * p / 100 <= 100"],
    } as Generated;
    const t = templates(spec);
    expect(soundness(spec, {}, t, ["de"]).map((problem) => problem.path)).toContainEqual(["task", "figure"]);
  });

  test("the answer not defined", () => {
    const spec = { ...prozentwert, answer: { value: "G / (p - p)", compare: { number: {} } } } as Generated;
    expect(soundness(spec, {}, templates(spec), ["de"])).toEqual([
      { path: ["answer", "value"], message: "for seed 1 the answer is not defined: division by zero" },
    ]);
  });
});
