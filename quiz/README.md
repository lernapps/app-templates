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
- Content in a question, between its text and its answers (`material`): prose, a formula, a figure (your own image in
  `src/images/` with its source and licence, or drawn from numbers), a labelled figure, a table, a quotation, code.
  Every figure has an alternative text and a caption; the build checks the blocks and carries the images.

## What it cannot do

- No other media than images: no audio, no video. Content does not move.
- No own colours or layout: the look is the runtime's, calm like a worksheet. Dark mode follows the device.
- No timer, no new tasks drawn each time, no count the learner chooses.

## What the app supplies

- The question bank `src/quiz.json` ([schema](../runtime/quiz/quiz.v1.schema.json)) and, for the figures of its
  questions, the image files in `src/images/` (`<name>.svg`, `.png`, `.jpg` or `.webp`, referred to as
  `images/<name>.…`). No code: the runtime `@lernapps/app-templates` does the rest.
