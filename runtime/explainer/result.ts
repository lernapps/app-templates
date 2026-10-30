// The result line that "Zurück" copies on a page a tutor opened (explainer.ts). The app sends nothing and reports
// nothing back: the tutor learns only what the learner writes into the chat, so the button puts the line on the
// clipboard for the learner to paste there. It names the page, the exercise and its task number, how far the learner
// got with it ("richtig im 2. Versuch", "Lösung angesehen", "noch nicht gelöst (1 Versuch, Eingabe 3/20)"), the count
// of the session on this page, and the absolute address of the page's tutor page with the position (position.ts),
// which holds the task (tutorpage.ts): a chat assistant fetches only addresses its user wrote into the conversation,
// so the learner brings it. The solution is never in the line, as the learner reads it while pasting. Pure and
// without Node: the client module calls it.
import { rightEntries, type Answer, type Question } from "../shared/questions/question.ts";
import { message } from "./messages.ts";

/**
 * How far the learner got with one task: the tries, the try that was right, the solution viewed, the last wrong input
 * with the message the app showed for it, word for word, and whether the learner opened the hint.
 */
export interface TaskState {
  attempts: number;
  rightAt?: number;
  revealed: boolean;
  input?: string;
  message?: string;
  hint?: boolean;
  /** For an open task not all right: how many of its points the learner ticked, of how many, and the missed ones (P1). */
  points?: { ticked: number; total: number; missed: string };
}

/** The count of the session: the tasks answered right, of all the learner answered or looked up. */
export interface Session {
  right: number;
  total: number;
}

const key = (id: string, n: number | undefined) => (n === undefined ? id : `${id}=${n}`);

/**
 * What the learner did on this page, by task (an exercise and its task number), kept in memory only: the page stores
 * nothing, so the session is this visit of the page, which a tutor's link opens in a tab of its own.
 */
export class Progress {
  readonly #tasks = new Map<string, TaskState>();
  readonly #listeners: ((id: string) => void)[] = [];
  #last: string | undefined;

  /** Calls `listener` with the exercise's id whenever the state of one of its tasks changes. */
  listen(listener: (id: string) => void): void {
    this.#listeners.push(listener);
  }

  #set(id: string, n: number | undefined, state: TaskState): void {
    this.#tasks.set(key(id, n), state);
    for (const listener of this.#listeners) listener(id);
  }

