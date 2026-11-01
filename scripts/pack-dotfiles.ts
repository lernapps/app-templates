// npm drops .gitignore and .npmrc from every package, so a template folder would reach `lernapps create` without its
// .gitignore. `prepack` copies each folder's .gitignore to _gitignore, which the package carries; `postpack` removes the
// copies again. `lernapps create` writes _gitignore back as .gitignore. (The .npmrc of a template is for this repo's own
// checks, `create` removes it from the app anyway.)
import { copyFileSync, existsSync, rmSync } from "node:fs";
import { join } from "node:path";

const ARCHETYPES = ["explainer", "interactive", "quiz"];
const mode = process.argv[2];
if (mode !== "stage" && mode !== "clean") {
  process.stderr.write("usage: node scripts/pack-dotfiles.ts stage|clean\n");
  process.exit(2);
}
for (const archetype of ARCHETYPES) {
  const source = join(archetype, ".gitignore");
  const copy = join(archetype, "_gitignore");
  if (mode === "stage") {
    if (!existsSync(source)) throw new Error(`${source} is missing: the template has no .gitignore to ship`);
    copyFileSync(source, copy);
  } else {
    rmSync(copy, { force: true });
  }
}
