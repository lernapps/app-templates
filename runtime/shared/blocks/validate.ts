// What the schema cannot say about blocks that show content, at build time: a figure is drawn or an image, not both
// and not neither; a bundled image exists; every text is complete in the declared languages and holds what its kind
// allows (plain text without raw HTML, restricted Markdown, a formula, a name, the source of a credit). The place of a
// problem is a path below the blocks: [2, "caption", "en"] for the English caption of the third block.
import type { Text } from "../languages.ts";
import { checkText, type TextFinding, type TextKind } from "../text/check.ts";
import type { MaterialBlock } from "./block.ts";

/** The definition of each type of block in the schema of the blocks (blocks.v1.schema.json). */
export const MATERIAL_DEFINITIONS: Readonly<Record<MaterialBlock["type"], string>> = {
  text: "textBlock",
  formula: "formula",
  figure: "figure",
  "labelled-figure": "labelledFigure",
  table: "table",
  quote: "quote",
  code: "code",
};

/** A problem in blocks: where in them (a path), in which language, in Markdown on which line below the first, and what. */
export interface BlockProblem {
  path: (string | number)[];
  lang?: string;
  line?: number;
  message: string;
}

/** A link to a page of the app in a text of a block. */
export interface BlockLink {
  path: (string | number)[];
  lang: string;
  href: string;
}

/** What the checks need to know about the app. */
export interface BlockChecks {
  /** The languages of the app, German first; ["de"] while German is the only one. */
  languages: readonly string[];
  /** Where the app declares its languages, for the message about a language it does not declare. */
  declaredIn?: string;
  /** Whether the bundled image `image` (images/<name>) is a file in src/images/ of the app. */
  imageExists(image: string): boolean;
  /**
   * What to do with a link to a page of the app in a caption or a text: the page that holds the blocks resolves it
   * later. Without it such a link is a problem, as an app without pages (a quiz) has none.
   */
  onLink?(link: BlockLink): void;
}

/** What the checks need to know about the app beyond its languages. */
export type AppChecks = Pick<BlockChecks, "imageExists" | "onLink">;

/** The problems of `blocks`. */
export function checkMaterial(blocks: readonly MaterialBlock<Text>[], checks: BlockChecks): BlockProblem[] {
  const problems: BlockProblem[] = [];
  const text = (at: (string | number)[], value: Text | undefined, kind: TextKind) => {
    if (value === undefined) return;
    const { findings, links } = checkText(value, kind, checks.languages, checks.declaredIn);
    for (const finding of findings as TextFinding[]) problems.push({ ...finding, path: [...at, ...finding.path] });
    for (const link of links) {
      const place = [...at, ...link.path];
      if (checks.onLink !== undefined) checks.onLink({ ...link, path: place });
      else {
        problems.push({
          path: place,
          lang: link.lang,
          message: `${link.href} is a link to a page of the app; here there are no pages: link an https address`,
        });
      }
    }
  };
  blocks.forEach((block, index) => {
    const at: (string | number)[] = [index];
    switch (block.type) {
      case "text":
        text([...at, "text"], block.text, "markdown");
        break;
      case "formula":
        text([...at, "formula"], block.formula, "latex");
        break;
      case "figure":
      case "labelled-figure": {
        if (block.type === "figure" && (block.draw === undefined) === (block.image === undefined)) {
          problems.push({
            path: at,
            message:
              block.draw === undefined
                ? "draw or image is missing; a figure is drawn from data (draw) or a bundled image (image)"
                : "draw and image: a figure is either drawn from data or a bundled image",
          });
        }
        if (block.image !== undefined && !checks.imageExists(block.image)) {
          problems.push({
            path: [...at, "image"],
            message: `${block.image} is missing: put the file into src/images/`,
          });
        }
        text([...at, "alt"], block.alt, "plain");
        text([...at, "caption"], block.caption, "markdown");
        if (block.type === "labelled-figure") {
          block.labels.forEach((label, number) => text([...at, "labels", number, "text"], label.text, "plain"));
        }
        text([...at, "source"], block.source, "credit");
        break;
      }
      case "table": {
        text([...at, "caption"], block.caption, "plain");
        block.header?.forEach((cell, number) => text([...at, "header", number], cell, "markdown"));
        const columns = block.header?.length ?? block.rows[0]?.length ?? 0;
        block.rows.forEach((row, line) => {
          if (row.length !== columns) {
            problems.push({
              path: [...at, "rows", line],
              message: `${row.length} cells, but the table has ${columns} columns; give each row a cell per column`,
            });
          }
          row.forEach((_cell, number) => text([...at, "rows", line, number], row[number], "markdown"));
        });
        break;
      }
      case "quote":
        text([...at, "text"], block.text, "markdown");
        text([...at, "origin", "author"], block.origin.author, "name");
        text([...at, "origin", "work"], block.origin.work, "name");
        if (typeof block.origin.year !== "number") text([...at, "origin", "year"], block.origin.year, "plain");
        text([...at, "source"], block.source, "credit");
        break;
      case "code":
        text([...at, "caption"], block.caption, "plain");
        break;
    }
  });
  return problems;
}
