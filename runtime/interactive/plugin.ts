// The build step of an interactive app (@lernapps/app-templates/interactive/plugin), a Vite plugin. An app's
// vite.config.ts adds it to the shared preset of @lernapps/tooling:
//
//   import { lernapps } from "@lernapps/tooling/preset";
//   import { interactive } from "@lernapps/app-templates/interactive/plugin";
//   export default lernapps({ plugins: [interactive()] });
//
// It reads src/app.yaml and the playthroughs (load.ts) and fails the build with one line per problem. Then, before
// anything is written:
// - the component rules on every single-file component in src/ (src/ui/) and the app's own TypeScript modules they
//   import, with the explainer's checks on the SFC compiler's output (../explainer/components.ts): no network, no
//   eval, new Function, innerHTML or v-html, imports only from vue, this runtime, @lernapps/tooling/storage, i18n and
//   a11y and the app's own files in src/, browser globals only in onMounted;
// - the core (src/core/index.ts, contract.ts), loaded in a Vite server of its own: it exports start and step (and tick,
//   if any, as a function, which a playthrough with ticks needs), every route starts, and every playthrough plays:
//   start(seed, route), then for each step step(state, input) for each of its inputs (its keys as key inputs) and
//   tick(state, TICK) for each of its ticks, twice, giving the same states both times (deterministic by its seed),
//   and after each step the state the playthrough expects. No time passes but the ticks a step names.
// index.html is Vite's only entry: Vite builds the app's client module (src/main.ts) and stylesheet from it. The built
// index.html is the shell of every page (render.ts): the start page without any script, and the app page that loads
// the client module, in each language, with the shell's relative asset URLs rewritten for its depth. An app's code has
// no size limit. 404.html leads every address the app does not have to its start page. `vp dev` serves the same
// pages, rendered on each request.
import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import vue from "@vitejs/plugin-vue";
import type { Plugin } from "vite-plus";
import { codeProblems, sourceScope } from "../explainer/components.ts";
import { pathText, Problems } from "../explainer/load.ts";
import { fromDepth, notFoundPage, withLanguage } from "../shared/pages.ts";
import { type Load, VUE_OPTIONS, vueAlias, withServer } from "../shared/vue.ts";
import { doingText, inputsOf, inputText, mismatch, TICK, type Core, type Playthrough } from "./contract.ts";
import { InteractiveError, loadInteractive, type Interactive } from "./load.ts";
import { pages, renderPage, type RenderedPage } from "./render.ts";

const MARKER = "<!-- interactive -->";
/** Where the core is, from the app's root. */
export const CORE = "src/core/index.ts";

const CONTRACT =
  "the core exports start(seed, route) and step(state, input), and tick(state, dt) when the app moves on its own (interactive-core-contract)";

/** The shell with the page in it; the start page without the shell's scripts. */
export function fill(shell: string, rendered: RenderedPage): string {
  if (!shell.includes(MARKER)) throw new Error(`index.html has no ${MARKER}: put it in <body>, where the pages go`);
  let html = withLanguage(shell, rendered.page.lang)
    .replace(/\s*<title>[\s\S]*?<\/title>/, "")
    .replace("</head>", `  ${rendered.head}\n  </head>`);
  if (rendered.page.kind === "start") {
    html = html
      .replace(/\s*<script type="module"[^>]*><\/script>/g, "")
      .replace(/\s*<link rel="modulepreload"[^>]*>/g, "");
  }
  return fromDepth(html, rendered.page.path).replace(MARKER, () => rendered.body);
}

/** The single-file components of the app, from its root: every .vue file in src/. */
function vueFiles(root: string, dir = "src"): string[] {
  if (!existsSync(join(root, dir))) return [];
  return readdirSync(join(root, dir))
    .sort()
    .flatMap((name) => {
      const file = `${dir}/${name}`;
      if (statSync(join(root, file)).isDirectory()) return name === "node_modules" ? [] : vueFiles(root, file);
      return name.endsWith(".vue") ? [file] : [];
    });
}

