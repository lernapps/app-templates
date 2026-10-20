// Code blocks, highlighted at build time by highlight.js into spans with classes (explainer.css colours them): the
// page needs no script for it. The languages are a fixed list, the schema's $defs/code.
import hljs from "highlight.js/lib/core";
import bash from "highlight.js/lib/languages/bash";
import c from "highlight.js/lib/languages/c";
import css from "highlight.js/lib/languages/css";
import java from "highlight.js/lib/languages/java";
import javascript from "highlight.js/lib/languages/javascript";
import json from "highlight.js/lib/languages/json";
import python from "highlight.js/lib/languages/python";
import sql from "highlight.js/lib/languages/sql";
import typescript from "highlight.js/lib/languages/typescript";
import xml from "highlight.js/lib/languages/xml";
import { escapeText } from "../shared/html.ts";

const languages = { bash, c, css, html: xml, java, javascript, json, python, sql, typescript };
for (const [name, language] of Object.entries(languages)) hljs.registerLanguage(name, language);

/** The languages a code block may have. */
export type CodeLanguage = keyof typeof languages | "plaintext";

/** The code as highlighted HTML, for inside <code>. */
export function highlight(code: string, language: CodeLanguage): string {
  if (language === "plaintext") return escapeText(code);
  return hljs.highlight(code, { language, ignoreIllegals: true }).value;
}
