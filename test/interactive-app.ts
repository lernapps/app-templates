// A copy of the interactive template (interactive/) as an app for the tests of its build.
import { cpSync, mkdtempSync, readFileSync, symlinkSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const REPO = join(import.meta.dirname, "..");

/**
 * A copy of the template as an app, whose src/main.ts takes the runtime from this repo; with this repo's node_modules,
 * for the packages its components import (@lernapps/tooling).
 */
export function interactiveApp(): string {
  const root = mkdtempSync(join(tmpdir(), "interactive-"));
  cpSync(join(REPO, "interactive/src"), join(root, "src"), { recursive: true });
  cpSync(join(REPO, "interactive/index.html"), join(root, "index.html"));
  symlinkSync(join(REPO, "node_modules"), join(root, "node_modules"));
  const main = readFileSync(join(root, "src/main.ts"), "utf8").replaceAll(
    "@lernapps/app-templates/interactive",
    join(REPO, "runtime/interactive/interactive.ts"),
  );
  writeFileSync(join(root, "src/main.ts"), main.replace(/^import ".*style\.css";\n/m, ""));
  return root;
}

/** Replaces `from` by `to` in the app's file `file` (from src/); `from` must be there. */
export function edit(root: string, file: string, from: string, to: string): void {
  const path = join(root, "src", file);
  const text = readFileSync(path, "utf8");
  if (!text.includes(from)) throw new Error(`${file} has no ${JSON.stringify(from)}`);
  writeFileSync(path, text.replace(from, to));
}
