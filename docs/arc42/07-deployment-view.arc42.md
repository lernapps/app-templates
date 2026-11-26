# Deployment View

## Deployment overview

Every app is static files. They are built and checked on the creator's machine and again in CI, published to GitHub
Pages, and run entirely in the learner's browser. There is no server of the app's own. A pull request gets a preview
of the same files. Each extension adds its archetype's blocks to these nodes.

Every app gets the same generated publishing workflow. It exists for the quiz and the explainer; an interactive app
has none yet. The diagram shows one block per node; each node's section lists all it hosts.

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
    service bb-tooling(server)[Preset, hooks and lernapps check] in dn-creator-machine
    service bb-build(server)[Build step] in dn-ci-runner
    service bb-render(disk)[Rendered pages] in dn-github-pages
    service bb-runtime(disk)[Page trees] in dn-pr-preview
    service bb-shell(server)[Shell] in dn-learner-browser
    bb-tooling:R --> L:bb-build
    bb-build:R --> L:bb-render
    bb-build:B --> T:bb-runtime
    bb-render:R --> L:bb-shell
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

A development server shows the pages while the assistant writes. Git hooks run the checks before a commit and before
a push.

```arc42
:::deployment-node
id: dn-creator-machine
title: Creator's machine
type: device
parent: env-development
hosts: bb-tooling, bb-skills, bb-runtime, bb-questions, bb-blocks, bb-component-rules, bb-build, bb-validation, bb-render, bb-runtime-texts, bb-e2e
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

Runs `lernapps check`, the same command as the hooks. On `main` it publishes the checked files. On a pull request it
publishes them as a preview.

```arc42
:::deployment-node
id: dn-ci-runner
title: GitHub Actions runner
type: server
parent: env-ci
hosts: bb-tooling, bb-runtime, bb-questions, bb-blocks, bb-component-rules, bb-build, bb-validation, bb-render, bb-runtime-texts, bb-e2e
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

Serves the app at `lernapps.net/<repo>/`: the pages in every language, the 404 page and the bundle. The app uses
relative URLs, so it works under any path.

```arc42
:::deployment-node
id: dn-github-pages
title: GitHub Pages
type: server
parent: env-production
hosts: bb-render, bb-runtime, bb-questions, bb-blocks, bb-component-rules
:::
```

## Pull request preview

The same files under a preview path of the app's address. Search engines do not index it. It is removed when the
pull request closes.

```arc42
:::deployment-node
id: dn-pr-preview
title: Pull request preview
type: server
parent: env-production
hosts: bb-render, bb-runtime, bb-questions, bb-blocks, bb-component-rules
:::
```

## Learner's browser

Runs the archetype's code and the tooling's helpers. The browser's storage holds what the app remembers. Nothing
leaves the device before a click.

```arc42
:::deployment-node
id: dn-learner-browser
title: Learner's browser
type: device
parent: env-production
hosts: bb-shell, bb-tooling
:::
```
