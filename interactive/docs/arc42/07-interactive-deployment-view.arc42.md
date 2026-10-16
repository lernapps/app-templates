# Deployment View

Where the interactive archetype's blocks run, below the generic nodes.

## Interactive build

The page rendering, the build checks with both playthrough players and the end-to-end tests run in CI and, through
the same hooks, on the creator's machine; the app's code, data and playthroughs are built and played there, and the
assistant will load the skill there once it is written.

```arc42
:::deployment-node
id: dn-interactive-build
title: Interactive build
type: container
parent: dn-ci-runner
hosts: bb-interactive-start-page, bb-interactive-app-page, bb-interactive-validation, bb-core-check, bb-build-playthroughs, bb-browser-playthroughs, bb-interactive-description, bb-interactive-core, bb-interactive-data, bb-interactive-playthroughs, bb-skill-interactive
:::
```

## Interactive app page

The shell, the core and the UI run in the learner's browser on the app page.

```arc42
:::deployment-node
id: dn-interactive-app-page
title: Interactive app page
type: container
parent: dn-learner-browser
hosts: bb-interactive-main, bb-state-holder, bb-input-router, bb-clock, bb-hash-router, bb-seed, bb-interactive-core, bb-interactive-ui, bb-interactive-data, bb-interactive-messages
:::
```
