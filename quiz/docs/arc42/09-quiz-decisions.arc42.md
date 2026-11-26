# Architecture Decisions

The quiz's decisions, besides the generic ones.

## The Creator Writes Only the Question Bank

The quiz is a deep scaffold. The runtime brings engine, question types, feedback, scoring, accessibility and the
worksheet. The creator writes only `src/quiz.json`, no code.
What the bank cannot say goes into the retrospective, not into code around the runtime.
So the schema fixes the quiz's structure, and a quiz app writes no architecture of its own.
Rejected: quiz-specific code in the app, because every app would then need its own checks.

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

A quiz is text-heavy and should read without JavaScript.
So the build renders every question with its solution into the page: a worksheet with its answer key.
JavaScript only adds the quiz with one question at a time.
Rejected: a page that needs JavaScript to show its questions, because it shows nothing without it.

```arc42
:::decision
id: dec-quiz-worksheet
title: The quiz page is a worksheet without JavaScript
status: accepted
date: 2026-10-16
addresses: qg-quiz-readable-without-js, qg-accessibility
:::
```
