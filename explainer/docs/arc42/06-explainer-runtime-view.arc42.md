# Runtime View

The explainer's own scenario, besides the generic ones (the tutor handoff is one of them).

## Practising on a page

The learner opens a page, possibly with `?<id>=<n>` for the task number of an exercise. Without JavaScript the page
is complete: the text, formulas, figures, each exercise with its solution in a `<details>` "Lösung", a generated one
with three worked tasks, each component's `nojs` text. With JavaScript `startExplainer()` makes the exercises live: a
quiz-type exercise gets the quiz's controls and checker, a generated exercise a live task from its task number and
"Neue Aufgabe", which writes the next number into the address; the islands hydrate their components. A wrong answer
gets its reason, the solution shows after the right answer or "Lösung zeigen", the feedback in view with the focus.

```arc42
:::runtime-scenario
id: scenario-explainer-practise
title: Practising on a page of the explainer
trigger: The learner opens a page or answers one of its exercises
involves: bb-explainer-rendering, bb-explainer-client, bb-islands, bb-generated-exercises, bb-question-types, bb-task-numbers, bb-explainer-content, bb-explainer-components, bb-a11y
:::
```
