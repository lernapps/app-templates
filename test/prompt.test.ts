// The prompt a provider link carries from a content page, the one kind of page that starts a tutor (prompt.ts): one
// sentence in the learner's voice with one address, the page's tutor page, however many pages the app has. A chat
// assistant fetches only addresses its user wrote into the conversation; the query of the address says where the
// learner is, which the client module fills in (position.ts).
import { cpSync, mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { expect, test } from "vite-plus/test";
import type { Site } from "../runtime/explainer/content.ts";
import { loadSite } from "../runtime/explainer/load.ts";
import { BASE, QUERY, startPrompt, withBase } from "../runtime/explainer/prompt.ts";
import { routes } from "../runtime/explainer/routes.ts";

const fixture = (name: string): Site => {
  const root = mkdtempSync(join(tmpdir(), "explainer-prompt-"));
  cpSync(join(import.meta.dirname, "fixtures", name), join(root, "src"), { recursive: true });
  return loadSite(root, 0);
};

/** The site with ten times as many pages in each chapter. */
const withMorePages = (site: Site): Site => ({
  ...site,
  chapters: site.chapters.map((chapter) => ({
    ...chapter,
    pages: Array.from({ length: 10 }, (_, copy) =>
      chapter.pages.map((page) => ({ ...page, id: copy === 0 ? page.id : `${page.id}-${copy}` })),
    ).flat(),
  })),
});

const addresses = (text: string) => text.split(BASE).length - 1;

test("from a content page: exactly one address, the page's tutor page with the position, however many pages", () => {
  const site = fixture("explainer-all-blocks");
  const more = withMorePages(site);
  for (const route of routes(site).filter((candidate) => candidate.kind === "page")) {
    const prompt = startPrompt(route);
    expect(addresses(prompt), `${route.path}: one address`).toBe(1);
    expect(prompt).toContain(`${BASE}${route.page?.chapter}/${route.page?.id}/tutor/${QUERY}`);
    const same = routes(more).find((candidate) => candidate.path === route.path);
    if (same === undefined) throw new Error(`no ${route.path}`);
    expect(startPrompt(same), "the same with ten times the pages").toBe(prompt);
  }
  const page = routes(site).find((route) => route.kind === "page" && route.lang === "de");
  if (page === undefined) throw new Error("no page");
  // the learner's voice only: the tutor page has the guide
  expect(withBase(startPrompt(page), "https://lernapps.net/alle/").replace(QUERY, "?prozent-rechnen=3")).toBe(
    "Lade https://lernapps.net/alle/zahlen/zahlen-01/tutor/?prozent-rechnen=3 und hilf mir, diese Seite zu verstehen.",
  );
  const english = routes(site).find((route) => route.kind === "page" && route.lang === "en");
  if (english === undefined) throw new Error("no English page");
  expect(startPrompt(english)).toBe(`Load ${BASE}zahlen/zahlen-01/tutor/${QUERY} and help me understand this page.`);
});
