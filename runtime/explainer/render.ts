// Renders every page of an explainer at build time into static HTML: the text, every formula as MathML, every figure
// as inline SVG or an image, tables, timelines, definitions, quotes, highlighted code, the exercises (exercises.ts:
// each with its solution in a <details>, a generated one with three worked tasks), and the navigation (contents,
// breadcrumbs, previous and next, the contents of a page with three or more sections, the glossary, the language
// switch). Without JavaScript the page is complete; the client module only adds. A vue-component block is its island:
// the component's markup as the build rendered it (`hidden` until it hydrates), its nojs text, its props in the page's
// language, and for an exercise its anchor, its task number with "Neue Aufgabe", the task of number 1 as its describe
// states it with the solution folded, and the place of its feedback. Links to other sites are plain links with rel="noopener":
// nothing is loaded from another server before a click. The end-to-end tests rely on the classes, ids and rel
// attributes written here.
import { questionMessagesIn } from "../shared/questions/render.ts";
import { propsIn } from "./components/props.ts";
import {
  inLanguage,
  termId as termIdOf,
  timelineEvents,
  type Block,
  type BlockOf,
  type Event,
  type Site,
  type Text,
  type Descriptions,
} from "./content.ts";
import { renderExercise } from "./exercises.ts";
import { isSizeless } from "../shared/blocks/image.ts";
import { renderMaterial, type MaterialContext } from "../shared/blocks/index.ts";
import { localeOf } from "../shared/languages.ts";
import { plain, renderInline, renderMarkdown } from "../shared/text/markdown.ts";
import { message, type Messages } from "./messages.ts";
import { alternateLinks, languageRoot, pageFooter, pageHeader, relative } from "../shared/pages.ts";
import { contentPages, hiddenChapter, routes, terms, type Route } from "./routes.ts";
import { tutorPageOf } from "./tutor.ts";
import { BASE, plainAddress, PROVIDERS, QUERY, startPrompt } from "./prompt.ts";
import { pageExercises, sectionsOf, TUTOR_MARKDOWN } from "./tutorpage.ts";
import { NEW_TASK_ICON } from "./tasks.ts";

function sizeless(site: Site, image: string): boolean {
  const file = site.images.get(image);
  return file !== undefined && isSizeless(file);
}

/** A rendered page: its language, what goes into <head>, and what replaces the marker in <body>. */
export interface RenderedPage {
  route: Route;
  head: string;
  body: string;
  /** Whether it has a component, which the islands module hydrates. */
  islands: boolean;
}

/** The markup of each vue-component block in each language, as the build rendered it (plugin.ts). */
export type Islands = ReadonlyMap<Block, ReadonlyMap<string, string>>;

