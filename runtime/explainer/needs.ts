// The needs a learner can choose for the tutor (dec-tutor-needs): ways the tutor talks that help some learners, named
// by what helps, never by a diagnosis. The learner chooses none, one or several on the start page, and with
// `andere-muttersprache` their first language; the choice is kept on the device as a setting for every explainer or
// for this app only (@lernapps/tooling/storage, createSettings). The ways to the tutor that start a chat name the needs
// in the query of the tutor page (position.ts, `bedarf=`), and the start prompt adds the first language in the
// learner's voice; the tutor page holds a short section for each need (tutorpage.ts). Pure and without Node: the
// client module and the build call it.

/** The needs, in the order the start page shows them; their ids are a contract with every tutor. */
export const NEEDS = [
  "kurze-schritte",
  "wenig-lesen",
  "mehr-tiefe",
  "andere-muttersprache",
  "klar-und-woertlich",
  "rechnen-anschaulich",
] as const;

export type Need = (typeof NEEDS)[number];

/** The need whose choice also asks for the learner's first language. */
export const OTHER_LANGUAGE: Need = "andere-muttersprache";

/** The key of the choice among the learner's settings, for every explainer or for one app. */
export const NEEDS_KEY = "tutor-bedarf";

/** What the learner chose: the needs, and their first language (a language tag) with `andere-muttersprache`. */
export interface NeedsChoice {
  needs: Need[];
  language?: string;
}

const isNeed = (value: unknown): value is Need => NEEDS.some((need) => need === value);

/** Whether a stored value is a choice of needs. */
export function isNeedsChoice(value: unknown): value is NeedsChoice {
  if (typeof value !== "object" || value === null) return false;
  const { needs, language } = value as Record<string, unknown>;
  return Array.isArray(needs) && needs.every(isNeed) && (language === undefined || typeof language === "string");
}

/**
 * The first languages the start page offers, as language tags: the most common first languages of children in
 * German schools besides German, and German Sign Language (`gsg`).
 */
export const LANGUAGES: readonly string[] = [
  "ar",
  "bg",
  "bs",
  "en",
  "fa",
  "fr",
  "gsg",
  "el",
  "it",
  "hr",
  "ku",
  "pl",
  "ps",
  "pt",
  "ro",
  "ru",
  "so",
  "sq",
  "sr",
  "es",
  "ti",
  "tr",
  "uk",
  "vi",
  "zh",
];

/** The names of the languages Intl does not know, in each language of the explainer. */
const OWN_NAMES: Readonly<Record<string, Readonly<Record<string, string>>>> = {
  de: { gsg: "Deutsche Gebärdensprache" },
  en: { gsg: "German Sign Language" },
};

/** The name of the language `tag` in `lang`, "Türkisch" for `tr` in German; the tag itself if none is known. */
export function languageName(tag: string, lang: string): string {
  const own = OWN_NAMES[lang]?.[tag] ?? OWN_NAMES["de"]?.[tag];
  if (own !== undefined) return own;
  try {
    const name = new Intl.DisplayNames([lang], { type: "language", fallback: "none" }).of(tag);
    return name === undefined ? tag : name.charAt(0).toLocaleUpperCase(lang) + name.slice(1);
  } catch {
    return tag;
  }
}

/** The query parameter of the needs, `bedarf=kurze-schritte,mehr-tiefe` in the order of NEEDS; "" for none. */
export function needsParameter(choice: NeedsChoice | undefined): string {
  const needs = NEEDS.filter((need) => choice?.needs.includes(need));
  return needs.length === 0 ? "" : `bedarf=${needs.join(",")}`;
}

/** The query `query` (with its "?" or "") with the needs of `choice` added. */
export function withNeeds(query: string, choice: NeedsChoice | undefined): string {
  const needs = needsParameter(choice);
  if (needs === "") return query;
  return query === "" ? `?${needs}` : `${query}&${needs}`;
}

const FIRST_LANGUAGE: Readonly<Record<string, string>> = {
  de: "Meine Muttersprache ist {language}.",
  en: "My first language is {language}.",
};

/**
 * The sentence the start prompt adds in the learner's voice when they chose `andere-muttersprache` with a language,
 * in `lang`: "Meine Muttersprache ist Türkisch."; "" otherwise.
 */
export function languageSentence(choice: NeedsChoice | undefined, lang: string): string {
  if (choice?.language === undefined || !choice.needs.includes(OTHER_LANGUAGE)) return "";
  const text = FIRST_LANGUAGE[lang] ?? FIRST_LANGUAGE["de"] ?? "";
  return text.replace("{language}", languageName(choice.language, lang));
}

/** A prompt that starts a chat, with the sentence of the learner's first language after it when they chose one. */
export const withLanguage = (prompt: string, choice: NeedsChoice | undefined, lang: string): string =>
  [prompt, languageSentence(choice, lang)].filter((part) => part !== "").join("\n");
