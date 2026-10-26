# System Scope and Context

The explainer's actor, besides the generic ones.

## Learner's own AI assistant

The explainer's optional tutor is this assistant, which the learner brings and controls; no model runs in the
browser. After the learner's click, the app hands it the current task through the tutor prompt and the static tutor
files.

```arc42
:::actor
id: actor-learner-assistant
title: Learner's own AI assistant
type: system
description: Receives the page's tutor page with the learner's task after the learner's click
requires: if-tutor-files
:::
```
