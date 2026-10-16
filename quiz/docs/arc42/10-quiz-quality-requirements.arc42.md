# Quality Requirements

The quiz's goal and scenarios, besides the generic ones.

## Readable without JavaScript (quiz)

A quiz is text-heavy, so its questions, solutions, background and links read without JavaScript, as far as a quiz
can: as a worksheet with its answer key, not as a quiz answered one question at a time. Realised by the quiz
rendering and checked by the quiz's end-to-end tests (`dec-quiz-worksheet`).

OPEN: Confirm the priority (medium is a proposal).

```arc42
:::quality-goal
id: qg-quiz-readable-without-js
title: Readable without JavaScript (quiz)
priority: medium
:::
```

## Every question readable without JavaScript

`quizTests()` opens the page with JavaScript off, in every language of the bank.

```arc42
:::quality-scenario
id: qs-quiz-without-js
title: Every question and its solution read without JavaScript
quality: qg-quiz-readable-without-js
stimulus: The quiz's end-to-end tests open the built quiz with JavaScript off
response: Every question and its solution, with the same background and links, are visible; in each further language too
metric: All questions of the bank and their solutions visible, in every declared language
:::
```

## A broken bank fails the build

The bank validation runs before the page is written.

```arc42
:::quality-scenario
id: qs-quiz-bank-valid
title: A broken question bank fails the build
quality: qg-checkable
stimulus: The bank has two correct options in a single choice, a duplicate id or a missing translation
response: The build fails with one line per problem, naming the question by its position and id
metric: 0 pages written from an invalid bank
:::
```
