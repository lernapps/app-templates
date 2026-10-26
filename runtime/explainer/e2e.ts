// The end-to-end tests of every explainer (@lernapps/app-templates/explainer/e2e), run by `lernapps check --pre-push`
// on the built app with the app's own content. An app's e2e/explainer.e2e.ts is
//
//   import { explainerTests } from "@lernapps/app-templates/explainer/e2e";
//   explainerTests();
//
// What they expect comes from the content in src/ (outline.ts), not from the rendered pages. Without JavaScript, for
// every page in every language: the heading levels follow the nesting (page h1, section h2, subsection h3, a box one
// below its place), every section heading is visible, the number of <math> elements is the number of formulas in the
// content, every figure is visible with its accessible name, every link to an anchor finds it, and the page has its
// language, its alternates in the other languages, a language switch and the archetype marker. Previous and next
// form one chain over all pages, in the order of the lists. Every exercise shows its text in the page's language, and
// every "Lösung" opens and shows the answer the checker accepts. With JavaScript, in German, one exercise of each type
// per page, whose solution shows only once it is answered: a question of the question types accepts its right answer
// and then shows its solution; it rejects a wrong one with the most specific reason it has, stays open for another
// try, and shows its solution on "Lösung zeigen"; the feedback each time in view with the focus. A generated exercise
// shows, at its deep link ?seed=<n>#<id>, the task of number n (the seed of its table of distinct tasks), its worked tasks hidden;
// it rejects a wrong one (a mistake, with its message), shows its solution on "Lösung zeigen",
// "Neue Aufgabe" changes the task, and the new task accepts its right answer. Each component hydrates without a
// console error, folds a nojs text it keeps, and an exercise component's answered gives the feedback, once for each
// answer, with the reason of a wrong one, in view with the focus; at its address ?<id>=<n> it shows "Aufgabe
// Nr. n" and gets the seed of task number n from its table, and "Neue Aufgabe", the arrow beside the number, moves to
// the next number in the address and on the page.
// Without JavaScript, each component's nojs text is visible and not empty, an exercise component's with its task of
// number 1 and the solution folded, and its island hidden. For a tutor: the start page switches an assistant on for
// every page and off again; a content page has "Mit einem KI-Tutor lernen" folded under its title while none is on, and
// once one is, a bar whose button (way A) names the page's tutor page with the page's task numbers alone, which
// answers, or copies that prompt with the tutor page's Markdown; "Keiner" on the start page
// takes the bar and the help away. Way B: the help button
// in the row of "Prüfen" and "Lösung" of a generated exercise, there only while a tutor is on, "Hilfe" before the first
// input and "Warum?" after a wrong one, opens the assistant with one sentence that names the tutor page with the
// page's task numbers and the task, then the wrong input with its try and the app's message word for word, the
// address answering; before the first input with the sentence alone; on a page a tutor opened it copies the task, the
// lines and the tutor page and opens nothing, and once the solution shows it is "Zurück", which copies the result
// line. "Zurück zum Tutor" on a page a tutor opened copies the result line of a generated exercise and of an exercise
// component, with the task number, the try and the input, and the tutor page with the task, which answers.
// No page stores anything on the device. The tests run in parallel, with reduced motion; the preset runs
// them at desktop width and at 360 px; `lernapps check` adds axe and the width on the pages it visits.
import { expect, test, type APIRequestContext, type Locator, type Page } from "playwright/test";
import {
  missesRight,
  questionId,
  rightAnswer,
  wrongAnswer,
  wrongReasons,
  type Answer,
  type Question,
} from "../shared/questions/question.ts";
import { answerQuestion, expectFeedbackInView, expectMaterial } from "../shared/questions/e2e.ts";
import { questionMessagesIn } from "../shared/questions/render.ts";
import { answerShown } from "./result.ts";
import { answerFor, diagnose, questionFor, taskKey } from "./generated/question.ts";
import { fill, plainText, taskText } from "./generated/texts.ts";
import { generate } from "./generated/values.ts";
import { taskSeeds } from "./exercises.ts";
import { message as messageOf } from "./messages.ts";
import { nextTaskNumber, taskNumber } from "./tasks.ts";
import { outline, type ComponentOutline, type ExerciseOutline, type PageOutline } from "./outline.ts";

/** The task number of the deep link the tests open a generated exercise with. */
const SEED = 7;

/**
 * Every exercise of the page shows its text, and each "Lösung" opens and shows the accepted answer: read in one go,
 * before and after a click on each "Lösung".
 */
async function expectExercises(page: Page, item: PageOutline): Promise<void> {
  if (item.exercises.length === 0) return;
  const main = page.locator("main");
  const expected = item.exercises.map((exercise) =>
    exercise.kind === "question"
      ? { id: exercise.id, texts: [exercise.question.text], answers: [exercise.answers] }
      : {
          id: exercise.id,
          texts: exercise.worked.map((worked) => worked.task),
          answers: exercise.worked.map((worked) => [worked.answer]),
        },
  );
  const read = () =>
    main.locator(".explainer-exercise").evaluateAll((elements) =>
      elements.map((element) => {
        const fold = (text: string | null) => (text ?? "").replace(/\s+/g, " ").trim();
        const own = element.classList.contains("explainer-question")
          ? [...element.querySelectorAll("legend")]
          : [...element.querySelectorAll(".explainer-worked-task > .explainer-task")];
        const solutions = [...element.querySelectorAll<HTMLDetailsElement>("details.explainer-solution")];
        return {
          id: element.id,
          texts: own.map((text) => fold(text.textContent)),
          // what a learner sees of each "Lösung": nothing while it is closed
          shown: solutions.map((details) => (details.open ? fold((details as HTMLElement).innerText) : "")),
        };
      }),
    );
  const before = await read();
  expect(
    before.map(({ id, texts }) => ({ id, texts })),
    `${item.url}: each exercise with its text`,
  ).toEqual(expected.map(({ id, texts }) => ({ id, texts })));
  // a click on each summary, as a learner opens a <details> (its own behaviour, no script of the page)
  await main
    .locator(".explainer-exercise details.explainer-solution > summary")
    .evaluateAll((summaries) => summaries.forEach((summary) => (summary as HTMLElement).click()));
  const after = await read();
  for (const [index, exercise] of expected.entries()) {
    exercise.answers.forEach((answers, at) => {
      for (const answer of answers) {
        expect(
          after[index]?.shown[at] ?? "",
          `${item.url}: ${exercise.id}, Lösung ${at + 1} shows ${answer}`,
        ).toContain(answer);
      }
    });
  }
}

