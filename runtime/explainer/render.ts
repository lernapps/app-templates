// Renders every page of an explainer at build time into static HTML: the text, every formula as MathML, every figure
// as inline SVG or an image, tables, timelines, definitions, quotes, highlighted code, vocabulary (vocabulary.ts), the
// exercises (exercises.ts: each with its solution in a <details>, a generated one with three worked tasks), and the
// navigation (contents, breadcrumbs, previous and next, the contents of a page with three or more sections, the glossary, the language
// switch; a recap page marked in the contents, and at its top its notice with a link to the learning map for each competency it repeats). Without
// JavaScript the page is complete; the client module only adds. A vue-component block is its island:
// the component's markup as the build rendered it (`hidden` until it hydrates), its nojs text, its props in the page's
// language, and for an exercise its anchor, its task number with "Neue Aufgabe", the task of number 1 as its describe
// states it with the solution folded, and the place of its feedback. Links to other sites are plain links with rel="noopener":
// nothing is loaded from another server before a click; a video is such a link, with its player only after a click
// (video.ts). The end-to-end tests rely on the classes, ids and rel
// attributes written here.
import { questionMessagesIn } from "../shared/questions/render.ts";
import { propsIn } from "./components/props.ts";
import {
  inLanguage,
  mapUrl,
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
import { blockId, blockPosition } from "./block-id.ts";
import { isSizeless } from "../shared/blocks/image.ts";
import { renderMaterial, type MaterialContext } from "../shared/blocks/index.ts";
import { localeOf } from "../shared/languages.ts";
import { plain, renderInline, renderMarkdown } from "../shared/text/markdown.ts";
import { message, type Messages } from "./messages.ts";
import { alternateLinks, languageRoot, pageFooter, pageHeader, relative } from "../shared/pages.ts";
import { contentPages, hiddenChapter, routes, terms, type Route } from "./routes.ts";
import { tutorPageOf } from "./tutor.ts";
import { LANGUAGES, languageName, NEEDS, OTHER_LANGUAGE, type Need } from "./needs.ts";
import { BASE, placeholderPrompt, plainAddress, PROVIDERS, QUERY, startPrompt } from "./prompt.ts";
import { pageExercises, sectionsOf, TUTOR_MARKDOWN } from "./tutorpage.ts";
import { NEW_TASK_ICON } from "./tasks.ts";
import { renderVideo, watchAddress } from "./video.ts";
import { renderSelfTest } from "./selftest.ts";
import { renderVocabulary } from "./vocabulary.ts";
import { mediaOf, type MediaItem } from "./media.ts";
import { languageOfAudio } from "../shared/audio.ts";
import { renderCredit } from "../shared/blocks/render.ts";
import { assessmentOf } from "./assessment.ts";
import { assessmentMain, assessmentOffer, type AssessmentContext } from "./assessment-page.ts";

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
  /** The blocks of the page wrapped so far, for the order of the next (renderBlocks). */
  blockOrder = 0;
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
      audio: (name) => {
        const file = site.audio.get(`audio/${name}`);
        if (file === undefined) return undefined;
        return {
          src: relative(route.path, `audio/${name}`),
          text: file.meta.text,
          ...(file.meta.synthetic
            ? {
                ai: message(route.lang, "audioAiShort"),
                info: [
                  `${message(route.lang, "mediaAiVoice")}.`,
                  message(route.lang, "mediaVoice", {
                    model: file.meta.model ?? "",
                    voice: file.meta.voice ?? "",
                    date: file.meta.date,
                  }),
                  message(route.lang, "mediaLicence", { licence: file.meta.licence }),
                  ...(file.meta.attribution === undefined || file.meta.attribution === "none"
                    ? []
                    : [message(route.lang, "mediaAttribution", { attribution: file.meta.attribution })]),
                ].join(" "),
              }
            : {}),
        };
      },
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

/**
 * The blocks, at heading level `level` (the level of the heading they are under: 1 for the page), in the sections
 * `anchor`. Every block but a section is in a wrapper with its address for the feedback mode (block-id.ts): its
 * position under `at` (the sections and the places of the boxes it is in), its id, its type and its order on the page.
 */
function renderBlocks(
  context: Context,
  blocks: readonly Block[],
  level: number,
  anchor: string[] = [],
  at: readonly (string | number)[] = anchor,
): string {
  let place = 0;
  return blocks
    .map((block) => {
      if (block.type === "section") return renderBlock(context, block, level, anchor, at);
      place += 1;
      const position = blockPosition(at, place);
      const order = ++context.blockOrder;
      const attributes = `data-block="${position}" data-block-id="${blockId(block)}" data-block-type="${block.type}" data-block-order="${order}"`;
      return `<div class="explainer-block" ${attributes}>\n${renderBlock(context, block, level, anchor, [...at, place])}\n</div>`;
    })
    .join("\n");
}

function renderBlock(
  context: Context,
  block: Block,
  level: number,
  anchor: string[],
  at: readonly (string | number)[],
): string {
  switch (block.type) {
    case "section": {
      const id = [...anchor, block.id];
      return [
        `<section class="explainer-section">`,
        `<h${level + 1} id="${id.join("/")}">${context.text(block.title)}</h${level + 1}>`,
        renderBlocks(context, block.blocks, level + 1, id, [...at, block.id]),
        `</section>`,
      ].join("\n");
    }
    case "example":
    case "note":
      return [
        `<div class="explainer-box explainer-${block.type}">`,
        `<h${level + 1} class="explainer-box-title">${context.text(block.title)}</h${level + 1}>`,
        renderBlocks(context, block.blocks, level + 1, anchor, at),
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
    case "video":
      return renderVideo(block, context.lang, context.site.storage ?? "explainer");
    case "vocabulary":
      return renderVocabulary(
        { lang: context.lang, text: (text) => context.text(text), inline: (text) => context.inline(text) },
        block,
      );
    case "self-test":
      return renderSelfTest({ lang: context.lang, inline: (text) => context.inline(text) }, block);
    case "vue-component":
      return renderComponent(context, block);
    default:
      return renderExercise(
        block,
        context.lang,
        context.site.data,
        context.resolve,
        context.material,
        context.site.storage ?? "explainer",
      );
  }
}

const json = (value: unknown) => JSON.stringify(value).replace(/</g, "\\u003c");

/**
 * A vue-component block: its island, hidden until it hydrates, its nojs text, its props and its feedback. An exercise
 * component has its anchor, its task number with "Neue Aufgabe" (hidden until it hydrates), its island in a form with
 * the explainer's "Prüfen" (the row of the shared questions, hidden until it hydrates; Enter in a field of the
 * component checks too), and as its no-JS text the task of number 1 as its describe states it, with the solution
 * folded, under the block's own nojs text if it has one.
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
    ? `<p class="explainer-task-controls" hidden><span class="explainer-task-number" tabindex="-1" data-template="${plain(context.t("taskNumber"))}">${number(1)}</span> <button type="button" class="explainer-new-task" title="${plain(context.t("newTask"))}">${NEW_TASK_ICON}<span class="explainer-new-task-text">${plain(context.t("newTask"))}</span></button></p>`
    : "";
  const attributes = [
    ...(use.id === undefined ? [] : [`id="${use.id}"`]),
    `data-component="${component.name}"`,
    // the seed of each task number, which the islands draw the task from
    ...(component.exercise
      ? [`data-exercise data-seeds="${JSON.stringify(context.descriptions.get(block)?.seeds ?? [1])}"`]
      : []),
    // it declares the prop checked, which the islands set once "Prüfen" judged its answer
    ...(component.checked ? ["data-checked"] : []),
    ...(component.caption ? [`data-nojs="caption" data-caption="${plain(context.t("textDescription"))}"`] : []),
  ];
  return [
    `<div class="explainer-component" ${attributes.join(" ")}>`,
    controls,
    component.exercise
      ? `<form class="explainer-component-form" novalidate><div class="explainer-island" hidden>${markup}</div><p class="question-actions" hidden><button type="submit" class="question-check" disabled>${plain(messages.check)}</button></p></form>`
      : `<div class="explainer-island" hidden>${markup}</div>`,
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
  if ((route.kind === "page" || route.kind === "assessment") && route.chapter !== undefined && !hiddenChapter(site)) {
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
      // a recap page repeats competencies the app does not practise: marked, so that no one takes it for the app's own
      const recap =
        page.recap === undefined ? "" : ` <span class="explainer-recap-note">(${plain(context.t("recapNote"))})</span>`;
      return `<li><a href="${context.to(`${page.chapter}/${page.id}/`)}">${context.text(page.title)}</a>${recap}${description}</li>`;
    })
    .join("")}</ol>`;
}

/** The page "Medienübersicht": the images, audio files and videos of the app, each with its credit and where it is used. */
function mediaOverview(context: Context): string {
  const items = mediaOf(context.site);
  const uses = (item: MediaItem) =>
    `<p class="explainer-media-uses">${
      item.uses.length === 0
        ? plain(context.t("mediaUnused"))
        : `${plain(context.t("mediaUsedOn"))} ${item.uses
            .map(
              ({ chapter, page }) =>
                `<a href="${context.to(`${chapter.id}/${page.id}/`)}">${context.text(page.title)}</a>`,
            )
            .join(", ")}`
    }</p>`;
  const entry = (item: MediaItem): string => {
    switch (item.kind) {
      case "image": {
        const credit = renderCredit(
          {
            ...(item.source === undefined ? {} : { source: item.source }),
            ...(item.licence === undefined ? {} : { licence: item.licence }),
          },
          context.lang,
        );
        return `<li><img class="explainer-media-preview" src="${plain(context.material.href(item.name))}" alt="${context.text(item.alt)}" loading="lazy" decoding="async"><p><code>${plain(item.name)}</code>${credit}</p>${uses(item)}</li>`;
      }
      case "audio": {
        const { meta } = item;
        const spoken = languageOfAudio(meta.language);
        const voice = meta.synthetic
          ? `<span class="explainer-ai-voice">${plain(context.t("mediaAiVoice"))}</span> ${plain(
              context.t("mediaVoice", { model: meta.model ?? "", voice: meta.voice ?? "", date: meta.date }),
            )}`
          : `<span class="explainer-ai-voice">${plain(context.t("mediaHumanVoice"))}</span>`;
        const attribution =
          meta.attribution === undefined || meta.attribution === "none"
            ? ""
            : ` ${plain(context.t("mediaAttribution", { attribution: meta.attribution }))}`;
        return `<li><p><code>${plain(item.name)}</code></p><span class="explainer-audio"><audio controls preload="none" src="${plain(context.material.href(item.name))}" aria-label="${plain(context.t("mediaPlay", { text: meta.text }))}"></audio></span><p class="explainer-media-text">${plain(context.t("mediaText"))} <span lang="${plain(spoken)}">${plain(meta.text)}</span></p><p>${voice}${attribution} ${plain(context.t("mediaLicence", { licence: meta.licence }))}</p>${uses(item)}</li>`;
      }
      case "video":
        return `<li><p>${external(watchAddress(item.youtube), item.title)} ${plain(context.t("mediaVideoBy", { channel: item.channel }))}</p>${uses(item)}</li>`;
    }
  };
  const section = (kind: MediaItem["kind"], title: "mediaImages" | "mediaAudio" | "mediaVideos"): string => {
    const list = items.filter((item) => item.kind === kind);
    return list.length === 0
      ? ""
      : `<section class="explainer-media-section"><h2>${plain(context.t(title))}</h2><ul class="explainer-media">${list.map(entry).join("")}</ul></section>`;
  };
  return [section("image", "mediaImages"), section("audio", "mediaAudio"), section("video", "mediaVideos")]
    .filter((part) => part !== "")
    .join("\n");
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
      const media =
        mediaOf(site).length === 0 ? "" : `<p><a href="${context.to("medien/")}">${plain(context.t("media"))}</a></p>`;
      const sources =
        site.app.sources === undefined
          ? ""
          : `<section class="explainer-sources"><h2>${plain(context.t("sources"))}</h2><p>${plain(context.t("sourcesIntro"))}</p><ul>${site.app.sources
              .map((source) => {
                const text = inLanguage(source.title, context.lang);
                return `<li>${source.url === undefined ? plain(text) : external(source.url, text)}</li>`;
              })
              .join("")}</ul></section>`;
      const assessment = assessmentOf(site);
      return [
        title,
        `<div class="explainer-intro">${context.markdown(site.app.intro)}</div>`,
        assessment === undefined ? "" : assessmentOffer(assessmentContext(context), assessment),
        `<nav class="explainer-contents" aria-labelledby="inhalt"><h2 id="inhalt">${plain(context.t("contents"))}</h2>${contents}</nav>`,
        glossary,
        media,
        tutorAbout(context),
        feedbackAbout(context),
        sources,
      ]
        .filter((part) => part !== "")
        .join("\n");
    }
    case "chapter": {
      const chapter = route.chapter;
      if (chapter === undefined) return title;
      const summary =
        chapter.summary === undefined ? "" : `<div class="explainer-intro">${context.markdown(chapter.summary)}</div>`;
      const assessment = assessmentOf(site, chapter.id);
      return [
        title,
        summary,
        assessment === undefined ? "" : assessmentOffer(assessmentContext(context), assessment),
        `<nav class="explainer-contents" aria-label="${plain(context.t("pages"))}">${pageList(context, chapter.pages)}</nav>`,
      ]
        .filter((part) => part !== "")
        .join("\n");
    }
    case "assessment":
      return route.assessment === undefined ? title : assessmentMain(assessmentContext(context), route.assessment);
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
    case "media":
      return [title, `<p>${plain(context.t("mediaIntro"))}</p>`, mediaOverview(context)].join("\n");
    case "page": {
      const page = route.page;
      if (page === undefined) return title;
      // the title and way A in one row: beside it on a wide screen, below it on a narrow one (explainer.css)
      // a recap page says first what it is for; the tutor comes after that, and its sections are short enough to need
      // no table of contents
      if (page.recap !== undefined) {
        return [
          `<div class="explainer-title-row explainer-title-row-recap">`,
          title,
          `</div>`,
          recapNotice(context, page.recap, page.recapTitles),
          `<div class="explainer-title-row explainer-title-row-recap">`,
          tutorSection(context),
          `</div>`,
          renderBlocks(context, page.blocks, 1),
          feedbackInvite(context),
        ].join("\n");
      }
      return [
        `<div class="explainer-title-row">`,
        title,
        tutorSection(context),
        `</div>`,
        pageContents(context, page.blocks),
        renderBlocks(context, page.blocks, 1),
        feedbackInvite(context),
      ].join("\n");
    }
  }
}

