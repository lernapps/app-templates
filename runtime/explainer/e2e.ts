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
// per page: a question of the quiz's types accepts its right answer and rejects a wrong one, the feedback in view with
// the focus; a generated exercise shows, at its deep link ?seed=<n>#<id>, the task the notation gives for that seed,
// accepts its right answer, rejects a wrong one (a mistake, with its message), and "Neue Aufgabe" changes the
// task. No page stores anything on the device. The tests run in parallel, with reduced motion; the preset runs
// them at desktop width and at 360 px; `lernapps check` adds axe and the width on the pages it visits.
import { expect, test, type Page } from "playwright/test";
import { questionId, rightAnswer, wrongAnswer } from "../quiz/quiz.ts";
import { answerQuestion, expectFeedbackInView } from "../quiz/e2e.ts";
import { messagesIn } from "../quiz/render.ts";
import { answerFor, fill, generate, plainText, questionFor, taskKey, taskText } from "./generated.ts";
import { outline, type ExerciseOutline, type PageOutline } from "./outline.ts";

/** The seed of the deep link the tests open a generated exercise with. */
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
    .locator("details.explainer-solution > summary")
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

/** The feedback of the question `id` says `text`. */
const feedback = (page: Page, id: string) => page.locator(`[id="${id}"] .quiz-feedback`);

/** With JavaScript: a question of the quiz's types accepts its right answer and rejects a wrong one. */
async function checkQuestion(
  page: Page,
  url: string,
  exercise: Extract<ExerciseOutline, { kind: "question" }>,
): Promise<void> {
  const { question } = exercise;
  await page.goto(`./${url}#${exercise.id}`);
  await answerQuestion(page, question, rightAnswer(question));
  await expect(feedback(page, questionId(question))).toContainText(messagesIn("de").right);
  await expectFeedbackInView(page, question);
  await page.reload();
  await answerQuestion(page, question, wrongAnswer(question));
  await expect(feedback(page, questionId(question))).toContainText(messagesIn("de").wrong);
  await expectFeedbackInView(page, question);
}

/** With JavaScript: a generated exercise at its deep link, its answers, a mistake, and "Neue Aufgabe". */
async function checkGenerated(
  page: Page,
  url: string,
  exercise: Extract<ExerciseOutline, { kind: "generated" }>,
): Promise<void> {
  const { spec, data, templates } = exercise;
  const task = generate(spec, SEED, data);
  const question = questionFor(spec, task, "de", templates);
  const address = `./${url}?seed=${SEED}#${exercise.id}`;
  const legend = page.locator(`[id="${questionId(question)}"] legend`);
  await page.goto(address);
  await expect(legend, "the deep link shows the task of its seed").toHaveText(
    plainText(taskText(spec, task, "de", templates)),
  );
  // a wrong answer: the first mistake, with its message; the comparator's wrong answer without mistakes
  if (task.mistakes.length > 0) {
    await answerQuestion(page, question, answerFor(spec, task, question, 0));
    const message = fill(templates["de"]?.messages[0] ?? "", spec, task, "de", "text");
    await expect(feedback(page, questionId(question)).locator(".quiz-diagnosis"), "the mistake's message").toHaveText(
      message,
    );
  } else await answerQuestion(page, question, wrongAnswer(question));
  await expect(feedback(page, questionId(question))).toContainText(messagesIn("de").wrong);
  await expectFeedbackInView(page, question);
  // "Neue Aufgabe": another task, its seed in the address; its right answer counts
  await page.locator(`[id="${exercise.id}"] .explainer-new-task`).click();
  const seed = Number(new URL(page.url()).searchParams.get("seed"));
  expect(seed, "the new task's seed in the address").not.toBe(SEED);
  const next = generate(spec, seed, data);
  const nextQuestion = questionFor(spec, next, "de", templates);
  const nextLegend = page.locator(`[id="${questionId(nextQuestion)}"] legend`);
  await expect(nextLegend).toHaveText(plainText(taskText(spec, next, "de", templates)));
  expect(taskKey(spec, next, "de", templates), "a new task").not.toBe(taskKey(spec, task, "de", templates));
  await expect(nextLegend).toBeFocused();
  await answerQuestion(page, nextQuestion, rightAnswer(nextQuestion));
  await expect(feedback(page, questionId(nextQuestion))).toContainText(messagesIn("de").right);
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
    const other = page.locator(`.explainer-languages a[hreflang="${lang}"]`);
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
            await expect(main.locator("math"), "one <math> per formula").toHaveCount(item.formulas);
            for (const name of item.figures) {
              await expect(main.getByRole("img", { name, exact: true }).first(), `the figure "${name}"`).toBeVisible();
            }
            await expectAnchors(page);
            await expectLanguages(page, item, app.languages);
            await expectExercises(page, item);
          });
        }

        for (const item of app.others[lang] ?? []) {
          test(`${item.url || "./"}: its heading, its links and anchors, its languages`, async ({ page }) => {
            await page.goto(`./${item.url}`);
            await expect(page.locator("main h1")).toHaveText(item.title);
            await expectAnchors(page);
            await expectLanguages(page, item, app.languages);
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
    });

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
