// Renders every page of an explainer at build time into static HTML: the text, every formula as MathML, every figure
// as inline SVG or an image, tables, timelines, definitions, quotes, highlighted code, the exercises (exercises.ts:
// each with its solution in a <details>, a generated one with three worked tasks), and the navigation (contents,
// breadcrumbs, previous and next, the contents of a page with three or more sections, the glossary, the language
// switch). Without JavaScript the page is complete; the client module only adds. A vue-component block is its island:
// the component's markup as the build rendered it (`hidden` until it hydrates), its nojs text, its props in the page's
// language, and for an exercise the place of its feedback. Links to other sites are plain links with rel="noopener":
// nothing is loaded from another server before a click. The end-to-end tests rely on the classes, ids and rel
// attributes written here.
import { messagesIn } from "../quiz/render.ts";
import { highlight, type CodeLanguage } from "./code.ts";
import { propsIn } from "./components.ts";
import {
  inLanguage,
  termId as termIdOf,
  timelineEvents,
  type Block,
  type BlockOf,
  type Credit,
  type Event,
  type Site,
  type Text,
} from "./content.ts";
import { renderExercise } from "./exercises.ts";
import { bar, hundredGrid } from "./figures.ts";
import { renderFormula } from "./formula.ts";
import { plain, renderInline, renderMarkdown } from "./markdown.ts";
import { message, type Messages } from "./messages.ts";
import { alternateLinks, languageRoot, languageSwitch, relative } from "../shared/pages.ts";
import { contentPages, hiddenChapter, routes, terms, type Route } from "./routes.ts";

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

const LOCALES: Readonly<Record<string, string>> = { de: "de-DE", en: "en-GB" };

/** What rendering one page needs. */
class Context {
  readonly locale: string;
  readonly site: Site;
  readonly route: Route;
  readonly islands: Islands;
  /** Whether a component was rendered. */
  hasIslands = false;
  constructor(site: Site, route: Route, islands: Islands) {
    this.site = site;
    this.route = route;
    this.islands = islands;
    this.locale = LOCALES[route.lang] ?? route.lang;
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

function credit(context: Context, item: Credit): string {
  if (item.source === undefined || item.licence === undefined) return "";
  const source = /^https?:\/\//.test(item.source) ? external(item.source) : plain(item.source);
  const text = context.t("credit", { source: "\u0000", licence: plain(item.licence) }).replace("\u0000", source);
  return ` <span class="explainer-credit">${text}</span>`;
}

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
      return `<div class="explainer-text">${context.markdown(block.text)}</div>`;
    case "formula":
      return `<div class="explainer-formula">${renderFormula(inLanguage(block.formula, context.lang), true)}</div>`;
    case "figure": {
      const alt = inLanguage(block.alt, context.lang);
      let picture = "";
      if (block.draw?.kind === "hundred-grid") picture = hundredGrid(block.draw.filled, alt);
      else if (block.draw?.kind === "bar") picture = bar(block.draw.part, block.draw.whole, alt, context.locale);
      else if (block.image !== undefined) {
        picture = `<img src="${plain(relative(context.route.path, block.image))}" alt="${plain(alt)}">`;
      }
      return `<figure class="explainer-figure">${picture}<figcaption>${context.markdown(block.caption)}${credit(context, block)}</figcaption></figure>`;
    }
    case "labelled-figure": {
      const markers = block.labels
        .map(
          (label, index) =>
            `<span class="explainer-marker" style="left: ${label.x}%; top: ${label.y}%" aria-hidden="true">${index + 1}</span>`,
        )
        .join("");
      const legend = block.labels.map((label) => `<li>${context.text(label.text)}</li>`).join("");
      const caption = block.caption === undefined ? "" : context.markdown(block.caption);
      return [
        `<figure class="explainer-figure explainer-labelled">`,
        `<div class="explainer-labelled-image"><img src="${plain(relative(context.route.path, block.image))}" alt="${context.text(block.alt)}">${markers}</div>`,
        `<ol class="explainer-legend">${legend}</ol>`,
        `<figcaption>${caption}${credit(context, block)}</figcaption>`,
        `</figure>`,
      ].join("");
    }
    case "table": {
      const caption = context.text(block.caption);
      const head =
        block.header === undefined
          ? ""
          : `<thead><tr>${block.header.map((cell) => `<th scope="col">${context.inline(cell)}</th>`).join("")}</tr></thead>`;
      const rows = block.rows
        .map(
          (row) =>
            `<tr>${row
              .map((cell, index) =>
                index === 0 && block.rowHeaders === true
                  ? `<th scope="row">${context.inline(cell)}</th>`
                  : `<td>${context.inline(cell)}</td>`,
              )
              .join("")}</tr>`,
        )
        .join("");
      return `<div class="explainer-table" role="region" aria-label="${caption}" tabindex="0"><table><caption>${caption}</caption>${head}<tbody>${rows}</tbody></table></div>`;
    }
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
    case "quote": {
      const { author, work, year } = block.origin;
      const origin = [
        context.text(author),
        ...(work === undefined ? [] : [`<cite>${context.text(work)}</cite>`]),
        ...(year === undefined ? [] : [typeof year === "number" ? String(year) : context.text(year)]),
      ].join(", ");
      return `<figure class="explainer-quote"><blockquote>${context.markdown(block.text)}</blockquote><figcaption>— ${origin}.${credit(context, block)}</figcaption></figure>`;
    }
    case "code": {
      const language = block.language as CodeLanguage;
      const caption = block.caption === undefined ? "" : `<figcaption>${context.text(block.caption)}</figcaption>`;
      return `<figure class="explainer-code"><pre role="region" aria-label="${plain(context.t("code", { language }))}" tabindex="0"><code class="hljs language-${language}">${highlight(block.code, language)}</code></pre>${caption}</figure>`;
    }
    case "vue-component":
      return renderComponent(context, block);
    default:
      return renderExercise(block, context.lang, context.site.data, context.resolve);
  }
}