/** Without JavaScript: each component's nojs text is visible, not empty and as in the content; its island is hidden. */
async function expectNojs(page: Page, item: PageOutline): Promise<void> {
  if (item.components.length === 0) return;
  const components = page.locator("main .explainer-component");
  await expect(components, `${item.url}: one island per component`).toHaveCount(item.components.length);
  for (const [index, component] of item.components.entries()) {
    const element = components.nth(index);
    const nojs = element.locator(":scope > .explainer-nojs");
    await expect(nojs, `${item.url}: the nojs text of ${component.name}`).toBeVisible();
    expect((await nojs.innerText()).trim(), `${item.url}: the nojs text of ${component.name}`).not.toBe("");
    if (component.nojs !== "") await expect(nojs).toContainText(component.nojs);
    if (component.exercise) {
      // the task of number 1, as the component's describe states it, with its solution folded
      await expect(nojs.locator(".explainer-task-number"), `${item.url}: ${component.name}, task 1`).toHaveText(
        messageOf(item.lang, "taskNumber", { n: "1" }),
      );
      await expect(nojs.locator("details.explainer-solution")).not.toHaveAttribute("open");
    }
    await expect(element.locator(":scope > .explainer-island")).toBeHidden();
    await expect(element.locator(":scope > .explainer-task-controls")).toBeHidden();
  }
}

/** With JavaScript: each component hydrates without a console error; an exercise's answered gives the feedback. */
async function checkComponents(page: Page, item: PageOutline): Promise<void> {
  const errors: string[] = [];
  page.on("console", (message) => {
    if (message.type() === "error") errors.push(message.text());
  });
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto(`./${item.url}`);
  const components = page.locator("main .explainer-component");
  for (const [index, component] of item.components.entries()) {
    const element = components.nth(index);
    await expect(element, `${item.url}: ${component.name} hydrates`).toHaveAttribute("data-hydrated", "");
    await expect(element.locator(":scope > .explainer-island")).toBeVisible();
    const nojs = element.locator(":scope > .explainer-nojs");
    if (component.caption) {
      // the nojs text stays as a text description, folded: its summary shows, one click opens it
      const details = nojs.locator(":scope > details");
      await expect(details.locator(":scope > summary"), "the nojs text folds").toHaveText(
        messageOf("de", "textDescription"),
      );
      await expect(details).not.toHaveAttribute("open");
    } else await expect(nojs, "the component replaces its nojs text").toBeHidden();
    if (!component.exercise) continue;
    // its own buttons in its row .question-actions ("Prüfen") look like those of the questions: filled with the
    // accent and at least 44 px high
    const own = element.locator(":scope > .explainer-island .question-actions button:not(.explainer-help)");
    for (const button of await own.all()) {
      const look = await button.evaluate((node) => {
        const style = getComputedStyle(node);
        const accent = getComputedStyle(document.documentElement).getPropertyValue("--page-accent").trim();
        const probe = document.createElement("span");
        probe.style.color = accent;
        document.body.append(probe);
        const filled = getComputedStyle(probe).color;
        probe.remove();
        return { height: node.getBoundingClientRect().height, background: style.backgroundColor, filled };
      });
      expect(look.height, `${component.name}: its button is at least 44 px high`).toBeGreaterThanOrEqual(44);
      expect(look.background, `${component.name}: its button is filled with the accent`).toBe(look.filled);
    }
    // the component's own answered, as it emits it, with each result: one feedback, in view with the focus
    const feedback = element.locator(":scope > .question-feedback");
    for (const correct of [true, false]) {
      await element.evaluate(emitAnswered, { correct });
      await expect(feedback, `${component.name}: the feedback on answered`).toHaveText(
        questionMessagesIn("de")[correct ? "right" : "wrong"],
      );
      await expect(feedback).toBeFocused();
      await expect(feedback).toBeInViewport();
    }
    // a wrong answer with its reason: the reason under the feedback
    await element.evaluate(emitAnswered, { correct: false, reason: "Der Grund." });
    await expect(feedback.locator(".question-diagnosis"), `${component.name}: the reason of a wrong answer`).toHaveText(
      "Der Grund.",
    );
    await expect(element.locator(".question-feedback"), "one feedback").toHaveCount(1);
    await checkTaskNumber(page, item, component);
  }
  expect(errors, `${item.url}: no console error`).toEqual([]);
}

/** The instance of the component in an island: the child of the explainer's wrapper for an exercise component. */
type Instance = { emit(event: string, payload: unknown): void; props: Record<string, unknown> };
type Mounted = { _vnode?: { component?: Instance & { subTree?: { component?: Instance } } } };

/** Emits answered with `payload` from the component in the island of `node`, as the component itself does. */
function emitAnswered(node: Element, payload: { correct: boolean; reason?: string; answer?: string }): void {
  const island = node.querySelector(".explainer-island") as unknown as Mounted;
  const wrapper = island._vnode?.component;
  (wrapper?.subTree?.component ?? wrapper)?.emit("answered", payload);
}

/** The task number the component in the island of `node` was given, as its prop seed. */
function seedOf(node: Element): unknown {
  const island = node.querySelector(".explainer-island") as unknown as Mounted;
  return island._vnode?.component?.subTree?.component?.props["seed"];
}

/**
 * An exercise component at its address ?<id>=<n>: it gets the task number n as its prop seed and shows "Aufgabe
 * Nr. n"; "Neue Aufgabe" moves to the next number, in the address and on the page, with the focus on it.
 */