const reason = (error: unknown) => (error instanceof Error ? error.message : String(error)).split("\n")[0] ?? "";

/** Plays `playthrough` from `route`: the state after each step, or where it throws. */
function play(
  core: Core<unknown>,
  playthrough: Playthrough,
  route: string,
): { states: unknown[]; error?: { path: (string | number)[]; message: string } } {
  const states: unknown[] = [];
  let state: unknown;
  try {
    state = core.start(playthrough.seed, route);
  } catch (error) {
    const message = `start(${playthrough.seed}, ${JSON.stringify(route)}) throws: ${reason(error)} (interactive-core-contract)`;
    return { states, error: { path: ["seed"], message } };
  }
  for (const [index, step] of playthrough.steps.entries()) {
    for (const [at, input] of inputsOf(step).entries()) {
      try {
        state = core.step(state, input);
      } catch (error) {
        const message = `step(state, ${inputText(input)}) throws: ${reason(error)} (interactive-core-contract)`;
        return { states, error: { path: ["steps", index, step.keys === undefined ? "inputs" : "keys", at], message } };
      }
    }
    for (let at = 0; at < (step.ticks ?? 0); at++) {
      try {
        state = core.tick?.(state, TICK) ?? state;
      } catch (error) {
        const message = `tick(state, ${TICK}) throws at tick ${at + 1}: ${reason(error)} (interactive-core-contract)`;
        return { states, error: { path: ["steps", index, "ticks"], message } };
      }
    }
    states.push(state);
  }
  return { states };
}

const valueAt = (value: unknown, path: readonly (string | number)[]): unknown =>
  path.reduce<unknown>(
    (at, part) => (typeof at === "object" && at !== null ? (at as Record<string, unknown>)[part] : undefined),
    value,
  );

/** The problems of the core: its exports, the start of every route, and every playthrough. */
async function coreProblems(root: string, content: Interactive, load: Load): Promise<string[]> {
  if (!existsSync(join(root, CORE))) return [`${CORE} is missing; ${CONTRACT}`];
  let exports: Record<string, unknown>;
  try {
    exports = await load(`/${CORE}`);
  } catch (error) {
    return [`${CORE}: cannot be loaded: ${reason(error)}`];
  }
  const lacking = ["start", "step"].filter((name) => typeof exports[name] !== "function");
  if (exports["tick"] !== undefined && typeof exports["tick"] !== "function") lacking.push("tick as a function");
  if (lacking.length > 0) return [`${CORE}: exports no ${lacking.join(", ")}; ${CONTRACT}`];
  const core = exports as unknown as Core<unknown>;
  const problems = new Problems();
  const routes = content.app.routes ?? [];
  const failed = new Set<string>();
  routes.forEach((route, index) => {
    try {
      core.start(1, route.id);
    } catch (error) {
      failed.add(route.id);
      problems.at(
        content.appYaml,
        ["routes", index, "id"],
        `start(1, ${JSON.stringify(route.id)}) throws: ${reason(error)}; the core starts every route (interactive-core-contract)`,
      );
    }
  });
  for (const { yaml, playthrough } of content.playthroughs) {
    const route = playthrough.route ?? routes[0]?.id ?? "";
    if (failed.has(route)) continue;
    const ticking = playthrough.steps.findIndex((step) => step.ticks !== undefined);
    if (core.tick === undefined && ticking >= 0) {
      problems.at(
        yaml,
        ["steps", ticking, "ticks"],
        `the core exports no tick, so no time passes in the app; export tick(state, dt) from ${CORE}, or leave the ticks out (interactive-core-contract)`,
      );
      continue;
    }
    const first = play(core, playthrough, route);
    if (first.error !== undefined) {
      problems.at(yaml, first.error.path, first.error.message);
      continue;
    }
    const second = play(core, playthrough, route);
    const differs = first.states.findIndex(
      (state, index) => JSON.stringify(state) !== JSON.stringify(second.states[index]),
    );
    if (differs >= 0 || second.error !== undefined) {
      problems.at(
        yaml,
        ["steps", Math.max(differs, 0)],
        "the state differs between two plays of the same steps; the core gives the same state for the same seed, route, inputs and ticks, so draw from the seed, never from Math.random or the clock (interactive-core-contract)",
      );
      // a property of the core: once is enough, and no state of it can be trusted
      break;
    }
    for (const [index, step] of playthrough.steps.entries()) {
      if (step.state === undefined) continue;
      const found = mismatch(first.states[index], step.state);
      if (found === undefined) continue;
      const done = playthrough.steps
        .slice(0, index + 1)
        .flatMap(doingText)
        .join(", ");
      const where = found.path.length === 0 ? "the state" : pathText(found.path);
      problems.at(
        yaml,
        ["steps", index, "state", ...found.path],
        `${where} is ${JSON.stringify(found.actual) ?? "missing"} after ${done}, the playthrough expects ${JSON.stringify(valueAt(step.state, found.path))} (interactive-playthroughs-pass)`,
      );
      // the steps after it start from another state
      break;
    }
  }
  return problems.lines;
}

