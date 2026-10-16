# Runtime View

The quiz's own scenario, besides the generic ones.

## Answering a question

The learner opens the quiz, possibly with `?seed=<n>` or `#frage-<id>`. Without JavaScript the page is a worksheet:
every question, then the solutions with the same background and links. With JavaScript `startQuiz()` turns it into a
quiz: the questions in the order of the seed (the address gets one when it has none), one at a time; an answer is
checked by the question types' checker, and right or wrong, the background of every option, the explanation and the
further reading show, the feedback in view with the focus and announced. At the end come the score and the solutions;
when the bank asks for it, the last result is kept on the device.

```arc42
:::runtime-scenario
id: scenario-quiz-answer
title: Answering a question of the quiz
trigger: The learner opens the quiz or answers a question
involves: bb-render, bb-shell, bb-question-types, bb-quiz-bank, bb-runtime-texts, bb-tooling
:::
```
