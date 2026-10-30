// Reads an explainer's content from src/ at build time and validates it: each file against its part of the schema
// (explainer.v1.schema.json), then what a schema cannot say. The order lists are complete and unique, the depth is
// app, chapter, page and two section levels, ids are unique per level, every text is complete in each declared
// language and in no other, texts hold restricted Markdown without raw HTML or headings, formulas are in the command
// list, bundled images and quotes name source and licence, links to pages of the app find their page and section,
// every page has an exercise, a question of the question types passes the validation of a question in every declared language,
// a generated exercise declares what it uses and passes its property test over fixed seeds (generated.ts), the check
// of each exercise judges its examples as they are listed, a vue-component block names a component of src/components/
// that passes its checks (components.ts), its props match the component's prop types, it has its nojs text (an exercise
// component's is generated from its describe) and, for an exercise component, its examples (which the build step
// runs, plugin.ts) and an anchor once on the page (its id, or its name in kebab case), every data file is named by a timeline, a generated exercise or a component prop, and src/ holds nothing else. Each problem is one line: the file,
// its line, the place in the file, the language where it matters, and what to do.
import { existsSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import { checkBlocks } from "./check-page.ts";
import { readComponents } from "./components/read.ts";
import {
  isExercise,
  type App,
  type BlockOf,
  type Chapter,
  type ComponentUse,
  type DataRecord,
  type Page,
  type SelfAssessment,
  type Site,
} from "./content.ts";
import { allBlocks } from "./routes.ts";
import { ASSESSMENT, drawsTasks, exerciseOf, parseRef } from "./assessment.ts";
import { SCHEMA_FILE, validate } from "./schema.ts";
import { appName } from "../shared/appname.ts";
import { isObject, Problems, readYaml, Texts, type Path, type YamlFile } from "../shared/content.ts";
import { isLanguage, LANGUAGES, languageListProblems } from "../shared/languages.ts";

export { SCHEMA_ID } from "./schema.ts";
export const RULE_URL = "https://lernapps.net/tooling/rules/#explainer-content-valid";

/** What src/ may hold besides the chapter folders. */
const SRC = "src/ holds only app.yaml, the chapter folders, data/, images/, components/ and main.ts";
/** Chapter ids that would collide with other addresses: data files, images, the glossary, the scope, language trees. */
const RESERVED = new Set(["data", "images", "glossar", "components", "assets", "scope", ASSESSMENT]);
const ID = /^[a-z0-9]+(-[a-z0-9]+)*$/;
const IMAGE = /^[a-z0-9]+(-[a-z0-9]+)*\.(svg|png|jpg|webp)$/;

/** The content could not be read: one problem per line in `problems`. */
export class ContentError extends Error {
  readonly problems: readonly string[];
  constructor(problems: readonly string[]) {
    super(
      [
        `the explainer's content in src/ is not valid (${RULE_URL}):`,
        ...problems.map((problem) => `  - ${problem}`),
        `Fix the content as its schema says: ${SCHEMA_FILE}`,
      ].join("\n"),
    );
    this.problems = problems;
  }
}

/** The files and folders in `dir`, sorted. */
const entries = (dir: string) => (existsSync(dir) ? readdirSync(dir).sort() : []);
const isDirectory = (path: string) => statSync(path).isDirectory();

/** Checks the order list `list` (at `key` of `yaml`) against the ids that exist; true when they agree. */
function checkOrder(
  yaml: YamlFile,
  key: string,
  list: readonly string[],
  existing: readonly string[],
  what: { one: string; folder: string; file: (id: string) => string },
  problems: Problems,
): boolean {
  let ok = true;
  list.forEach((id, index) => {
    if (list.indexOf(id) !== index) {
      problems.at(yaml, [key, index], `${id} is listed twice; list each ${what.one} exactly once`);
      ok = false;
    } else if (!existing.includes(id)) {
      problems.at(yaml, [key, index], `${id} is listed, but ${what.file(id)} does not exist`);
      ok = false;
    }
  });
  for (const id of existing.filter((candidate) => !list.includes(candidate))) {
    problems.at(yaml, [key], `${id} is not listed; list each ${what.one} of ${what.folder} exactly once`);
    ok = false;
  }
  return ok;
}

/**
 * The problems of the self-assessment `assessment` of `yaml`: of the app (no `chapter`), or of the chapter `chapter`,
 * whose exercises are all its own. Each reference names a page and an exercise of it of a question type or generated;
 * a question is listed once, a generated exercise may be listed again (each listing draws a task of its own).
 */
function checkAssessment(
  yaml: YamlFile,
  assessment: SelfAssessment,
  chapters: readonly Chapter[],
  chapter: string | undefined,
  components: Site["components"],
  problems: Problems,
): void {
  const seen = new Set<string>();
  assessment.pages.forEach((step, index) => {
    step.exercises.forEach((ref, at) => {
      const path = ["selfAssessment", "pages", index, "exercises", at];
      const parts = parseRef(ref);
      if (parts === undefined) return;
      const twice = seen.has(ref);
      seen.add(ref);
      if (chapter !== undefined && parts.chapter !== chapter) {
        problems.at(
          yaml,
          path,
          `${ref} is not an exercise of the chapter ${chapter}; a chapter's self-assessment asks only its own pages; the app's is every chapter's together`,
        );
        return;
      }
      const page = chapters
        .find((candidate) => candidate.id === parts.chapter)
        ?.pages.find((candidate) => candidate.id === parts.page);
      if (page === undefined) {
        problems.at(yaml, path, `${ref} names no page of the app; write /<chapter>/<page>/#<exercise>`);
        return;
      }
      const exercise = exerciseOf(components, page, parts.exercise);
      // a generated exercise or an exercise component may be listed again: each listing draws a task of its own
      if (twice && exercise !== undefined && !drawsTasks(exercise)) {
        problems.at(
          yaml,
          path,
          `${ref} is listed twice, and a question shows the same task each time; list it once (a generated exercise or an exercise component may be listed again: each listing draws a task of its own)`,
        );
        return;
      }
      if (exercise !== undefined) return;
      const component = components.some(
        (use) => use.id === parts.exercise && [...allBlocks(page.blocks)].some((block) => block === use.block),
      );
      problems.at(
        yaml,
        path,
        component
          ? `${ref} is a component that checks no answer; choose an exercise: generated, a question type, or an exercise component`
          : `${ref} names no exercise of ${page.file}; use the id of one of its exercises: generated, a question type, or an exercise component`,
      );
    });
  });
}

/** How many seeds the property test of each generated exercise draws at build time. */
export const SEEDS = 200;

/** The problems of the content in `root`/src, and the content when there are none. */
export function check(root: string, seeds = SEEDS): { site?: Site; problems: string[] } {
  const problems = new Problems();
  const src = join(root, "src");
  if (!existsSync(join(src, "app.yaml"))) {
    problems.file(
      "src/app.yaml",
      "is missing: the app's title, intro, languages and the order of its chapters belong there",
    );
    return { problems: problems.lines };
  }

  // what src/ holds
  const chapterIds: string[] = [];
  const dataFiles = new Map<string, YamlFile>();
  for (const name of entries(src)) {
    const path = join(src, name);
    if (name === "app.yaml" || name === "main.ts") continue;
    if (name === "components" && isDirectory(path)) continue;
    if (!isDirectory(path)) {
      problems.file(`src/${name}`, `not part of an explainer; ${SRC}`);
    } else if (name === "images") {
      for (const image of entries(path)) {
        if (isDirectory(join(path, image)) || !IMAGE.test(image)) {
          problems.file(
            `src/images/${image}`,
            "not an image of an explainer; src/images/ holds image files <name>.svg, .png, .jpg or .webp, with a lower-case name",
          );
        }
      }
    } else if (name === "data") {
      for (const file of entries(path)) {
        const id = file.replace(/\.yaml$/, "");
        if (isDirectory(join(path, file)) || !file.endsWith(".yaml") || !ID.test(id)) {
          problems.file(
            `src/data/${file}`,
            "not a data file; src/data/ holds data files <name>.yaml, with a lower-case name",
          );
          continue;
        }
        const yaml = readYaml(root, `src/data/${file}`, problems);
        if (yaml !== undefined && validate(yaml, "data", problems)) dataFiles.set(id, yaml);
      }
    } else if (!ID.test(name)) {
      problems.file(
        `src/${name}/`,
        `the folder's name is the chapter's id: use lower-case letters, digits and hyphens`,
      );
    } else if (RESERVED.has(name) || /^[a-z]{2}$/.test(name)) {
      problems.file(
        `src/${name}/`,
        `${name} is reserved for the app's addresses (data, images, glossar, components, assets, ${ASSESSMENT} and two-letter language codes); rename the chapter`,
      );
    } else chapterIds.push(name);
  }

  // the components, read with Vue's SFC compiler only when there are any
  const components = existsSync(join(src, "components")) ? readComponents(root) : undefined;
  for (const problem of components?.problems ?? []) problems.add(problem);

  // the app
  const appYaml = readYaml(root, "src/app.yaml", problems);
  if (appYaml === undefined || !validate(appYaml, "app", problems)) return { problems: problems.lines };
  const app = appYaml.value as App;
  const languageList = languageListProblems(app.languages, LANGUAGES);
  for (const problem of languageList) {
    problems.at(appYaml, ["languages", Math.max(app.languages.lastIndexOf(problem.lang), 0)], problem.message);
  }
  if (languageList.length > 0) return { problems: problems.lines };
  const texts = new Texts(app.languages, problems);
  texts.check(appYaml, ["title"], "plain");
  texts.check(appYaml, ["intro"], "markdown");
  texts.check(appYaml, ["tutor", "rules"], "markdown");
  app.sources?.forEach((_source, index) => texts.check(appYaml, ["sources", index, "title"], "plain"));
  // a text by language anywhere in a record, also in the lists and records of a record: a map of strings with a
  // language among its keys; a record whose fields are all texts ({ name: Geige, familie: Streicher }) is no text
  const checkDataTexts = (yaml: YamlFile, path: (string | number)[], value: unknown): void => {
    if (Array.isArray(value)) value.forEach((item, index) => checkDataTexts(yaml, [...path, index], item));
    else if (isObject(value)) {
      const fields = Object.entries(value);
      if (fields.every(([, field]) => typeof field === "string") && fields.some(([key]) => isLanguage(key))) {
        texts.check(yaml, path, "plain");
      } else for (const [field, item] of fields) checkDataTexts(yaml, [...path, field], item);
    }
  };
  for (const yaml of dataFiles.values()) {
    (yaml.value as DataRecord[]).forEach((record, index) => checkDataTexts(yaml, [index], record));
  }
  const chaptersOk = checkOrder(
    appYaml,
    "chapters",
    app.chapters,
    chapterIds,
    { one: "chapter", folder: "src/", file: (id) => `src/${id}/` },
    problems,
  );

  // the chapters and their pages
  const terms = new Map<string, string>();
  const images = new Map<string, string>();
  const anchors = new Map<string, Set<string>>();
  const uses: ComponentUse[] = [];
  const dataUsed = new Set<string>();
  // false once a chapter or page could not be read: what it names is unknown, so no data file counts as unused
  let complete = true;
  const chapters: Chapter[] = [];
  const chapterFiles = new Map<string, YamlFile>();
  for (const chapterId of chaptersOk ? app.chapters : chapterIds) {
    const folder = join(src, chapterId);
    const pageIds: string[] = [];
    for (const name of entries(folder)) {
      const file = `src/${chapterId}/${name}`;
      if (name === "chapter.yaml") continue;
      if (isDirectory(join(folder, name))) {
        problems.file(
          `${file}/`,
          "a folder inside a chapter; an explainer goes app, chapter, page, and two section levels inside a page: split the app",
        );
      } else if (!name.endsWith(".yaml")) {
        problems.file(
          file,
          `not part of an explainer; a chapter folder holds only chapter.yaml and its pages <page>.yaml`,
        );
      } else if (!ID.test(name.slice(0, -".yaml".length))) {
        problems.file(file, `the file's name is the page's id: use lower-case letters, digits and hyphens`);
      } else if (name === `${ASSESSMENT}.yaml`) {
        problems.file(file, `${ASSESSMENT} is reserved for the chapter's self-assessment; rename the page`);
      } else {
        const pageId = name.slice(0, -".yaml".length);
        pageIds.push(pageId);
      }
    }
    if (!existsSync(join(folder, "chapter.yaml"))) {
      problems.file(
        `src/${chapterId}/chapter.yaml`,
        "is missing: a chapter folder needs its chapter.yaml with its title and the order of its pages",
      );
      complete = false;
      continue;
    }
    const chapterYaml = readYaml(root, `src/${chapterId}/chapter.yaml`, problems);
    if (chapterYaml === undefined || !validate(chapterYaml, "chapter", problems)) {
      complete = false;
      continue;
    }
    const chapter = chapterYaml.value as Omit<Chapter, "id" | "pages"> & { pages: string[] };
    chapterFiles.set(chapterId, chapterYaml);
    texts.check(chapterYaml, ["title"], "plain");
    texts.check(chapterYaml, ["summary"], "markdown");
    const pagesOk = checkOrder(
      chapterYaml,
      "pages",
      chapter.pages,
      pageIds,
      { one: "page", folder: `src/${chapterId}/`, file: (id) => `src/${chapterId}/${id}.yaml` },
      problems,
    );
    const pages: Page[] = [];
    for (const pageId of pagesOk ? chapter.pages : pageIds) {
      const file = `src/${chapterId}/${pageId}.yaml`;
      const yaml = readYaml(root, file, problems);
      if (yaml === undefined || !validate(yaml, "page", problems)) {
        complete = false;
        continue;
      }
      const page = yaml.value as Omit<Page, "id" | "chapter" | "file">;
      texts.check(yaml, ["title"], "plain");
      texts.check(yaml, ["description"], "plain");
      const pageAnchors = new Set<string>();
      const exercises = new Map<string, Path>();
      checkBlocks(
        {
          yaml,
          texts,
          problems,
          root,
          dataFiles,
          terms,
          images,
          anchors: pageAnchors,
          exercises,
          seeds,
          components,
          uses,
          dataUsed,
        },
        page.blocks,
        ["blocks"],
        0,
      );
      if (![...allBlocks(page.blocks)].some(isExercise)) {
        problems.at(
          yaml,
          ["blocks"],
          "the page has no exercise; give it a section with an exercise: one of the question types, or generated",
        );
      }
      for (const [id, path] of exercises) {
        if (pageAnchors.has(id)) {
          problems.at(
            yaml,
            [...path, "id"],
            `${id} is also the anchor of a section of this page; give the exercise its own id`,
          );
        }
        pageAnchors.add(id);
      }
      anchors.set(`/${chapterId}/${pageId}/`, pageAnchors);
      pages.push({ ...page, id: pageId, chapter: chapterId, file });
    }
    chapters.push({
      id: chapterId,
      title: chapter.title,
      ...(chapter.summary === undefined ? {} : { summary: chapter.summary }),
      ...(chapter.selfAssessment === undefined ? {} : { selfAssessment: chapter.selfAssessment }),
      ...(chapter.scope === undefined ? {} : { scope: chapter.scope }),
      pages,
    });
  }

  // the self-assessments: each exercise found, checkable, in its scope and listed once
  if (complete) {
    for (const chapter of chapters) {
      const yaml = chapterFiles.get(chapter.id);
      if (chapter.selfAssessment === undefined || yaml === undefined) continue;
      checkAssessment(yaml, chapter.selfAssessment, chapters, chapter.id, uses, problems);
    }
  }

  // a data file that nothing names is dead: the author believes its content is in the app
  if (complete) {
    for (const id of dataFiles.keys()) {
      if (dataUsed.has(id)) continue;
      problems.file(
        `src/data/${id}.yaml`,
        `never used; no timeline, generated exercise or component prop names { data: ${id} }. Use it, or remove it (explainer-unused-data)`,
      );
    }
  }

  // links to pages of the app
  const hidden = app.chapters.length === 1;
  for (const link of texts.links) {
    const [path = "", hash] = link.href.split("#");
    const pageAnchors = anchors.get(path);
    const generated =
      path === "/" ||
      (path === "/glossar/" && terms.size > 0) ||
      (!hidden && app.chapters.some((id) => path === `/${id}/`));
    if (pageAnchors === undefined && !generated) {
      problems.at(
        link.yaml,
        link.path,
        `the link ${link.href} leads to no page of the app; write /<chapter>/<page>/, or /<chapter>/<page>/#<section>`,
        link.lang,
      );
    } else if (hash !== undefined && hash !== "" && (pageAnchors === undefined || !pageAnchors.has(hash))) {
      problems.at(link.yaml, link.path, `the link ${link.href} leads to no section of its page`, link.lang);
    }
  }

  // the scope for the tutor: with the app's, every page has its own; a page's without the app's would be lost
  for (const chapter of chapters) {
    for (const page of chapter.pages) {
      if (app.scope !== undefined && page.scope === undefined) {
        problems.file(
          page.file,
          "has no scope; src/app.yaml has one, so each page says in scope: what it teaches, in your own words from the material",
        );
      } else if (app.scope === undefined && page.scope !== undefined) {
        problems.file(
          page.file,
          "has a scope, but src/app.yaml has none; add scope: { in: [...], out: [...] } to src/app.yaml, what belongs to the scope and what does not",
        );
      }
    }
  }

  if (problems.lines.length > 0) return { problems: problems.lines };
  const data: Record<string, DataRecord[]> = {};
  for (const [id, yaml] of dataFiles) data[id] = yaml.value as DataRecord[];
  return {
    site: {
      app,
      chapters,
      data,
      images,
      components: uses,
      storage: appName(root, "explainer"),
    },
    problems: [],
  };
}

/**
 * The content in `root`/src, its generated exercises tested over `seeds` seeds (0: not at all, for a reader of content
 * the build has checked); throws a ContentError with every problem when it is not valid. */
export function loadSite(root: string, seeds = SEEDS): Site {
  const { site, problems } = check(root, seeds);
  if (site === undefined) throw new ContentError(problems);
  return site;
}

export type { BlockOf };
