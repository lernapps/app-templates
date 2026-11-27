// Streamlined entry and learning-path navigation for explainers, and back-link on interactive /app/ pages.
import { join } from "node:path";
import { expect, test } from "vite-plus/test";
import { loadSite } from "../runtime/explainer/load.ts";
import { renderPage } from "../runtime/explainer/render.ts";
import { routes } from "../runtime/explainer/routes.ts";
import { loadInteractive } from "../runtime/interactive/load.ts";
import { pages as interactivePages, renderPage as renderInteractive } from "../runtime/interactive/render.ts";

test("explainer start page links primary CTA to the first non-recap page and renders chapter accordions", () => {
  const site = loadSite(join(import.meta.dirname, "../explainer"));
  const startRoute = routes(site).find((r) => r.kind === "start" && r.lang === "de");
  expect(startRoute).toBeDefined();
  const rendered = renderPage(site, startRoute!);
  expect(rendered.body).toContain('class="explainer-start-cta"');
  expect(rendered.body).toContain('data-continue-template="Weiterlernen: {title}"');
  expect(rendered.body).toContain("Loslegen:");
  // multi-chapter apps use collapsible <details> instead of redundant chapter-page links
  if (site.chapters.length > 1) {
    expect(rendered.body).toContain('<details class="explainer-chapter-group" open>');
    expect(rendered.body).not.toContain('class="explainer-chapter-link"');
  }
});

test("explainer content page renders progress bar, sidebar learning-path nav, and storage/page-key attributes", () => {
  const site = loadSite(join(import.meta.dirname, "../explainer"));
  const pageRoute = routes(site).find((r) => r.kind === "page" && r.lang === "de");
  expect(pageRoute).toBeDefined();
  const rendered = renderPage(site, pageRoute!);
  expect(rendered.body).toContain('class="explainer-progress"');
  expect(rendered.body).toContain('class="explainer-layout"');
  expect(rendered.body).toContain('class="explainer-sidebar"');
  expect(rendered.body).toContain('<details class="explainer-nav">');
  expect(rendered.body).toContain('aria-current="page"');
  expect(rendered.body).toContain("data-storage=");
  expect(rendered.body).toContain("data-page-key=");
});

test("interactive /app/ page includes a link back to the start page (howto)", () => {
  const { app } = loadInteractive(join(import.meta.dirname, "../interactive"));
  const appRoute = interactivePages(app).find((p) => p.kind === "app" && p.lang === "de");
  expect(appRoute).toBeDefined();
  const rendered = renderInteractive(app, appRoute!);
  expect(rendered.body).toContain('class="interactive-howto-link"');
  expect(rendered.body).toContain('href="../"');
});
