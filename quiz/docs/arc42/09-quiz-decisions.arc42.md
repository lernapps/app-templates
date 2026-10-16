# Architecture Decisions

The quiz's decisions, besides the generic ones.

## The Creator Writes Only the Question Bank

The quiz is a deep scaffold: engine, six question types, feedback, scoring, order, accessibility and the page
without JavaScript come from the runtime, and the creator writes only `src/quiz.json`, no code. What the bank cannot
say goes into the retrospective instead of code around the runtime. So the schema fixes the quiz's structure, and a
quiz app writes no architecture of its own. Rejected: quiz-specific code in the app.

```arc42
:::decision
id: dec-quiz-only-bank
title: A quiz is only its question bank
status: accepted
date: 2026-10-16
addresses: qg-checkable, qg-understandable, con-runtime-unchanged
:::
```

## A Worksheet Without JavaScript

The build renders every question with its solution into the page, so that without JavaScript the quiz reads as a
worksheet with its answer key and the engine only adds the one-question-at-a-time quiz. Rejected: a page that needs
JavaScript to show its questions.

```arc42
:::decision
id: dec-quiz-worksheet
title: The quiz page is a worksheet without JavaScript
status: accepted
date: 2026-10-16
addresses: qg-quiz-readable-without-js, qg-accessibility
:::
```
