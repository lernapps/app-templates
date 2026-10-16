// The app's name from its package.json: the prefix of what it stores on the device (@lernapps/tooling/storage).
import { readFileSync } from "node:fs";
import { join } from "node:path";

/** The name in the package.json of the app in `root`, or `fallback` when there is none. */
export function appName(root: string, fallback: string): string {
  try {
    const manifest: unknown = JSON.parse(readFileSync(join(root, "package.json"), "utf8"));
    if (typeof manifest === "object" && manifest !== null && "name" in manifest && typeof manifest.name === "string") {
      return manifest.name;
    }
  } catch {
    // no package.json: the fallback
  }
  return fallback;
}
