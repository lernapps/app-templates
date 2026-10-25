// Learner texts in several languages, shared by the archetypes' runtimes (the explainer, the quiz): a text is a string while German is the app's only language, else a map of texts
// by language, { de: …, en: … }, complete in every declared language and in no other. German is always first.

/**
 * The languages the runtime has texts for, German first. Every registry of the runtime's own texts has one entry per
 * language (its type says so), so adding a language is complete when the compiler is.
 */
export const LANGUAGES = ["de", "en"] as const;
export type Language = (typeof LANGUAGES)[number];

export const isLanguage = (lang: string): lang is Language => (LANGUAGES as readonly string[]).includes(lang);

const LOCALES = { de: "de-DE", en: "en-GB" } as const satisfies Readonly<Record<Language, string>>;
/** The locale for numbers and dates in `lang`; German's for a language the runtime has no texts for. */
export const localeOf = (lang: string): string => LOCALES[isLanguage(lang) ? lang : "de"];

/** The entry of `registry` for `lang`; German's for a language the runtime has no texts for. */
export const textsIn = <T>(registry: Readonly<Record<Language, T>>, lang: string): T =>
  registry[isLanguage(lang) ? lang : "de"];

/** A learner text: a string while German is the only language, else a map of texts by language. */
export type Text = string | Readonly<Record<string, string>>;

/** A problem with the languages of one text, in `lang`. */
export interface LanguageProblem {
  lang: string;
  message: string;
}

/** The text in one language; `keyed` when it comes from a map (its place is then <path>.<lang>). */
export interface TextIn {
  lang: string;
  text: string;
  keyed: boolean;
}

/** The text in `lang`; a plain string is the same in every language. */
export function inLanguage(text: Text, lang: string): string {
  return typeof text === "string" ? text : (text[lang] ?? text["de"] ?? "");
}

/**
 * The text in each of the app's `languages` that it has, and the problems of its languages: a translation missing,
 * a language not declared (in `declaredIn`, the file with the app's languages). A plain string is German, and complete
 * only while German is the only language; with `neutral` (a formula, a code), a plain string is the same in every
 * language.
 */
export function textLanguages(
  value: Text,
  languages: readonly string[],
  neutral = false,
  declaredIn = "src/app.yaml",
): { texts: TextIn[]; problems: LanguageProblem[] } {
  if (typeof value === "string") {
    if (neutral) return { texts: languages.map((lang) => ({ lang, text: value, keyed: false })), problems: [] };
    const map = `{ ${languages.map((code) => `${code}: …`).join(", ")} }`;
    return {
      texts: [{ lang: "de", text: value, keyed: false }],
      problems: languages
        .slice(1)
        .map((lang) => ({ lang, message: `the translation is missing; write the text as a map: ${map}` })),
    };
  }
  const problems: LanguageProblem[] = [
    ...Object.keys(value)
      .filter((lang) => !languages.includes(lang))
      .map((lang) => ({
        lang,
        message: `${lang} is not a language of the app; declare it in languages in ${declaredIn}, or remove it`,
      })),
    ...languages.filter((lang) => !(lang in value)).map((lang) => ({ lang, message: "the translation is missing" })),
  ];
  return {
    texts: languages.filter((lang) => lang in value).map((lang) => ({ lang, text: value[lang] ?? "", keyed: true })),
    problems,
  };
}

/** What is wrong with an app's list of languages: German first, each once, each one the runtime has texts for. */
export function languageListProblems(languages: readonly string[], supported: readonly string[]): LanguageProblem[] {
  const problems: LanguageProblem[] = [];
  if (languages[0] !== "de")
    problems.push({ lang: languages[0] ?? "", message: "German comes first: languages: [de, …]" });
  languages.forEach((lang, index) => {
    if (languages.indexOf(lang) !== index) problems.push({ lang, message: `${lang} is listed twice` });
    else if (!supported.includes(lang)) {
      problems.push({
        lang,
        message: `the runtime has no texts of its own in ${lang} yet; it has ${supported.join(", ")}`,
      });
    }
  });
  return problems;
}
