// The RELEASE of the framework, not of the apps made with it: how the three npm packages @lernapps/app-templates,
// @lernapps/tooling and @lernapps/practice follow one another. Nothing here is about an app or a template's content.
//
// A package of the framework releases after a merge to main (semantic-release, release.yml). The next one in the chain
// releases because Renovate raises its runtime dependency (`dependencies`) on the one before as fix(deps) (the preset
// default.json of lernapps/tooling, the group "lernapps runtime dependencies"). So the runtime dependencies between the
// packages must be a chain with no way back: with one, each release would answer the next with another for ever.
// Development and peer dependencies are no part of it: the templates here depend on the tooling as a development
// dependency, and the runtime package has it as an optional peer, which stay chore(deps) and release nothing.
// This package is the first of the chain: it depends at runtime on none of the others. The same test, with its own
// package's row, is in lernapps/tooling and lernapps/practice.
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, test } from "vite-plus/test";

/** Each package of the framework, and the packages of the framework it depends on at runtime. */
const CHAIN: Record<string, string[]> = {
  "@lernapps/app-templates": [],
  "@lernapps/tooling": ["@lernapps/app-templates"],
  "@lernapps/practice": ["@lernapps/tooling"],
};

/** The packages reachable from `name` through runtime dependencies. */
function reachable(name: string, seen = new Set<string>()): Set<string> {
  for (const next of CHAIN[name] ?? []) {
    if (!seen.has(next)) reachable(next, seen.add(next));
  }
  return seen;
}

const root = new URL("..", import.meta.url).pathname;
const manifest = JSON.parse(readFileSync(join(root, "package.json"), "utf8")) as {
  name: string;
  dependencies?: Record<string, string>;
};

describe("the release chain of the framework's packages (not of apps)", () => {
  test("is a chain: no package can be reached from itself, so no release can lead back to itself", () => {
    for (const name of Object.keys(CHAIN)) {
      expect([...reachable(name)], `${name} reaches itself`).not.toContain(name);
    }
  });

  test("names this package: a package of the framework that is not in the chain is not covered by it", () => {
    expect(Object.keys(CHAIN)).toContain(manifest.name);
  });

  test(`${manifest.name} depends at runtime on exactly the packages before it in the chain, and on no other of ours`, () => {
    const ours = Object.keys(manifest.dependencies ?? {})
      .filter((name) => name.startsWith("@lernapps/"))
      .sort();
    expect(
      ours,
      `A runtime dependency (\`dependencies\`) of ${manifest.name} on ${ours.join(", ") || "nothing"} changes the release chain. ` +
        "Renovate raises such a dependency as fix(deps), which releases this package; one that leads back to a package " +
        "before it would release the two for ever. A package that is no part of the shipped code belongs in devDependencies.",
    ).toEqual([...(CHAIN[manifest.name] ?? [])].sort());
  });
});
