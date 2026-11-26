# app-templates

The archetypes of [lernapps.net](https://lernapps.net/) apps: one template folder per archetype, and at the root the
package `@lernapps/app-templates` with the runtime of each archetype that apps depend on. It is part of the tooling
with which a creator and their AI assistant build a learning app.

## Who it is for

- **Creators and their assistants** never open this repo: the generator of
  [lernapps/tooling](https://github.com/lernapps/tooling) writes a template's scaffold into a new app. Start at
  [lernapps.net/apps/eintragen/](https://lernapps.net/apps/eintragen/), or, as an assistant, at
  [lernapps.net/tooling/llms.txt](https://lernapps.net/tooling/llms.txt).
- **Maintainers of an archetype** change its template and its runtime here.

## What is in it

What each archetype can and cannot do is in the README of its folder: [quiz](quiz/README.md),
[explainer](explainer/README.md), [interactive](interactive/README.md). Change it in the same pull request as the
feature: assistants read it before they choose an archetype.

| Folder | Archetype | What the app supplies |
|---|---|---|
| [`quiz/`](quiz/) | A quiz about things to know: questions with options, feedback, score and solutions. | The question bank `src/quiz.json` ([schema](runtime/quiz/quiz.v1.schema.json)). |
| [`explainer/`](explainer/) | Chapters of pages that explain a topic, with an exercise on every page except recap pages. Readable without JavaScript. | The content as YAML in `src/`, and Vue components where no block fits ([schema](runtime/explainer/explainer.v2.schema.json)). |
| [`interactive/`](interactive/) | An app whose doing is the content, such as a game or a trainer, behind a static start page. | `src/app.yaml` ([schema](runtime/interactive/interactive.v1.schema.json)), a core, Vue components and playthroughs ([schema](runtime/interactive/playthrough.v1.schema.json)). |

Every archetype can have pages in one or more languages.

- [`runtime/`](runtime/) holds the runtime of each archetype. It is published to npm as `@lernapps/app-templates`,
  together with the template folders, complete example apps and the scaffold of each archetype.
  `lernapps create` of `@lernapps/tooling` copies the paths listed under `lernapps.scaffold.<archetype>` in
  [`package.json`](package.json) and the placeholder in [`scaffold/<archetype>/`](scaffold/).
- The exports of the package are in [`package.json`](package.json). What each one does is in the comments of its
  source.
- Other archetypes can embed single quiz questions as exercises. `@lernapps/app-templates/quiz/question` provides
  the schema, validation, rendering, checker and messages of one question. A question's texts may be maps by
  language. [`test/fixtures/question-page/`](test/fixtures/question-page/) is a page built this way.
- Every exercise may carry `examples: { accepted, rejected }`. Learners never see them. They are other correct
  answers and typical wrong ones. The build runs each through the page's own check and fails if one is judged
  wrongly.
- Every app gets a `404.html` that sends an unknown address to the app's start page.
- Which version of this package a new app gets, and what the generator adds to the template:
  `npx --yes @lernapps/tooling create --help`.
- What an archetype is and how the parts fit: the [architecture of the tooling](https://lernapps.net/tooling/architecture/).

## Architecture

All archetypes share one architecture, because they share its quality goals. The generic part is in
[`docs/arc42/`](docs/arc42/). Each archetype adds an extension in its folder: its runtime and the parts its creator
writes. An app's architecture is both together.

- **Quiz** ([`quiz/docs/arc42/`](quiz/docs/arc42/)): one worksheet page from the question bank; no tutor.
- **Explainer** ([`explainer/docs/arc42/`](explainer/docs/arc42/)): pages from YAML with component islands, the
  tutor handoff, task numbers, the two-click video and the self-assessment.
- **Interactive** ([`interactive/docs/arc42/`](interactive/docs/arc42/)): a start page and an app page, a core the
  build checks with playthroughs; no tutor yet. Only an interactive app adds an architecture part of its own.

`node scripts/arc42.ts` validates the generic part with each extension and fails on any finding. The pre-commit hook
runs it when an architecture file is staged, and CI runs it on every change.

## Contributing

- Run `npm ci`, then the steps of the workflow [`check.yml`](.github/workflows/check.yml): the runtime's checks at the
  root, and `lernapps check` in every template folder and in `test/fixtures/question-page/`.
- `npm ci` also installs the git hooks in [`.vite-hooks/`](.vite-hooks/). The pre-commit hook formats the staged
  files. The pre-push hook skips a push of only the plan (`.vibe/**`) or only docs. Otherwise it runs the root checks
  and the checks of each template the push affects.
- To push a change to a template, run `npm install` in its folder first.
- Which paths affect which template is a list in [`scripts/pre-push.ts`](scripts/pre-push.ts). If CI catches
  something the hook let through, add the path to that list.
- The job `check` reports the overall result. It is the check to require.
- A merge to `main` releases a new version to npm ([`release.yml`](.github/workflows/release.yml)). The version
  follows from the conventional commits. New apps get it once lernapps/tooling depends on it. Renovate updates
  existing apps.
- Each template folder has its `.gitignore` also as `_gitignore`, because npm never ships a `.gitignore`. Change both
  together.
- A template has no `prepare` script, so `npm install` in its folder leaves this repo's git hooks alone.

## License

[MIT](LICENSE). Apps created from these templates start with MIT as well.
