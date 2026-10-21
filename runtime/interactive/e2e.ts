// The end-to-end tests of every interactive app (@lernapps/app-templates/interactive/e2e), run by `lernapps check
// --pre-push` on the built app. An app's e2e/interactive.e2e.ts is
//
//   import { interactiveTests } from "@lernapps/app-templates/interactive/e2e";
//   interactiveTests();
//
// What they expect comes from src/app.yaml and src/playthroughs/ (load.ts), not from the rendered pages. Without
// JavaScript, in every language: the start page shows the title, what the app does, the note that the app needs
// JavaScript, the link into the app, a link to each route, how to play, each competency and each background section,
// and loads no script; the app page shows the title, the note with a link back to the start page, and an element
// with each route's id; each page has its language, its alternates, a language switch and the archetype marker. With
// JavaScript, in German: the app page mounts the app without a console error, and every playthrough plays at its
// address (app/?seed=<seed>#<route>) on the tests' clock (CLOCK_PROPERTY), on which no time passes but the ticks a
// step names, as in the build: each step's inputs one after the other, a key pressed on the keyboard with the focus
// on the page, an action emitted as input by the app's root component, as the component itself does; then its ticks,
// stepped through the runtime's own tick; after each step the state it expects (the fields it names, read from the
// runtime) and the announcement it expects (the polite live region of @lernapps/tooling/a11y). The tests run in
// parallel, with reduced motion; the preset runs them at desktop width and at 360 px; `lernapps check` adds axe and
// the width on the pages it visits.
import { expect, test, type Page } from "playwright/test";
import { inLanguage } from "../shared/languages.ts";
import { languageRoot } from "../shared/pages.ts";
import { CLOCK_PROPERTY, doingText, inputsOf, mismatch, STATE_PROPERTY } from "./contract.ts";
import { loadInteractive } from "./load.ts";
import { message } from "./messages.ts";
import { APP_PAGE } from "./render.ts";

/** The page's language, its alternates and a switch to each other language, the archetype marker. */
async function expectFrame(page: Page, lang: string, languages: readonly string[]): Promise<void> {
  await expect(page.locator("html")).toHaveAttribute("lang", lang);
  await expect(page.locator('meta[name="lernapps-archetype"]')).toHaveAttribute("content", "interactive");
  for (const other of languages) {
    await expect(page.locator(`link[rel="alternate"][hreflang="${other}"]`)).toHaveCount(1);
    if (other === lang) continue;
    const link = page.locator(`.page-languages a[hreflang="${other}"]`);
    await expect(link).toBeVisible();
    const response = await page.request.get(await link.evaluate((a) => (a as HTMLAnchorElement).href));
    expect(response.status(), `the switch to ${other}`).toBe(200);
  }
}

/** Collects the page's console errors and uncaught exceptions. */
function consoleErrors(page: Page): string[] {
  const errors: string[] = [];
  page.on("console", (entry) => {
    if (entry.type() === "error") errors.push(entry.text());
  });
  page.on("pageerror", (error) => errors.push(error.message));
  return errors;
}

/** The instance of a component, as Vue mounts it. */
type Instance = { emit(event: string, payload: unknown): void; subTree?: { component?: Instance } };

/** Emits `input` (an Input) as input from the app's root component in `host`, as the component itself does. */
function emitInput(host: Element, input: unknown): void {
  const wrapper = (host as unknown as { _vnode?: { component?: Instance } })._vnode?.component;
  const root = wrapper?.subTree?.component;
  if (root === undefined) throw new Error("the app's root component is not mounted");
  root.emit("input", input);
}

/** Steps `count` ticks on the tests' clock of the page, the global `property`. */
function stepTicks({ count, property }: { count: number; property: string }): void {
  (Reflect.get(globalThis, property) as { tick(count: number): void }).tick(count);
}

