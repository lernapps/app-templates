# Glossary

The explainer's terms, besides the generic ones.

## Block

A page is a list of blocks from a closed set, each with its type; sections give the structure.

```arc42
:::glossary-term
id: term-block
title: Block
definition: One element of an explainer page in its content YAML (a section, a text, a formula, a figure, an exercise, a vue-component, ...).
:::
```

## Island

Only a page with a component loads Vue.

```arc42
:::glossary-term
id: term-island
title: Island
definition: The place of a Vue component on a static explainer page, rendered at build and hydrated in the browser.
:::
```

## Task Number

"Aufgabe Nr. n" on the page, `?<id>=<n>` in the address.

```arc42
:::glossary-term
id: term-task-number
title: Task number
definition: The number of one of the distinct tasks of a seeded exercise, shared by the learner, the tutor and the address.
:::
```

## Generated Exercise

Written as `generated` in the content: given values, preconditions, a task template, an answer and typical mistakes.

```arc42
:::glossary-term
id: term-generated-exercise
title: Generated exercise
definition: An exercise of the explainer drawn from a seed, property-tested at build and live in the browser.
:::
```

## Tutor Page

`<chapter>/<page>/tutor/`, the address a tutor's prompt names for a page.

```arc42
:::glossary-term
id: term-tutor-page
title: Tutor page
definition: The one source of what the learner's own AI assistant gets about one content page: who it helps and how it guides, where the child is, then the page's content and its exercises with every task number, a generated one with its table of tasks; its query says where the learner is.
:::
```

## Table of Tasks

The inputs and outputs of each task number of a `generated` exercise on the tutor page, one line each:
`27 | 15 | 1260 | 189 | 18900` under `Nr. | p | G | Lösung | F1`.

```arc42
:::glossary-term
id: term-table-of-tasks
title: Table of tasks
definition: For each task number of a generated exercise, or of an exercise component that declares it, under its template on the tutor page: the values of its placeholders, the solution and what each typical mistake gives, worked out, so that the tutor fills in and calculates nothing.
:::
```

## Way to the Tutor

How the learner reaches the tutor: A, "Mit <name> lernen", for a page; B, "Hilfe", for one task.

```arc42
:::glossary-term
id: term-tutor-way
title: Way to the tutor
definition: Once an assistant is switched on, "Mit <name> lernen" (A) opens it with one sentence that names the page's tutor page with where the learner is; "Hilfe", "Warum?" after a wrong answer (B), gives the lines of one task, as a new chat (B1) or, on a page a tutor opened, copied for the running chat (B2).
:::
```

## Assistant Switched On

The learner's choice of a KI assistant, on the start page or beside the title of a page.

```arc42
:::glossary-term
id: term-tutor-assistant
title: Assistant switched on
definition: One of the app's assistants, or copying the text, chosen once by the learner and kept on the device per app; while one is on, each content page has the bar of way A and every exercise the help button of way B.
:::
```

## Lines of "Hilfe"

What way B gives the tutor about one task.

```arc42
:::glossary-term
id: term-stuck-lines
title: Lines of "Hilfe"
definition: In the learner's voice: the page's tutor page with the page's task numbers, uebung and abschnitt, and the task; the last wrong input with its tries, the app's message for it word for word, the hint or solution opened; no rule for the tutor.
:::
```

## Result Line

What "Zurück" at one task copies for the learner to paste into the chat; "Zurück zum Tutor" copies the tutor page and a
line like it for each task of the session.

```arc42
:::glossary-term
id: term-result-line
title: Result line
definition: The exercise, its task number, how far the learner got and the last input, with the absolute address of the page's tutor page with where the learner is.
:::
```

## Self-Assessment

German: Selbsteinschätzung. Optional, for the app or a chapter.

```arc42
:::glossary-term
id: term-self-assessment
title: Self-assessment
definition: Exercises of an explainer's content pages, a few per page of its own, which the learner may answer before learning and which are checked only all together; the result says per content page whether it is probably known, to look at again or to read.
:::
```
