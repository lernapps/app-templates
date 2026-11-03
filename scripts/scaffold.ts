// The scaffold of an archetype as `lernapps create` writes it (lernapps/tooling, generator/create.ts): the paths that
// lernapps.scaffold.<archetype> in package.json lists, copied from the template folder <archetype>/, then the start
// content scaffold/<archetype>/ over them. The rest of the template folder is the example app; it stays in the package
// (node_modules/@lernapps/app-templates/<archetype>/), for the creator's assistant to look up, and is never copied.
//
//   node scripts/scaffold.ts <archetype> <dir>   writes the scaffold into the empty or missing folder <dir>
//
// CI (the job scaffold of check.yml) checks the result with `lernapps check`, so that a new app passes from its first
// commit. Unlike create it writes none of the files the tooling adds (AGENTS.md, the plan, the workflows, ...), and
// it points the runtime at this checkout (file:<path>, installed as a copy through .npmrc), not at a version.
import { copyFileSync, cpSync, existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");

interface Manifest {
  lernapps?: { archetypes?: string[]; scaffold?: Record<string, string[]> };
  devDependencies?: Record<string, string>;
  [key: string]: unknown;
}

const readJson = (file: string): Manifest => JSON.parse(readFileSync(file, "utf8")) as Manifest;

/** The paths of the scaffold of `archetype`, relative to its template folder. */
export function scaffoldPaths(archetype: string, manifest: Manifest = readJson(join(root, "package.json"))): string[] {
  const paths = manifest.lernapps?.scaffold?.[archetype];
  if (paths === undefined) throw new Error(`package.json has no lernapps.scaffold.${archetype}`);
  return paths;
}

/** Writes the scaffold of `archetype` into `dir`. */
export function writeScaffold(archetype: string, dir: string): void {
  if (existsSync(dir) && readdirSync(dir).length > 0) throw new Error(`${dir} is not empty`);
  const template = join(root, archetype);
  for (const path of scaffoldPaths(archetype)) {
    // npm ships a .gitignore only as its tracked copy _gitignore; this checkout has the .gitignore itself
    const source = join(template, path);
    const target = join(dir, path);
    mkdirSync(dirname(target), { recursive: true });
    copyFileSync(source, target);
  }
  cpSync(join(root, "scaffold", archetype), dir, { recursive: true });
  const app = readJson(join(dir, "package.json"));
  // as create adds them (ARCHETYPE_DEV_DEPENDENCIES of the tooling): vue-tsc type-checks the Vue components, at the
  // versions of this repo
  const own = readJson(join(root, "package.json")).devDependencies ?? {};
  const vue = existsSync(join(dir, "src")) && archetype !== "quiz" ? ["typescript", "vue-tsc"] : [];
  app.devDependencies = {
    ...app.devDependencies,
    ...Object.fromEntries(vue.map((name) => [name, own[name] ?? "*"])),
    "@lernapps/app-templates": `file:${relative(dir, root)}`,
  };
  // npm would install the published runtime that @lernapps/tooling depends on instead of file:: the override keeps this
  // checkout's, as in the template folders (create removes it from an app)
  app["overrides"] = {
    ...(app["overrides"] as Record<string, string>),
    "@lernapps/app-templates": `file:${relative(dir, root)}`,
  };
  // sorted by name, as create, npm and the formatter keep them
  app.devDependencies = Object.fromEntries(Object.entries(app.devDependencies).sort(([a], [b]) => a.localeCompare(b)));
  writeFileSync(join(dir, "package.json"), `${JSON.stringify(app, null, 2)}\n`);
  writeFileSync(join(dir, ".npmrc"), "install-links=true\n");
}

if (process.argv[1] !== undefined && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const [archetype, dir] = process.argv.slice(2);
  if (archetype === undefined || dir === undefined) {
    process.stderr.write("usage: node scripts/scaffold.ts <archetype> <dir>\n");
    process.exit(2);
  }
  writeScaffold(archetype, resolve(dir));
  process.stdout.write(`the scaffold of ${archetype} in ${dir}\n`);
}