/**
 * At the top of a recap page: that it is a recap, and a link to each competency's page on the learning map, where the
 * apps are that practise it; the link's text is the competency's id. The runtime writes it, so that it cannot be
 * missing; what the page repeats, its content says. Plain links, nothing loaded before a click.
 */
function recapNotice(context: Context, recap: readonly string[], titles: Readonly<Record<string, Text>> = {}): string {
  // the link leaves the app: the page says so, as a link to another site should
  const link = (competency: string) =>
    `${external(mapUrl(competency), titles[competency] === undefined ? competency : inLanguage(titles[competency], context.lang))} <span class="explainer-recap-hint">(${plain(context.t("recapLinkHint"))})</span>`;
  const label = plain(context.t("recap"));
  let text: string;
  if (recap.length === 1) {
    // the message keeps its placeholder {link} unfilled: the link goes in its place as markup
    const [before = "", after = ""] = context.t("recapText").split("{link}");
    text = `<p>${plain(before)}${link(recap[0] ?? "")}${plain(after)}</p>`;
  } else {
    text = [
      `<p>${plain(context.t("recapTextSeveral"))}</p>`,
      `<ul>${recap.map((competency) => `<li>${link(competency)}</li>`).join("")}</ul>`,
    ].join("\n");
  }
  return [
    `<aside class="explainer-recap" aria-label="${label}">`,
    `<p class="explainer-recap-label">${label}</p>`,
    text,
    `</aside>`,
  ].join("\n");
}

