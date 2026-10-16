// What the tutor button of a page adds to the prompt (explainer.ts): the tasks the learner has in front of them. The
// address of a page holds the task number of each of its exercises (?<id>=<n>; tasks.ts); the page's tutor file
// (tutor.ts) lists every number of each exercise with its task and solution. Reduced to the numbers of the address,
// the file gives the tutor exactly the tasks on the learner's screen. Pure and without Node: the client module
// calls it.
import { numberFromAddress, RESERVED_PARAMS } from "./tasks.ts";

/** The task number of each exercise the address `href` names, by exercise id (also the legacy ?seed=<n>#<id>). */
export function numbersOf(href: string): Map<string, number> {
  const url = new URL(href);
  const numbers = new Map<string, number>();
  for (const key of url.searchParams.keys()) {
    if (RESERVED_PARAMS.includes(key)) continue;
    const n = numberFromAddress(href, key);
    if (n !== undefined) numbers.set(key, n);
  }
  const anchor = decodeURIComponent(url.hash.slice(1));
  const legacy = anchor === "" ? undefined : numberFromAddress(href, anchor);
  if (legacy !== undefined && !numbers.has(anchor)) numbers.set(anchor, legacy);
  return numbers;
}

const EXERCISE = /^### (\S+)/;
const TASK = /^ {2}- \[[^\]]*\]\(\.\/\?([^=&)#]+)=(\d+)#/;

/**
 * The page's tutor file with, of each seeded exercise, only the task whose number the address `href` names (with the
 * lines that belong to it, its typical mistakes), and its relative links made absolute, from the page's address.
 */
export function pageTutorText(file: string, href: string): string {
  const numbers = numbersOf(href);
  const page = new URL(href);
  page.search = "";
  page.hash = "";
  const out: string[] = [];
  let exercise = "";
  let keep = true;
  for (const line of file.split("\n")) {
    const heading = EXERCISE.exec(line);
    if (heading) exercise = heading[1] ?? "";
    const task = TASK.exec(line);
    if (task) keep = numbers.get(exercise) === Number(task[2]);
    else if (!/^ {4}/.test(line)) keep = true;
    if (keep) out.push(line);
  }
  return out.join("\n").replace(/\]\(\.\//g, `](${page.href}`);
}
