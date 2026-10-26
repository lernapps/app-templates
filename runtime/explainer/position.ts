// Where the learner is, for the two ways to the tutor (explainer.ts): as the query of the page's tutor page, which
// the learner's message names. The tutor page holds every task of the page (tutorpage.ts), and a static host serves
// it for any query: the tutor reads the query from its own prompt. It is the page's own address, the task number of
// each of its exercises (?<id>=<n>; tasks.ts). Way A, "Mit <name> lernen", is for learning the page from its start:
// the numbers alone (pageQuery), so that the tutor leads through the page before it comes to a task. Way B, "Hilfe",
// adds the exercise whose button was pressed (uebung) and its section (abschnitt; taskQuery). Pure and without Node:
// the client module calls it.
import { numberFromAddress } from "./tasks.ts";

/** What a page tells the client module about itself for the learner's position (render.ts). */
export interface PagePosition {
  id: string;
  /** Its exercises in order, each with the anchor of its section and whether its tasks have numbers. */
  exercises: readonly { id: string; section?: string; numbered: boolean }[];
  /** The anchors of its sections. */
  sections: readonly string[];
}

type Exercise = PagePosition["exercises"][number];

/** The anchor of the address `href`, decoded. */
const anchorOf = (href: string): string => decodeURIComponent(new URL(href).hash.slice(1));

/**
 * The exercise the learner is at on the page at `href`: the one answered last, else the one the anchor names, else the
 * page's only exercise; none on a page with several and no such hint.
 */
export function currentExercise(href: string, page: PagePosition, last?: string): Exercise | undefined {
  const anchor = anchorOf(href);
  const byId = (id: string | undefined) => page.exercises.find((exercise) => exercise.id === id);
  return byId(last) ?? byId(anchor) ?? (page.exercises.length === 1 ? page.exercises[0] : undefined);
}

/**
 * The query of the page's tutor page: the task number the address `href` holds of each exercise with numbers, in the
 * page's order, then the exercise `exercise` and the section `section`, each if any; "" for none of them.
 */
function tutorQuery(
  href: string,
  page: PagePosition,
  exercise: Exercise | undefined,
  section: string | undefined,
): string {
  const query = new URLSearchParams();
  for (const candidate of page.exercises) {
    const n = candidate.numbered ? numberFromAddress(href, candidate.id) : undefined;
    if (n !== undefined) query.set(candidate.id, String(n));
  }
  if (exercise !== undefined) query.set("uebung", exercise.id);
  if (section !== undefined) query.set("abschnitt", section);
  const text = query.toString();
  return text === "" ? "" : `?${text}`;
}

/** Way A: the task numbers the address `href` holds of the page's exercises, for learning the page. */
export const pageQuery = (href: string, page: PagePosition): string => tutorQuery(href, page, undefined, undefined);

/** Way B: the page's task numbers at `href`, and the exercise `id` with its section. */
export function taskQuery(href: string, page: PagePosition, id: string): string {
  const exercise = page.exercises.find((candidate) => candidate.id === id);
  return tutorQuery(href, page, exercise ?? { id, numbered: false }, exercise?.section);
}
