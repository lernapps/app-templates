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
// Nr. n" and gets the seed of task number n from its table, and "Neue Aufgabe" moves to the next number in the address and on the page.
// Without JavaScript, each component's nojs text is visible and not empty, an exercise component's with its task of
// number 1 and the solution folded, and its island hidden. Each video shows its title as a link to YouTube, its channel
// and the note on privacy without JavaScript; with JavaScript it requests nothing of another host before a click (every
// such request is blocked), loads the player of youtube-nocookie.com on "Video abspielen", and "Videos immer direkt
// laden" is kept, loads every player directly, and goes when unticked. No page stores anything on the device before
// a choice of the learner. The tests run in parallel, with reduced motion; the preset runs
// them at desktop width and at 360 px; `lernapps check` adds axe and the width on the pages it visits.
import { expect, test, type Page } from "playwright/test";
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
import { answerFor, questionFor, taskKey } from "./generated/question.ts";
import { fill, plainText, taskText } from "./generated/texts.ts";
import { generate } from "./generated/values.ts";
import { taskSeeds } from "./exercises.ts";
import { message as messageOf } from "./messages.ts";
import { nextTaskNumber, taskNumber } from "./tasks.ts";
import { outline, type ComponentOutline, type ExerciseOutline, type PageOutline } from "./outline.ts";
import { embedAddress, watchAddress } from "./video.ts";

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

/** Without JavaScript: each video shows its title as the link to YouTube, its channel and the note; no player. */
async function expectVideos(page: Page, item: PageOutline): Promise<void> {
  if (item.videos.length === 0) return;
  const videos = page.locator("main figure.explainer-video");
  await expect(videos, `${item.url}: one figure per video`).toHaveCount(item.videos.length);
  for (const [index, video] of item.videos.entries()) {
    const figure = videos.nth(index);
    const link = figure.getByRole("link", { name: video.title, exact: true });
    await expect(link, `${item.url}: the video "${video.title}" as a link`).toBeVisible();
    await expect(link).toHaveAttribute("href", watchAddress(video.youtube));
    await expect(figure.locator(".explainer-video-channel")).toHaveText(
      messageOf(item.lang, "videoChannel", { channel: video.channel }),
    );
    await expect(figure.locator(".explainer-video-note")).toHaveText(messageOf(item.lang, "videoNote"));
    await expect(figure.locator(".explainer-video-controls"), "no button without JavaScript").toBeHidden();
  }
  await expect(page.locator("iframe"), `${item.url}: no player without JavaScript`).toHaveCount(0);
}

/** Whether `url` is of YouTube or Google: a player, a thumbnail, a script or a beacon of theirs. */
const ofYoutubeOrGoogle = (url: string): boolean =>
  /(^|\.)(youtube[a-z-]*\.com|youtu\.be|ytimg\.com|google[a-z-]*\.com|gstatic\.com|ggpht\.com|doubleclick\.net)$/.test(
    new URL(url).hostname,
  );

/**
 * With JavaScript: the videos of a page load nothing of another host before a click (every such request is blocked and
 * recorded); "Video abspielen" puts the player of youtube-nocookie.com, named by the video's title, into its figure
 * and stores nothing; "Videos immer direkt laden" is kept on the device, loads every player without the click from
 * then on, and goes when the learner unticks it.
 */
