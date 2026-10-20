// The shape of the runtime (runtime/): the archetypes (quiz, explainer, interactive) build on runtime/shared and
// never on each other, and runtime/shared builds on no archetype. What two archetypes use alike, e.g. the questions of
// the quiz and of the explainer's exercises, therefore lives in runtime/shared. The package's public paths
// (package.json "exports") resolve to files, and each built path (dist/) is an entry of the build (vite.config.ts), so
// that a move inside the runtime cannot break an app that generated its src/main.ts from a template.
import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { dirname, join, relative, resolve } from "node:path";
import { describe, expect, test } from "vite-plus/test";

const root = join(import.meta.dirname, "..");
const runtime = join(root, "runtime");
const ARCHETYPES = ["quiz", "explainer", "interactive"];

function sources(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) return sources(path);
    return /\.(ts|vue)$/.test(name) ? [path] : [];
  });
}

/** The files a module imports or re-exports from by a relative path, resolved. */
function imports(file: string): string[] {
  const text = readFileSync(file, "utf8");
  const specifiers = [...text.matchAll(/(?:from|import)\s*\(?\s*["'](\.[^"']*)["']/g)].map((match) => match[1] ?? "");
  return specifiers.map((specifier) => resolve(dirname(file), specifier));
}

/** The part of the runtime a path is in: an archetype's folder, `shared`, or undefined outside the runtime. */
const partOf = (path: string): string | undefined => {
  const [part] = relative(runtime, path).split(/[\\/]/);
  return part === undefined || part.startsWith("..") ? undefined : part;
};

describe("the runtime's dependencies", () => {
  for (const part of [...ARCHETYPES, "shared"]) {
    const forbidden = part === "shared" ? ARCHETYPES : ARCHETYPES.filter((other) => other !== part);
    test(`${part} imports nothing from ${forbidden.join(", ")}`, () => {
      const found = sources(join(runtime, part)).flatMap((file) =>
        imports(file)
          .filter((target) => forbidden.includes(partOf(target) ?? ""))
          .map((target) => `${relative(root, file)} imports ${relative(root, target)}`),
      );
      expect(found, "move what both need into runtime/shared").toEqual([]);
    });
  }
});

describe("the package's public paths", () => {
  const manifest = JSON.parse(readFileSync(join(root, "package.json"), "utf8")) as {
    exports: Record<string, string | { types?: string; default: string }>;
  };
  const entries = new Set(
    [...readFileSync(join(root, "vite.config.ts"), "utf8").matchAll(/^\s*"?([\w-]+)"?:\s*"(runtime\/[^"]+)",?$/gm)].map(
      (match) => match[1] ?? "",
    ),
  );

  test("each resolves to a file of the runtime", () => {
    const missing = Object.entries(manifest.exports).flatMap(([path, target]) => {
      const file = typeof target === "string" ? target : target.types;
      return file === undefined || existsSync(join(root, file)) ? [] : [`${path} -> ${file}`];
    });
    expect(missing).toEqual([]);
  });

  test("each built path is an entry of the build", () => {
    const unbuilt = Object.entries(manifest.exports).flatMap(([path, target]) => {
      if (typeof target === "string") return [];
      const name = /^\.\/dist\/(.+)\.mjs$/.exec(target.default)?.[1];
      return name !== undefined && entries.has(name) ? [] : [`${path} -> ${target.default}`];
    });
    expect(unbuilt).toEqual([]);
  });
});

describe("the schema of a question", () => {
  const read = (path: string) =>
    JSON.parse(readFileSync(join(root, path), "utf8")) as { $defs: Record<string, unknown> };
  const question = read("runtime/shared/questions/question.v1.schema.json");
  const quiz = read("runtime/quiz/quiz.v1.schema.json");

  test("the quiz's schema carries the same definitions, so that its published address keeps working", () => {
    const different = Object.keys(question.$defs).filter(
      (name) => JSON.stringify(quiz.$defs[name]) !== JSON.stringify(question.$defs[name]),
    );
    expect(different, "run: node scripts/sync-schemas.ts").toEqual([]);
  });
});
