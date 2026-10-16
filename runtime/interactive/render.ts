// Renders the pages of an interactive app at build time from src/app.yaml, in each of its languages (German at the
// root, every other language below /<language>/):
// - the start page (index.html): what the app does, a link into the app, its routes, how to play, what a learner
//   learns, and the background sections; complete static HTML, with a <noscript> note that the app needs JavaScript;
// - the app page (app/index.html): the title, a <noscript> note, the routes as links to their anchors (#<id>, each the
//   id of its list item, so that a topic app/#<id> of the catalog entry finds it), and the element the app's root
//   component is mounted into (interactive.ts).
// Each page has its language, its alternates and a language switch of plain links, the archetype marker, and the
// footer with imprint and privacy notice. The end-to-end tests rely on the classes and ids written here.
import { inLanguage, type Text } from "../shared/languages.ts";
import { alternateLinks, languageRoot, languageSwitch, relative } from "../shared/pages.ts";
import { plain, renderMarkdown } from "../explainer/markdown.ts";
import type { App } from "./load.ts";
import { message, type Messages } from "./messages.ts";

/** The address of the app page, from a language tree's root. */
export const APP_PAGE = "app/";

/** A page of the app in one language. */
export interface Page {
  kind: "start" | "app";
  lang: string;
  /** Where the page is, from the app's root: "", "app/", "en/", "en/app/". */
  path: string;
  /** The same page's address within any language tree: "" or "app/". */
  local: string;
}

/** A page, rendered: what goes into the shell's head and body. */
export interface RenderedPage {
  page: Page;
  head: string;
  body: string;
}

/** Every page of the app, in every language. */
export function pages(app: App): Page[] {
  return app.languages.flatMap((lang) =>
    (["start", "app"] as const).map((kind) => {
      const local = kind === "start" ? "" : APP_PAGE;
      return { kind, lang, path: `${languageRoot(lang)}${local}`, local };
    }),
  );
}

/** The ids of the routes, in order: the app page's anchors. */
export const routeIds = (app: App): string[] => (app.routes ?? []).map((route) => route.id);

/** One page of the app. */
export function renderPage(app: App, page: Page): RenderedPage {
  const { lang, path } = page;
  const t = (key: keyof Messages) => plain(message(lang, key));
  const text = (value: Text) => plain(inLanguage(value, lang));
  /** A link from this page to `to` (from the language tree's root). */
  const to = (target: string) => relative(path, `${languageRoot(lang)}${target}`);
  const markdown = (value: Text) =>
    renderMarkdown(inLanguage(value, lang), (href) => (href.startsWith("/") ? to(href.slice(1)) : href));
  const title = text(app.title);
  const switcher = languageSwitch({
    ...page,
    languages: app.languages,
    className: "interactive-languages",
    label: t("languages"),
    name: (other) => plain(message(other, "language")),
  });
  const header = `<header class="interactive-header"><p class="interactive-brand"><a href="${to("")}">${title}</a></p>${switcher}</header>`;
  const footer = `<footer class="interactive-footer"><p>${t("footer")} · <a href="https://lernapps.net/imprint/">${t("imprint")}</a> · <a href="https://lernapps.net/privacy/">${t("privacy")}</a></p></footer>`;
  const routes = app.routes ?? [];
  let main: string;
  if (page.kind === "start") {
    const routeList =
      routes.length === 0
        ? ""
        : `<section class="interactive-section"><h2>${t("routes")}</h2><ul class="interactive-route-list">${routes
            .map((route) => {
              const description =
                route.description === undefined
                  ? ""
                  : ` <span class="interactive-description">${text(route.description)}</span>`;
              return `<li><a href="${to(`${APP_PAGE}#${route.id}`)}">${text(route.title)}</a>${description}</li>`;
            })
            .join("")}</ul></section>`;
    main = [
      `<h1>${title}</h1>`,
      `<div class="interactive-intro">${markdown(app.description)}</div>`,
      `<noscript><p class="interactive-noscript">${t("noscript")}</p></noscript>`,
      `<p class="interactive-play"><a class="interactive-start" href="${to(APP_PAGE)}">${t("play")}</a></p>`,
      routeList,
      `<section class="interactive-section interactive-howto"><h2>${t("howto")}</h2>${markdown(app.howto)}</section>`,
      `<section class="interactive-section"><h2>${t("competencies")}</h2><ul class="interactive-competencies">${app.competencies
        .map((competency) => `<li>${text(competency)}</li>`)
        .join("")}</ul></section>`,
      ...(app.sections ?? []).map(
        (section) =>
          `<section class="interactive-section"><h2 id="${section.id}">${text(section.title)}</h2>${markdown(section.text)}</section>`,
      ),
    ]
      .filter((part) => part !== "")
      .join("\n");
  } else {
    const nav =
      routes.length === 0
        ? ""
        : `<nav class="interactive-routes" aria-label="${t("routes")}"><ul>${routes
            .map((route) => `<li id="${route.id}"><a href="#${route.id}">${text(route.title)}</a></li>`)
            .join("")}</ul></nav>`;
    main = [
      `<h1>${title}</h1>`,
      `<noscript><p class="interactive-noscript">${t("noscriptApp")} <a href="${to("")}">${t("toStart")}</a></p></noscript>`,
      nav,
      `<div class="interactive-app" data-routes="${plain(JSON.stringify(routeIds(app)))}"></div>`,
    ]
      .filter((part) => part !== "")
      .join("\n");
  }
  const body = [header, `<main class="interactive" id="inhalt">`, main, `</main>`, footer].join("\n");
  const head = [
    `<title>${page.kind === "start" ? title : `${t("play")} – ${title}`}</title>`,
    `<meta name="description" content="${plain(inLanguage(app.description, lang).replace(/\s+/g, " ").trim())}" />`,
    `<meta name="lernapps-archetype" content="interactive" />`,
    ...alternateLinks({ ...page, languages: app.languages }),
  ].join("\n    ");
  return { page, head, body };
}