/** What a part of a self-assessment needs of the page it is on (assessment-page.ts). */
const assessmentContext = (context: Context): AssessmentContext => ({
  site: context.site,
  lang: context.lang,
  to: (local) => context.to(local),
  resolve: context.resolve,
  material: context.material,
  ways: wayOptions(context),
  component: (block, key) => assessmentComponent(context, block, key),
});

/**
 * An exercise component as one exercise of a self-assessment, by its key: its island with the task of number 1 as the
 * build rendered it, its props and its task numbers, without "Prüfen", feedback, task number or nojs text (the
 * self-assessment runs with JavaScript only); the islands hydrate it with the task the self-assessment draws.
 */
function assessmentComponent(
  context: Context,
  block: BlockOf<"vue-component">,
  key: string,
): { html: string; seeds: number[] } | undefined {
  const use = context.site.components.find((candidate) => candidate.block === block);
  if (use === undefined || !use.component.exercise) return undefined;
  context.hasIslands = true;
  const { component } = use;
  const seeds = context.descriptions.get(block)?.seeds ?? [1];
  const attributes = [
    `id="aufgabe-${key}"`,
    `data-component="${component.name}"`,
    `data-exercise data-assessment data-seeds="${JSON.stringify(seeds)}"`,
    ...(component.checked ? ["data-checked"] : []),
  ];
  const html = [
    `<div class="explainer-component" ${attributes.join(" ")}>`,
    `<div class="explainer-island" hidden>${context.islands.get(block)?.get(context.lang) ?? ""}</div>`,
    `<script type="application/json" class="explainer-component-props">${json(propsIn(block.props, component, context.lang))}</script>`,
    `</div>`,
  ].join("\n");
  return { html, seeds: [...seeds] };
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
    `<p class="explainer-tutor-choice" hidden><label>${plain(context.t("tutorChoose"))} <select class="explainer-tutor-choose" data-storage="${plain(site.storage ?? "explainer")}"><option value="">${plain(context.t("tutorNone"))}</option>${wayOptions(context)}</select></label> <button type="button" class="explainer-tutor-needs-open" aria-haspopup="dialog" aria-label="${plain(context.t("needsOpen"))}" title="${plain(context.t("needsOpen"))}">${SETTINGS_ICON}</button></p>`,
    `<p class="explainer-tutor-hint" role="status" aria-live="polite" hidden></p>`,
    `<p>${plain(context.t("tutorAccount"))}</p>`,
    `<p>${plain(context.t("tutorAboutPrivacy"))}</p>`,
    `</section>`,
    needsChoice(context),
  ].join("\n");
}

