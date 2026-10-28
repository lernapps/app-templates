// The blocks that show content, for every archetype that shows it with its questions or on its pages (the quiz, the
// explainer): a text in restricted Markdown, a formula, a figure (drawn from data, or a bundled image), a labelled
// figure (a bundled image with labels), a table, a quotation and program code. Their types, the blocks in one
// language, and the images they use. The checks are in validate.ts, the rendering in render.ts. A bundled image is a
// file in src/images/ of the app, named by its path from src/: images/<name>.svg (or .png, .jpg, .webp).
import { inLanguage, type Text } from "../languages.ts";
import type { CodeLanguage } from "./code.ts";

/** Where a bundled image or a quote comes from: a URL, the same in every language, or a citation, and its licence. */
export interface Credit<T extends Text = string> {
  source?: T;
  licence?: string;
}

export type Drawing = { kind: "hundred-grid"; filled: number } | { kind: "bar"; part: number; whole: number };

export interface TextBlock<T extends Text = string> {
  type: "text";
  text: T;
}

export interface FormulaBlock<T extends Text = string> {
  type: "formula";
  formula: T;
}

export type Figure<T extends Text = string> = {
  type: "figure";
  draw?: Drawing;
  image?: string;
  alt: T;
  caption: T;
} & Credit<T>;

export type LabelledFigure<T extends Text = string> = {
  type: "labelled-figure";
  image: string;
  alt: T;
  caption?: T;
  /** Whether the figure lists the texts of the labels next to the image; without it, alt names every marker. */
  legend?: boolean;
  labels: readonly { marker?: string; x: number; y: number; text: T }[];
} & Credit<T>;

/** The marker of the label at `index`: the one it names, else its number. */
export const markerOf = (label: { marker?: string }, index: number): string => label.marker ?? String(index + 1);

export interface TableBlock<T extends Text = string> {
  type: "table";
  caption: T;
  header?: readonly T[];
  rowHeaders?: boolean;
  rows: readonly (readonly T[])[];
}

export type QuoteBlock<T extends Text = string> = {
  type: "quote";
  text: T;
  origin: { author: T; work?: T; year?: number | T };
} & Credit<T>;

export interface CodeBlock<T extends Text = string> {
  type: "code";
  language: CodeLanguage;
  code: string;
  caption?: T;
}

/** A block that shows content. */
export type MaterialBlock<T extends Text = string> =
  | TextBlock<T>
  | FormulaBlock<T>
  | Figure<T>
  | LabelledFigure<T>
  | TableBlock<T>
  | QuoteBlock<T>
  | CodeBlock<T>;

/** The types of the blocks that show content. */
export const MATERIAL_TYPES: readonly MaterialBlock["type"][] = [
  "text",
  "formula",
  "figure",
  "labelled-figure",
  "table",
  "quote",
  "code",
];

/** The blocks with each text in `lang`. */
export function materialIn(blocks: readonly MaterialBlock<Text>[], lang: string): MaterialBlock[] {
  const t = (text: Text) => inLanguage(text, lang);
  const credit = (block: Credit<Text>): Credit => ({
    ...(block.source === undefined ? {} : { source: t(block.source) }),
    ...(block.licence === undefined ? {} : { licence: block.licence }),
  });
  return blocks.map((block): MaterialBlock => {
    switch (block.type) {
      case "text":
        return { type: "text", text: t(block.text) };
      case "formula":
        return { type: "formula", formula: t(block.formula) };
      case "figure":
        return {
          type: "figure",
          ...(block.draw === undefined ? {} : { draw: block.draw }),
          ...(block.image === undefined ? {} : { image: block.image }),
          alt: t(block.alt),
          caption: t(block.caption),
          ...credit(block),
        };
      case "labelled-figure":
        return {
          type: "labelled-figure",
          image: block.image,
          alt: t(block.alt),
          ...(block.caption === undefined ? {} : { caption: t(block.caption) }),
          ...(block.legend === undefined ? {} : { legend: block.legend }),
          labels: block.labels.map((label) => ({
            ...(label.marker === undefined ? {} : { marker: label.marker }),
            x: label.x,
            y: label.y,
            text: t(label.text),
          })),
          ...credit(block),
        };
      case "table":
        return {
          type: "table",
          caption: t(block.caption),
          ...(block.header === undefined ? {} : { header: block.header.map(t) }),
          ...(block.rowHeaders === undefined ? {} : { rowHeaders: block.rowHeaders }),
          rows: block.rows.map((row) => row.map(t)),
        };
      case "quote":
        return {
          type: "quote",
          text: t(block.text),
          origin: {
            author: t(block.origin.author),
            ...(block.origin.work === undefined ? {} : { work: t(block.origin.work) }),
            ...(block.origin.year === undefined
              ? {}
              : { year: typeof block.origin.year === "number" ? block.origin.year : t(block.origin.year) }),
          },
          ...credit(block),
        };
      case "code":
        return {
          type: "code",
          language: block.language,
          code: block.code,
          ...(block.caption === undefined ? {} : { caption: t(block.caption) }),
        };
    }
  });
}

/** The bundled images `blocks` use, each once, as paths from src/. */
export const materialImages = (blocks: readonly MaterialBlock<Text>[]): string[] => [
  ...new Set(blocks.flatMap((block) => ("image" in block && block.image !== undefined ? [block.image] : []))),
];
