// Renders blocks that show content at build time into HTML: prose, a formula (MathML), a figure (an inline SVG drawn
// from data, or a bundled image), a labelled figure (a bundled image with numbered markers and a legend), a table, a
// quotation and highlighted code, each with its caption and, for an image or a quotation, its credit. The page that
// shows them says where a bundled image is from the page and how a link to one of its pages resolves; the look is
// blocks.css.
import { escape } from "../html.ts";
import { inLanguage, localeOf, textsIn, type Language, type Text } from "../languages.ts";
import { renderFormula } from "../text/formula.ts";
import { renderInline, renderMarkdown } from "../text/markdown.ts";
import { isUrl } from "../text/check.ts";
import type { Credit, MaterialBlock } from "./block.ts";
import { highlight } from "./code.ts";
import { bar, hundredGrid } from "./figures.ts";
import de from "./messages/de.json" with { type: "json" };
import en from "./messages/en.json" with { type: "json" };

export const BLOCK_MESSAGES: Readonly<Record<Language, typeof de>> = { de, en };

/** What rendering blocks needs from the page that shows them. */
export interface MaterialContext {
  /** The language of the page. */
  lang: string;
  /** The address of the bundled image `image` (images/<name>) from the page. */
  href: (image: string) => string;
  /** Where a link to a page of the app leads; an https address is left as it is. */
  resolve?: (href: string) => string;
  /**
   * Whether the bundled image has no size of its own: an SVG whose root has neither a width nor a height (only a
   * viewBox, or percentages). In a box as wide as its content, as the image of a labelled figure is, the browser
   * draws such an image with zero width.
   */
  sizeless?: (image: string) => boolean;
}

const external = (url: string) => `<a href="${escape(url)}" rel="noopener">${escape(url)}</a>`;

/** The credit of an image or a quotation: its source, as a link when it is a URL, and its licence. */
export function renderCredit(item: Credit<Text>, lang: string): string {
  if (item.source === undefined || item.licence === undefined) return "";
  const given = inLanguage(item.source, lang);
  const source = isUrl(given) ? external(given) : escape(given);
  const text = textsIn(BLOCK_MESSAGES, lang)
    .credit.replace("{licence}", () => escape(item.licence ?? ""))
    .replace("{source}", () => source);
  return ` <span class="block-credit">${text}</span>`;
}

function renderBlock(block: MaterialBlock<Text>, context: MaterialContext): string {
  const { lang } = context;
  const resolve = context.resolve ?? ((href: string) => href);
  const plain = (text: Text) => escape(inLanguage(text, lang));
  const markdown = (text: Text) => renderMarkdown(inLanguage(text, lang), resolve);
  const inline = (text: Text) => renderInline(inLanguage(text, lang), resolve);
  switch (block.type) {
    case "text":
      return `<div class="block-text">${markdown(block.text)}</div>`;
    case "formula":
      return `<div class="block-formula">${renderFormula(inLanguage(block.formula, lang), true)}</div>`;
    case "figure": {
      const alt = inLanguage(block.alt, lang);
      let picture = "";
      if (block.draw?.kind === "hundred-grid") picture = hundredGrid(block.draw.filled, alt);
      else if (block.draw?.kind === "bar") picture = bar(block.draw.part, block.draw.whole, alt, localeOf(lang));
      else if (block.image !== undefined)
        picture = `<img src="${escape(context.href(block.image))}" alt="${escape(alt)}">`;
      return `<figure class="block-figure">${picture}<figcaption>${markdown(block.caption)}${renderCredit(block, lang)}</figcaption></figure>`;
    }
    case "labelled-figure": {
      const markers = block.labels
        .map(
          (label, index) =>
            `<span class="block-marker" style="left: ${label.x}%; top: ${label.y}%" aria-hidden="true">${index + 1}</span>`,
        )
        .join("");
      const legend = block.labels.map((label) => `<li>${plain(label.text)}</li>`).join("");
      const caption = block.caption === undefined ? "" : markdown(block.caption);
      const fill = context.sizeless?.(block.image) === true ? " block-labelled-fill" : "";
      return [
        `<figure class="block-figure block-labelled">`,
        `<div class="block-labelled-image${fill}"><img src="${escape(context.href(block.image))}" alt="${plain(block.alt)}">${markers}</div>`,
        `<ol class="block-legend">${legend}</ol>`,
        `<figcaption>${caption}${renderCredit(block, lang)}</figcaption>`,
        `</figure>`,
      ].join("");
    }
    case "table": {
      const caption = plain(block.caption);
      const head =
        block.header === undefined
          ? ""
          : `<thead><tr>${block.header.map((cell) => `<th scope="col">${inline(cell)}</th>`).join("")}</tr></thead>`;
      const rows = block.rows
        .map(
          (row) =>
            `<tr>${row
              .map((cell, index) =>
                index === 0 && block.rowHeaders === true
                  ? `<th scope="row">${inline(cell)}</th>`
                  : `<td>${inline(cell)}</td>`,
              )
              .join("")}</tr>`,
        )
        .join("");
      return `<div class="block-table" role="region" aria-label="${caption}" tabindex="0"><table><caption>${caption}</caption>${head}<tbody>${rows}</tbody></table></div>`;
    }
    case "quote": {
      const { author, work, year } = block.origin;
      const origin = [
        plain(author),
        ...(work === undefined ? [] : [`<cite>${plain(work)}</cite>`]),
        ...(year === undefined ? [] : [typeof year === "number" ? String(year) : plain(year)]),
      ].join(", ");
      return `<figure class="block-quote"><blockquote>${markdown(block.text)}</blockquote><figcaption>— ${origin}.${renderCredit(block, lang)}</figcaption></figure>`;
    }
    case "code": {
      const label = textsIn(BLOCK_MESSAGES, lang).code.replace("{language}", () => block.language);
      const caption = block.caption === undefined ? "" : `<figcaption>${plain(block.caption)}</figcaption>`;
      return `<figure class="block-code"><pre role="region" aria-label="${escape(label)}" tabindex="0"><code class="hljs language-${block.language}">${highlight(block.code, block.language)}</code></pre>${caption}</figure>`;
    }
  }
}

/** The blocks as HTML, one after the other. */
export const renderMaterial = (blocks: readonly MaterialBlock<Text>[], context: MaterialContext): string =>
  blocks.map((block) => renderBlock(block, context)).join("");
