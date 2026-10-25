// Restricted Markdown, the format of every learner text with formatting: paragraphs, **bold**, *italics*, lists,
// links, line breaks and formulas as $…$. Everything else Markdown knows is a problem with the block to use instead,
// so that structure comes only from section blocks and the heading levels from the nesting. Raw HTML is a problem
// too. Rendered at build time; formulas become MathML.
import { Marked, type Token, type Tokens } from "marked";
import { formulaProblem, renderFormula } from "./formula.ts";
import { escape } from "../html.ts";

/** A problem in a text, `line` lines below its first. */
export interface TextProblem {
  line: number;
  message: string;
}

/** What a text holds besides its prose: its problems, the formulas and the targets of its links. */
export interface Inspection {
  problems: TextProblem[];
  formulas: string[];
  links: string[];
}

interface MathToken extends Tokens.Generic {
  type: "math";
  raw: string;
  tex: string;
}

/** Where a link leads from the page being rendered; set for each render. */
let resolveLink: (href: string) => string = (href) => href;

const marked = new Marked({
  gfm: true,
  breaks: false,
  extensions: [
    {
      name: "math",
      level: "inline",
      start(source: string) {
        const at = source.indexOf("$");
        return at < 0 ? undefined : at;
      },
      tokenizer(source: string): MathToken | undefined {
        const match = /^\$((?:\\.|[^\\$\n])+?)\$/.exec(source);
        return match === null ? undefined : { type: "math", raw: match[0], tex: match[1] ?? "" };
      },
      renderer(token: Tokens.Generic) {
        return renderFormula(String(token["tex"]), false);
      },
    },
  ],
  renderer: {
    html(token) {
      return escape(token.text);
    },
    link({ href, tokens }) {
      const text = this.parser.parseInline(tokens);
      const external = /^https?:\/\//.test(href);
      return `<a href="${escape(external ? href : resolveLink(href))}"${external ? ' rel="noopener"' : ""}>${text}</a>`;
    },
  },
});

/** What each construct outside restricted Markdown is, and what to use instead. */
const NOT_ALLOWED: Readonly<Record<string, string>> = {
  blockquote: "a quotation in Markdown; use a quote block",
  code: "code in a text; use a code block",
  codespan: "code in a text; use a code block, or $…$ for a formula",
  def: "a link definition; write the link in place: [text](url)",
  del: "strikethrough is not part of restricted Markdown",
  hr: "a horizontal rule; structure the page with section blocks",
  image: "an image in a text; use a figure block",
  table: "a table in Markdown; use a table block",
  checkbox: "a task list is not part of restricted Markdown",
};
const ALLOWED = new Set([
  "space",
  "paragraph",
  "text",
  "list",
  "list_item",
  "strong",
  "em",
  "link",
  "escape",
  "br",
  "math",
]);

function children(token: Token): Token[] {
  const nested: Token[] = [];
  if ("tokens" in token && Array.isArray(token.tokens)) nested.push(...(token.tokens as Token[]));
  if (token.type === "list") nested.push(...token.items);
  return nested;
}

/** The problems, formulas and links of a text in restricted Markdown. */
export function inspect(source: string): Inspection {
  const found: Inspection = { problems: [], formulas: [], links: [] };
  const lineOf = (raw: string) => {
    const at = source.indexOf(raw.trimStart());
    return at < 0 ? 0 : source.slice(0, at).split("\n").length - 1;
  };
  const add = (raw: string, message: string) => {
    if (!found.problems.some((problem) => problem.message === message)) {
      found.problems.push({ line: lineOf(raw), message });
    }
  };
  const visit = (tokens: Token[]) => {
    for (const token of tokens) {
      if (token.type === "heading") {
        const title = (token as Tokens.Heading).text.trim();
        add(token.raw, `a Markdown heading ("${title}"); use a section block with the title "${title}"`);
      } else if (token.type === "html") {
        const tag = /^<\/?([a-zA-Z][\w-]*)/.exec(token.raw.trim())?.[1] ?? "";
        const first = found.problems.some((problem) => problem.message.startsWith("raw HTML"));
        if (!first) {
          add(
            token.raw,
            `raw HTML (<${tag}>) is not allowed; write restricted Markdown: **bold**, *italics*, lists, links`,
          );
        }
      } else if (token.type === "math") {
        const tex = String((token as MathToken).tex);
        found.formulas.push(tex);
        const problem = formulaProblem(tex);
        if (problem !== undefined) add(token.raw, `$${tex}$: ${problem}`);
      } else if (token.type === "link") {
        const href = (token as Tokens.Link).href;
        if (/^https?:\/\/\S+$/.test(href) || href.startsWith("/")) found.links.push(href);
        else {
          add(
            token.raw,
            `the link ${href} leads nowhere a learner can follow; link to https://… or to a page of the app: /<chapter>/<page>/`,
          );
        }
      } else if (!ALLOWED.has(token.type)) {
        add(token.raw, NOT_ALLOWED[token.type] ?? `${token.type} is not part of restricted Markdown`);
      }
      visit(children(token));
    }
  };
  visit(marked.lexer(source));
  return found;
}

/** A text in restricted Markdown as HTML; links to pages of the app go through `resolve`. */
export function renderMarkdown(source: string, resolve: (href: string) => string): string {
  resolveLink = resolve;
  return marked.parse(source, { async: false }).trim();
}

/** A short text in restricted Markdown as HTML without a paragraph around it, e.g. a table cell or a caption. */
export function renderInline(source: string, resolve: (href: string) => string): string {
  resolveLink = resolve;
  return marked.parseInline(source, { async: false }).trim();
}

/** A plain text as HTML. */
export const plain = escape;

const FORMULA = /\$((?:\\.|[^\\$\n])+?)\$/g;

/** A plain text as HTML in which only $…$ is a formula (MathML); everything else stays text, as in a quiz. */
export function renderWithFormulas(text: string): string {
  let html = "";
  let from = 0;
  for (const match of text.matchAll(FORMULA)) {
    html += escape(text.slice(from, match.index)) + renderFormula(match[1] ?? "", false);
    from = match.index + match[0].length;
  }
  return html + escape(text.slice(from));
}

/** What is wrong with the formulas $…$ of a plain text; none when each is in the command list and parses. */
export function formulaProblems(text: string): string[] {
  return [...text.matchAll(FORMULA)].flatMap((match) => {
    const problem = formulaProblem(match[1] ?? "");
    return problem === undefined ? [] : [`$${match[1]}$: ${problem}`];
  });
}

/** The first HTML tag in a plain text, if it has one. */
export function htmlTag(text: string): string | undefined {
  return /<\/?([a-zA-Z][\w-]*)[^>]*>/.exec(text)?.[1];
}
