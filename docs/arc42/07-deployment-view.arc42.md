# Deployment View

## Deployment overview

Every app is static files: it is built and checked on the creator's machine and again in CI, published to its repo's
GitHub Pages and run entirely in the learner's browser. There is no server of the app's own; what the app remembers
stays in the browser's `localStorage`. A pull request gets a preview of the same files. Each extension adds nodes
below these for its archetype's blocks at build and in the browser; blocks not built yet are listed where they would
run.

Every app gets the same generated Pages workflow (app check, publish, preview) in step 2 of the plan. It is built for
the explainer and quiz archetypes; the tooling does not have the interactive archetype yet, so an interactive app has
no generated workflow today. The templates themselves are checked by the CI of `lernapps/app-templates`. The diagram
shows one representative block per node; each node's section lists all it hosts.

```arc42
:::diagram
id: deployment-overview
view: deployment
notation: mermaid-architecture
:::
```

```mermaid
architecture-beta
    group env-development(server)[Development]
    group dn-creator-machine(server)[Creator machine] in env-development
    group env-ci(cloud)[CI]
    group dn-ci-runner(server)[GitHub Actions runner] in env-ci
    group env-production(internet)[Production and preview]
    group dn-github-pages(cloud)[GitHub Pages] in env-production
    group dn-pr-preview(cloud)[Pull request preview] in env-production
    group dn-learner-browser(internet)[Learner browser] in env-production
    service bb-preset(server)[Preset and hooks] in dn-creator-machine
    service bb-lernapps-check(server)[lernapps check] in dn-ci-runner
    service bb-static-description(disk)[Static description] in dn-github-pages
    service bb-page-tree(disk)[Page trees] in dn-pr-preview
    service bb-shell(server)[Shell] in dn-learner-browser
    bb-preset:R --> L:bb-lernapps-check
    bb-lernapps-check:R --> L:bb-static-description
    bb-lernapps-check:B --> T:bb-page-tree
    bb-static-description:R --> L:bb-shell
```

## Development

The creator's machine, where the creator's AI assistant writes the app.

```arc42
:::deployment-node
id: env-development
title: Development
type: environment
:::
```

## Creator's machine

`vp dev` serves the pages, rendered on each request. The git hooks the preset installs run the checks before a commit
(format, lint, type check) and before a push (unit tests, build, checks of the built app, end-to-end tests, in
Chromium). The assistant loads the skills here. A template folder inside `lernapps/app-templates` gets no hooks of
its own.

```arc42
:::deployment-node
id: dn-creator-machine
title: Creator's machine
type: device
parent: env-development
hosts: bb-preset, bb-lint-rules, bb-lernapps-check, bb-playwright-config, bb-skill-app, bb-build, bb-static-description, bb-page-tree, bb-not-found-page, bb-build-checks, bb-component-rules, bb-examples-check, bb-question-types, bb-exercise-contract, bb-task-numbers, bb-tutor-handoff, bb-e2e, bb-archetype
:::
```

## CI

GitHub Actions of the app's repo, on every push and pull request.

```arc42
:::deployment-node
id: env-ci
title: CI
type: environment
:::
```

## GitHub Actions runner

The job `app` runs `lernapps check`, the same command as the hooks, and keeps the checked bundle; on `main` the job
`deploy` publishes it, on a pull request from the repo the job `preview` publishes it as a preview. A change of only
the plan or only docs checks and publishes nothing.

```arc42
:::deployment-node
id: dn-ci-runner
title: GitHub Actions runner
type: server
parent: env-ci
hosts: bb-preset, bb-lint-rules, bb-lernapps-check, bb-playwright-config, bb-skill-app, bb-build, bb-static-description, bb-page-tree, bb-not-found-page, bb-build-checks, bb-component-rules, bb-examples-check, bb-question-types, bb-exercise-contract, bb-task-numbers, bb-tutor-handoff, bb-e2e, bb-archetype
:::
```

## Production and preview

lernapps.net as learners reach it.

```arc42
:::deployment-node
id: env-production
title: Production and preview
type: environment
:::
```

## GitHub Pages

The `gh-pages` branch of the app's repo, served from its root at `lernapps.net/<repo>/` (only a repo of the lernapps
organisation is served there; any other at its own Pages address). It serves the rendered pages in every language,
the 404 page, the tutor files where the tutor is built, and the bundle; the preset builds with relative URLs, so the
app works under any path.

```arc42
:::deployment-node
id: dn-github-pages
title: GitHub Pages
type: server
parent: env-production
hosts: bb-static-description, bb-page-tree, bb-not-found-page, bb-tutor-handoff
:::
```

## Pull request preview

The same files below `pr-preview/pr-<number>/` of the app's address, not indexed by search engines, removed when the
pull request is closed.

```arc42
:::deployment-node
id: dn-pr-preview
title: Pull request preview
type: server
parent: env-production
hosts: bb-static-description, bb-page-tree, bb-not-found-page, bb-tutor-handoff
:::
```

## Learner's browser

Runs the app's client module: the shell with the archetype's code and the tooling's helpers. `localStorage` of the
one origin lernapps.net holds what the app remembers, under the app's prefix; nothing leaves the device before a
click.

```arc42
:::deployment-node
id: dn-learner-browser
title: Learner's browser
type: device
parent: env-production
hosts: bb-shell, bb-loading-indicator, bb-settings, bb-question-types, bb-task-numbers, bb-tutor-handoff, bb-archetype, bb-i18n, bb-a11y, bb-small-storage
:::
```
