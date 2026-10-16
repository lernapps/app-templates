// The runtime package @lernapps/app-templates: format, lint with type check, unit tests, the staged files of the
// pre-commit hook, and the build of the runtime into dist/ (vp pack, run by `prepare` when an app installs the package
// from git). The template folders
// (quiz/, explainer/, interactive/) are apps of their own and checked in their own folder with `lernapps check`, as is the page that
// embeds the quiz's questions one by one (test/fixtures/question-page/).
import { defineConfig } from "vite-plus";

const notCode = [
  "dist/**",
  "node_modules/**",
  "quiz/**",
  "explainer/**",
  "interactive/**",
  "test/fixtures/question-page/**",
  "**/*.md",
];

export default defineConfig({
  fmt: {
    printWidth: 120,
    ignorePatterns: notCode,
  },
  lint: {
    ignorePatterns: notCode,
    options: {
      typeAware: true,
      typeCheck: true,
    },
    rules: {
      "typescript/no-explicit-any": "error",
    },
  },
  test: {
    include: ["test/**/*.test.ts"],
  },
  pack: {
    // What apps import: the engine (browser), the build step and the end-to-end tests (Node); and what other
    // archetypes import to embed the quiz's questions: one question at build time (Node).
    entry: {
      quiz: "runtime/quiz/engine.ts",
      "quiz-plugin": "runtime/quiz/plugin.ts",
      "quiz-question": "runtime/quiz/question.ts",
      "quiz-e2e": "runtime/quiz/e2e.ts",
      explainer: "runtime/explainer/explainer.ts",
      "explainer-plugin": "runtime/explainer/plugin.ts",
      "explainer-e2e": "runtime/explainer/e2e.ts",
      // the hydration of an explainer's components, which the build step points the islands module of a page to
      "explainer-islands": "runtime/explainer/islands.ts",
      interactive: "runtime/interactive/interactive.ts",
      "interactive-plugin": "runtime/interactive/plugin.ts",
      "interactive-e2e": "runtime/interactive/e2e.ts",
    },
    format: "esm",
    platform: "node",
    dts: false,
  },
  staged: {
    // The pre-commit hook (.vite-hooks/pre-commit) formats and fixes the staged files of the runtime package and checks
    // the architecture. A template folder's code is on the ignore list above: `lernapps check --pre-push` in that folder
    // checks it.
    "*.{ts,json,vue}": "vp check --fix --no-error-on-unmatched-pattern",
    // The architecture: the generic part with each archetype's extension, `arc42 validate --strict` (scripts/arc42.ts,
    // about 3 s); any finding fails the commit. An app will run `arc42 diff --staged --strict` on its one architecture;
    // this repo holds one per archetype, so the script is its gate. CI runs it too (job architecture).
    "{*.arc42.md,.arc42ignore}": "node scripts/arc42.ts",
  },
});