  /**
   * A complete answer to the task number `n` of the exercise `id` (none for an exercise without numbers): the input as
   * text, and the message the app showed for a wrong one, word for word.
   */
  answered(id: string, n: number | undefined, right: boolean, input?: string, message?: string): void {
    this.#last = id;
    const state = this.state(id, n);
    // once the task is right or its solution shown, nothing after counts
    if (state.rightAt !== undefined || state.revealed) return;
    const attempts = state.attempts + 1;
    const { input: _input, message: _message, ...rest } = state;
    this.#set(id, n, {
      ...rest,
      attempts,
      ...(right ? { rightAt: attempts } : {}),
      ...(right || input === undefined ? {} : { input }),
      ...(right || message === undefined || message === "" ? {} : { message }),
    });
  }

  /**
   * The open task `id` as the learner compared it: `ticked` of `total` points, the `missed` ones named (P2, P4), the
   * answer as text (or that it is a photo). `attempt`: a new comparing, which counts as a try; a changed tick changes
   * the same try. Its model answer shows once compared.
   */
  compared(id: string, ticked: number, total: number, missed: string, input: string, attempt = true): void {
    this.#last = id;
    const state = this.state(id, undefined);
    const attempts = attempt ? state.attempts + 1 : Math.max(state.attempts, 1);
    const { points: _points, input: _input, rightAt: _rightAt, ...rest } = state;
    this.#set(id, undefined, {
      ...rest,
      attempts,
      revealed: true,
      ...(ticked === total ? { rightAt: attempts } : { points: { ticked, total, missed }, input }),
    });
  }

  /** The learner opened the hint of the task. */
  hinted(id: string, n: number | undefined): void {
    const state = this.state(id, n);
    if (state.hint === true) return;
    this.#set(id, n, { ...state, hint: true });
  }

  /** The solution of the task shows ("Lösung"; also after the right answer, which then stays right). */
  revealed(id: string, n: number | undefined): void {
    this.#last = id;
    const state = this.state(id, n);
    if (state.rightAt !== undefined) return;
    this.#set(id, n, { ...state, revealed: true });
  }

  /** How far the learner got with the task. */
  state(id: string, n: number | undefined): TaskState {
    return this.#tasks.get(key(id, n)) ?? { attempts: 0, revealed: false };
  }

  /** The exercise the learner answered last, if any. */
  get last(): string | undefined {
    return this.#last;
  }

  /** Each task the learner answered or looked up in this session, in the order they first did. */
  tasks(): { id: string; number?: number; state: TaskState }[] {
    return [...this.#tasks.entries()]
      .filter(([, state]) => state.attempts > 0 || state.revealed)
      .map(([key, state]) => {
        const [id = "", n] = key.split("=");
        return { id, ...(n === undefined ? {} : { number: Number(n) }), state };
      });
  }

  /** The count of the session. */
  session(): Session {
    // a hint alone does not count: the learner neither answered nor looked up the task
    const states = [...this.#tasks.values()].filter((state) => state.attempts > 0 || state.revealed);
    return { right: states.filter((state) => state.rightAt !== undefined).length, total: states.length };
  }
}

/** What one result line says. */
export interface ResultLine {
  /** The page's title. */
  page: string;
  /** The exercise's id. */
  exercise: string;
  /** The task number, for an exercise with numbers. */
  number?: number;
  state: TaskState;
  session: Session;
  /** The page's tutor page with the position, absolute. */
  tutor: string;
}

/** How far the learner got with a task, in `lang`: "richtig im 2. Versuch", "noch nicht gelöst (1 Versuch, …)". */
function statusOf(state: TaskState, lang: string): string {
  if (state.rightAt !== undefined) return message(lang, "resultRight", { n: String(state.rightAt) });
  if (state.points !== undefined) {
    const partly = message(lang, "resultPartly", {
      n: String(state.points.ticked),
      total: String(state.points.total),
      missed: state.points.missed,
    });
    return state.input === undefined ? partly : `${partly}, ${message(lang, "resultAnswer", { input: state.input })}`;
  }
  const status = message(lang, state.revealed ? "resultSolution" : "resultOpen");
  if (state.attempts === 0) return status;
  const tries =
    state.attempts === 1 ? message(lang, "resultTry") : message(lang, "resultTries", { n: String(state.attempts) });
  const input = state.input === undefined ? "" : `, ${message(lang, "resultInput", { input: state.input })}`;
  return `${status} (${tries}${input})`;
}

/**
 * What "Zurück zum Tutor" at the top or the end of a page copies, in `lang`: the page's tutor page with the page's
 * task numbers, then a line for each task the learner answered or looked up in this session (the exercise, its task
 * number, how far the learner got, the last wrong input and the app's message for it, word for word), then the count of
 * the session; a tutor loads the tutor page and coaches on exactly these tasks.
 */
export function sessionLines(
  tutor: string,
  tasks: readonly { id: string; number?: number; state: TaskState }[],
  session: Session,
  lang: string,
): string {
  if (tasks.length === 0) return message(lang, "sessionNone", { url: tutor });
  return [
    message(lang, "sessionIntro", { url: tutor }),
    ...tasks.map((task) => {
      const said =
        task.state.rightAt === undefined && task.state.message !== undefined
          ? ` ${message(lang, "stuckMessage", { message: task.state.message.replace(/\s+/g, " ").trim() })}`
          : "";
      return `- ${message(lang, "sessionTask", {
        exercise: task.id,
        number: task.number === undefined ? "" : message(lang, "resultNumber", { n: String(task.number) }),
        status: statusOf(task.state, lang),
      })}${said}`;
    }),
    message(lang, "resultSession", { right: String(session.right), total: String(session.total) }),
  ].join("\n");
}

/** The result line, two lines in `lang`: the result, and the page's tutor page. */
export function resultLine(line: ResultLine, lang: string): string {
  const first = message(lang, "resultLine", {
    page: line.page,
    exercise: line.exercise,
    number: line.number === undefined ? "" : message(lang, "resultNumber", { n: String(line.number) }),
    status: statusOf(line.state, lang),
  });
  const session =
    line.session.total === 0
      ? ""
      : ` ${message(lang, "resultSession", { right: String(line.session.right), total: String(line.session.total) })}`;
  return [`${first}${session}`, `${message(lang, "resultTutor")} ${line.tutor}`].join("\n");
}

const oneLine = (text: string) => text.replace(/\s+/g, " ").trim();

/** The learner's answer to a question as text, in `lang`: the options chosen, the number typed, the order given. */
export function answerShown(question: Question, answer: Answer, lang: string): string {
  const indices = typeof answer === "number" ? [answer] : Array.isArray(answer) ? (answer as readonly number[]) : [];
  switch (question.type) {
    case "single-choice":
    case "multiple-choice":
      return indices.map((index) => oneLine(question.options[index]?.text ?? "?")).join("; ");
    case "true-false":
      return message(lang, answer === true ? "resultTrue" : "resultFalse");
    case "number":
      return oneLine(String(answer));
    case "ordering":
      return indices
        .map((place, item) => ({ place, item }))
        .filter(({ place }) => place >= 0)
        .sort((a, b) => a.place - b.place)
        .map(({ item }) => oneLine(question.items[item] ?? "?"))
        .join(" → ");
    case "matching":
      return question.pairs
        .map((pair, index) => `${oneLine(pair.left)} → ${oneLine(rightEntries(question)[indices[index] ?? -1] ?? "?")}`)
        .join("; ");
  }
}