/** The symbol of "Einstellungen", which opens the dialog of the learner's needs: a gear, its name in aria-label. */
const SETTINGS_ICON =
  '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 1 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 1 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 1 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 1 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>';

/** The name and the description of each need on the start page. */
const NEED_TEXTS: Readonly<Record<Need, readonly [keyof Messages, keyof Messages]>> = {
  "kurze-schritte": ["needKurzeSchritte", "needKurzeSchritteAbout"],
  "wenig-lesen": ["needWenigLesen", "needWenigLesenAbout"],
  "mehr-tiefe": ["needMehrTiefe", "needMehrTiefeAbout"],
  "andere-muttersprache": ["needAndereMuttersprache", "needAndereMutterspracheAbout"],
  "klar-und-woertlich": ["needKlarUndWoertlich", "needKlarUndWoertlichAbout"],
  "rechnen-anschaulich": ["needRechnenAnschaulich", "needRechnenAnschaulichAbout"],
};

/**
 * The choice of the learner's needs for the tutor, on the start page (dec-tutor-needs): a dialog that "Einstellungen"
 * beside the choice of the assistant opens, with a box per need and one or two sentences on what it does, the first
 * language below `andere-muttersprache`, and whether the choice holds for every explainer or for this app only. The
 * tutor needs JavaScript, so the dialog does too: it stays in a <template> until the client module puts it into the
 * page, opens it and keeps the choice on the device.
 */
