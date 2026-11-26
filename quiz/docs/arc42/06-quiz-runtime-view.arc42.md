# Runtime View

The quiz's own scenario, besides the generic ones.

## Answering a question

The learner opens the quiz, possibly with a seed or a link to one question.
Without JavaScript the page is a worksheet: every question, then the solutions with background and links.
With JavaScript the page becomes a quiz. The learner first chooses how many questions to answer; a link can preset this.
The questions come one at a time, in the order of the seed.
After each answer the learner sees whether it is right, the background of every option and the explanation.
A small "i" links to further reading. Screen readers announce the feedback.
At the end come the score and the solutions. When the bank asks for it, the device keeps the last result.

```arc42
:::runtime-scenario
id: scenario-quiz-answer
title: Answering a question of the quiz
trigger: The learner opens the quiz or answers a question
involves: bb-archetype-runtime, bb-render, bb-shell, bb-questions, bb-blocks, bb-quiz-bank, bb-runtime-texts, bb-tooling
:::
```
