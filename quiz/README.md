# Archetype quiz

A quiz about things to know: one page of questions with options, feedback on every option, score and solutions.

## What it can do

- Six question types: single choice, multiple choice, true or false, a number within a tolerance, putting items in
  order, matching pairs.
- Background on every option, an explanation for every question, links to further reading, an optional hint, typical
  wrong numbers with their message.
- One question at a time with feedback; at the end the score and all solutions. Without JavaScript: a worksheet with
  the solutions.
- Questions in a shuffled order; a link with a seed gives every learner the same order. A link to each question.
- The learner chooses at the start how many questions to answer (at most all of them): the seed picks them, and the address (`?seed=…&n=…`) keeps the choice, so a link gives every learner the same questions.
- German, plus English: a page per language.
- Optionally keeps the last score on the learner's device.

## What it cannot do

- No images or other media.
- No own colours or layout: the look is the runtime's, calm like a worksheet. Dark mode follows the device.
- No timer, no new tasks drawn each time, no count the learner chooses.

## What the app supplies

- Only the question bank `src/quiz.json` ([schema](../runtime/quiz/quiz.v1.schema.json)). No
  code: the runtime `@lernapps/app-templates` does the rest.
