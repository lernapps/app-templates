// Fractions in the feedback of an exercise, in the browser. The feedback of an exercise component and the messages of the
// typical mistakes of a generated exercise are made when the learner answers, so the build cannot render their formulas,
// and Temml stays out of the page (architecture.test.ts). This renders the small part of $…$ that such feedback needs:
// numbers, letters, + − = < >, \cdot \times \div, parentheses and \frac{…}{…} (not within another), as the MathML Temml gives for the same
// formula. Anything else is a problem the build reports; the browser then shows the text as written.
import { escape } from "../html.ts";

const OPERATORS: Readonly<Record<string, string>> = {
  "+": "+",
  "-": "−",
  "=": "=",
  "<": "<",
  ">": ">",
  "(": "(",
  ")": ")",
  "\\cdot": "·",
  "\\times": "×",
  "\\div": "÷",
  "\\%": "%",
};

/** What the formula may use, for the message of a problem. */
const ALLOWED =
  "numbers (also 0{,}5), letters, + - = < > ( ), \\cdot, \\times, \\div, \\% and \\frac{…}{…} (not within another)";

class Unsupported extends Error {}

/** The MathML elements of `tex` from `at` up to the end or, inside braces, the closing brace. */
function parse(tex: string, start: number, inBraces: boolean, inFraction = false): { html: string[]; end: number } {
  const html: string[] = [];
  let at = start;
  while (at < tex.length) {
    const rest = tex.slice(at);
    const char = tex[at] ?? "";
    if (char === "}") {
      if (!inBraces) throw new Unsupported("a closing brace without an opening one");
      return { html, end: at };
    }
    let match: RegExpExecArray | null;
    if (/\s/.test(char)) {
      at++;
    } else if ((match = /^\d+(?:\{,\}\d+)?/.exec(rest))) {
      html.push(`<mn>${match[0].replace("{,}", ",")}</mn>`);
      at += match[0].length;
    } else if (/^[A-Za-z]/.test(rest)) {
      html.push(`<mi>${char}</mi>`);
      at++;
    } else if ((match = /^\\frac(?![A-Za-z])/.exec(rest))) {
      if (inFraction) throw new Unsupported("a fraction inside a fraction");
      at += match[0].length;
      const parts: string[] = [];
      for (let part = 0; part < 2; part++) {
        while (/\s/.test(tex[at] ?? "")) at++;
        if (tex[at] !== "{") throw new Unsupported("\\frac needs two arguments in braces: \\frac{…}{…}");
        const inner = parse(tex, at + 1, true, true);
        if (tex[inner.end] !== "}") throw new Unsupported("a brace is not closed");
        if (inner.html.length === 0) throw new Unsupported("\\frac has an empty numerator or denominator");
        parts.push(group(inner.html));
        at = inner.end + 1;
      }
      html.push(`<mfrac>${parts.join("")}</mfrac>`);
    } else {
      const command = /^\\(?:[A-Za-z]+|.)/.exec(rest)?.[0] ?? char;
      const operator = OPERATORS[command];
      if (operator === undefined) throw new Unsupported(`${command} is not supported`);
      html.push(`<mo>${operator}</mo>`);
      at += command.length;
    }
  }
  if (inBraces) throw new Unsupported("a brace is not closed");
  return { html, end: at };
}

/** One element for the elements of a part: as they are, or in an <mrow>. */
const group = (html: string[]): string => (html.length === 1 ? (html[0] ?? "") : `<mrow>${html.join("")}</mrow>`);

/** The formula `tex` as a <math> element; throws when it is outside the part this renders. */
function formula(tex: string): string {
  const { html } = parse(tex, 0, false);
  if (html.length === 0) throw new Unsupported("the formula is empty");
  return `<math>${group(html)}</math>`;
}

const FORMULA = /\$((?:\\.|[^\\$\n])+?)\$/g;

/** A plain text as HTML in which $…$ is a formula as far as this renders it; the rest, and any other $…$, stays text. */
export function fractionHtml(text: string): string {
  let html = "";
  let from = 0;
  for (const match of text.matchAll(FORMULA)) {
    let shown: string;
    try {
      shown = formula(match[1] ?? "");
    } catch (error) {
      if (!(error instanceof Unsupported)) throw error;
      continue;
    }
    html += escape(text.slice(from, match.index)) + shown;
    from = match.index + match[0].length;
  }
  return html + escape(text.slice(from));
}

/** What is wrong with the formulas $…$ of a feedback text; none when each is in the part this renders. */
export function fractionProblems(text: string): string[] {
  return [...text.matchAll(FORMULA)].flatMap((match) => {
    try {
      formula(match[1] ?? "");
      return [];
    } catch (error) {
      if (!(error instanceof Unsupported)) throw error;
      return [`$${match[1]}$: ${error.message}; feedback may use only ${ALLOWED}`];
    }
  });
}