const json = (value: unknown) => JSON.stringify(value).replace(/</g, "\\u003c");

/** A vue-component block: its island, hidden until it hydrates, its nojs text, its props and its feedback. */
function renderComponent(context: Context, block: BlockOf<"vue-component">): string {
  const use = context.site.components.find((candidate) => candidate.block === block);
  if (use === undefined) return "";
  context.hasIslands = true;
  const { component } = use;
  const markup = context.islands.get(block)?.get(context.lang) ?? "";
  const messages = messagesIn(context.lang);
  const feedback = component.exercise
    ? `<p class="quiz-feedback" data-right="${plain(messages.right)}" data-wrong="${plain(messages.wrong)}"></p>`
    : "";
  return [
    `<div class="explainer-component" data-component="${component.name}"${component.caption ? ' data-nojs="caption"' : ""}>`,
    `<div class="explainer-island" hidden>${markup}</div>`,
    `<div class="explainer-nojs">${context.markdown(block.nojs)}</div>`,
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
  const switcher = languageSwitch({
    ...route,
    languages: site.app.languages,
    className: "explainer-languages",
    label: plain(context.t("languages")),
    name: (lang) => plain(message(lang, "language")),
  });
  return `<header class="explainer-header"><p class="explainer-brand"><a href="${context.to("")}">${context.text(site.app.title)}</a></p>${switcher}</header>`;
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
      return [title, pageContents(context, page.blocks), renderBlocks(context, page.blocks, 1)].join("\n");
    }
  }
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
  return `<footer class="explainer-footer"><p>${plain(context.t("footer"))} · <a href="https://lernapps.net/imprint/">${plain(context.t("imprint"))}</a> · <a href="https://lernapps.net/privacy/">${plain(context.t("privacy"))}</a></p></footer>`;
}

/** One page of the app, with the markup of its components as the build rendered them. */
export function renderPage(site: Site, route: Route, islands: Islands = new Map()): RenderedPage {
  const context = new Context(site, route, islands);
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
export function renderSite(site: Site, islands: Islands = new Map()): RenderedPage[] {
  return routes(site).map((route) => renderPage(site, route, islands));
}

/** llms.txt of a language tree: the app, its pages with their sections as deep links, from that tree's root. */
export function llmsTxt(site: Site, lang: string): string {
  const t = (key: keyof Messages) => message(lang, key);
  const own = (text: Text) => inLanguage(text, lang).replace(/\s+/g, " ").trim();
  const lines = [`# ${own(site.app.title)}`, "", `> ${own(site.app.intro)}`, ""];
  if (site.app.languages.length > 1) {
    lines.push(
      site.app.languages
        .filter((other) => other !== lang)
        .map(
          (other) => `${message(other, "language")}: ${relative(languageRoot(lang), `${languageRoot(other)}llms.txt`)}`,
        )
        .join("\n"),
      "",
    );
  }
  for (const chapter of site.chapters) {
    lines.push(`## ${hiddenChapter(site) ? t("pages") : own(chapter.title)}`, "");
    for (const page of chapter.pages) {
      const url = `${chapter.id}/${page.id}/`;
      const description = page.description === undefined ? "" : `: ${own(page.description)}`;
      lines.push(`- [${own(page.title)}](${url})${description}`);
      const sections = (blocks: readonly Block[], anchor: string[], depth: number): void => {
        for (const block of blocks) {
          if (block.type !== "section") continue;
          const id = [...anchor, block.id];
          lines.push(`${"  ".repeat(depth)}- [${own(block.title)}](${url}#${id.join("/")})`);
          sections(block.blocks, id, depth + 1);
        }
      };
      sections(page.blocks, [], 1);
    }
    lines.push("");
  }
  if (terms(site).length > 0) lines.push(`## ${t("glossary")}`, "", `- [${t("glossary")}](glossar/)`, "");
  return `${lines.join("\n").trimEnd()}\n`;
}