async function checkTaskNumber(page: Page, item: PageOutline, component: ComponentOutline): Promise<void> {
  if (component.id === undefined) return;
  await page.goto(`./${item.url}?${component.id}=3#${component.id}`);
  const element = page.locator(`[id="${component.id}"]`);
  await expect(element, `${component.name}: hydrates at its address`).toHaveAttribute("data-hydrated", "");
  // the seed of each task number, as the build ships it
  const seeds = JSON.parse((await element.getAttribute("data-seeds")) ?? "[1]") as number[];
  const shown = taskNumber(3, seeds.length);
  const number = element.locator(":scope > .explainer-task-controls .explainer-task-number");
  await expect(number, `${component.name}: the task number of the address`).toHaveText(
    messageOf("de", "taskNumber", { n: String(shown) }),
  );
  await expect
    .poll(() => element.evaluate(seedOf), `${component.name}: gets the seed of number ${shown}`)
    .toBe(seeds[shown - 1]);
  await element.locator(":scope > .explainer-task-controls .explainer-new-task").click();
  const next = Number(new URL(page.url()).searchParams.get(component.id));
  expect(next, `${component.name}: the next task number in the address`).toBe(nextTaskNumber(shown, seeds.length));
  expect(new URL(page.url()).hash).toBe(`#${component.id}`);
  await expect(number).toHaveText(messageOf("de", "taskNumber", { n: String(next) }));
  await expect(number).toBeFocused();
  await expect
    .poll(() => element.evaluate(seedOf), `${component.name}: gets the seed of number ${next}`)
    .toBe(seeds[next - 1]);
}

/** The feedback of the question `id` says `text`. */
const feedback = (page: Page, id: string) => page.locator(`[id="${id}"] .question-feedback`);

/** The first reason the feedback gives for the wrong `answer`: the most specific the question has. */
function reasonFor(question: Question, answer: Answer): string {
  const quiz = questionMessagesIn("de");
  const [first] = wrongReasons(question, answer);
  if (first !== undefined) return first.option === undefined ? first.text : `${first.option}: ${first.text}`;
  return missesRight(question, answer) ? quiz.missingRight : quiz.lookAgain;
}

/**
 * A wrong answer to the question in `exercise` (an element's id): the feedback with the reason `reason`, in view
 * with the focus; the solution still hidden and the controls open; then "Lösung zeigen" shows the solution.
 */
async function wrongThenSolution(page: Page, exercise: string, question: Question, reason: string): Promise<void> {
  const item = page.locator(`[id="${questionId(question)}"]`);
  await expect(feedback(page, questionId(question))).toContainText(questionMessagesIn("de").wrong);
  await expect(item.locator(".question-diagnosis").first(), `${exercise}: the reason of the wrong answer`).toHaveText(
    reason,
  );
  await expectFeedbackInView(page, question);
  await expect(item.locator(".question-reveal"), `${exercise}: no solution after a wrong answer`).toBeHidden();
  await expect(item.locator("input, select").first(), `${exercise}: another try`).toBeEnabled();
  await item.getByRole("button", { name: questionMessagesIn("de").showSolution }).click();
  await expect(item.locator(".question-reveal"), `${exercise}: the solution on Lösung zeigen`).toBeVisible();
  await expect(item.locator(".question-reveal")).toBeFocused();
}

/** With JavaScript: a question of the question types, answered before its solution shows, right and wrong. */
async function checkQuestion(
  page: Page,
  url: string,
  exercise: Extract<ExerciseOutline, { kind: "question" }>,
): Promise<void> {
  const { question } = exercise;
  const item = page.locator(`[id="${exercise.id}"]`);
  await page.goto(`./${url}#${exercise.id}`);
  await expectMaterial(page, question);
  await expect(item.locator(".question-reveal"), `${exercise.id}: no solution before the answer`).toBeHidden();
  await expect(item.locator("details.explainer-solution"), `${exercise.id}: no Lösung before the answer`).toBeHidden();
  await answerQuestion(page, question, rightAnswer(question));
  await expect(feedback(page, questionId(question))).toContainText(questionMessagesIn("de").right);
  await expectFeedbackInView(page, question);
  await expect(item.locator(".question-reveal"), `${exercise.id}: the solution after the right answer`).toBeVisible();
  await page.reload();
  const wrong = wrongAnswer(question);
  await answerQuestion(page, question, wrong);
  await wrongThenSolution(page, exercise.id, question, reasonFor(question, wrong));
}

/** With JavaScript: a generated exercise at its deep link, its answers, a mistake, and "Neue Aufgabe". */
async function checkGenerated(
  page: Page,
  url: string,
  exercise: Extract<ExerciseOutline, { kind: "generated" }>,
): Promise<void> {
  const { spec, data, templates } = exercise;
  // the deep link names a task number; its seed comes from the exercise's table of distinct tasks
  const seeds = taskSeeds(spec, data);
  const seedOfNumber = (n: number) => seeds[taskNumber(n, seeds.length) - 1] ?? n;
  const task = generate(spec, seedOfNumber(SEED), data);
  const question = questionFor(spec, task, "de", templates);
  const address = `./${url}?seed=${SEED}#${exercise.id}`;
  const legend = page.locator(`[id="${questionId(question)}"] legend`);
  const worked = page.locator(`[id="${exercise.id}"] .explainer-worked`);
  await page.goto(address);
  await expect(legend, "the deep link shows the task of its seed").toHaveText(
    plainText(taskText(spec, task, "de", templates)),
  );
  await expect(worked, `${exercise.id}: no worked task before the answer`).toBeHidden();
  // a wrong answer: the first mistake, with its message; the comparator's wrong answer without mistakes
  if (task.mistakes.length > 0) {
    await answerQuestion(page, question, answerFor(spec, task, question, 0));
    const message = fill(templates["de"]?.messages[0] ?? "", spec, task, "de", "text");
    await wrongThenSolution(page, exercise.id, question, message);
  } else {
    const wrong = wrongAnswer(question);
    await answerQuestion(page, question, wrong);
    await wrongThenSolution(page, exercise.id, question, reasonFor(question, wrong));
  }
  // the worked tasks stay hidden with JavaScript
  await expect(worked, `${exercise.id}: the worked tasks stay hidden with JavaScript`).toBeHidden();
  // "Neue Aufgabe": another task, its seed in the address; its right answer counts
  await page.locator(`[id="${exercise.id}"] .explainer-new-task`).click();
  const number = Number(new URL(page.url()).searchParams.get(exercise.id));
  expect(number, "the next task number in the address").toBe(
    nextTaskNumber(taskNumber(SEED, seeds.length), seeds.length),
  );
  const next = generate(spec, seedOfNumber(number), data);
  const nextQuestion = questionFor(spec, next, "de", templates);
  const nextLegend = page.locator(`[id="${questionId(nextQuestion)}"] legend`);
  await expect(nextLegend).toHaveText(plainText(taskText(spec, next, "de", templates)));
  if (seeds.length > 1) {
    expect(taskKey(spec, next, "de", templates), "a new task").not.toBe(taskKey(spec, task, "de", templates));
  }
  await expect(nextLegend).toBeFocused();
  await answerQuestion(page, nextQuestion, rightAnswer(nextQuestion));
  await expect(feedback(page, questionId(nextQuestion))).toContainText(questionMessagesIn("de").right);
  await expectFeedbackInView(page, nextQuestion);
}

