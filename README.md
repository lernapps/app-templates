# app-templates

The archetypes of [lernapps.net](https://lernapps.net/) apps: one template folder per archetype, and at the root the
package `@lernapps/app-templates` with the runtime of each archetype that apps depend on. It is part of the tooling
with which a creator and their AI assistant build a learning app.

## Who it is for

- **Creators and their assistants** never open this repo: the generator of
  [lernapps/tooling](https://github.com/lernapps/tooling) copies a template folder into a new app. Start at
  [lernapps.net/apps/eintragen/](https://lernapps.net/apps/eintragen/), or, as an assistant, at
  [lernapps.net/tooling/llms.txt](https://lernapps.net/tooling/llms.txt).
- **Maintainers of an archetype** change its template and its runtime here.

## What is in it

| Folder | Archetype | What the app supplies |
|---|---|---|
| [`quiz/`](quiz/) | a quiz about things to know: questions with options, feedback on every option, score and solutions, in one or more languages (a page per language) | the question bank `src/quiz.json` ([schema](https://lernapps.net/tooling/schemas/quiz.v1.schema.json)) |
| [`explainer/`](explainer/) | an explainer: chapters of pages with sections, formulas, figures, tables, timelines, definitions with a glossary, quotes and code, and an exercise on every page (the quiz's question types, and `generated` exercises drawn from a seed and property-tested at build), readable without JavaScript, in one or more languages; Vue components for what no block can express | the content as YAML in `src/`: `app.yaml`, a folder per chapter with `chapter.yaml` and its pages, `data/` and `images/`, and `components/` ([schema](https://lernapps.net/tooling/schemas/explainer.v1.schema.json)) |

- [`runtime/`](runtime/): the runtime of each archetype, published from git as `@lernapps/app-templates`; its exports
  are in [`package.json`](package.json), what each does in the comments of its source. The quiz's questions also work
  one by one, for other archetypes that embed them as exercises: `@lernapps/app-templates/quiz/question` (schema,
  validation, rendering, checker, messages; a question's texts may be maps by language), `startQuestion` of `@lernapps/app-templates/quiz` and the helpers of
  `@lernapps/app-templates/quiz/e2e`; [`test/fixtures/question-page/`](test/fixtures/question-page/) is a page built so.
- The placeholders of the explainer's `generated` exercises are always two braces around a declared name or its
  field, nothing else inside: `{{G}}`, `{{e.name}}`, `{{answer}}`, in prose and in formulas alike
  (`$\frac{{{W}}}{{{G}}} \cdot 100 = {{answer}}$`). One brace is never a placeholder, so in a formula `G`, `{G}` and
  `\frac{W}{G}` are letters; the only LaTeX form this reserves, a double group around a lone name, means the same as
  the name alone. The build fails on a placeholder whose name `given` does not declare, on one brace or spaces where a
  placeholder was meant in prose (`{G}`, `{{ G }}`), on a variable of `given` that nothing uses (no placeholder, and
  no expression of the figure, answer or mistakes; `where` does not count), and on a placeholder left after filling in
  ([`generated.ts`](runtime/explainer/generated.ts)).
- An explainer's components are Vue single-file components in `src/components/<Name>.vue`, each with
  `<script setup lang="ts">`, typed props and its test `<Name>.test.ts`, used by a `vue-component` block with its
  `props` and a `nojs` text. The build renders each with Vue's server renderer into its island, `hidden` until it
  hydrates; only a page with a component loads Vue. It checks each block's props against the component's prop types,
  and on the SFC compiler's output: no network, no `eval`, `new Function`, `innerHTML` or `v-html`, imports only from
  `vue`, this runtime, `@lernapps/tooling/storage`, `i18n` and `a11y` and the folder itself, browser globals only in
  `onMounted`, and 20 kB gzip of the component's own code. Once it runs, it replaces its `nojs` text, or keeps it
  folded as a text description under it with `defineOptions({ nojs: "caption" })`. A component that emits
  `answered { correct, reason? }` is an exercise (`reason`: what went wrong in a wrong answer, shown with the
  feedback): its logic module `<Name>.ts` exports `generate(seed, props)`, `check(task, answer)`, `solution(task)` and
  `wrong(task)`, which the build tests over 50 fixed seeds per block ([`components.ts`](runtime/explainer/components.ts)).
- Both archetypes write `404.html` at the bundle's root: GitHub Pages serves it for any address the app does not
  have, and its script finds the app's root (the nearest folder upwards with a `404.html`, so a preview below
  `pr-preview/pr-<n>/` finds its own) and moves on to its start page
  ([`pages.ts`](runtime/shared/pages.ts)).
- Which commit of this repo a new app gets and what the generator adds to the template:
  `npx --yes github:lernapps/tooling#main create --help`.
- What an archetype is and how the parts fit: the [architecture of the tooling](https://lernapps.net/tooling/architecture/).
- A template has no `prepare` script of its own, so `npm install` in its folder leaves this repo's git hooks alone;
  the generator gives the app the one that installs them.

## Contributing

`npm ci`, then the steps of the workflow [`check.yml`](.github/workflows/check.yml): the runtime's checks at the root
(with `npm run check:vue`, the type check of the fixtures' `.vue` files) and `lernapps check` in every template folder
and in `test/fixtures/question-page/`. `npm ci` also installs this repo's git hooks ([`.vite-hooks/`](.vite-hooks/)):
the pre-commit hook formats and fixes the staged files (`vp staged`); the pre-push hook
([`scripts/pre-push.ts`](scripts/pre-push.ts)) checks nothing for a push of only the plan (`.vibe/**`) or only docs
(`docs/**/*.md`, the change scope of `lernapps changes`, whose classifier the hook fetches once at the commit check.yml
uses), and otherwise runs the root checks and `lernapps check --pre-push` in each template folder the push affects.
Install a template's folder (`npm install` in it) to push a change to it. Which paths affect which template is a
positive list, `TEMPLATE_PATHS`: a path on no list runs the root checks only, and CI, which gates every job on the
change scope and runs all of them for any code change, catches the rest; when it catches what the hook let through, add
the path to the list. The fixture jobs run only in CI. The job `check` reports the overall result and is the check to
require. A change reaches new apps once the pin in lernapps/tooling moves to its commit on `main`; Renovate moves
existing apps.

## License

[MIT](LICENSE). Apps created from these templates start with MIT as well.