function needsChoice(context: Context): string {
  const { site, lang } = context;
  const languages = [...LANGUAGES]
    .map((tag) => ({ tag, name: languageName(tag, lang) }))
    .sort((a, b) => a.name.localeCompare(b.name, lang));
  const language = [
    `<p class="explainer-tutor-language-choice" hidden><label>${plain(context.t("needsLanguage"))} <select class="explainer-tutor-language">`,
    `<option value="">${plain(context.t("needsLanguageNone"))}</option>`,
    ...languages.map(({ tag, name }) => `<option value="${plain(tag)}">${plain(name)}</option>`),
    `</select></label></p>`,
  ].join("");
  const needs = NEEDS.map((need) => {
    const [name, about] = NEED_TEXTS[need];
    const id = `bedarf-${need}`;
    return [
      `<div class="explainer-tutor-need-choice"><input type="checkbox" class="explainer-tutor-need" id="${id}" value="${need}" aria-describedby="${id}-text" />`,
      `<label for="${id}">${plain(context.t(name))}</label>`,
      `<p class="explainer-tutor-need-text" id="${id}-text">${plain(context.t(about))}</p></div>`,
      need === OTHER_LANGUAGE ? language : "",
    ].join("");
  });
  const scope = (value: string, key: keyof Messages) =>
    `<label><input type="radio" class="explainer-tutor-needs-scope" name="bedarf-gilt" value="${value}" /> ${plain(context.t(key))}</label>`;
  return [
    `<template class="explainer-tutor-needs-template">`,
    `<dialog class="explainer-tutor-needs" data-storage="${plain(site.storage ?? "explainer")}" aria-labelledby="bedarf-titel">`,
    `<form method="dialog">`,
    `<h2 id="bedarf-titel">${plain(context.t("needsTitle"))}</h2>`,
    `<p>${plain(context.t("needsAbout"))}</p>`,
    ...needs,
    `<fieldset class="explainer-tutor-needs-where"><legend>${plain(context.t("needsScopeTitle"))}</legend>${scope("archetype", "needsScopeAll")} ${scope("app", "needsScopeApp")}</fieldset>`,
    `<p class="explainer-tutor-note">${plain(context.t("needsPrivacy"))}</p>`,
    `<p><button class="explainer-tutor-needs-done">${plain(context.t("needsDone"))}</button></p>`,
    `</form>`,
    `</dialog>`,
    `</template>`,
  ].join("\n");
}

