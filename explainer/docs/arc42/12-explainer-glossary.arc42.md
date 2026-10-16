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
