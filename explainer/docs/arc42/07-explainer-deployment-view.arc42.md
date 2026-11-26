# Deployment View

Where the explainer's blocks run, below the generic nodes.

## Explainer build

The explainer's build runs in CI and, through the same hooks, on the creator's machine. It checks the content and the
components and builds them into the pages and the bundle. In the preview of a pull request it also marks the difference
to the base in the pages.

```arc42
:::deployment-node
id: dn-explainer-build
title: Explainer build
type: container
parent: dn-ci-runner
hosts: bb-generated-exercises, bb-tutor-handoff, bb-scope, bb-task-numbers, bb-self-assessment, bb-diff-mode, bb-explainer-content, bb-explainer-data, bb-explainer-components
:::
```

## Explainer page

Everything live runs in the learner's browser, on the pages the build rendered: the exercises, the components, the
videos, the feedback mode, the diff mode's controls and the self-assessment.

```arc42
:::deployment-node
id: dn-explainer-page
title: Explainer page
type: container
parent: dn-learner-browser
hosts: bb-islands, bb-generated-exercises, bb-open-tasks, bb-language-tasks, bb-speaking-tasks, bb-audio-player, bb-media, bb-task-numbers, bb-video, bb-feedback-mode, bb-diff-mode, bb-self-assessment, bb-runtime-texts, bb-explainer-components
:::
```
