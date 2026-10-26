// The build step of an explainer (@lernapps/app-templates/explainer/plugin), a Vite plugin. An app's vite.config.ts
// adds it to the shared preset of @lernapps/tooling:
//
//   import { lernapps } from "@lernapps/tooling/preset";
//   import { explainer } from "@lernapps/app-templates/explainer/plugin";
//   export default lernapps({ plugins: [explainer()] });
//
// It reads the content in src/ (load.ts) and fails the build with one line per problem. index.html is Vite's only
// entry: Vite builds the one hashed client module (src/main.ts) and stylesheet from it. The built index.html is then
// the shell of every page: each page is the shell with its language, its head and its body where it says
// <!-- explainer -->, written into its folder, with the shell's relative asset URLs (./assets/…) rewritten for its
// depth. The bundled images go to images/, the tutor page of each content page to <chapter>/<page>/tutor/ with its
// Markdown beside it (index.md; tutorpage.ts), every link of it checked, and 404.html, which leads every address the
// app does not have to its start page (notFoundPage of ../shared/pages.ts). `vp dev` serves the same pages and tutor pages, rendered on each request.
//
// Components (src/components/<Name>.vue, components.ts): only when the app has them, the plugin compiles them with
// @vitejs/plugin-vue and resolves vue to the copy this runtime depends on, so that the components and the islands
// module share one Vue. Before the pages are written, it runs the property test of each exercise component's logic
// module for every block that uses it, with the block's examples, reads what the logic describes (about, and describe
// for each task number in each language, for the no-JS text and the tutor), and renders each block's component with
// Vue's server renderer in each language, all in a Vite server of their own; a problem fails the build with its line. The islands module
// (islands.ts) is a chunk of its own with Vue, and only the pages with a component load it; each component is a chunk
// that its pages load when they hydrate it, and its own code, gzipped, must stay within the budget.
import { existsSync, readFileSync, readdirSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { gzipSync } from "node:zlib";
import type { Component } from "vue";
import type { Plugin, ViteDevServer } from "vite-plus";
import { describedProblems, exampleProblems, propertyProblems, type ExerciseLogic } from "./components/exercise.ts";
import { propsIn } from "./components/props.ts";
import { SIZE_BUDGET } from "./components/read.ts";
import type { Block, ComponentDescription, Descriptions, Site } from "./content.ts";
import { ContentError, loadSite } from "./load.ts";
import { dataOf, taskSeeds } from "./exercises.ts";
import { MAX_TASKS } from "./tasks.ts";
import { renderSite, type Islands, type RenderedPage } from "./render.ts";
import { fromDepth, languageRoot, notFoundPage, withLanguage } from "../shared/pages.ts";
import { type Load, VUE_OPTIONS, vueAlias, withServer } from "../shared/vue.ts";
import { allBlocks, contentPages, routes } from "./routes.ts";
import { anchorsOf, linkProblems, tutorPageOf } from "./tutor.ts";
import {
  bytesOf,
  type Cut,
  tableHint,
  TUTOR_MARKDOWN,
  TUTOR_PAGE_BUDGET,
  tutorPage,
  tutorPageDocument,
} from "./tutorpage.ts";
import { imageType } from "../shared/blocks/image.ts";

const MARKER = "<!-- explainer -->";
const ISLANDS = "\0lernapps-explainer-islands";

/** The shell with the page in it, and `head` (the islands module) at the end of its head. */
export function fill(shell: string, page: RenderedPage, head = ""): string {
  if (!shell.includes(MARKER)) throw new Error(`index.html has no ${MARKER}: put it in <body>, where the pages go`);
  const html = withLanguage(shell, page.route.lang)
    .replace(/\s*<title>[\s\S]*?<\/title>/, "")
    .replace("</head>", `  ${page.head}${head === "" ? "" : `\n    ${head}`}\n  </head>`);
  return fromDepth(html, page.route.path).replace(MARKER, () => page.body);
}

/** The islands module, next to this file: islands.ts in the source, explainer-islands.mjs in dist/. */
const here = fileURLToPath(import.meta.url);
const ISLANDS_RUNTIME = here.endsWith(".ts")
  ? join(dirname(here), "islands.ts")
  : join(dirname(here), "explainer-islands.mjs");

/** Whether the app in `root` has components. */
const hasComponents = (root: string): boolean => {
  const dir = join(root, "src/components");
  return existsSync(dir) && readdirSync(dir).some((file) => file.endsWith(".vue"));
};

type Hook = (this: unknown, ...args: unknown[]) => unknown;
/** @vitejs/plugin-vue, loaded only when the app has components: an app without them loads nothing of Vue. */
function vueWhenComponents(): Plugin {
  let inner: Record<string, unknown> | undefined;
  const delegate = (name: string): Hook =>
    function (this: unknown, ...args: unknown[]): unknown {
      const hook = inner?.[name] as Hook | { handler: Hook } | undefined;
      if (hook === undefined) return undefined;
      return (typeof hook === "function" ? hook : hook.handler).apply(this, args);
    };
  const hooks = [
    "configResolved",
    "options",
    "buildStart",
    "configureServer",
    "handleHotUpdate",
    "shouldTransformCachedModule",
    "resolveId",
    "load",
    "transform",
  ];
  return {
    name: "lernapps-explainer-vue",
    ...Object.fromEntries(hooks.map((name) => [name, delegate(name)])),
    async config(config, env) {
      if (!hasComponents(resolve(config.root ?? process.cwd()))) return undefined;
      const { default: vue } = await import("@vitejs/plugin-vue");
      inner = vue(VUE_OPTIONS) as unknown as Record<string, unknown>;
      const own = ((await delegate("config").call(this, config, env)) ?? {}) as { resolve?: object };
      return { ...own, resolve: { ...own.resolve, alias: vueAlias() } };
    },
  } as Plugin;
}

const reason = (error: unknown) => (error instanceof Error ? error.message : String(error)).split("\n")[0] ?? "";

/**
 * The property test of each exercise component's logic with each block's props (`test`), what its logic describes
 * (about, and describe for each task number in each language), and the markup of each block's component in each
 * language, rendered by Vue's server renderer, an exercise component with the task number 1; or the problems, one
 * line each.
 */
async function renderComponents(
  site: Site,
  load: Load,
  test: boolean,
): Promise<{ islands: Islands; descriptions: Descriptions; problems: string[] }> {
  const problems: string[] = [];
  const islands = new Map<Block, Map<string, string>>();
  const descriptions = new Map<Block, ComponentDescription>();
  if (site.components.length === 0) return { islands, descriptions, problems };
  const { createSSRApp } = (await load("vue")) as unknown as typeof import("vue");
  const { renderToString } = (await load("vue/server-renderer")) as unknown as typeof import("vue/server-renderer");
  for (const { block, component, place, examples } of site.components) {
    if (component.logic !== undefined) {
      const logic = (await load(`/${component.file.replace(/\.vue$/, ".ts")}`)) as unknown as ExerciseLogic;
      const props = propsIn(block.props, component, "de");
      const contract = test ? propertyProblems(logic, props) : [];
      for (const problem of contract) {
        problems.push(`${place}: ${component.name}.ts: ${problem} (vue-component-exercise-contract)`);
      }
      if (test && contract.length === 0) {
        for (const { kind, index, message } of exampleProblems(logic, props, block.examples)) {
          problems.push(
            `${examples[kind][index] ?? place}: ${component.name}.ts: ${message} (vue-component-exercise-contract)`,
          );
        }
      }
      if (contract.length === 0) {
        const described = describedProblems(logic, (lang) => propsIn(block.props, component, lang), site.app.languages);
        for (const problem of described.problems) {
          problems.push(`${place}: ${component.name}.ts: ${problem} (vue-component-exercise-contract)`);
        }
        if (described.description !== undefined) descriptions.set(block, described.description);
      }
    }
    const definition = (await load(`/${component.file}`))["default"] as Component;
    const markup = new Map<string, string>();
    for (const lang of site.app.languages) {
      const app = createSSRApp(definition, {
        ...propsIn(block.props, component, lang),
        // the task of number 1, as the islands hydrate it
        ...(component.exercise ? { seed: descriptions.get(block)?.seeds[0] ?? 1 } : {}),
      });
      const warnings = new Set<string>();
      app.config.warnHandler = (message) => warnings.add(message);
      try {
        markup.set(lang, await renderToString(app));
      } catch (error) {
        problems.push(`${place} (${lang}): ${component.name} throws while the build renders it: ${reason(error)}`);
      }
      for (const warning of warnings) {
        problems.push(`${place} (${lang}): Vue warns while the build renders ${component.name}: ${warning}`);
      }
    }
    islands.set(block, markup);
  }
  return { islands, descriptions, problems };
}

/** The islands module of the app: the islands runtime, with each component the pages use, loaded on first use. */
function islandsModule(site: Site): string {
  const names = [...new Set(site.components.map((use) => use.component.name))];
  const loaders = names.map(
    (name) => `  ${JSON.stringify(name)}: () => import(${JSON.stringify(`/src/components/${name}.vue`)}),`,
  );
  return [
    `import { startIslands } from ${JSON.stringify(ISLANDS_RUNTIME)};`,
    `startIslands({`,
    ...loaders,
    `});`,
    "",
  ].join("\n");
}

/** A tutor page as the build writes it: its Markdown, its HTML, and its exercises with numbers left out. */
interface TutorAsset {
  markdown: string;
  html: string;
  cut: Cut[];
}

/**
 * What the build writes for a tutor beside the pages: the tutor page of each content page, by its folder from the
 * app's root (with the language root), its HTML as index.html and its Markdown beside it.
 */
function tutorAssets(site: Site, descriptions: Descriptions): Map<string, TutorAsset> {
  const pages = new Map<string, TutorAsset>();
  for (const lang of site.app.languages) {
    for (const page of contentPages(site)) {
      const { markdown, cut } = tutorPage(site, page, lang, descriptions);
      pages.set(`${languageRoot(lang)}${tutorPageOf(page)}`, {
        markdown,
        html: tutorPageDocument(markdown, site, page, lang),
        cut,
      });
    }
  }
  return pages;
}

/** The build step of an explainer: validates the content in src/ and writes every page. */
export function explainer(): Plugin[] {
  let root = process.cwd();
  let command: "build" | "serve" = "build";
  let site: Site | undefined;
  let islands: Islands = new Map();
  let descriptions: Descriptions = new Map();
  let islandsChunk: string | undefined;
  let devServer: ViteDevServer | undefined;
  const load = () => (site ??= loadSite(root));
  const main: Plugin = {
    name: "lernapps-explainer",
    enforce: "post",
    configResolved(config) {
      root = config.root;
      command = config.command;
    },
    async buildStart() {
      site = undefined;
      islands = new Map();
      descriptions = new Map();
      islandsChunk = undefined;
      let content: Site;
      try {
        content = load();
      } catch (error) {
        this.error(error instanceof Error ? error.message : String(error));
      }
      if (command !== "build" || content.components.length === 0) return;
      const rendered = await withServer(root, (loader) => renderComponents(content, loader, true));
      if (rendered.problems.length > 0) this.error(new ContentError(rendered.problems).message);
      islands = rendered.islands;
      descriptions = rendered.descriptions;
      islandsChunk = this.emitFile({ type: "chunk", id: ISLANDS, name: "islands" });
    },
    resolveId(id) {
      return id === ISLANDS ? ISLANDS : undefined;
    },
    load(id) {
      return id === ISLANDS ? islandsModule(load()) : undefined;
    },
    generateBundle(_options, bundle) {
      const index = bundle["index.html"];
      if (index === undefined || index.type !== "asset") return;
      const shell = String(index.source);
      const content = load();
      const script =
        islandsChunk === undefined
          ? ""
          : `<script type="module" crossorigin src="./${this.getFileName(islandsChunk)}"></script>`;
      for (const page of renderSite(content, islands, descriptions)) {
        const html = fill(shell, page, page.islands ? script : "");
        if (page.route.path === "") index.source = html;
        else this.emitFile({ type: "asset", fileName: `${page.route.path}index.html`, source: html });
      }
      this.emitFile({ type: "asset", fileName: "404.html", source: notFoundPage() });
      for (const [image, file] of content.images) {
        this.emitFile({ type: "asset", fileName: image, source: readFileSync(file) });
      }
      const problems: string[] = [];
      const tutor = tutorAssets(content, descriptions);
      for (const lang of content.app.languages) {
        const files = new Set([
          ...routes(content)
            .filter((route) => route.lang === lang)
            .map((route) => route.local),
          ...contentPages(content).map((page) => tutorPageOf(page)),
        ]);
        const anchors = new Map(
          contentPages(content).map((page) => [`${page.chapter}/${page.id}/`, anchorsOf(content, page)]),
        );
        // the tutor page of each content page with its Markdown, each link checked against the pages and anchors of
        // the language tree
        for (const contentPage of contentPages(content)) {
          const local = tutorPageOf(contentPage);
          const page = tutor.get(`${languageRoot(lang)}${local}`);
          if (page === undefined) continue;
          problems.push(
            ...linkProblems(local, page.markdown, files, anchors).map((problem) => `${languageRoot(lang)}${problem}`),
          );
          this.emitFile({ type: "asset", fileName: `${languageRoot(lang)}${local}index.html`, source: page.html });
          this.emitFile({
            type: "asset",
            fileName: `${languageRoot(lang)}${local}${TUTOR_MARKDOWN}`,
            source: page.markdown,
          });
        }
      }
      // a tutor page beyond its budget: noted, no problem (the tutor may get it cut off)
      const large = [...tutor].filter(([, page]) => bytesOf(page.html) > TUTOR_PAGE_BUDGET);
      if (large.length > 0) {
        this.info(
          `lernapps explainer: ${large.length} tutor page${large.length === 1 ? " is" : "s are"} larger than ${TUTOR_PAGE_BUDGET / 1000} kB, which a tutor may get cut off: ${large.map(([file, page]) => `${file} (${(bytesOf(page.html) / 1000).toFixed(0)} kB)`).join(", ")}`,
        );
      }
      // an exercise component whose numbers do not all fit on its tutor page: a warning, until it declares its
      // table of tasks (template, params, mistakes and show of its logic module)
      const cut = [...tutor].flatMap(([file, page]) => page.cut.map((one) => ({ file, ...one })));
      if (cut.length > 0) {
        this.warn(
          `lernapps explainer: ${cut.length} exercise${cut.length === 1 ? " shows" : "s show"} only some of ${cut.length === 1 ? "its" : "their"} task numbers on the tutor page, to stay within ${TUTOR_PAGE_BUDGET / 1000} kB; export template, params, mistakes and show from its logic module for a table of all its numbers: ${cut.map((one) => `${one.file} ${one.id} (${one.shown} of ${one.count})`).join(", ")}`,
        );
      }
      // an exercise component without its table of tasks: a hint for now
      const hint = tableHint(content, descriptions);
      if (hint !== undefined) this.info(hint);
      // the exercises with fewer distinct tasks than the numbers allow: noted, no problem
      const few = [
        ...contentPages(content).flatMap((page) =>
          [...allBlocks(page.blocks)].flatMap((block) =>
            block.type === "generated"
              ? [[block.id, taskSeeds(block, dataOf(block, content.data)).length] as const]
              : [],
          ),
        ),
        ...content.components.flatMap((use) => {
          const seeds = descriptions.get(use.block)?.seeds;
          return seeds === undefined || use.id === undefined ? [] : [[use.id, seeds.length] as const];
        }),
      ].filter(([, count]) => count < MAX_TASKS);
      if (few.length > 0) {
        this.info(
          `lernapps explainer: ${few.length} exercise${few.length === 1 ? " has" : "s have"} fewer than ${MAX_TASKS} distinct tasks, numbered 1 to N: ${few.map(([id, count]) => `${id} (${count})`).join(", ")}`,
        );
      }
      // each component's own code: its chunk and the chunks of its folder that it imports, gzipped
      const chunks = Object.values(bundle).flatMap((output) => (output.type === "chunk" ? [output] : []));
      const folder = join(root, "src/components");
      for (const component of new Map(content.components.map((use) => [use.component.name, use.component])).values()) {
        const chunk = chunks.find((candidate) => candidate.facadeModuleId === component.path);
        if (chunk === undefined) continue;
        const own = [
          chunk.code,
          ...chunk.imports
            .map((file) => chunks.find((candidate) => candidate.fileName === file))
            .filter((imported) => imported !== undefined && imported.moduleIds.every((id) => id.startsWith(folder)))
            .map((imported) => imported?.code ?? ""),
        ].join("\n");
        const size = gzipSync(own).length;
        if (size > SIZE_BUDGET) {
          problems.push(
            `${component.file}: ${(size / 1000).toFixed(1)} kB gzip of its own code, more than the budget of ${SIZE_BUDGET / 1000} kB; split it into smaller components, or ask for a built-in block (vue-component-size)`,
          );
        }
      }
      if (problems.length > 0) this.error(new ContentError(problems).message);
    },
    configureServer(server) {
      devServer = server;
      server.watcher.on("all", (_event, file) => {
        if (file.startsWith(join(root, "src")) && !file.endsWith(".ts")) {
          site = undefined;
          server.ws.send({ type: "full-reload" });
        }
      });
      // before Vite's own fallback to index.html
      server.middlewares.use((request, response, next) => {
        const url = new URL(request.url ?? "/", "http://localhost");
        const path = decodeURIComponent(url.pathname).replace(/^\//, "");
        if (path.startsWith("images/")) {
          response.setHeader("content-type", imageType(path));
          response.end(readFileSync(join(root, "src", path)));
          return;
        }
        const forTutor = new RegExp(`(^|/)tutor/(${TUTOR_MARKDOWN.replace(".", "\\.")})?$`).test(path);
        if (!(path === "" || path.endsWith("/") || forTutor)) return next();
        const fail = (error: unknown) => {
          response.statusCode = 500;
          response.setHeader("content-type", "text/plain; charset=utf-8");
          response.end(error instanceof Error ? error.message : String(error));
        };
        let content: Site;
        try {
          content = load();
        } catch (error) {
          fail(error);
          return;
        }
        const dev = devServer;
        if (dev === undefined) return next();
        renderComponents(content, (id) => dev.ssrLoadModule(id), false)
          .then(({ islands: rendered, descriptions: described, problems }) => {
            if (problems.length > 0) throw new ContentError(problems);
            if (forTutor) {
              const markdown = path.endsWith(TUTOR_MARKDOWN);
              const page = tutorAssets(content, described).get(markdown ? path.slice(0, -TUTOR_MARKDOWN.length) : path);
              if (page === undefined) return next();
              response.setHeader("content-type", `text/${markdown ? "markdown" : "html"}; charset=utf-8`);
              response.end(markdown ? page.markdown : page.html);
              return undefined;
            }
            const page = renderSite(content, rendered, described).find((candidate) => candidate.route.path === path);
            if (page === undefined) return next();
            const shell = readFileSync(join(root, "index.html"), "utf8");
            const head = page.islands
              ? `<script type="module" src="/@id/__x00__lernapps-explainer-islands"></script>`
              : "";
            return dev
              .transformIndexHtml(`/${path}`, fill(shell, { ...page, route: { ...page.route, path: "" } }, head))
              .then((html) => {
                response.setHeader("content-type", "text/html; charset=utf-8");
                response.end(html);
              });
          })
          .catch(fail);
      });
    },
  };
  return [vueWhenComponents(), main];
}