/** What rendering one page needs. */
class Context {
  readonly locale: string;
  readonly site: Site;
  readonly route: Route;
  readonly islands: Islands;
  readonly descriptions: Descriptions;
  /** What the blocks that show content need from this page. */
  readonly material: MaterialContext;
  /** Whether a component was rendered. */
  hasIslands = false;
  constructor(site: Site, route: Route, islands: Islands, descriptions: Descriptions) {
    this.site = site;
    this.route = route;
    this.islands = islands;
    this.descriptions = descriptions;
    this.locale = localeOf(route.lang);
    this.material = {
      lang: route.lang,
      href: (image) => relative(route.path, image),
      resolve: this.resolve,
      sizeless: (image) => sizeless(site, image),
    };
  }
  get lang(): string {
    return this.route.lang;
  }
  t(key: keyof Messages, params?: Readonly<Record<string, string>>): string {
    return message(this.lang, key, params);
  }
  /** The text in this page's language, as plain HTML. */
  text(text: Text): string {
    return plain(inLanguage(text, this.lang));
  }
  /** A link from this page to `local` (an address within the language tree, e.g. "prozent/prozentwert/#regel"). */
  to(local: string): string {
    return relative(this.route.path, languageRoot(this.lang) + local);
  }
  /** Where a link inside a text leads: /<chapter>/<page>/#<section> within this language's tree. */
  readonly resolve = (href: string): string => this.to(href.replace(/^\//, ""));
  markdown(text: Text): string {
    return renderMarkdown(inLanguage(text, this.lang), this.resolve);
  }
  inline(text: Text): string {
    return renderInline(inLanguage(text, this.lang), this.resolve);
  }
}

const external = (url: string, text = url) => `<a href="${plain(url)}" rel="noopener">${plain(text)}</a>`;

function dateLabel(context: Context, event: Event): { label: string; datetime?: string } {
  const date = String(event.date);
  const match = /^(-?\d{1,4})(?:-(\d{2}))?(?:-(\d{2}))?$/.exec(date);
  const year = Number(match?.[1] ?? 0);
  const datetime = year >= 0 && match !== null ? date.replace(/^\d+/, (digits) => digits.padStart(4, "0")) : undefined;
  if (event.label !== undefined)
    return { label: context.text(event.label), ...(datetime === undefined ? {} : { datetime }) };
  if (year < 0) return { label: plain(context.t("beforeChrist", { year: String(-year) })) };
  let label = String(year);
  if (match?.[2] !== undefined) {
    const when = new Date(Date.UTC(year, Number(match[2]) - 1, Number(match[3] ?? 1)));
    when.setUTCFullYear(year);
    label = new Intl.DateTimeFormat(context.locale, {
      timeZone: "UTC",
      year: "numeric",
      month: "long",
      ...(match[3] === undefined ? {} : { day: "numeric" }),
    }).format(when);
  }
  return { label: plain(label), ...(datetime === undefined ? {} : { datetime }) };
}

function renderEvents(context: Context, events: readonly Event[]): string {
  const items = events.map((event) => {
    const { label, datetime } = dateLabel(context, event);
    const when =
      datetime === undefined
        ? `<span class="explainer-date">${label}</span>`
        : `<time class="explainer-date" datetime="${datetime}">${label}</time>`;
    const text =
      event.text === undefined ? "" : `<div class="explainer-event-text">${context.markdown(event.text)}</div>`;
    return `<li><p class="explainer-event">${when} <strong>${context.text(event.title)}</strong></p>${text}</li>`;
  });
  return `<ol class="explainer-timeline">${items.join("")}</ol>`;
}

/** The blocks, at heading level `level` (the level of the heading they are under: 1 for the page). */
function renderBlocks(context: Context, blocks: readonly Block[], level: number, anchor: string[] = []): string {
  return blocks.map((block) => renderBlock(context, block, level, anchor)).join("\n");
}

function renderBlock(context: Context, block: Block, level: number, anchor: string[]): string {
  switch (block.type) {
    case "section": {
      const id = [...anchor, block.id];
      return [
        `<section class="explainer-section">`,
        `<h${level + 1} id="${id.join("/")}">${context.text(block.title)}</h${level + 1}>`,
        renderBlocks(context, block.blocks, level + 1, id),
        `</section>`,
      ].join("\n");
    }
    case "example":
    case "note":
      return [
        `<div class="explainer-box explainer-${block.type}">`,
        `<h${level + 1} class="explainer-box-title">${context.text(block.title)}</h${level + 1}>`,
        renderBlocks(context, block.blocks, level + 1, anchor),
        `</div>`,
      ].join("\n");
    case "text":
    case "formula":
    case "figure":
    case "labelled-figure":
    case "table":
      return renderMaterial([block], context.material);
    case "timeline":
      return renderEvents(context, timelineEvents(context.site, block));
    case "definition": {
      const id = termIdOf(block.term);
      return [
        `<dl class="explainer-definition">`,
        `<dt><dfn id="begriff-${id}"><a href="${context.to(`glossar/#${id}`)}">${context.text(block.term)}</a></dfn></dt>`,
        `<dd>${context.markdown(block.explanation)}</dd>`,
        `</dl>`,
      ].join("");
    }
    case "quote":
    case "code":
      return renderMaterial([block], context.material);
    case "vue-component":
      return renderComponent(context, block);
    default:
      return renderExercise(block, context.lang, context.site.data, context.resolve, context.material);
  }
}

const json = (value: unknown) => JSON.stringify(value).replace(/</g, "\\u003c");

/**
 * A vue-component block: its island, hidden until it hydrates, its nojs text, its props and its feedback. An exercise
 * component has its anchor, its task number with "Neue Aufgabe" (hidden until it hydrates), and as its no-JS text the
 * task of number 1 as its describe states it, with the solution folded, under the block's own nojs text if it has one.
 */
function renderComponent(context: Context, block: BlockOf<"vue-component">): string {
  const use = context.site.components.find((candidate) => candidate.block === block);
  if (use === undefined) return "";
  context.hasIslands = true;
  const { component } = use;
  const markup = context.islands.get(block)?.get(context.lang) ?? "";
  const messages = questionMessagesIn(context.lang);
  const feedback = component.exercise
    ? `<p class="question-feedback" data-right="${plain(messages.right)}" data-wrong="${plain(messages.wrong)}"></p>`
    : "";
  const first = context.descriptions.get(block)?.tasks[context.lang]?.[0];
  const number = (seed: number) => plain(context.t("taskNumber", { n: String(seed) }));
  const described =
    first === undefined
      ? ""
      : [
          `<div class="explainer-described">`,
          `<p class="explainer-task-number">${number(first.number)}</p>`,
          `<div class="explainer-task">${renderMarkdown(first.task, context.resolve)}</div>`,
          `<details class="explainer-solution"><summary>${plain(messages.solution)}</summary>${renderMarkdown(first.solution, context.resolve)}</details>`,
          `</div>`,
        ].join("");
  const nojs = (block.nojs === undefined ? "" : context.markdown(block.nojs)) + described;
  const controls = component.exercise
    ? `<p class="explainer-task-controls" hidden><span class="explainer-task-number" tabindex="-1" data-template="${plain(context.t("taskNumber"))}">${number(1)}</span> <button type="button" class="explainer-new-task" aria-label="${plain(context.t("newTask"))}" title="${plain(context.t("newTask"))}">${NEW_TASK_ICON}</button></p>`
    : "";
  const attributes = [
    ...(use.id === undefined ? [] : [`id="${use.id}"`]),
    `data-component="${component.name}"`,
    // the seed of each task number, which the islands draw the task from
    ...(component.exercise
      ? [`data-exercise data-seeds="${JSON.stringify(context.descriptions.get(block)?.seeds ?? [1])}"`]
      : []),
    ...(component.caption ? [`data-nojs="caption" data-caption="${plain(context.t("textDescription"))}"`] : []),
  ];
  return [
    `<div class="explainer-component" ${attributes.join(" ")}>`,
    controls,
    `<div class="explainer-island" hidden>${markup}</div>`,
    `<div class="explainer-nojs">${nojs}</div>`,
    feedback,
    `<script type="application/json" class="explainer-component-props">${json(propsIn(block.props, component, context.lang))}</script>`,
    `</div>`,
  ]
    .filter((part) => part !== "")
    .join("\n");
}

/** The contents of a page with three or more sections: the sections and their subsections. */
function pageContents(context: Context, blocks: readonly Block[]): string {
  const sections = blocks.filter((block) => block.type === "section");
  if (sections.length < 3) return "";
  const list = (items: readonly Block[], anchor: string[]): string =>
    `<ol>${items
      .filter((block) => block.type === "section")
      .map((section) => {
        const id = [...anchor, section.id];
        const inner = section.blocks.some((block) => block.type === "section") ? list(section.blocks, id) : "";
        return `<li><a href="#${id.join("/")}">${context.text(section.title)}</a>${inner}</li>`;
      })
      .join("")}</ol>`;
  return `<nav class="explainer-toc" aria-label="${plain(context.t("onThisPage"))}"><p class="explainer-toc-title">${plain(context.t("onThisPage"))}</p>${list(blocks, [])}</nav>`;
}

function header(context: Context): string {
  const { site, route } = context;
  // only the language switch: the breadcrumbs lead to the start page, and the way back to the catalog is the platform's
  return pageHeader({
    ...route,
    languages: site.app.languages,
    label: plain(context.t("languages")),
    name: (lang) => plain(message(lang, "language")),
  });
}

function breadcrumbs(context: Context): string {
  const { route, site } = context;
  if (route.kind === "start") return "";
  const items = [`<li><a href="${context.to("")}">${plain(context.t("start"))}</a></li>`];
  if (route.kind === "page" && route.chapter !== undefined && !hiddenChapter(site)) {
    items.push(`<li><a href="${context.to(`${route.chapter.id}/`)}">${context.text(route.chapter.title)}</a></li>`);
  }
  items.push(`<li aria-current="page">${plain(route.title)}</li>`);
  return `<nav class="explainer-breadcrumbs" aria-label="${plain(context.t("breadcrumbs"))}"><ol>${items.join("")}</ol></nav>`;
}

function pager(context: Context): string {
  const { route, site } = context;
  if (route.page === undefined) return "";
  const pages = contentPages(site);
  const index = pages.indexOf(route.page);
  const link = (rel: "prev" | "next", key: "previous" | "next", offset: number) => {
    const other = pages[index + offset];
    if (other === undefined) return "";
    const title = inLanguage(other.title, context.lang);
    return `<a rel="${rel}" href="${context.to(`${other.chapter}/${other.id}/`)}">${plain(context.t(key, { title }))}</a>`;
  };
  return `<nav class="explainer-pager" aria-label="${plain(context.t("pager"))}">${link("prev", "previous", -1)}${link("next", "next", 1)}</nav>`;
}

function pageList(context: Context, pages: readonly NonNullable<Route["page"]>[]): string {
  return `<ol class="explainer-pages">${pages
    .map((page) => {
      const description =
        page.description === undefined
          ? ""
          : ` <span class="explainer-description">${context.text(page.description)}</span>`;
      return `<li><a href="${context.to(`${page.chapter}/${page.id}/`)}">${context.text(page.title)}</a>${description}</li>`;
    })
    .join("")}</ol>`;
}

function main(context: Context): string {
  const { route, site } = context;
  const title = `<h1>${plain(route.title)}</h1>`;
  switch (route.kind) {
    case "start": {
      const contents = hiddenChapter(site)
        ? pageList(context, site.chapters[0]?.pages ?? [])
        : `<ol class="explainer-chapters">${site.chapters
            .map((chapter) => {
              const summary = chapter.summary === undefined ? "" : context.markdown(chapter.summary);
              return `<li><a class="explainer-chapter-link" href="${context.to(`${chapter.id}/`)}">${context.text(chapter.title)}</a>${summary}${pageList(context, chapter.pages)}</li>`;
            })
            .join("")}</ol>`;
      const glossary =
        terms(site).length === 0
          ? ""
          : `<p><a href="${context.to("glossar/")}">${plain(context.t("glossary"))}</a></p>`;
      const sources =
        site.app.sources === undefined
          ? ""
          : `<section class="explainer-sources"><h2>${plain(context.t("sources"))}</h2><p>${plain(context.t("sourcesIntro"))}</p><ul>${site.app.sources
              .map((source) => {
                const text = inLanguage(source.title, context.lang);
                return `<li>${source.url === undefined ? plain(text) : external(source.url, text)}</li>`;
              })
              .join("")}</ul></section>`;
      return [
        title,
        `<div class="explainer-intro">${context.markdown(site.app.intro)}</div>`,
        `<nav class="explainer-contents" aria-labelledby="inhalt"><h2 id="inhalt">${plain(context.t("contents"))}</h2>${contents}</nav>`,
        glossary,
        tutorAbout(context),
        sources,
      ].join("\n");
    }
    case "chapter": {
      const chapter = route.chapter;
      if (chapter === undefined) return title;
      const summary =
        chapter.summary === undefined ? "" : `<div class="explainer-intro">${context.markdown(chapter.summary)}</div>`;
      return [
        title,
        summary,
        `<nav class="explainer-contents" aria-label="${plain(context.t("pages"))}">${pageList(context, chapter.pages)}</nav>`,
      ].join("\n");
    }
    case "glossary": {
      const collator = new Intl.Collator(context.locale);
      const entries = terms(site)
        .sort((a, b) => collator.compare(inLanguage(a.term, context.lang), inLanguage(b.term, context.lang)))
        .map((term) => {
          const page = inLanguage(term.page.title, context.lang);
          const back = `<a href="${context.to(`${term.page.chapter}/${term.page.id}/#begriff-${term.id}`)}">${plain(context.t("explainedOn", { page }))}</a>`;
          return `<dt id="${term.id}"><dfn>${context.text(term.term)}</dfn></dt><dd>${context.markdown(term.explanation)}<p>${back}</p></dd>`;
        });
      return [
        title,
        `<p>${plain(context.t("glossaryIntro"))}</p>`,
        `<dl class="explainer-glossary">${entries.join("")}</dl>`,
      ].join("\n");
    }
    case "page": {
      const page = route.page;
      if (page === undefined) return title;
      // the title and way A in one row: beside it on a wide screen, below it on a narrow one (explainer.css)
      return [
        `<div class="explainer-title-row">`,
        title,
        tutorSection(context),
        `</div>`,
        pageContents(context, page.blocks),
        renderBlocks(context, page.blocks, 1),
      ].join("\n");
    }
  }
}

/**
 * What a KI tutor is, on the start page: a section of its own that says what the tutor does and where it shows, the
 * choice of the learner's assistant ("Keiner" first; shown by the client module, which keeps it on the device), that the
 * learner uses an account of their own and the assistant is no offer of lernapps.net, and that nothing leaves the app
 * before a click. It starts no tutor itself.
 */
function tutorAbout(context: Context): string {
  const { site } = context;
  return [
    `<section class="explainer-tutor-about" aria-labelledby="ki-tutor">`,
    `<h2 id="ki-tutor">${plain(context.t("tutorTitle"))}</h2>`,
    `<p>${plain(context.t("tutorAbout"))}</p>`,
    `<p>${plain(context.t("tutorAboutStart"))}</p>`,
    `<p class="explainer-tutor-choice" hidden><label>${plain(context.t("tutorChoose"))} <select class="explainer-tutor-choose" data-storage="${plain(site.storage ?? "explainer")}"><option value="">${plain(context.t("tutorNone"))}</option>${wayOptions(context)}</select></label></p>`,
    `<p>${plain(context.t("tutorAccount"))}</p>`,
    `<p>${plain(context.t("tutorAboutPrivacy"))}</p>`,
    `</section>`,
  ].join("\n");
}

/** The assistants of the app as options of a select, each by its name, and copying the prompt last (COPY). */
function wayOptions(context: Context): string {
  return [
    ...PROVIDERS.map((provider) => `<option value="${plain(provider.name)}">${plain(provider.name)}</option>`),
    `<option value="copy">${plain(context.t("tutorOther"))}</option>`,
  ].join("");
}

/**
 * "Mit einem KI-Tutor lernen", way A to the tutor, on each content page alone, beside its title. Folded while no
 * assistant is switched on: unfolded, a select of the app's assistants and copying the text, "Einschalten" (hidden
 * until the client module runs; without it a plain link per assistant), that the learner uses an account of their own
 * and the assistant is no offer of lernapps.net, and the link to the page's tutor page. Once an assistant is on
 * (chosen here or on the start page, kept on the device), a bar in its place: "Mit <name> lernen"; it is changed or
 * switched off on the start page. Then a status line, and what the client module needs (prompt.ts): the start prompt
 * with BASE before its address, the page's tutor page and its Markdown, and the page's id, title, exercises and
 * sections, for the learner's position (position.ts), the result line of "Zurück" (result.ts) and the lines of
 * "Hilfe" (stuck.ts), whose button the client module adds to each exercise with the way chosen here.
 */
function tutorSection(context: Context): string {
  const { site, lang, route } = context;
  const plainLinks = PROVIDERS.map(
    (provider) =>
      `<a class="explainer-tutor-provider" href="${plain(plainAddress(provider.url))}" rel="noopener" target="_blank">${plain(context.t("tutorOpenWith", { name: provider.name }))}</a>`,
  ).join(" ");
  const { page } = route;
  const data = {
    start: startPrompt(route),
    base: BASE,
    query: QUERY,
    // the root of the language tree, from this page: the base of the prompt's address is never the page's own folder
    root: context.to(""),
    storage: site.storage ?? "explainer",
    ...(page === undefined
      ? {}
      : {
          page: {
            id: page.id,
            title: inLanguage(page.title, lang).replace(/\s+/g, " ").trim(),
            exercises: pageExercises(site, page, context.descriptions).map((exercise) => ({
              id: exercise.id,
              ...(exercise.section === undefined ? {} : { section: exercise.section }),
              numbered: exercise.count > 0,
            })),
            sections: sectionsOf(page),
          },
        }),
    ...(page === undefined ? {} : { tutor: tutorPageOf(page), markdown: `${tutorPageOf(page)}${TUTOR_MARKDOWN}` }),
    ways: PROVIDERS.map((provider) => ({ name: provider.name, url: provider.url })),
    go: context.t("tutorGo"),
    copy: context.t("tutorCopy"),
    copied: context.t("tutorCopied"),
    failed: context.t("tutorCopyFailed"),
  };
  const tutorPage =
    page === undefined
      ? ""
      : `<p><a class="explainer-tutor-guide" href="${context.to(tutorPageOf(page))}">${plain(context.t("tutorPageLink"))}</a></p>`;
  return [
    `<div class="explainer-tutor explainer-tutor-page">`,
    `<details class="explainer-tutor-off">`,
    `<summary>${plain(context.t("tutorTitle"))}</summary>`,
    `<p>${plain(context.t("tutorPageIntro"))}</p>`,
    `<p class="explainer-tutor-actions"><span class="explainer-tutor-way" hidden><select class="explainer-tutor-select" aria-label="${plain(context.t("tutorWay"))}">${wayOptions(context)}</select> <button type="button" class="explainer-tutor-on">${plain(context.t("tutorOn"))}</button></span> <span class="explainer-tutor-plain">${plainLinks}</span></p>`,
    `<p class="explainer-tutor-note">${plain(context.t("tutorAccount"))} ${plain(context.t("tutorScope"))}</p>`,
    tutorPage,
    `</details>`,
    `<p class="explainer-tutor-bar" hidden><button type="button" class="explainer-tutor-go"></button></p>`,
    `<p class="explainer-tutor-status" role="status" aria-live="polite"></p>`,
    `<script type="application/json" class="explainer-tutor-prompt">${json(data)}</script>`,
    `</div>`,
  ]
    .filter((part) => part !== "")
    .join("\n");
}

function head(context: Context): string {
  const { route, site } = context;
  const app = inLanguage(site.app.title, context.lang);
  const title = route.kind === "start" ? app : `${route.title} – ${app}`;
  const description =
    route.page?.description !== undefined
      ? inLanguage(route.page.description, context.lang)
      : route.chapter?.summary !== undefined && route.kind === "chapter"
        ? inLanguage(route.chapter.summary, context.lang)
        : inLanguage(site.app.intro, context.lang);
  const alternates = alternateLinks({ ...route, languages: site.app.languages }).join("\n    ");
  return [
    `<title>${plain(title)}</title>`,
    `<meta name="description" content="${plain(description.replace(/\s+/g, " ").trim())}" />`,
    `<meta name="lernapps-archetype" content="explainer" />`,
    alternates,
  ].join("\n    ");
}

function footer(context: Context): string {
  return pageFooter({
    footer: plain(context.t("footer")),
    imprint: plain(context.t("imprint")),
    privacy: plain(context.t("privacy")),
  });
}

/** One page of the app, with the markup of its components as the build rendered them. */
export function renderPage(
  site: Site,
  route: Route,
  islands: Islands = new Map(),
  descriptions: Descriptions = new Map(),
): RenderedPage {
  const context = new Context(site, route, islands, descriptions);
  const body = [
    header(context),
    breadcrumbs(context),
    `<main class="explainer" id="inhalt-der-seite">`,
    main(context),
    `</main>`,
    pager(context),
    footer(context),
  ]
    .filter((part) => part !== "")
    .join("\n");
  return { route, head: head(context), body, islands: context.hasIslands };
}

/** Every page of the app, in every language. */
export function renderSite(
  site: Site,
  islands: Islands = new Map(),
  descriptions: Descriptions = new Map(),
): RenderedPage[] {
  return routes(site).map((route) => renderPage(site, route, islands, descriptions));
}
