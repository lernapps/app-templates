// The self-assessment of an explainer ("Wie sicher bist du?"): the level a learner gives a page, one of three, kept on
// the device (@lernapps/tooling/storage) under one key as a map from each page's key <chapter>/<page> to its level, the
// same in every language tree. Nothing of it leaves the browser; a tutor gets a chapter's levels only in the address
// the learner opens it with, as the parameter stand (standOf). Read by the build (render.ts) and the client module.
import type { Site } from "./content.ts";
import type { Messages } from "./messages.ts";

/** Whether the app has the self-assessment: unless app.yaml says selfAssessment: false. */
export const selfAssessed = (site: Site): boolean => site.app.selfAssessment !== false;

/** The levels, in order: sure, partly, still to practise. */
export const LEVELS = ["sicher", "teils", "ueben"] as const;
export type Level = (typeof LEVELS)[number];

/** The message of each level: the text of its option and of its cell in the overview. */
export const LEVEL_MESSAGE = { sicher: "selfSicher", teils: "selfTeils", ueben: "selfUeben" } as const satisfies Record<
  Level,
  keyof Messages
>;

/** The level of each page that has one, by the page's key <chapter>/<page>. */
export type Levels = Readonly<Record<string, Level>>;

/** The key the levels are kept under on the device. */
export const SELF_KEY = "self-assessment";

/** The key of a page: its chapter and its id, as page ids are unique only within a chapter. */
export const pageKey = (chapter: string, page: string): string => `${chapter}/${page}`;

export const isLevel = (value: unknown): value is Level => LEVELS.includes(value as Level);

/** Whether `value` is a plain object, which the levels kept on the device are read from. */
export const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

/** The levels in a stored value: every page with a known level, nothing else; none for any other value. */
export function levelsFrom(value: unknown): Levels {
  if (!isRecord(value)) return {};
  return Object.fromEntries(Object.entries(value).filter((entry): entry is [string, Level] => isLevel(entry[1])));
}

/** The levels with `level` for the page `key`. */
export const withLevel = (levels: Levels, key: string, level: Level): Levels => ({ ...levels, [key]: level });

/**
 * The value of the tutor's parameter stand for the chapter `chapter` with the pages `pages` in order: each page with a
 * level as <page>:<level>, joined by commas, e.g. "laplace:teils,baumdiagramm:sicher"; empty when none has one.
 */
export function standOf(levels: Levels, chapter: string, pages: readonly string[]): string {
  return pages
    .flatMap((page) => {
      const level = levels[pageKey(chapter, page)];
      return level === undefined ? [] : [`${page}:${level}`];
    })
    .join(",");
}
