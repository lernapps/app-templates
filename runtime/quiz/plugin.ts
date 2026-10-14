// The build step of a quiz (@lernapps/app-templates/quiz/plugin), a Vite plugin. An app's vite.config.ts adds it to
// the shared preset of @lernapps/tooling:
//
//   import { lernapps } from "@lernapps/tooling/preset";
//   import { quiz } from "@lernapps/app-templates/quiz/plugin";
//   export default lernapps({ plugins: [quiz()] });
//
// It reads the question bank (src/quiz.json), validates it against its JSON Schema and fails the build with a
// message naming each problem, and renders every question into index.html where it says <!-- quiz -->, so the page
// reads without JavaScript. The app's src/main.ts starts the engine (@lernapps/app-templates/quiz) on that page.
// A bank in several languages (languages: ["de", "en"]) gives a page per language: German in index.html, every other
// language in <language>/index.html, the built index.html with that language's quiz and its relative asset URLs
// rewritten for its depth; each with its language, its alternates and a language switch. `vp dev` serves the same
// pages, /en/ in English.
import { readFileSync } from "node:fs";
import { join } from "node:path";
import type { Plugin } from "vite-plus";
import type { Text } from "../shared/languages.ts";
import { fromDepth, languageRoot, withLanguage } from "../shared/pages.ts";
import { quizIn, quizLanguages, type Quiz } from "./quiz.ts";
import { renderQuiz } from "./render.ts";
import { readBank } from "./validate.ts";

/** Where the question bank is, relative to the app's root. */
export const BANK = "src/quiz.json";
const MARKER = "<!-- quiz -->";

const escapeAttribute = (text: string) => text.replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;");

/** The app's name from its package.json: the prefix of what it stores on the device. */
function appName(root: string): string {
  try {
    const manifest: unknown = JSON.parse(readFileSync(join(root, "package.json"), "utf8"));
    if (typeof manifest === "object" && manifest !== null && "name" in manifest && typeof manifest.name === "string") {
      return manifest.name;
    }
  } catch {
    // no package.json: the default name
  }
  return "quiz";
}

/** The bank, in all its languages, and the name of the app's storage when the quiz keeps the last result. */
interface Bank {
  quiz: Quiz<Text>;
  storage?: string;
}

/** The page in `lang`: the shell with the quiz in that language, its title, description and alternates. */
function fill(html: string, { quiz, storage }: Bank, lang: string): string {
  if (!html.includes(MARKER)) {
    throw new Error(`index.html has no ${MARKER}: put it in <body>, where the quiz goes`);
  }
  const data = {
    quiz: quizIn(quiz, lang),
    ...(storage === undefined ? {} : { storage }),
    ...(lang === "de" ? {} : { lang }),
  };
  const { title, description, alternates, body } = renderQuiz(data, { languages: quizLanguages(quiz) });
  const head = [
    `<title>${escapeAttribute(title)}</title>`,
    `<meta name="description" content="${escapeAttribute(description)}" />`,
    ...alternates,
  ].join("\n    ");
  const withHead = /<title>[\s\S]*?<\/title>/.test(html)
    ? html.replace(/<title>[\s\S]*?<\/title>/, head)
    : html.replace("</head>", `    ${head}\n  </head>`);
  return (lang === "de" ? withHead : withLanguage(withHead, lang)).replace(MARKER, () => body);
}

/** The language of a page the dev server serves: the first part of its address, if the quiz has that language. */
function languageOf(url: string | undefined, languages: readonly string[]): string {
  const first = /^\/([a-z]{2})\//.exec(url ?? "")?.[1];
  return first !== undefined && first !== "de" && languages.includes(first) ? first : "de";
}

/** The build step of the quiz: validates the question bank and renders it into index.html, a page per language. */
export function quiz(): Plugin {
  let root = process.cwd();
  let bank: Bank | undefined;
  /** The built index.html before the quiz is in it, for the pages in the other languages. */
  let shell: string | undefined;
  const load = (): Bank => {
    const file = join(root, BANK);
    let text: string;
    try {
      text = readFileSync(file, "utf8");
    } catch {
      throw new Error(`${BANK} is missing: the quiz's questions belong there (schema quiz.v1.schema.json)`);
    }
    const quiz = readBank(text, BANK);
    return quiz.rememberLastResult === true ? { quiz, storage: appName(root) } : { quiz };
  };
  return {
    name: "lernapps-quiz",
    // after Vite has written the built index.html, so the pages in the other languages are made from it
    enforce: "post",
    configResolved(config) {
      root = config.root;
    },
    buildStart() {
      this.addWatchFile(join(root, BANK));
      try {
        bank = load();
      } catch (error) {
        this.error(error instanceof Error ? error.message : String(error));
      }
    },
    handleHotUpdate({ file, server }) {
      if (file === join(root, BANK)) {
        bank = undefined;
        server.ws.send({ type: "full-reload" });
      }
    },
    transformIndexHtml(html, context) {
      bank ??= load();
      shell = html;
      return fill(html, bank, languageOf(context.originalUrl, quizLanguages(bank.quiz)));
    },
    generateBundle() {
      if (bank === undefined || shell === undefined) return;
      for (const lang of quizLanguages(bank.quiz).slice(1)) {
        const path = languageRoot(lang);
        this.emitFile({
          type: "asset",
          fileName: `${path}index.html`,
          // the shell's asset URLs for the depth of the page, before the quiz is in it (its own links are relative to it)
          source: fill(fromDepth(shell, path), bank, lang),
        });
      }
    },
  };
}