/** The interactive app's tests, for the app in `root`. */
export function interactiveTests(root = "."): void {
  const { app, playthroughs } = loadInteractive(root);
  const routes = app.routes ?? [];

  test.describe("interactive", () => {
    test.describe.configure({ mode: "parallel" });
    test.use({ reducedMotion: "reduce" });

    test.describe("without JavaScript", () => {
      test.use({ javaScriptEnabled: false });

      for (const lang of app.languages) {
        const start = languageRoot(lang);
        const text = (value: Parameters<typeof inLanguage>[0]) => inLanguage(value, lang).replace(/\s+/g, " ").trim();

        test(`${start || "./"}: the start page says what the app does, how to play and what one learns`, async ({
          page,
        }) => {
          await page.goto(`./${start}`);
          await expectFrame(page, lang, app.languages);
          const main = page.locator("main");
          await expect(main.locator("h1")).toHaveText(text(app.title));
          await expect(main.locator(".interactive-intro")).toBeVisible();
          await expect(main.locator(".interactive-noscript"), "the note that the app needs JavaScript").toBeVisible();
          const play = main.locator("a.interactive-start");
          await expect(play).toBeVisible();
          const response = await page.request.get(await play.evaluate((a) => (a as HTMLAnchorElement).href));
          expect(response.status(), "the link into the app").toBe(200);
          for (const route of routes) {
            const link = main.locator(`a[href$="${APP_PAGE}#${route.id}"]`);
            await expect(link, `the link to the route ${route.id}`).toHaveText(text(route.title));
          }
          await expect(
            main.getByRole("heading", { level: 2, name: message(lang, "howto"), exact: true }),
          ).toBeVisible();
          for (const competency of app.competencies) {
            await expect(main.locator(".interactive-competencies li", { hasText: text(competency) })).toBeVisible();
          }
          for (const section of app.sections ?? []) {
            await expect(main.locator(`h2[id="${section.id}"]`), `the section ${section.id}`).toHaveText(
              text(section.title),
            );
          }
          expect(await page.locator("script").count(), "the start page loads no script").toBe(0);
        });

        test(`${start}${APP_PAGE}: the app page says that the app needs JavaScript and has each route's anchor`, async ({
          page,
        }) => {
          await page.goto(`./${start}${APP_PAGE}`);
          await expectFrame(page, lang, app.languages);
          const main = page.locator("main");
          await expect(main.locator("h1"), "one h1: the title").toHaveText(text(app.title));
          await expect(page.locator(".interactive-title-slot"), "the slot of the heading line").toBeHidden();
          const note = main.locator(".interactive-noscript");
          await expect(note, "the note that the app needs JavaScript").toBeVisible();
          const back = await note.locator("a").evaluate((a) => (a as HTMLAnchorElement).href);
          expect(back, "the note links the start page").toBe(new URL("../", page.url()).href);
          for (const route of routes) {
            await expect(main.locator(`[id="${route.id}"]`), `the anchor of the route ${route.id}`).toHaveText(
              text(route.title),
            );
          }
        });
      }
    });

    test.describe("with JavaScript", () => {
      test(`${APP_PAGE}: the app mounts without a console error`, async ({ page }) => {
        const errors = consoleErrors(page);
        await page.goto(`./${APP_PAGE}`);
        await expect(page.locator(".interactive-app")).toHaveAttribute("data-mounted", "");
        await expect(page.locator(".interactive-app")).not.toBeEmpty();
        expect(errors, "no console error").toEqual([]);
      });

      for (const { yaml, playthrough } of playthroughs) {
        const route = playthrough.route ?? routes[0]?.id;
        test(`${yaml.file}: played with its inputs and ticks`, async ({ page }) => {
          const errors = consoleErrors(page);
          // before the client module runs: the runtime then starts no interval, and time passes only by stepTicks
          await page.addInitScript((property) => Reflect.set(globalThis, property, {}), CLOCK_PROPERTY);
          await page.goto(`./${APP_PAGE}?seed=${playthrough.seed}${route === undefined ? "" : `#${route}`}`);
          const host = page.locator(".interactive-app");
          await expect(host).toHaveAttribute("data-mounted", "");
          // the polite live region of @lernapps/tooling/a11y, which announce() fills
          const live = page.locator('body > [aria-live="polite"]');
          for (const [index, step] of playthrough.steps.entries()) {
            for (const input of inputsOf(step)) {
              if (input.kind === "key") await page.keyboard.press(input.key);
              else await host.evaluate(emitInput, input as unknown);
            }
            if (step.ticks !== undefined)
              await page.evaluate(stepTicks, { count: step.ticks, property: CLOCK_PROPERTY });
            const where = `${yaml.file}: steps[${index}] after ${doingText(step).join(", ")}`;
            if (step.state !== undefined) {
              const state = await host.evaluate(
                (element, property) => (element as unknown as Record<string, unknown>)[property],
                STATE_PROPERTY,
              );
              expect(mismatch(state, step.state), `${where}: the state`).toBeUndefined();
            }
            if (step.announce !== undefined) await expect(live, `${where}: the announcement`).toHaveText(step.announce);
          }
          expect(errors, "no console error").toEqual([]);
        });
      }
    });
  });
}
