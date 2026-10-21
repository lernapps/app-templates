// The checks of one learner text at build time, for the content of every archetype: its languages (a text is a string
// while German is the only language, else a map complete in each declared language and in no other), and, by what the
// text is, its content: plain text without raw HTML, restricted Markdown, a formula, a name, the source of a credit.
// The place of a finding is a path below the text: [] for the text, [lang] for its translation in a map.
import { textLanguages, type Text } from "../languages.ts";
import { formulaProblem } from "./formula.ts";
import { htmlTag, inspect } from "./markdown.ts";

/** What a text is: a plain text, restricted Markdown, a formula, a name (a person, a work), the source of a credit. */
export type TextKind = "plain" | "markdown" | "latex" | "name" | "credit";

/** A URL as the source of a credit: the same in every language. */
export const isUrl = (text: string): boolean => /^https?:\/\/\S+$/.test(text);

/** A problem in a text: where (below it), in which language, and in Markdown on which line below its first. */
export interface TextFinding {
  path: (string | number)[];
  lang?: string;
  line?: number;
  message: string;
}

/** A link to a page of the app in a text, which the page that holds the text resolves. */
export interface TextLink {
  path: (string | number)[];
  lang: string;
  href: string;
}

/** The problems of the text `value` of the given kind in `languages`, declared in `declaredIn`, and its links. */
export function checkText(
  value: Text,
  kind: TextKind,
  languages: readonly string[],
  declaredIn?: string,
): { findings: TextFinding[]; links: TextLink[] } {
  const findings: TextFinding[] = [];
  const links: TextLink[] = [];
  const neutral =
    kind === "latex" || kind === "name" || (kind === "credit" && typeof value === "string" && isUrl(value));
  const { texts, problems } = textLanguages(value, languages, neutral, declaredIn);
  for (const problem of problems) findings.push({ path: [], lang: problem.lang, message: problem.message });
  for (const { lang, text, keyed } of texts) {
    const at = keyed ? [lang] : [];
    if (kind === "latex") {
      const problem = formulaProblem(text);
      if (problem !== undefined) findings.push({ path: at, ...(keyed ? { lang } : {}), message: problem });
      continue;
    }
    if (kind === "plain" || kind === "name" || kind === "credit") {
      const tag = htmlTag(text);
      if (tag !== undefined) {
        findings.push({
          path: at,
          lang,
          message: `raw HTML (<${tag}>) is not allowed; write restricted Markdown: **bold**, *italics*, lists, links`,
        });
      }
      continue;
    }
    const found = inspect(text);
    for (const problem of found.problems) {
      findings.push({ path: at, lang, line: problem.line, message: problem.message });
    }
    for (const href of found.links.filter((link) => link.startsWith("/"))) links.push({ path: at, lang, href });
  }
  return { findings, links };
}