/** Whether the page at `url` (absolute) has an element with the id `id`, fetched once per page. */
const known = new Map<string, Promise<string>>();
async function hasAnchor(page: Page, url: string, id: string): Promise<boolean> {
  let html = known.get(url);
  if (html === undefined) {
    html = page.request.get(url).then((response) => response.text());
    known.set(url, html);
  }
  const escaped = id.replace(/&/g, "&amp;").replace(/"/g, "&quot;");
  return (await html).includes(` id="${escaped}"`);
}

/** Every link of the page to an anchor of this app finds an element with that id. */
async function expectAnchors(page: Page): Promise<void> {
  const here = new URL(page.url());
  const links = await page
    .locator("a[href*='#']")
    .evaluateAll((anchors) => anchors.map((a) => (a as HTMLAnchorElement).href));
  for (const link of new Set(links)) {
    const url = new URL(link);
    if (url.origin !== here.origin || url.hash === "") continue;
    const id = decodeURIComponent(url.hash.slice(1));
    const found =
      url.pathname === here.pathname
        ? (await page.locator(`[id="${id.replace(/"/g, '\\"')}"]`).count()) === 1
        : await hasAnchor(page, url.href.replace(/#.*$/, ""), id);
    expect(found, `${here.pathname}: the link to ${url.pathname}${url.hash} finds its anchor`).toBe(true);
  }
}

/** The page's language, its alternates and a switch to each other language, the archetype marker. */
async function expectLanguages(page: Page, item: PageOutline, languages: readonly string[]): Promise<void> {
  await expect(page.locator("html")).toHaveAttribute("lang", item.lang);
  await expect(page.locator('meta[name="lernapps-archetype"]')).toHaveAttribute("content", "explainer");
  for (const lang of languages) {
    await expect(page.locator(`link[rel="alternate"][hreflang="${lang}"]`)).toHaveCount(1);
    if (lang === item.lang) continue;
    const other = page.locator(`.page-languages a[hreflang="${lang}"]`);
    await expect(other).toBeVisible();
    const response = await page.request.get(await other.evaluate((a) => (a as HTMLAnchorElement).href));
    expect(response.status(), `${item.url}: the switch to ${lang}`).toBe(200);
  }
}

/**
 * The clipboard of the page, recorded in the test (nothing leaves the browser): each text the page writes, kept even
 * when the page closes its tab right after.
 */
async function recordClipboard(page: Page): Promise<string[]> {
  const copied: string[] = [];
  await page.exposeBinding("lernappsRecordCopy", (_source, text: string) => {
    copied.push(text);
  });
  await page.addInitScript(() => {
    const recorder = window as unknown as { lernappsRecordCopy: (text: string) => Promise<void> };
    Object.defineProperty(navigator, "clipboard", {
      configurable: true,
      value: { writeText: (text: string) => recorder.lernappsRecordCopy(text) },
    });
  });
  return copied;
}

/** Records the addresses the page opens with window.open, which opens nothing. */
async function recordOpen(page: Page): Promise<() => Promise<string[]>> {
  await page.addInitScript(() => {
    const opened: string[] = [];
    Object.assign(window, { opened, open: (url?: string | URL) => (opened.push(String(url ?? "")), null) });
  });
  return () => page.evaluate(() => (window as unknown as { opened: string[] }).opened);
}

/**
 * Switches the way `label` to the tutor on under the title of a content page (an assistant's name, or copying the
 * text): "Mit einem KI-Tutor lernen" is folded while none is on; then the bar with its button shows.
 */
async function switchOn(page: Page, label: string): Promise<Locator> {
  const tutor = page.locator(".explainer-tutor");
  const off = tutor.locator("details.explainer-tutor-off");
  await expect(off, "folded at first").not.toHaveAttribute("open");
  await expect(tutor.locator(".explainer-tutor-bar")).toBeHidden();
  await off.locator(":scope > summary").click();
  await tutor.locator(".explainer-tutor-select").selectOption({ label });
  await tutor.locator(".explainer-tutor-on").click();
  await expect(off).toBeHidden();
  await expect(tutor.locator(".explainer-tutor-go")).toBeVisible();
  return tutor;
}

/** The app's first assistant, from the page's tutor section: its name and its address with {prompt}. */
async function firstAssistant(page: Page): Promise<{ name: string; url: string }> {
  const ways = await page
    .locator("script.explainer-tutor-prompt")
    .evaluate((script) => (JSON.parse(script.textContent ?? "{}") as { ways: { name: string; url: string }[] }).ways);
  return ways[0] ?? { name: "", url: "" };
}

/** The prompt in the address `opened` of the assistant `template`. */
function promptOf(template: string, opened: string): string {
  const [before = "", after = ""] = template.split("{prompt}");
  return decodeURIComponent(opened.slice(before.length, opened.length - after.length));
}

/**
 * The address of the page's tutor page with where the learner is, as the ways to the tutor name it from the page
 * `here` (its address before the click): the tutor page beside the page, every task number of `here`, and the exercise
 * `id` at task `n` (none for one without numbers); for way A, without `id`, no exercise and no section.
 */
function expectTutorAddress(address: string, here: string, id: string | undefined, n: number | undefined): void {
  const url = new URL(address);
  expect(`${url.origin}${url.pathname}`, "the page's tutor page").toBe(new URL("tutor/", new URL(".", here)).href);
  for (const [key, value] of new URL(here).searchParams) {
    if (key !== "von") expect(url.searchParams.get(key), `the task number of ${key}`).toBe(value);
  }
  expect(url.searchParams.get("von"), "no von=tutor").toBeNull();
  if (id === undefined) {
    expect(url.searchParams.get("uebung"), "no exercise").toBeNull();
    expect(url.searchParams.get("abschnitt"), "no section").toBeNull();
    return;
  }
  expect(url.searchParams.get("uebung"), "the exercise").toBe(id);
  if (n !== undefined) expect(url.searchParams.get(id), "its task number").toBe(String(n));
}

/**
 * The result line "Zurück zum Tutor" copies on the page `here` (its address before the click): its first line has
 * `first`, then the page's tutor page with the task `n` of the exercise `id`, which answers and has the exercise.
 */
async function expectResultLine(
  request: APIRequestContext,
  copied: string[],
  here: string,
  first: string,
  id: string,
  n: number,
): Promise<void> {
  await expect.poll(() => copied.length, "the result line is copied").toBe(1);
  const lines = (copied[0] ?? "").split("\n");
  expect(lines, "two lines").toHaveLength(2);
  const [line = "", tutor = ""] = lines;
  expect(line, "the first line: exercise, number, how far, the input").toContain(first);
  const prefix = `${messageOf("de", "resultTutor")} `;
  expect(tutor.startsWith(prefix), "the page's tutor page").toBe(true);
  const address = tutor.slice(prefix.length);
  expectTutorAddress(address, here, id, n);
  const response = await request.get(address);
  expect(response.status(), `${address} answers`).toBe(200);
  expect(await response.text(), "the tutor page has the exercise").toContain(id);
}

/** The explainer's tests, for the content in `root`/src. */
export function explainerTests(root = "."): void {
  const app = outline(root);

  test.describe("explainer", () => {
    test.describe.configure({ mode: "parallel" });
    test.use({ reducedMotion: "reduce" });

    test.describe("without JavaScript", () => {
      test.use({ javaScriptEnabled: false });

      for (const lang of app.languages) {
        for (const item of app.pages[lang] ?? []) {
          test(`${item.url || "./"}: headings, sections, formulas, figures and anchors as in the content`, async ({
            page,
          }) => {
            await page.goto(`./${item.url}`);
            const main = page.locator("main");
            const headings = await main.locator("h1, h2, h3, h4, h5, h6").evaluateAll((elements) =>
              elements.map((element) => ({
                level: Number(element.tagName.slice(1)),
                text: (element.textContent ?? "").replace(/\s+/g, " ").trim(),
              })),
            );
            expect(headings, "the heading levels follow the nesting").toEqual(item.headings);
            for (const section of item.sections) {
              const heading = page.locator(`[id="${section.id}"]`);
              await expect(heading, `section ${section.id}`).toBeVisible();
              await expect(heading).toHaveText(section.title);
            }
            // the formulas of the content; an exercise component's no-JS task, from its describe, is not content
            const formulas = await main
              .locator("math")
              .evaluateAll((elements) => elements.filter((math) => !math.closest(".explainer-described")).length);
            expect(formulas, "one <math> per formula").toBe(item.formulas);
            for (const name of item.figures) {
              await expect(main.getByRole("img", { name, exact: true }).first(), `the figure "${name}"`).toBeVisible();
            }
            await expectAnchors(page);
            await expectLanguages(page, item, app.languages);
            await expectExercises(page, item);
            await expectNojs(page, item);
          });
        }

        for (const item of app.others[lang] ?? []) {
          test(`${item.url || "./"}: its heading, its links and anchors, its languages`, async ({ page }) => {
            await page.goto(`./${item.url}`);
            await expect(page.locator("main h1")).toHaveText(item.title);
            await expectAnchors(page);
            await expectLanguages(page, item, app.languages);
            // only a content page starts a tutor; the start page says what it is
            await expect(page.locator(".explainer-tutor"), "no way to the tutor here").toHaveCount(0);
            if (item.kind === "start") {
              await expect(page.locator(".explainer-tutor-about h2")).toHaveText(messageOf(item.lang, "tutorTitle"));
            }
          });
        }

        test(`${lang}: previous and next form one chain over all pages`, async ({ page }) => {
          const order = (app.pages[lang] ?? []).map((item) => item.url);
          const first = order[0];
          if (first === undefined) throw new Error(`no page in ${lang}`);
          const relative = (url: string) => {
            const path = new URL(url).pathname;
            const at = order.find((candidate) => path.endsWith(`/${candidate}`));
            return at ?? path;
          };
          const forward: string[] = [];
          await page.goto(`./${first}`);
          for (let step = 0; step <= order.length; step++) {
            forward.push(relative(page.url()));
            const next = page.locator('a[rel="next"]');
            if ((await next.count()) === 0) break;
            await next.click();
          }
          expect(forward, "next leads through every page in order").toEqual(order);
          const backward: string[] = [];
          for (let step = 0; step <= order.length; step++) {
            backward.push(relative(page.url()));
            const previous = page.locator('a[rel="prev"]');
            if ((await previous.count()) === 0) break;
            await previous.click();
          }
          expect(backward, "previous leads back through every page").toEqual([...order].reverse());
        });
      }
    });

    // with JavaScript in German, one exercise of each type per page; the other languages render the same code
    test.describe("with JavaScript", () => {
      // at the narrowest width only, where the feedback is hardest to keep in view: the exercises' logic is the same
      // at every width, and the hooks stay fast
      test.skip(({ viewport }) => (viewport?.width ?? 0) > 400, "the exercises run at 360 px");
      for (const item of app.pages["de"] ?? []) {
        const types = new Map<string, ExerciseOutline>();
        for (const exercise of item.exercises) if (!types.has(exercise.type)) types.set(exercise.type, exercise);
        if (types.size === 0) continue;
        test(`${item.url}: one exercise of each type checks its answers (${[...types.keys()].join(", ")})`, async ({
          page,
        }) => {
          for (const exercise of types.values()) {
            if (exercise.kind === "question") await checkQuestion(page, item.url, exercise);
            else await checkGenerated(page, item.url, exercise);
          }
          expect(await page.evaluate(() => [...Object.keys(localStorage), ...Object.keys(sessionStorage)])).toEqual([]);
        });
      }
      for (const item of app.pages["de"] ?? []) {
        if (item.components.length === 0) continue;
        test(`${item.url}: each component hydrates without a console error (${item.components.map((component) => component.name).join(", ")})`, async ({
          page,
        }) => {
          await checkComponents(page, item);
          expect(await page.evaluate(() => [...Object.keys(localStorage), ...Object.keys(sessionStorage)])).toEqual([]);
        });
      }
    });

    for (const item of (app.pages["de"] ?? []).filter((candidate) =>
      candidate.exercises.some((exercise) => exercise.kind === "generated"),
    )) {
      test(`${item.url}: the address holds the task of each exercise, and the tutor button gives them to the prompt`, async ({
        page,
      }) => {
        await page.addInitScript(() => {
          const copied: string[] = [];
          Object.assign(window, { copied });
          Object.defineProperty(navigator, "clipboard", {
            configurable: true,
            value: { writeText: (text: string) => (copied.push(text), Promise.resolve()) },
          });
        });
        await page.goto(`./${item.url}`);
        const ids = item.exercises.flatMap((exercise) => (exercise.kind === "generated" ? [exercise.id] : []));
        // the task numbers are in the address as soon as the page runs; "Neue Aufgabe" changes only its exercise's
        for (const id of ids) {
          await expect.poll(() => new URL(page.url()).searchParams.get(id), `${id} is in the address`).not.toBeNull();
        }
        const first = ids[0];
        if (first === undefined) return;
        const before = new URL(page.url()).searchParams;
        await page.locator(`[id="${first}"] .explainer-new-task`).click();
        const after = new URL(page.url()).searchParams;
        expect(after.get(first), "the exercise's task changes").not.toBe(before.get(first));
        for (const id of ids.slice(1)) expect(after.get(id), `${id} stays`).toBe(before.get(id));
        // the bar's button copies the prompt with the page's address once copying the text is switched on
        const tutor = await switchOn(page, messageOf("de", "tutorOther"));
        await expect(tutor.locator(".explainer-tutor-go")).toHaveText(`?${messageOf("de", "tutorCopy")}`);
        await tutor.locator(".explainer-tutor-go").click();
        await expect(tutor.locator(".explainer-tutor-status")).toHaveText(messageOf("de", "tutorCopied"));
        const copied = await page.evaluate(() => (window as unknown as { copied: string[] }).copied);
        const [prompt = "", ...markdown] = (copied[0] ?? "").split("\n");
        // the start prompt, the tutor page with the page's task numbers, then the tutor page's Markdown
        const address = /https?:\/\/\S+/.exec(prompt)?.[0] ?? "";
        expect(new URL(address).searchParams.get(first), "the task number in the tutor page's address").toBe(
          after.get(first),
        );
        expect(`${new URL(address).origin}${new URL(address).pathname}`).toBe(new URL("tutor/", page.url()).href);
        expect(markdown.join("\n"), "the tutor page's Markdown, with the guide").toContain("## So leitest du an");
        expect(markdown.join("\n"), "and the exercise").toContain(`### Übung ${first}`);
        // the way stays on, on this device
        await page.reload();
        await expect(tutor.locator(".explainer-tutor-go")).toBeVisible();
      });
    }

    const generatedPage = (app.pages["de"] ?? []).find((candidate) =>
      candidate.exercises.some((exercise) => exercise.kind === "generated"),
    );
    if (generatedPage !== undefined) {
      const exercise = generatedPage.exercises.find((candidate) => candidate.kind === "generated");
      test(`${generatedPage.url}: way A, the provider link names the page's tutor page with the page's task numbers`, async ({
        page,
        request,
      }) => {
        if (exercise?.kind !== "generated") return;
        const opened = await recordOpen(page);
        await page.goto(`./${generatedPage.url}?${exercise.id}=${SEED}#${exercise.id}`);
        const n = taskNumber(SEED, taskSeeds(exercise.spec, exercise.data).length);
        const assistant = await firstAssistant(page);
        const template = assistant.url;
        test.skip(!template.includes("{prompt}"), "the app's first assistant takes no prompt in its address");
        await (await switchOn(page, assistant.name)).locator(".explainer-tutor-go").click();
        const addresses = await opened();
        expect(addresses, "one assistant opens").toHaveLength(1);
        const prompt = promptOf(template, addresses[0] ?? "");
        const found = prompt.match(/https?:\/\/\S+/g) ?? [];
        expect(found, "one address: the tutor page").toHaveLength(1);
        const [address = ""] = found;
        expectTutorAddress(address, page.url(), undefined, undefined);
        expect(new URL(address).searchParams.get(exercise.id), "the task number").toBe(String(n));
        expect(prompt, "in the learner's voice: help with this page").toContain("verstehen");
        const response = await request.get(address);
        expect(response.status(), "the tutor page answers").toBe(200);
        expect(await response.text()).toContain('<main id="anleitung">');
      });

      /** The first line of way B1: the tutor page and the task in one sentence. */
      const stuckFirst = (line: string, here: string, n: number) => {
        const address = /https?:\/\/\S+/.exec(line)?.[0] ?? "";
        expectTutorAddress(address, here, exercise?.id ?? "", n);
        expect(line).toBe(
          messageOf("de", "stuckAsk", {
            url: address,
            exercise: exercise?.id ?? "",
            number: messageOf("de", "resultNumber", { n: String(n) }),
          }),
        );
        return address;
      };

      test(`${generatedPage.url}: way B1, "Warum?" after a wrong answer opens the assistant with the input and the app's message word for word`, async ({
        page,
        request,
      }) => {
        if (exercise?.kind !== "generated") return;
        const opened = await recordOpen(page);
        const { spec, data, templates } = exercise;
        const seeds = taskSeeds(spec, data);
        const n = taskNumber(SEED, seeds.length);
        const task = generate(spec, seeds[n - 1] ?? n, data);
        const question = questionFor(spec, task, "de", templates);
        await page.goto(`./${generatedPage.url}?${exercise.id}=${SEED}#${exercise.id}`);
        const assistant = await firstAssistant(page);
        const template = assistant.url;
        test.skip(!template.includes("{prompt}"), "the app's first assistant takes no prompt in its address");
        await expect(page.locator(`[id="${questionId(question)}"] legend`)).toBeVisible();
        await switchOn(page, assistant.name);
        const wrong = task.mistakes.length > 0 ? answerFor(spec, task, question, 0) : wrongAnswer(question);
        await answerQuestion(page, question, wrong);
        await expect(feedback(page, questionId(question))).toContainText(questionMessagesIn("de").wrong);
        // what the app shows under the verdict, without its offer to try again
        const shown = (await feedback(page, questionId(question)).locator(".question-diagnosis").allTextContents())
          .slice(0, -1)
          .join(" ");
        if (task.mistakes.length > 0) {
          expect(shown, "the message of the mistake").toBe(diagnose(spec, task, question, wrong, "de", templates));
        }
        // in the row of "Prüfen" and "Lösung", "Warum?" after the wrong answer
        const help = page.locator(`[id="${exercise.id}"] .question-actions button.explainer-help`);
        await expect(help).toHaveText(`${assistant.name.charAt(0).toUpperCase()}${messageOf("de", "helpWhy")}`);
        await expect(help).toHaveAttribute("aria-label", messageOf("de", "helpWhyLabel", { name: assistant.name }));
        await help.click();
        const addresses = await opened();
        expect(addresses, "one assistant opens").toHaveLength(1);
        const prompt = promptOf(template, addresses[0] ?? "");
        const [first = "", ...rest] = prompt.split("\n");
        const address = stuckFirst(first, page.url(), n);
        expect(rest).toEqual([
          messageOf("de", "stuckInput", {
            input: answerShown(question, wrong, "de"),
            tries: messageOf("de", "resultTry"),
          }),
          messageOf("de", "stuckMessage", { message: shown.replace(/\s+/g, " ").trim() }),
        ]);
        expect((await request.get(address)).status(), `${address} answers`).toBe(200);
      });

      test(`${generatedPage.url}: way B1 before the first input, the sentence with the tutor page and the task alone`, async ({
        page,
      }) => {
        if (exercise?.kind !== "generated") return;
        const opened = await recordOpen(page);
        const n = taskNumber(SEED, taskSeeds(exercise.spec, exercise.data).length);
        await page.goto(`./${generatedPage.url}?${exercise.id}=${SEED}#${exercise.id}`);
        const assistant = await firstAssistant(page);
        const template = assistant.url;
        test.skip(!template.includes("{prompt}"), "the app's first assistant takes no prompt in its address");
        const button = page.locator(`[id="${exercise.id}"] .question-actions button.explainer-help`);
        await expect(button, "no help before a tutor is on").toBeHidden();
        await switchOn(page, assistant.name);
        await expect(button, "there before the first input").toHaveText(
          `${assistant.name.charAt(0).toUpperCase()}${messageOf("de", "help")}`,
        );
        await button.click();
        const addresses = await opened();
        expect(addresses, "one assistant opens").toHaveLength(1);
        const lines = promptOf(template, addresses[0] ?? "").split("\n");
        expect(lines, "the sentence alone").toHaveLength(1);
        stuckFirst(lines[0] ?? "", page.url(), n);
      });

      test(`${generatedPage.url}: way B2, on a page a tutor opened "Warum?" copies the lines and opens nothing`, async ({
        page,
      }) => {
        if (exercise?.kind !== "generated") return;
        const copied = await recordClipboard(page);
        const opened = await recordOpen(page);
        const { spec, data, templates } = exercise;
        const seeds = taskSeeds(spec, data);
        const n = taskNumber(SEED, seeds.length);
        const task = generate(spec, seeds[n - 1] ?? n, data);
        const question = questionFor(spec, task, "de", templates);
        await page.goto(`./${generatedPage.url}?${exercise.id}=${SEED}&von=tutor#${exercise.id}`);
        await expect(page.locator(`[id="${questionId(question)}"] legend`)).toBeVisible();
        const wrong = task.mistakes.length > 0 ? answerFor(spec, task, question, 0) : wrongAnswer(question);
        await answerQuestion(page, question, wrong);
        await expect(feedback(page, questionId(question))).toContainText(questionMessagesIn("de").wrong);
        // on a page a tutor opened, help is there without switching a tutor on
        await page.locator(`[id="${exercise.id}"] .question-actions button.explainer-help`).click();
        await expect.poll(() => copied.length, "the lines are copied").toBe(1);
        expect(await opened(), "no new chat").toEqual([]);
        const lines = (copied[0] ?? "").split("\n");
        expect(lines[0], "the task first").toBe(
          messageOf("de", "stuckTask", {
            exercise: exercise.id,
            number: messageOf("de", "resultNumber", { n: String(n) }),
          }),
        );
        expect(lines[1]).toBe(
          messageOf("de", "stuckInput", {
            input: answerShown(question, wrong, "de"),
            tries: messageOf("de", "resultTry"),
          }),
        );
        expect(lines[2]).toMatch(/^Die App sagt: „.+“$/);
        const prefix = `${messageOf("de", "resultTutor")} `;
        expect(lines.at(-1)?.startsWith(prefix), "the tutor page last").toBe(true);
        expectTutorAddress((lines.at(-1) ?? "").slice(prefix.length), page.url(), exercise.id, n);
      });

      test(`${generatedPage.url}: on a page a tutor opened, "Zurück" in the row copies the result line once the solution shows`, async ({
        page,
        request,
      }) => {
        if (exercise?.kind !== "generated") return;
        const copied = await recordClipboard(page);
        const { spec, data, templates } = exercise;
        const seeds = taskSeeds(spec, data);
        const n = taskNumber(SEED, seeds.length);
        const task = generate(spec, seeds[n - 1] ?? n, data);
        const question = questionFor(spec, task, "de", templates);
        await page.goto(`./${generatedPage.url}?${exercise.id}=${SEED}&von=tutor#${exercise.id}`);
        await expect(page.locator(`[id="${questionId(question)}"] legend`)).toBeVisible();
        const wrong = task.mistakes.length > 0 ? answerFor(spec, task, question, 0) : wrongAnswer(question);
        await answerQuestion(page, question, wrong);
        await page.getByRole("button", { name: questionMessagesIn("de").showSolution, exact: true }).click();
        const back = page.locator(`[id="${exercise.id}"] .question-actions button.explainer-help`);
        await expect(back).toHaveAttribute(
          "aria-label",
          messageOf("de", "helpBackLabel", { name: messageOf("de", "tutorSomeone") }),
        );
        const here = page.url();
        await back.click();
        await expectResultLine(
          request,
          copied,
          here,
          `, ${exercise.id}, Nr. ${n}: ${messageOf("de", "resultSolution")}`,
          exercise.id,
          n,
        );
      });

      test(`${generatedPage.url}: "Zurück zum Tutor" copies the result line of a generated exercise`, async ({
        page,
        request,
      }) => {
        if (exercise?.kind !== "generated") return;
        const copied = await recordClipboard(page);
        const { spec, data, templates } = exercise;
        const seeds = taskSeeds(spec, data);
        const n = taskNumber(SEED, seeds.length);
        const task = generate(spec, seeds[n - 1] ?? n, data);
        const question = questionFor(spec, task, "de", templates);
        await page.goto(`./${generatedPage.url}?${exercise.id}=${SEED}&von=tutor#${exercise.id}`);
        await expect(page.locator(`[id="${questionId(question)}"] legend`)).toBeVisible();
        const wrong = task.mistakes.length > 0 ? answerFor(spec, task, question, 0) : wrongAnswer(question);
        await answerQuestion(page, question, wrong);
        await expect(feedback(page, questionId(question))).toContainText(questionMessagesIn("de").wrong);
        const here = page.url();
        await page.getByRole("button", { name: messageOf("de", "backToTutor") }).click();
        const status = `${messageOf("de", "resultOpen")} (${messageOf("de", "resultTry")}, ${messageOf("de", "resultInput", { input: answerShown(question, wrong, "de") })})`;
        await expectResultLine(request, copied, here, `, ${exercise.id}, Nr. ${n}: ${status}.`, exercise.id, n);
      });
    }

    const firstPage = (app.pages["de"] ?? [])[0];
    if (firstPage !== undefined) {
      test("the start page switches an assistant on for every page, and off again", async ({ page }) => {
        await page.goto("./");
        const choose = page.locator("select.explainer-tutor-choose");
        await expect(choose, "none at first").toHaveValue("");
        const names = await choose
          .locator("option")
          .evaluateAll((options) => options.map((option) => (option as HTMLOptionElement).value));
        const name = names[1] ?? "";
        await choose.selectOption(name);
        await page.goto(`./${firstPage.url}`);
        const tutor = page.locator(".explainer-tutor");
        await expect(tutor.locator(".explainer-tutor-bar")).toBeVisible();
        await expect(tutor.locator("details.explainer-tutor-off")).toBeHidden();
        if (name !== "copy") await expect(tutor.locator(".explainer-tutor-go")).toContainText(name);
        await page.goto("./");
        await expect(choose).toHaveValue(name);
        await choose.selectOption("");
        await page.goto(`./${firstPage.url}`);
        await expect(tutor.locator(".explainer-tutor-bar")).toBeHidden();
        await expect(page.locator("button.explainer-help").first(), "no help without a tutor").toBeHidden();
      });
    }

    for (const item of app.pages["de"] ?? []) {
      const component = item.components.find((candidate) => candidate.exercise && candidate.id !== undefined);
      if (component?.id === undefined) continue;
      const id = component.id;
      // the client module places the help button of way B; the islands module hydrates the component: held back in
      // turn, so that each loads first once
      for (const [first, held] of [
        ["the component", "**/assets/index-*.js"],
        ["the client module", "**/assets/islands-*.js"],
      ] as const) {
        test(`${item.url}: on a page a tutor opened, ${component.name} has its help button once, ${first} loaded first`, async ({
          page,
        }) => {
          const errors: string[] = [];
          page.on("console", (message) => {
            if (message.type() === "error") errors.push(message.text());
          });
          page.on("pageerror", (error) => errors.push(error.message));
          await page.route(held, async (route) => {
            await new Promise((resolve) => setTimeout(resolve, 500));
            await route.continue();
          });
          await page.goto(`./${item.url}?von=tutor#${id}`);
          const element = page.locator(`[id="${id}"]`);
          await expect(element).toHaveAttribute("data-hydrated", "");
          // outside the component's island, which Vue owns: neither a mismatch nor lost with a new render
          const help = element.locator("button.explainer-help");
          await expect(help, "once").toHaveCount(1);
          await expect(help).toBeVisible();
          await expect(element.locator(".explainer-island button.explainer-help"), "not in the island").toHaveCount(0);
          await element.locator(".explainer-new-task").click();
          await expect(help, "once after a new task").toHaveCount(1);
          await expect(help).toBeVisible();
          await element.evaluate(emitAnswered, { correct: false });
          await expect(help, "after a wrong answer").toContainText(messageOf("de", "helpWhy"));
          expect(errors, "no console error").toEqual([]);
        });
      }
    }

    for (const item of app.pages["de"] ?? []) {
      const component = item.components.find((candidate) => candidate.exercise && candidate.id !== undefined);
      if (component?.id === undefined) continue;
      const id = component.id;
      test(`${item.url}: "Zurück zum Tutor" copies the result line of the exercise component ${component.name}`, async ({
        page,
        request,
      }) => {
        const copied = await recordClipboard(page);
        await page.goto(`./${item.url}?${id}=3&von=tutor#${id}`);
        const element = page.locator(`[id="${id}"]`);
        await expect(element).toHaveAttribute("data-hydrated", "");
        const seeds = JSON.parse((await element.getAttribute("data-seeds")) ?? "[1]") as number[];
        const n = taskNumber(3, seeds.length);
        await element.evaluate(emitAnswered, { correct: false, answer: "Die Eingabe" });
        const here = page.url();
        await page.getByRole("button", { name: messageOf("de", "backToTutor") }).click();
        const status = `${messageOf("de", "resultOpen")} (${messageOf("de", "resultTry")}, ${messageOf("de", "resultInput", { input: "Die Eingabe" })})`;
        await expectResultLine(request, copied, here, `, ${id}, Nr. ${n}: ${status}.`, id, n);
      });
    }

    test("nothing is stored on the device", async ({ page, context }) => {
      const urls = app.languages.flatMap((lang) => [...(app.others[lang] ?? []), ...(app.pages[lang] ?? [])]);
      for (const item of urls) {
        await page.goto(`./${item.url}`);
        const stored = await page.evaluate(() => [...Object.keys(localStorage), ...Object.keys(sessionStorage)]);
        expect(stored, `${item.url} stores nothing`).toEqual([]);
      }
      expect(await context.cookies()).toEqual([]);
    });
  });
}
