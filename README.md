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
| [`quiz/`](quiz/) | a quiz about things to know: questions with options, feedback on every option, score and solutions | the question bank `src/quiz.json` ([schema](https://lernapps.net/tooling/schemas/quiz.v1.schema.json)) |

- [`runtime/`](runtime/): the runtime of each archetype, published from git as `@lernapps/app-templates`; its exports
  are in [`package.json`](package.json), what each does in the comments of its source.
- Which commit of this repo a new app gets and what the generator adds to the template:
  `npx --yes github:lernapps/tooling#main create --help`.
- What an archetype is and how the parts fit: the [architecture of the tooling](https://lernapps.net/tooling/architecture/).
- A template has no `prepare` script of its own, so `npm install` in its folder leaves this repo's git hooks alone;
  the generator gives the app the one that installs them.

## Contributing

`npm ci`, then the steps of the workflow [`check.yml`](.github/workflows/check.yml): the runtime's checks at the root
and `lernapps check` in every template folder. A change reaches new apps once the pin in lernapps/tooling moves to its
commit on `main`; Renovate moves existing apps.

## License

[MIT](LICENSE). Apps created from these templates start with MIT as well.
