// A matching question about a figure to label takes its pairs from the labelled figure of its material (pairsFrom:
// material): each marker with its text, written once, in the figure. The checks say what is wrong, in the place of the
// question; the solution lists the pairs, as the figure itself shows no legend.
import { describe, expect, test } from "vite-plus/test";
import { questionIn, type Question } from "../runtime/shared/questions/question.ts";
import { renderQuestion, renderSolution } from "../runtime/shared/questions/render.ts";
import { validateQuestion } from "../runtime/shared/questions/validate.ts";

const app = { imageExists: () => true };
const labels = (texts: readonly unknown[], markers: readonly string[] = ["A", "B"]) =>
  texts.map((text, index) => ({ marker: markers[index], x: 10 + 40 * index, y: 20, text }));

const question = (
  extra: Record<string, unknown> = {},
  material: Record<string, unknown> = {},
): Record<string, unknown> => ({
  id: "klammern",
  type: "matching",
  text: "Welcher Begriff gehört zu welcher Klammer?",
  material: [
    {
      type: "labelled-figure",
      image: "images/klammern.svg",
      alt: "Ein Feld. A die Klammer unten, B die Klammer oben.",
      caption: "Beschrifte A und B.",
      source: "eigene Zeichnung",
      licence: "CC0-1.0",
      legend: false,
      labels: labels(["Grundwert", "Prozentwert"]),
      ...material,
    },
  ],
  pairsFrom: "material",
  explanation: "Die untere Klammer zeigt das Ganze.",
  links: [{ title: "Prozentrechnung (Wikipedia)", url: "https://de.wikipedia.org/wiki/Prozentrechnung" }],
  ...extra,
});

const problems = (value: unknown, languages = ["de"]) =>
  validateQuestion(value, "questions[0]", languages, undefined, app);

describe("a matching question with pairsFrom: material", () => {
  test("is valid and has the figure's markers on the left, its texts on the right", () => {
    expect(problems(question())).toEqual([]);
    const pairs = (questionIn(question() as unknown as Question<string>, "de") as { pairs: unknown }).pairs;
    expect(pairs).toEqual([
      { left: "A", right: "Grundwert" },
      { left: "B", right: "Prozentwert" },
    ]);
  });

  test("without markers the pairs lead with the numbers of the labels", () => {
    const bare = question(
      {},
      {
        labels: [
          { x: 1, y: 2, text: "Grundwert" },
          { x: 3, y: 4, text: "Prozentwert" },
        ],
      },
    );
    expect((questionIn(bare as unknown as Question<string>, "de") as { pairs: unknown }).pairs).toEqual([
      { left: "1", right: "Grundwert" },
      { left: "2", right: "Prozentwert" },
    ]);
  });

  test("in two languages the markers are the same, the texts are each language's", () => {
    const both = question(
      {},
      {
        labels: labels([
          { de: "Grundwert", en: "base" },
          { de: "Prozentwert", en: "part" },
        ]),
      },
    );
    both["text"] = { de: "Welcher Begriff?", en: "Which term?" };
    both["explanation"] = { de: "Die untere.", en: "The lower." };
    both["links"] = [
      {
        title: { de: "Prozent", en: "Percentage" },
        url: { de: "https://de.wikipedia.org/wiki/Prozentrechnung", en: "https://en.wikipedia.org/wiki/Percentage" },
      },
    ];
    const material = both["material"] as Record<string, unknown>[];
    Object.assign(material[0] ?? {}, {
      alt: { de: "Ein Feld. A unten, B oben.", en: "A grid. A below, B above." },
      caption: { de: "Beschrifte.", en: "Label it." },
      source: { de: "eigene Zeichnung", en: "own drawing" },
    });
    expect(problems(both, ["de", "en"])).toEqual([]);
    const pairs = (questionIn(both as unknown as Question<never>, "en") as { pairs: unknown }).pairs;
    expect(pairs).toEqual([
      { left: "A", right: "base" },
      { left: "B", right: "part" },
    ]);
  });

  test("the question shows the figure without legend, and the solution lists the pairs", () => {
    const item = questionIn(question() as unknown as Question<string>, "de");
    expect(renderQuestion(item)).toContain("<select");
    expect(renderSolution(item)).toContain("A – Grundwert; B – Prozentwert");
  });

  test("pairs and pairsFrom together are a problem", () => {
    expect(
      problems(
        question({
          pairs: [
            { left: "A", right: "x" },
            { left: "B", right: "y" },
          ],
        }),
      ),
    ).toEqual([
      'questions[0] (question "klammern"): pairs and pairsFrom: write the pairs, or take them from the material, not both',
    ]);
  });

  test("neither pairs nor pairsFrom is a problem", () => {
    const { pairsFrom: _from, ...without } = question();
    expect(problems(without)).toEqual([
      'questions[0] (question "klammern"): pairs is missing; write the pairs, or take them from the labelled figure of the material with pairsFrom: material',
    ]);
  });

  test("a material without a labelled figure is a problem", () => {
    expect(problems(question({ material: [{ type: "text", text: "Ein Text." }] }))).toEqual([
      'questions[0] (question "klammern"): the material has no labelled figure; add one, or write the pairs',
    ]);
  });

  test("a figure with its legend gives the answers away: a problem", () => {
    expect(problems(question({}, { legend: true }))).toEqual([
      'questions[0].material[0].legend (question "klammern"): the legend of the figure lists the answers before the question is answered; write legend: false, the solution shows them',
    ]);
  });

  test("a figure with one label is too few pairs", () => {
    expect(problems(question({}, { labels: labels(["Grundwert"]), alt: "Ein Feld. A die Klammer." }))).toEqual([
      'questions[0] (question "klammern"): the figure has 1 labels; a matching question takes 2 to 8 pairs',
    ]);
  });

  test("the same text on two labels is a problem of the right entries", () => {
    expect(problems(question({}, { labels: labels(["Grundwert", "Grundwert"]) }))).toEqual([
      'questions[0] (question "klammern"): the right entry "Grundwert" appears twice',
    ]);
  });
});
