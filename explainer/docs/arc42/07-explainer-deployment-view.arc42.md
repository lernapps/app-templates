# Deployment View

Where the explainer's blocks run, below the generic nodes.

## Explainer build

The explainer's component rules, property tests and tutor files run in CI and, through the same hooks, on the
creator's machine; the content, data and components are built into the pages and the bundle there.

```arc42
:::deployment-node
id: dn-explainer-build
title: Explainer build
type: container
parent: dn-ci-runner
hosts: bb-component-rules, bb-generated-exercises, bb-tutor-handoff, bb-task-numbers, bb-explainer-content, bb-explainer-data, bb-explainer-components
:::
```

## Explainer page

The client module, the islands with the components, the generated exercises' live tasks with the quiz's question
types, the task numbers and the explainer's texts run in the learner's browser on the pages the build rendered.

```arc42
:::deployment-node
id: dn-explainer-page
title: Explainer page
type: container
parent: dn-learner-browser
hosts: bb-islands, bb-generated-exercises, bb-task-numbers, bb-runtime-texts, bb-explainer-components
:::
```
