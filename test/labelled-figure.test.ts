// The labelled figure: the markers of the material (A to E, else the numbers 1 to 5) and a figure that leaves out the
// legend, so that it does not give away the labels. A page without the new fields renders as before; the checks of the
// markers and of the alt text without a legend are in explainer-broken.test.ts, in the block's own line.
import { cpSync, mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, test } from "vite-plus/test";
import { Ajv2020 } from "ajv/dist/2020.js";
import { loadSite } from "../runtime/explainer/load.ts";
import { contentLines } from "../runtime/explainer/tutor.ts";
import type { Block } from "../runtime/explainer/content.ts";
import { renderMaterial } from "../runtime/shared/blocks/render.ts";
import type { MaterialBlock } from "../runtime/shared/blocks/block.ts";
import blocksSchema from "../runtime/shared/blocks/blocks.v1.schema.json" with { type: "json" };
import textSchema from "../runtime/shared/text/text.v1.schema.json" with { type: "json" };

const ALT =
  "Grundriss einer Synagoge. A Toraschrein an der Ostwand, B zwei Menoren daneben, C das Ewige Licht vor dem Schrein, D das Lesepult in der Mitte, E die Frauenemporen an den Seiten.";
const TEXTS = ["Toraschrein", "Menora", "Ewiges Licht", "Lesepult (Bima)", "Frauenempore"];
const positions = [
  [50, 8],
  [25, 9],
  [50, 16],
  [50, 50],
  [10, 50],
] as const;

const figure = (extra: Record<string, unknown>, markers?: readonly string[]): MaterialBlock<string> =>
  ({
    type: "labelled-figure",
    image: "images/synagoge.svg",
    alt: ALT,
    caption: "Beschrifte A bis E.",
    source: "eigene Zeichnung",
    licence: "CC-BY-4.0",
    ...extra,
    labels: TEXTS.map((text, index) => ({
      ...(markers === undefined ? {} : { marker: markers[index] }),
      x: positions[index]?.[0],
      y: positions[index]?.[1],
      text,
    })),
  }) as MaterialBlock<string>;

const render = (block: MaterialBlock<string>) => renderMaterial([block], { lang: "de", href: (image) => image });

describe("the markers and the legend of a labelled figure", () => {
  test("the markers of the material and no legend: the letters on the image, no list of texts, alt as given", () => {
    const html = render(figure({ legend: false }, ["A", "B", "C", "D", "E"]));
    expect([...html.matchAll(/<span class="block-marker"[^>]*>([^<]*)<\/span>/g)].map((match) => match[1])).toEqual([
      "A",
      "B",
      "C",
      "D",
      "E",
    ]);
    expect(html).not.toContain("block-legend");
    expect(html).not.toContain("<li>");
    expect(html).toContain(`alt="${ALT}"`);
  });

  test("without marker and legend: the numbers and the legend, byte for byte as before", () => {
    expect(render(figure({}))).toBe(
      [
        `<figure class="block-figure block-labelled">`,
        `<div class="block-labelled-image"><img src="images/synagoge.svg" alt="${ALT}" loading="lazy" decoding="async">`,
        ...positions.map(
          ([x, y], index) =>
            `<span class="block-marker" style="left: ${x}%; top: ${y}%" aria-hidden="true">${index + 1}</span>`,
        ),
        `</div>`,
        `<ol class="block-legend">${TEXTS.map((text) => `<li>${text}</li>`).join("")}</ol>`,
        `<figcaption><p>Beschrifte A bis E.</p> <span class="block-credit">Quelle: eigene Zeichnung. Lizenz: CC-BY-4.0.</span></figcaption>`,
        `</figure>`,
      ].join(""),
    );
  });

  test("a marker is text: markup in it is escaped", () => {
    expect(render(figure({}, ["<b>", "B", "C", "D", "E"]))).toContain("&lt;b&gt;</span>");
  });
});

describe("the schema of a labelled figure", () => {
  const ajv = new Ajv2020({ allErrors: true, strict: true, allowUnionTypes: true });
  ajv.addSchema(textSchema);
  ajv.addSchema(blocksSchema);
  const valid = ajv.compile({ $ref: "urn:lernapps:schema:blocks.v1#/$defs/labelledFigure" });

  test("takes markers of 1 to 3 characters and legend: false", () => {
    expect(valid(figure({ legend: false }, ["A", "B", "C", "1a", "E12"]))).toBe(true);
  });

  test("a marker of 4 characters is an error", () => {
    expect(valid(figure({}, ["AB12", "B", "C", "D", "E"]))).toBe(false);
    expect(valid.errors?.map((error) => `${error.instancePath} ${error.keyword}`)).toContain(
      "/labels/0/marker maxLength",
    );
  });

  test("an empty marker is an error", () => {
    expect(valid(figure({}, ["", "B", "C", "D", "E"]))).toBe(false);
  });
});

describe("what a tutor reads of a labelled figure", () => {
  const root = mkdtempSync(join(tmpdir(), "labelled-figure-"));
  cpSync(join(import.meta.dirname, "fixtures", "explainer-all-blocks"), join(root, "src"), { recursive: true });
  const site = loadSite(root, 0);
  const lines = (block: MaterialBlock<string>) =>
    contentLines(
      site,
      [block as Block],
      "de",
      (text) => text,
      (title) => title,
    ).join("\n");

  test("without a legend: the markers with their texts, as with one", () => {
    expect(lines(figure({ legend: false }, ["A", "B", "C", "D", "E"]))).toContain(
      "A Toraschrein, B Menora, C Ewiges Licht, D Lesepult (Bima), E Frauenempore",
    );
  });

  test("without markers: the numbers", () => {
    expect(lines(figure({}))).toContain("1 Toraschrein, 2 Menora, 3 Ewiges Licht, 4 Lesepult (Bima), 5 Frauenempore");
  });
});
