# Deployment View

Where the explainer's blocks run, below the generic nodes.

## Explainer build

The explainer's rendering, validation, property tests and end-to-end tests run in CI and, through the same hooks,
on the creator's machine; the content, data, components and glue are built into the pages and the bundle there, and
the assistant loads the skill there.

```arc42
:::deployment-node
id: dn-explainer-build
title: Explainer build
type: container
parent: dn-ci-runner
hosts: bb-explainer-rendering, bb-explainer-validation, bb-generated-exercises, bb-explainer-tests, bb-explainer-content, bb-explainer-data, bb-explainer-components, bb-explainer-main, bb-skill-explainer
:::
```

## Explainer page

The client module, the islands with the components, and the generated exercises' live tasks run in the learner's
browser on the pages the build rendered.

```arc42
:::deployment-node
id: dn-explainer-page
title: Explainer page
type: container
parent: dn-learner-browser
hosts: bb-explainer-client, bb-islands, bb-generated-exercises, bb-explainer-components, bb-explainer-main
:::
```
