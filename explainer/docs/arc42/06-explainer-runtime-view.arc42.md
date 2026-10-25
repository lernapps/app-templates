# Runtime View

The explainer's own scenarios, besides the generic ones.

## Practising on a page

The learner opens a page, possibly with `?<id>=<n>` for the task number of an exercise. Without JavaScript the page
is complete: the text, formulas, figures, each exercise with its solution in a `<details>` "Lösung", a generated one
with three worked tasks, each component's `nojs` text. With JavaScript `startExplainer()` makes the exercises live: a
quiz-type exercise gets the quiz's controls and checker, a generated exercise a live task from its task number and
"Neue Aufgabe", which writes the next number into the address; the islands hydrate their components. A wrong answer
gets its reason, the solution shows after the right answer or "Lösung zeigen", the feedback in view with the focus.
The worked tasks stay hidden with JavaScript; the sentence above the live
task is the exercise's `practice`, else a neutral default.

```arc42
:::runtime-scenario
id: scenario-explainer-practise
title: Practising on a page of the explainer
trigger: The learner opens a page or answers one of its exercises
involves: bb-render, bb-shell, bb-islands, bb-generated-exercises, bb-questions, bb-task-numbers, bb-explainer-content, bb-explainer-data, bb-explainer-components, bb-runtime-texts, bb-tooling
:::
```

## Building the explainer

The `explainer()` plugin validates the content, its data files and its components, runs the component rules and the
property test of each generated exercise and exercise component over fixed seeds, and writes the pages and, where the
tutor is on, a `tutor.md` per page from each exercise's tasks by number and its `describe` and `about`.

```arc42
:::runtime-scenario
id: scenario-explainer-build
title: Building the explainer
trigger: The creator, a git hook or CI runs the build
involves: bb-archetype-runtime, bb-build, bb-validation, bb-component-rules, bb-generated-exercises, bb-tutor-handoff, bb-task-numbers, bb-questions, bb-blocks, bb-explainer-content, bb-explainer-data, bb-explainer-components
:::
```

## Asking the tutor

The learner clicks "Mit einem KI-Tutor lernen": a button copies a ready prompt, or a provider link opens the learner's
own assistant with it; static `tutor.md` and `llms.txt` files give the assistant the tasks and solutions the exercise
contract describes, numbered by the task numbers, and nothing leaves the device before the click. No model runs in
the browser.

```arc42
:::runtime-scenario
id: scenario-tutor
title: Asking the tutor
trigger: The learner asks for help with a task
involves: bb-shell, bb-tutor-handoff, bb-task-numbers, bb-explainer-components
:::
```