/** The build step of an interactive app: validates src/, checks its components and its core, writes every page. */
export function interactive(): Plugin[] {
  let root = process.cwd();
  let command: "build" | "serve" = "build";
  let content: Interactive | undefined;
  const load = () => (content ??= loadInteractive(root));
  const main: Plugin = {
    name: "lernapps-interactive",
    enforce: "post",
    configResolved(config) {
      root = config.root;
      command = config.command;
    },
    async buildStart() {
      content = undefined;
      let loaded: Interactive;
      try {
        loaded = load();
      } catch (error) {
        this.error(error instanceof Error ? error.message : String(error));
      }
      if (command !== "build") return;
      const problems = codeProblems(root, vueFiles(root), sourceScope(root));
      if (problems.length === 0)
        problems.push(...(await withServer(root, (loader) => coreProblems(root, loaded, loader))));
      if (problems.length > 0) this.error(new InteractiveError(problems).message);
    },
    generateBundle(_options, bundle) {
      const index = bundle["index.html"];
      if (index === undefined || index.type !== "asset") return;
      const shell = String(index.source);
      const app = load().app;
      for (const page of pages(app)) {
        const html = fill(shell, renderPage(app, page));
        if (page.path === "") index.source = html;
        else this.emitFile({ type: "asset", fileName: `${page.path}index.html`, source: html });
      }
      this.emitFile({ type: "asset", fileName: "404.html", source: notFoundPage() });
    },
    configureServer(server) {
      server.watcher.on("all", (_event, file) => {
        if (file.endsWith(".yaml") && file.startsWith(join(root, "src"))) {
          content = undefined;
          server.ws.send({ type: "full-reload" });
        }
      });
      // before Vite's own fallback to index.html
      server.middlewares.use((request, response, next) => {
        const path = decodeURIComponent(new URL(request.url ?? "/", "http://localhost").pathname).replace(/^\//, "");
        let app: Interactive["app"];
        try {
          app = load().app;
        } catch (error) {
          response.statusCode = 500;
          response.setHeader("content-type", "text/plain; charset=utf-8");
          response.end(error instanceof Error ? error.message : String(error));
          return;
        }
        const page = pages(app).find((candidate) => candidate.path === path);
        if (page === undefined) return next();
        const shell = readFileSync(join(root, "index.html"), "utf8");
        server
          .transformIndexHtml(`/${path}`, fill(shell, { ...renderPage(app, page), page: { ...page, path: "" } }))
          .then((html) => {
            response.setHeader("content-type", "text/html; charset=utf-8");
            response.end(html);
          })
          .catch(next);
      });
    },
  };
  const alias: Plugin = { name: "lernapps-interactive-vue-alias", config: () => ({ resolve: { alias: vueAlias() } }) };
  return [vue(VUE_OPTIONS), alias, main];
}
