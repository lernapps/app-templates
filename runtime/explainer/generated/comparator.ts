// How the comparator of a generated exercise maps the answer onto the answer kinds of a question.
import { Fraction } from "../fraction.ts";
import { type Text } from "../../shared/languages.ts";
import { type Compare, type Literal } from "./types.ts";

type Kind =
  | { kind: "number"; decimals: number; tolerance: Fraction; unit?: Text; money: boolean }
  | { kind: "choice"; options: readonly Literal[] | string }
  | { kind: "order" }
  | { kind: "set"; options: readonly Literal[] | string }
  | { kind: "pairs"; left?: string; right?: string };

/** What the comparator of an exercise is. */
export function kindOf(compare: Compare): Kind {
  if (compare === "number") return { kind: "number", decimals: 2, tolerance: Fraction.of(0), money: false };
  if (compare === "order") return { kind: "order" };
  if (compare === "pairs") return { kind: "pairs" };
  if ("number" in compare) {
    const { format = "decimal", decimals, tolerance = 0, unit } = compare.number;
    const places = decimals ?? (format === "integer" ? 0 : 2);
    const shown = unit ?? (format === "money" ? "€" : format === "percent" ? "%" : undefined);
    return {
      kind: "number",
      decimals: places,
      tolerance: Fraction.from(tolerance),
      money: format === "money",
      ...(shown === undefined ? {} : { unit: shown }),
    };
  }
  if ("choice" in compare) return { kind: "choice", options: compare.choice };
  if ("set" in compare) return { kind: "set", options: compare.set };
  return { kind: "pairs", left: compare.pairs.left, right: compare.pairs.right };
}