/**
 * The assistants of the app as options of a select, each by its name, and copying the prompt last (COPY). An assistant
 * that needs pasting (`paste`) carries its explanation in data-hint, which the client module shows once it is chosen.
 */
function wayOptions(context: Context): string {
  return [
    ...PROVIDERS.map((provider) => {
      const hint =
        provider.paste === true ? ` data-hint="${plain(context.t("tutorPasteHint", { name: provider.name }))}"` : "";
      return `<option value="${plain(provider.name)}"${hint}>${plain(provider.name)}</option>`;
    }),
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
    ways: PROVIDERS.map((provider) => ({
      name: provider.name,
      url: provider.url,
      ...(provider.paste === true ? { paste: true } : {}),
    })),
    placeholder: placeholderPrompt(lang),
    go: context.t("tutorGo"),
    done: context.t("tutorDone"),
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
    `<p class="explainer-tutor-hint" role="status" aria-live="polite" hidden></p>`,
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

/**
 * The way into the feedback mode at the end of a content page, inside its content, so that it is clearly about this
 * app (the footer is the platform's): "Fehler gefunden oder eine Idee für diese App? Feedback zu „<App>“ geben".
 * Hidden until the client module runs (feedback-client.ts): the mode needs JavaScript.
 */
function feedbackInvite(context: Context): string {
  const app = inLanguage(context.site.app.title, context.lang);
  return [
    `<p class="explainer-feedback-invite" hidden>`,
    `<span>${plain(context.t("feedbackInvite"))}</span> `,
    `<button type="button" class="explainer-feedback-switch">${plain(context.t("feedbackSwitch", { app }))}</button>`,
    `</p>`,
  ].join("");
}

/**
 * The start page's section on the feedback mode, for teachers and parents: in a <template>, which the client module
 * puts into the page (the mode needs JavaScript, and a page shows no heading that is hidden without it).
 */
function feedbackAbout(context: Context): string {
  return [
    `<template class="explainer-feedback-about-template">`,
    `<section class="explainer-feedback-about" aria-labelledby="verbesserungen">`,
    `<h2 id="verbesserungen">${plain(context.t("feedbackStartTitle"))}</h2>`,
    `<p>${plain(context.t("feedbackStartText"))}</p>`,
    `<p class="explainer-feedback-about-privacy">${plain(context.t("feedbackStartPrivacy"))}</p>`,
    `<p><button type="button" class="explainer-feedback-switch explainer-feedback-start">${FEEDBACK_ICON}${plain(context.t("feedbackStartOn"))}</button></p>`,
    `</section>`,
    `</template>`,
  ].join("\n");
}

const FEEDBACK_ICON =
  '<svg aria-hidden="true" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 5h16v11H9l-5 4z"/></svg>';
const COLLAPSE_ICON =
  '<svg aria-hidden="true" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 6l6 6-6 6"/></svg>';

/** What the client module needs of the page for the feedback mode (feedback-client.ts, FeedbackData). */
function feedbackData(context: Context): Record<string, unknown> {
  const { site, route, lang } = context;
  const page = route.page;
  const order = page === undefined ? -1 : contentPages(site).indexOf(page);
  return {
    storage: site.storage ?? "explainer",
    app: inLanguage(site.app.title, lang).replace(/\s+/g, " ").trim(),
    root: context.to(""),
    ...(site.repository === undefined ? {} : { repository: site.repository }),
    ...(site.revision === undefined ? {} : { revision: site.revision }),
    ...(page === undefined ? {} : { page: { title: route.title, order } }),
  };
}

/**
 * The bar of the feedback mode, on every page, in a <template> that the client module puts into the page, hidden until
 * the mode is on (feedback-client.ts): its help, the form of a note, the notes of the app with copying and the link to
 * a new issue, deleting, and "Beenden". The client module fills the notes; the page's data for it is in a script in it.
 */
function feedbackPanel(context: Context): string {
  const t = (key: keyof Messages) => plain(context.t(key));
  const issue =
    context.site.repository === undefined
      ? ""
      : `<a class="explainer-feedback-issue" href="#" target="_blank" rel="noopener">${t("feedbackIssue")}</a>`;
  return [
    `<template class="explainer-feedback-template">`,
    `<aside class="explainer-feedback" aria-labelledby="feedback-titel" hidden>`,
    `<div class="explainer-feedback-head">`,
    `<h2 id="feedback-titel">${t("feedbackPanel")}</h2>`,
    `<button type="button" class="explainer-feedback-help-open" aria-expanded="false" aria-controls="feedback-hilfe">${t("feedbackHelpOpen")}</button>`,
    `<button type="button" class="explainer-feedback-collapse" aria-expanded="true" aria-controls="feedback-inhalt" aria-label="${t("feedbackCollapse")}" title="${t("feedbackCollapse")}">${COLLAPSE_ICON}</button>`,
    `</div>`,
    `<button type="button" class="explainer-feedback-expand" hidden>${FEEDBACK_ICON}<span>${t("feedbackExpand")}</span></button>`,
    `<div class="explainer-feedback-body" id="feedback-inhalt">`,
    `<section class="explainer-feedback-help" id="feedback-hilfe" aria-labelledby="feedback-hilfe-titel" hidden>`,
    `<h3 id="feedback-hilfe-titel">${t("feedbackHelpTitle")}</h3>`,
    `<ol><li>${t("feedbackHelpStep1")}</li><li>${t("feedbackHelpStep2")}</li><li>${t("feedbackHelpStep3")}</li></ol>`,
    `<p class="explainer-feedback-privacy">${t("feedbackHelpPrivacy")}</p>`,
    `<p><button type="button" class="explainer-feedback-help-done">${t("feedbackHelpDone")}</button></p>`,
    `</section>`,
    `<form class="explainer-feedback-form" hidden>`,
    `<p class="explainer-feedback-new">${t("feedbackNew")}</p>`,
    `<p class="explainer-feedback-where"></p>`,
    `<blockquote class="explainer-feedback-quote" hidden></blockquote>`,
    `<label for="feedback-text">${t("feedbackYourNote")}</label>`,
    `<textarea id="feedback-text" class="explainer-feedback-text" rows="5" required></textarea>`,
    `<p class="explainer-feedback-buttons"><button type="submit" class="explainer-feedback-save">${t("feedbackSave")}</button> <button type="button" class="explainer-feedback-cancel">${t("feedbackCancel")}</button></p>`,
    `</form>`,
    `<p class="explainer-feedback-status" role="status" aria-live="polite"></p>`,
    `<section class="explainer-feedback-notes" aria-labelledby="feedback-notizen">`,
    `<h3 id="feedback-notizen" class="explainer-feedback-count"></h3>`,
    `<p class="explainer-feedback-actions"><button type="button" class="explainer-feedback-copy">${t("feedbackCopy")}</button> ${issue}</p>`,
    `<textarea class="explainer-feedback-export" readonly rows="6" aria-label="${t("feedbackExportLabel")}" hidden></textarea>`,
    `<div class="explainer-feedback-list"></div>`,
    `</section>`,
    `</div>`,
    `<div class="explainer-feedback-foot">`,
    `<button type="button" class="explainer-feedback-delete-all">${t("feedbackDeleteAll")}</button>`,
    `<span class="explainer-feedback-local">${t("feedbackLocal")}</span>`,
    `<button type="button" class="explainer-feedback-off">${t("feedbackOff")}</button>`,
    `</div>`,
    `<script type="application/json" class="explainer-feedback-data">${json(feedbackData(context))}</script>`,
    `</aside>`,
    `</template>`,
  ].join("\n");
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
    feedbackPanel(context),
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
