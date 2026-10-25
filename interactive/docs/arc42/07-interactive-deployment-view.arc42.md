# Deployment View

Where the interactive archetype's blocks run, below the generic nodes.

## Interactive build

The build step with its checks and the end-to-end tests run in CI and, through the same hooks, on the creator's
machine; the app's description, code, data and playthroughs are built and played there.

```arc42
:::deployment-node
id: dn-interactive-build
title: Interactive build
type: container
parent: dn-ci-runner
hosts: bb-interactive-description, bb-interactive-core, bb-interactive-ui, bb-interactive-data, bb-interactive-messages, bb-interactive-playthroughs
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
hosts: bb-shell, bb-interactive-core, bb-interactive-ui, bb-interactive-data, bb-interactive-messages
:::
```

<!-- app: begin -->
<!-- app: end -->
