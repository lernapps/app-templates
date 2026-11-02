// The text alternative of a formula, for a name a screen reader or the accessibility check can read where the page has
// only MathML (an option of a choice whose text is a formula, see the label of its radio): Speech Rule Engine speaks
// the MathML of the formula in the page's language. Build time only; the engine loads its rules for every language
// of the runtime once, here, so that speaking a formula in any of them is then synchronous.
// @ts-expect-error speech-rule-engine ships no types; the part this file uses is typed below (drop this line if it does)
import untyped from "speech-rule-engine";
import { isLanguage, LANGUAGES } from "../languages.ts";
import { renderFormula } from "./formula.ts";
import { FORMULA } from "./markdown.ts";

/** The part of Speech Rule Engine that this file uses. */
interface Engine {
  /** Loads the rules of the locale; once loaded, switching to it takes effect at once. */
  setupEngine(setup: { locale: string; domain: string; modality: string }): Promise<void>;
  /** The words of a MathML string, in the locale set up last. */
  toSpeech(mathml: string): string;
}
const SRE: Engine = untyped;

const SPEECH = { domain: "clearspeak", modality: "speech" } as const;

for (const locale of LANGUAGES) await SRE.setupEngine({ locale, ...SPEECH });

/** The formula `tex` as words in `lang` (German for a language the runtime has no texts for), e.g. "2 hoch 7". */
export function speakFormula(tex: string, lang: string): string {
  // the rules of every language are loaded: switching to one takes effect at once
  void SRE.setupEngine({ locale: isLanguage(lang) ? lang : "de", ...SPEECH });
  return SRE.toSpeech(renderFormula(tex, false)).replace(/\s+/g, " ").trim();
}

/**
 * The words of a text that is only formulas, $…$ (and space); undefined for any other text, which has words of its own
 * for a name to be made of.
 */
export function formulaAlternative(text: string, lang: string): string | undefined {
  const formulas = [...text.matchAll(FORMULA)];
  if (formulas.length === 0 || text.replace(FORMULA, "").trim() !== "") return undefined;
  return formulas.map((formula) => speakFormula(formula[1] ?? "", lang)).join(" ");
}
