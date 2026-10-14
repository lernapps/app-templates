// The runtime package @lernapps/app-templates: format, lint with type check, unit tests, and the build of the
// runtime into dist/ (vp pack, run by `prepare` when an app installs the package from git). The template folders
// (quiz/, explainer/) are apps of their own and checked in their own folder with `lernapps check`, as is the page that
// embeds the quiz's questions one by one (test/fixtures/question-page/).
import { defineConfig } from "vite-plus";

const notCode = ["dist/**", "node_modules/**", "quiz/**", "explainer/**", "test/fixtures/question-page/**", "**/*.md"];

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
    },
    format: "esm",
    platform: "node",
    dts: false,
  },
});
