// What a question shows besides its text: content in `material` (text, formula, figure, labelled figure, table,
// quotation, code). The fixture (test/fixtures/quiz-material) has a bank in German and English with every kind of block
// and two bundled images; the checks name what is wrong with a block, and the page shows the content between the text
// of a question and its answers, with the images found from each language's page.
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, test } from "vite-plus/test";
import { isSizeless } from "../runtime/shared/blocks/image.ts";
import { renderQuiz } from "../runtime/quiz/render.ts";
import { quizIn } from "../runtime/quiz/quiz.ts";
import { problems, readBank } from "../runtime/quiz/validate.ts";

const dir = join(import.meta.dirname, "fixtures/quiz-material");
const text = readFileSync(join(dir, "quiz.json"), "utf8");
const app = { imageExists: (image: string) => existsSync(join(dir, image)) };
const bank = () => JSON.parse(text) as { questions: Record<string, unknown>[] };
const material = (broken: ReturnType<typeof bank>, id: string) =>
  (broken.questions.find((question) => question["id"] === id)?.["material"] ?? []) as Record<string, unknown>[];

describe("the checks of the content of a question", () => {
  test("the fixture is valid", () => {
    expect(problems(bank(), app)).toEqual([]);
  });

  test("an image that is not in src/images/", () => {
    const broken = bank();
    (material(broken, "ring")[0] as { image: string }).image = "images/fehlt.svg";
    expect(problems(broken, app)).toEqual([
      'questions[0].material[0].image (question "ring"): images/fehlt.svg is missing: put the file into src/images/',
    ]);
  });

  test("without the app's files no image exists", () => {
    expect(problems(bank()).length).toBeGreaterThan(0);
  });

  test("a figure is drawn or an image, not both", () => {
    const broken = bank();
    (material(broken, "ring")[0] as Record<string, unknown>)["draw"] = { kind: "hundred-grid", filled: 3 };
    expect(problems(broken, app)).toEqual([
      'questions[0].material[0] (question "ring"): draw and image: a figure is either drawn from data or a bundled image',
    ]);
  });

  test("a figure drawn from data needs no image file", () => {
    const broken = bank();
    const figure = material(broken, "ring")[0] as Record<string, unknown>;
    delete figure["image"];
    delete figure["source"];
    delete figure["licence"];
    figure["draw"] = { kind: "bar", part: 1, whole: 4 };
    expect(problems(broken, app)).toEqual([]);
  });

  test("an image without its source and licence, a figure without alternative text, an unknown block", () => {
    const broken = bank();
    const figure = material(broken, "ring")[0] as Record<string, unknown>;
    delete figure["licence"];
    delete figure["alt"];
    material(broken, "flaeche").push({ type: "section", id: "x", title: "T", blocks: [] });
    const found = problems(broken, app).join("\n");
    expect(found).toContain("licence");
    expect(found).toContain("alt");
    expect(found).toContain("must be one of text, formula, figure");
  });

  test("raw HTML in the alternative text, and a link to a page of the app in a caption", () => {
    const broken = bank();
    const figure = material(broken, "ring")[0] as { alt: Record<string, string>; caption: Record<string, string> };
    figure.alt["de"] = "Ein <b>Kreis</b>";
    figure.caption["en"] = "See [the page](/kapitel/seite/).";
    const found = problems(broken, app);
    expect(found).toEqual([
      expect.stringContaining('questions[0].material[0].alt (de) (question "ring")'),
      expect.stringContaining(
        'questions[0].material[0].caption (en) (question "ring"): /kapitel/seite/ is a link to a page of the app',
      ),
    ]);
    expect(found[0]).toContain("raw HTML (<b>)");
  });

  test("a text of a block in one language only, in a bank in two", () => {
    const broken = bank();
    delete (material(broken, "schichten")[0] as { text: Record<string, string> }).text["en"];
    expect(problems(broken, app)).toEqual([
      expect.stringContaining('questions[2].material[0].text (en) (question "schichten")'),
    ]);
  });

  test("a table whose rows are as long as its header", () => {
    const broken = bank();
    (material(broken, "flaeche")[0] as { rows: unknown[][] }).rows[0]?.push({ de: "x", en: "x" });
    expect(problems(broken, app)).toEqual([
      expect.stringContaining(
        'questions[1].material[0].rows[0] (question "flaeche"): 3 cells, but the table has 2 columns',
      ),
    ]);
  });
});

describe("the page of a question with content", () => {
  const all = readBank(text, "src/quiz.json", app);
  const languages = ["de", "en"];
  const page = (lang: string, sizeless?: (image: string) => boolean) =>
    renderQuiz(
      { quiz: quizIn(all, lang), ...(lang === "de" ? {} : { lang }) },
      { languages, ...(sizeless === undefined ? {} : { sizeless }) },
    ).body;

  test("shows the content after the text of the question, before its answers", () => {
    const body = page("de");
    const ring = body.slice(body.indexOf('id="frage-ring"'), body.indexOf('id="frage-flaeche"'));
    expect(ring.indexOf('class="question-text"')).toBeLessThan(ring.indexOf('class="question-material"'));
    expect(ring.indexOf('class="question-material"')).toBeLessThan(ring.indexOf('class="question-option"'));
  });

  test("finds the images from each language's page", () => {
    expect(page("de")).toContain(
      '<img src="images/kreis.svg" alt="Ein blauer Kreis mit einem weißen Kreis in der Mitte" loading="lazy" decoding="async">',
    );
    expect(page("en")).toContain(
      '<img src="../images/kreis.svg" alt="A blue circle with a white circle in the middle" loading="lazy" decoding="async">',
    );
  });

  test("names the source and the licence of an image, in the language of the page", () => {
    expect(page("de")).toContain("Quelle: eigene Zeichnung. Lizenz: CC0-1.0.");
    expect(page("en")).toContain("Source: own drawing. Licence: CC0-1.0.");
  });

  test("renders each kind of block", () => {
    const body = page("de");
    expect(body).toContain('<div class="block-table"');
    expect(body).toContain('<th scope="row">a</th>');
    expect(body).toContain("<math");
    expect(body).toContain('<figure class="block-figure block-labelled">');
    expect(body).toContain('<span class="block-marker"');
    expect(body).toContain("<strong>Schichten</strong>");
    expect(body).toContain('<figure class="block-quote">');
    expect(body).toContain('<figure class="block-code">');
    expect(body).toContain("hljs");
  });

  test("an image with no size of its own fills its box", () => {
    expect(isSizeless(join(dir, "images/schnitt.svg"))).toBe(true);
    expect(isSizeless(join(dir, "images/kreis.svg"))).toBe(false);
    const body = page("de", (image) => isSizeless(join(dir, image)));
    expect(body).toContain("block-labelled-fill");
  });

  test("a question without content has none", () => {
    const [first, ...others] = quizIn(all, "de").questions;
    if (first === undefined) throw new Error("the fixture has questions");
    const { material: _material, ...bare } = first;
    const body = renderQuiz(
      { quiz: { ...quizIn(all, "de"), questions: [bare as typeof first, ...others] } },
      { languages },
    ).body;
    const ring = body.slice(body.indexOf('id="frage-ring"'), body.indexOf('id="frage-flaeche"'));
    expect(ring).not.toContain("question-material");
  });
});
