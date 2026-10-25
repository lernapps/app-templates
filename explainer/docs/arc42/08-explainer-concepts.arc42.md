# Cross-cutting Concepts

The explainer's concept, besides the generic ones.

## Self-assessment

Every page asks "Wie sicher bist du?" with three levels (Sicher, Teils, Noch üben); the start and chapter pages show
each page's level. The levels are the learner's own state, so they stay on the device through the storage wrapper
(`con-state-on-device`), one map under one key, shared by the language trees; nothing leaves the browser. A tutor
gets a chapter's levels only in the address the learner opens it with (`standOf`, parameter `stand`). Without
JavaScript the question and the overview's heading stay readable and say that nothing is saved. On by default, off
with `selfAssessment: false` in `app.yaml` (`dec-explainer-self-assessment`).

```arc42
:::concept
id: concept-self-assessment
title: Self-assessment per page, kept on the device
category: learning
:::
```

## Tutor

Optional per app: no model runs in the browser; the tutor is a handoff of the current task to the learner's own
assistant, after a click, through a prompt and static tutor files (`dec-tutor-variant`). Built for the explainer, not
built for the quiz and interactive apps (`risk-tutor-not-built`).

```arc42
:::concept
id: concept-tutor
title: Tutor as a handoff to the learner's own assistant
category: learning
:::
```