async function checkVideos(page: Page, item: PageOutline, origin: string): Promise<void> {
  const requested: string[] = [];
  await page.route(
    (url) => url.origin !== origin,
    async (route) => {
      requested.push(route.request().url());
      await route.abort("blockedbyclient");
    },
  );
  const stored = () => page.evaluate(() => [...Object.keys(localStorage), ...Object.keys(sessionStorage)]);
  await page.goto(`./${item.url}`);
  const videos = page.locator("main figure.explainer-video");
  const [first] = item.videos;
  if (first === undefined) return;
  await expect(videos.first().locator(".explainer-video-controls"), "the controls show").toBeVisible();
  await page.waitForLoadState("networkidle");
  expect(requested, `${item.url}: no request to another host before a click`).toEqual([]);
  await expect(page.locator("iframe"), "no player before a click").toHaveCount(0);
  // the click: the player of the first video, from youtube-nocookie.com, starting at once
  await videos
    .first()
    .getByRole("button", { name: messageOf("de", "videoPlay") })
    .click();
  const player = videos.first().locator("iframe");
  await expect(player).toHaveAttribute("src", embedAddress(first.youtube, true));
  await expect(player).toHaveAttribute("title", first.title);
  await expect(player).toBeFocused();
  await expect(videos.first().locator(".explainer-video-play"), "the button goes").toHaveCount(0);
  await expect
    .poll(() => requested.filter(ofYoutubeOrGoogle), "the player loads after the click")
    .toContain(embedAddress(first.youtube, true));
  expect(new Set(requested.map((url) => new URL(url).hostname)), "only the player's host").toEqual(
    new Set(["www.youtube-nocookie.com"]),
  );
  await expect(page.locator("iframe"), "only the clicked video").toHaveCount(1);
  expect(await stored(), "a click on the button stores nothing").toEqual([]);
  // "Videos immer direkt laden": kept, and every player loads without the click
  const always = page.getByRole("checkbox", { name: messageOf("de", "videoAlways") });
  await always.first().check();
  expect(await stored(), "the choice is kept").toHaveLength(1);
  await page.reload();
  await expect(page.locator("main figure.explainer-video iframe"), "every player, without a click").toHaveCount(
    item.videos.length,
  );
  for (const [index, video] of item.videos.entries()) {
    await expect(videos.nth(index).locator("iframe")).toHaveAttribute("src", embedAddress(video.youtube, false));
  }
  for (const box of await always.all()) await expect(box).toBeChecked();
  // unticked: nothing is kept, and the next visit waits for the click again
  await always.first().uncheck();
  for (const box of await always.all()) await expect(box).not.toBeChecked();
  expect(await stored(), "the choice goes").toEqual([]);
  requested.length = 0;
  await page.reload();
  await expect(videos.first().locator(".explainer-video-play")).toBeVisible();
  await expect(page.locator("iframe")).toHaveCount(0);
  expect(requested, `${item.url}: again no request before a click`).toEqual([]);
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
function emitAnswered(node: Element, payload: { correct: boolean; reason?: string }): void {
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
            await expectVideos(page, item);
          });
        }

        for (const item of app.others[lang] ?? []) {
          test(`${item.url || "./"}: its heading, its links and anchors, its languages`, async ({ page }) => {
            await page.goto(`./${item.url}`);
            await expect(page.locator("main h1")).toHaveText(item.title);
            await expectAnchors(page);
            await expectLanguages(page, item, app.languages);
            if (item.kind === "start") {
              // the tutor section without JavaScript: no button with a select, plain links to the assistants and to tutor.md
              const tutor = page.locator(".explainer-tutor");
              await expect(tutor.locator(".explainer-tutor-way")).toBeHidden();
              for (const href of await tutor
                .locator("a.explainer-tutor-provider")
                .evaluateAll((links) => links.map((link) => link.getAttribute("href") ?? ""))) {
                expect(href, "a provider link without the prompt").not.toMatch(/\{prompt\}|%7Bprompt%7D/i);
              }
              const prompt = await tutor
                .locator("a.explainer-tutor-text")
                .evaluate((link) => (link as HTMLAnchorElement).href);
              expect(prompt, "the link to the prompt as text").toBe(new URL("tutor.md", page.url()).href);
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
        if (item.videos.length === 0) continue;
        test(`${item.url}: the videos load nothing before a click, the player after it, directly once chosen`, async ({
          page,
          baseURL,
        }) => {
          await checkVideos(page, item, new URL(baseURL ?? page.url()).origin);
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

    test("the start page copies the tutor prompt, with the app's addresses in its links", async ({ page }) => {
      // the clipboard of the page, recorded: nothing leaves the browser
      await page.addInitScript(() => {
        const copied: string[] = [];
        Object.assign(window, { copied });
        Object.defineProperty(navigator, "clipboard", {
          configurable: true,
          value: { writeText: (text: string) => (copied.push(text), Promise.resolve()) },
        });
      });
      await page.goto("./");
      const tutor = page.locator(".explainer-tutor");
      // the first assistant is the default way; "Prompt kopieren" is picked from the select, and stays the way
      await expect(tutor.locator(".explainer-tutor-go")).toHaveText(messageOf("de", "tutorGo", { name: "Claude" }));
      expect(await page.evaluate(() => Object.keys(localStorage)), "nothing is kept before a choice").toEqual([]);
      await tutor.locator(".explainer-tutor-select").selectOption({ label: messageOf("de", "tutorCopy") });
      await tutor.getByRole("button", { name: messageOf("de", "tutorCopy") }).click();
      await expect(tutor.locator(".explainer-tutor-status")).toHaveText(messageOf("de", "tutorCopied"));
      const copied = await page.evaluate(() => (window as unknown as { copied: string[] }).copied);
      expect(copied, "one prompt copied").toHaveLength(1);
      expect(copied[0], "the prompt links llms.txt at the app's address").toContain(
        new URL("llms.txt", page.url()).href,
      );
      expect(copied[0]).not.toContain("⟦base⟧");
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
        // the button copies the prompt with the page's address once "Prompt kopieren" is the way
        const tutor = page.locator(".explainer-tutor");
        await tutor.locator(".explainer-tutor-select").selectOption({ label: messageOf("de", "tutorCopy") });
        await tutor.locator(".explainer-tutor-go").click();
        await expect(tutor.locator(".explainer-tutor-status")).toHaveText(messageOf("de", "tutorCopied"));
        const copied = await page.evaluate(() => (window as unknown as { copied: string[] }).copied);
        expect(copied[0], "the prompt names the page's address").toContain(page.url());
        // the links of the prompt start at the root of the language tree, not at the page's folder
        const tree = new URL("../".repeat(item.url.split("/").filter((part) => part !== "").length), page.url());
        expect(copied[0], "llms.txt at the root of the tree").toContain(new URL("llms.txt", tree).href);
        expect(copied[0]).not.toContain(new URL("llms.txt", page.url()).href);
        expect(copied[0], "and the task of the exercise, with its solution").toContain(`${first}=${after.get(first)}`);
        // the way is the default from then on
        await page.reload();
        await expect(tutor.locator(".explainer-tutor-go")).toHaveText(messageOf("de", "tutorCopy"));
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
