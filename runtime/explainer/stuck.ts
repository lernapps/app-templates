// "Hilfe" ("Warum?" after a wrong answer), way B to the tutor (explainer.ts): the learner is stuck at one task. The app
// sends nothing and reports nothing back, so what the tutor needs to help with exactly this task goes into lines the
// learner sends with the click, in the learner's voice: the exercise and its task number, the last wrong input with
// the tries, the message the app showed for it word for word (so that the tutor starts from what the learner was
// told, and does not repeat it), the hint or the solution opened, and the page's tutor page with the position
// (position.ts, taskQuery), which holds the task and the guide (tutorpage.ts). Without a chat (B1) one sentence names
// the tutor page and the task, as the prompt of a new chat; on a page a tutor opened (von=tutor, B2) the learner
// pastes the lines into the running chat, the tutor page last. Pure and without Node: the client module calls it.
import { message } from "./messages.ts";
import type { TaskState } from "./result.ts";

/** What the lines of one task say. */
export interface Stuck {
  /** The exercise's id. */
  exercise: string;
  /** The task number, for an exercise with numbers. */
  number?: number;
  state: TaskState;
  /** The page's tutor page with the position, absolute. */
  tutor: string;
}

/** The exercise and its task number, in `lang`: "prozentwert-ueben, Nr. 27". */
const taskOf = (stuck: Stuck, lang: string) => ({
  exercise: stuck.exercise,
  number: stuck.number === undefined ? "" : message(lang, "resultNumber", { n: String(stuck.number) }),
});

/** What the learner did and was told, in `lang`. */
function stateLines(state: TaskState, lang: string): string[] {
  const tries =
    state.attempts === 1 ? message(lang, "resultTry") : message(lang, "resultTries", { n: String(state.attempts) });
  const lines: string[] = [];
  if (state.rightAt !== undefined) lines.push(message(lang, "stuckRight", { n: String(state.rightAt) }));
  else if (state.input !== undefined) lines.push(message(lang, "stuckInput", { input: state.input, tries }));
  else if (state.attempts > 0) lines.push(message(lang, "stuckTries", { tries }));
  if (state.rightAt === undefined && state.message !== undefined) {
    lines.push(message(lang, "stuckMessage", { message: state.message.replace(/\s+/g, " ").trim() }));
  }
  if (state.hint === true) lines.push(message(lang, "stuckHint"));
  if (state.revealed) lines.push(message(lang, "stuckSolution"));
  return lines;
}

/** The lines for a running chat (B2), in `lang`: the task, what the learner did and was told, the tutor page. */
export const stuckLines = (stuck: Stuck, lang: string): string =>
  [
    message(lang, "stuckTask", taskOf(stuck, lang)),
    ...stateLines(stuck.state, lang),
    `${message(lang, "resultTutor")} ${stuck.tutor}`,
  ].join("\n");

/** The prompt of a new chat (B1), in `lang`: the tutor page and the task in one sentence, then the lines. */
export const stuckPrompt = (stuck: Stuck, lang: string): string =>
  [message(lang, "stuckAsk", { url: stuck.tutor, ...taskOf(stuck, lang) }), ...stateLines(stuck.state, lang)].join(
    "\n",
  );
