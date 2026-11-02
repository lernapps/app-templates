// The scaffold of each archetype (lernapps.scaffold in package.json, scripts/scaffold.ts): what `lernapps create`
// copies into a new app. Here: the contract itself. Every archetype has a list; every path on it exists in the
// template folder; the list holds the template's entry, its configuration and its e2e entry, but no content of the
// example app; every archetype has start content in scaffold/<archetype>/, and the package ships it. That the scaffold
// passes `lernapps check` as an app is the CI job scaffold of check.yml.
import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, test } from "vite-plus/test";
import { scaffoldPaths } from "../scripts/scaffold.ts";

const root = join(import.meta.dirname, "..");
const manifest = (await import("../package.json", { with: { type: "json" } })).default as {
  files: string[];
  lernapps: { archetypes: string[]; scaffold: Record<string, string[]> };
};

/** Every file below `dir`, relative to it. */
const files = (dir: string, prefix = ""): string[] =>
  readdirSync(join(dir, prefix)).flatMap((name) => {
    const path = prefix === "" ? name : `${prefix}/${name}`;
    return statSync(join(dir, path)).isDirectory() ? files(dir, path) : [path];
  });

test("every archetype has a scaffold, and no other key is on the list", () => {
  expect(Object.keys(manifest.lernapps.scaffold).sort()).toEqual([...manifest.lernapps.archetypes].sort());
});

test("the package ships the start content", () => {
  expect(manifest.files).toContain("scaffold");
});

describe.each(manifest.lernapps.archetypes)("the scaffold of %s", (archetype) => {
  const paths = scaffoldPaths(archetype);

  test("names files of the template folder that exist", () => {
    for (const path of paths) expect(existsSync(join(root, archetype, path)), path).toBe(true);
    expect(new Set(paths).size).toBe(paths.length);
  });

  test("holds the entry, the configuration and the e2e entry", () => {
    expect(paths).toEqual(
      expect.arrayContaining([
        ".gitignore",
        "index.html",
        "package.json",
        "vite.config.ts",
        "playwright.config.ts",
        "src/main.ts",
        `e2e/${archetype}.e2e.ts`,
      ]),
    );
  });

  test("copies no content of the example app: the start content comes from scaffold/", () => {
    const start = files(join(root, "scaffold", archetype));
    expect(start.length).toBeGreaterThan(0);
    for (const path of paths) {
      expect(start, `${path} is both scaffold and start content`).not.toContain(path);
      expect(path === "src/main.ts" || path === "src/env.d.ts" || !path.startsWith("src/"), path).toBe(true);
    }
  });
});

test("the interactive scaffold has every path its architecture claims: an app gets the architecture with them", () => {
  const dir = join(root, "interactive/docs/arc42");
  const claimed = readdirSync(dir)
    .filter((file) => file.endsWith(".md"))
    .flatMap((file) => [...readFileSync(join(dir, file), "utf8").matchAll(/^path: interactive\/(\S+)$/gm)])
    .map((match) => match[1] ?? "");
  expect(claimed.length).toBeGreaterThan(0);
  const app = [...scaffoldPaths("interactive"), ...files(join(root, "scaffold/interactive"))];
  for (const path of new Set(claimed)) {
    expect(
      app.some((file) => file === path || file.startsWith(`${path}/`)),
      path,
    ).toBe(true);
  }
});
