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

What each archetype can and cannot do is in the README of its folder: [quiz](quiz/README.md),
[explainer](explainer/README.md), [interactive](interactive/README.md). Change it in the same pull request as the
feature: assistants read it before they choose an archetype.

| Folder | Archetype | What the app supplies |
|---|---|---|
| [`quiz/`](quiz/) | a quiz about things to know: questions with options, feedback on every option, score and solutions, in one or more languages (a page per language) | the question bank `src/quiz.json` ([schema](https://lernapps.net/tooling/schemas/quiz.v1.schema.json)) |
| [`explainer/`](explainer/) | an explainer: chapters of pages with sections, formulas, figures, tables, timelines, definitions with a glossary, quotes and code, and an exercise on every page (the quiz's question types, and `generated` exercises drawn from a seed and property-tested at build), readable without JavaScript, in one or more languages; Vue components for what no block can express | the content as YAML in `src/`: `app.yaml`, a folder per chapter with `chapter.yaml` and its pages, `data/` and `images/`, and `components/` ([schema](https://lernapps.net/tooling/schemas/explainer.v1.schema.json)) |
| [`interactive/`](interactive/) | an interactive app whose doing is the content (a game, a trainer): a static start page, readable without JavaScript, and an app page with the app's own Vue components, its routes as `app/#<id>`; the build plays its playthroughs against its core | `src/app.yaml` ([schema](https://lernapps.net/tooling/schemas/interactive.v1.schema.json)), the core `src/core/index.ts` (`start(seed, route)`, `step(state, input)` with a key or an action of its root component, optional `tick(state, dt)`), its components in `src/ui/`, data in `src/data/`, and `src/playthroughs/*.yaml` ([schema](https://lernapps.net/tooling/schemas/playthrough.v1.schema.json)) |

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
  feedback): it declares the prop `seed: number`, the seed of its task number, which the explainer gives it with "Aufgabe Nr."
  and "Neue Aufgabe" and keeps in the address (`?<id>=<n>`, the id of its block or its name in kebab case), and
  its logic module `<Name>.ts` exports `generate(seed, props)`, `check(task, answer)`, `solution(task)` and
  `wrong(task)`, which the build tests over 50 fixed seeds per block, `describe(task, props, lang)`, the task and its
  solution as a learner reads them (`{ task, solution }`, restricted Markdown), and `about`, what the exercise is for a
  tutor (`{ task, answer, correct, mistakes }`). The build checks `describe` for every task number in every
  language and writes the no-JS text of an exercise component from it: the task of number 1 with its solution folded,
  so it needs no `nojs` ([`components.ts`](runtime/explainer/components.ts)).
- Every seeded exercise (generated, exercise component) numbers its distinct tasks: the build walks the seeds 1, 2,
  3, … through its generator, keeps each seed whose task differs from all before, up to 67, and the page shows
  "Aufgabe Nr. <n>" for them ([`tasks.ts`](runtime/explainer/tasks.ts)). The number is the one identifier of a task:
  `?<id>=<n>` opens task number n of the exercise `<id>` (a number above N wraps around). The address holds one
  parameter per exercise (`?a=3&b=12`), written on load and at every "Neue Aufgabe", so it is the page's state: a link
  to share in class, a deep link, and what a tutor reads; `seed` and `von` are no exercise id, and `?seed=<n>#<id>`
  still opens that exercise's task. The build ships each exercise's table of seeds. An exercise with fewer than 67 distinct tasks is
  noted in the build output.
- For a KI tutor, an assistant the learner brings and controls, the explainer writes static files only (a chat
  assistant that fetches a URL runs no JavaScript): per language tree a tutor file next to every page
  (`<chapter>/<page>/tutor.md`: its sections, every exercise with task, answer format, solution, hint and typical
  mistakes, and for a seeded exercise all its task numbers with their tasks and solutions and links
  `./?<id>=<n>#<id>`), and in `llms.txt` generic rules for a tutor, the app's own (`tutor.rules` in `app.yaml`) and
  links to the tutor files, and `tutor.md` at the root, a ready tutor prompt (role, approach, the pages as a checklist,
  the rules); the build checks every link and anchor of these files. The start page and the end of every page offer
  "Mit einem KI-Tutor lernen": one button with a select beside it (the assistants of `tutor.providers` in `app.yaml`,
  Claude first and the default, and "Prompt kopieren"); the way the learner picks is kept on the device
  (`@lernapps/tooling/storage`) and is the default from then on. On a page the prompt also gets the page's address and,
  from its tutor file, the tasks and solutions of the numbers in that address ([`tutorpage.ts`](runtime/explainer/tutorpage.ts));
  a prompt too long for the assistant's address goes short, with the whole one on the clipboard; the short one names every address the tutor may fetch (llms.txt and each page's tutor file), because a chat assistant fetches only addresses its user wrote into the conversation, not those it finds in a fetched file
  ([`prompt.ts`](runtime/explainer/prompt.ts)). Without JavaScript the section has a plain link per assistant. A page opened with `von=tutor`
  shows "Zurück zum Tutor", which closes the tab ([`tutor.ts`](runtime/explainer/tutor.ts)).
- Every exercise may carry `examples: { accepted, rejected }`, test cases that learners never see: the other correct
  answers its text allows, and typical wrong ones. The build runs each through the same check the page uses (the
  quiz's checker, a generated exercise's comparator for every seed, an exercise component's `check`) and fails on an
  accepted example the check rejects or a rejected one it accepts. An exercise component's block must have at least
  one of each, as its check is the app's own code; for every other exercise they are optional
  ([`examples.ts`](runtime/shared/examples.ts)).
- Both archetypes write `404.html` at the bundle's root: GitHub Pages serves it for any address the app does not
  have, and its script finds the app's root (the nearest folder upwards with a `404.html`, so a preview below
  `pr-preview/pr-<n>/` finds its own) and moves on to its start page
  ([`pages.ts`](runtime/shared/pages.ts)).
- Which commit of this repo a new app gets and what the generator adds to the template:
  `npx --yes github:lernapps/tooling#main create --help`.
- What an archetype is and how the parts fit: the [architecture of the tooling](https://lernapps.net/tooling/architecture/).
- A template has no `prepare` script of its own, so `npm install` in its folder leaves this repo's git hooks alone;
  the generator gives the app the one that installs them.

## Architecture

Every archetype follows one architecture, because they share its quality goals: the generic part in
[`docs/arc42/`](docs/arc42/) (the shared runtime with page trees, 404 page and examples check, and the tooling
helpers), and one extension per archetype in its folder, which adds the archetype's runtime (build step, validation,
rendering, shell, end-to-end tests) and the parts its creator writes. An app's architecture is both together.

- **Quiz** ([`quiz/docs/arc42/`](quiz/docs/arc42/)): the quiz rendering writes the bank into a worksheet page, the
  bank validation checks `src/quiz.json`, the quiz engine checks answers with the question types' checker and keeps
  only the last result on the device when the bank asks; no tutor.
- **Explainer** ([`explainer/docs/arc42/`](explainer/docs/arc42/)): the page rendering writes the YAML pages and the
  component islands at build, the content validation guards the content, the client module and the islands check
  answers in the browser and keep only the chosen way to the tutor; the tutor handoff and task numbers are built for
  it.
- **Interactive** ([`interactive/docs/arc42/`](interactive/docs/arc42/)): the start page and app page render from
  `src/app.yaml`, the build checks the core and plays the playthroughs, the shell mounts the root component and feeds
  the core inputs (today keys), ticks, route and seed; no tutor yet. Only an interactive app adds an architecture part
  of its own.

`node scripts/arc42.ts` validates the generic part with each extension (`arc42 validate --strict`, `--root` at the
repo root) and fails on any finding; the pre-commit hook runs it when an `*.arc42.md` or `.arc42ignore` file is staged,
and CI on every change.

## Contributing

`npm ci`, then the steps of the workflow [`check.yml`](.github/workflows/check.yml): the runtime's checks at the root
(with `npm run check:vue`, the type check of the fixtures' `.vue` files) and `lernapps check` in every template folder
and in `test/fixtures/question-page/`. `npm ci` also installs this repo's git hooks ([`.vite-hooks/`](.vite-hooks/)):
the pre-commit hook formats and fixes the staged files and checks a staged architecture (`vp staged`); the pre-push hook
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
