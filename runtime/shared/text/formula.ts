// Formulas at build time: the LaTeX subset of the formula command list, checked, then rendered by Temml to MathML,
// which current browsers show and screen readers read without a script or a font. \ce{…} and \pu{…} come from
// Temml's mhchem extension, which registers itself on a global temml; it is loaded once, here.
import temml from "temml";

(globalThis as { temml?: typeof temml }).temml = temml;
const mhchem: string = "temml/contrib/mhchem/mhchem.js";
await import(mhchem);

/** The commands a formula may use (explainer.v1.schema.json, $defs/latex), besides ^, _, braces and parentheses. */
export const COMMANDS: readonly string[] = [
  "\\frac",
  "\\cdot",
  "\\times",
  "\\div",
  "\\%",
  "\\text",
  "\\sqrt",
  "\\approx",
  "\\pm",
  "\\le",
  "\\ge",
  "\\neq",
  "\\,",
  "\\{",
  "\\}",
  "\\ce",
  "\\pu",
];
const allowed = new Set(COMMANDS);

/** The commands of `tex` outside the arguments of \ce and \pu, which mhchem reads in its own notation. */
function commands(tex: string): string[] {
  const found: string[] = [];
  for (let at = 0; at < tex.length; at++) {
    if (tex[at] !== "\\") continue;
    const word = /^\\(?:[a-zA-Z]+|.)/.exec(tex.slice(at))?.[0] ?? "\\";
    found.push(word);
    at += word.length - 1;
    if ((word === "\\ce" || word === "\\pu") && tex[at + 1] === "{") {
      let depth = 0;
      for (at++; at < tex.length; at++) {
        if (tex[at] === "{") depth++;
        else if (tex[at] === "}" && --depth === 0) break;
      }
    }
  }
  return found;
}

/** What is wrong with the formula `tex`, or undefined when it is in the command list and parses. */
export function formulaProblem(tex: string): string | undefined {
  const unknown = commands(tex).find((command) => !allowed.has(command));
  if (unknown !== undefined) {
    return `${unknown} is not in the formula command list; write the formula with the commands the schema lists ($defs/latex)`;
  }
  try {
    temml.renderToString(tex, { throwOnError: true });
    return undefined;
  } catch (error) {
    const message = (error instanceof Error ? error.message : String(error)).split("\n")[0]?.trim() ?? "";
    return `the formula does not parse: ${message}`;
  }
}

/** The formula as MathML: a <math> element, on its own line when `display`. */
export function renderFormula(tex: string, display: boolean): string {
  return temml.renderToString(tex, { displayMode: display, throwOnError: true });
}
