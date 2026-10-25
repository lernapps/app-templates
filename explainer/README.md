# Archetype explainer

Chapters of pages that explain a topic, with exercises on every page. Every page is complete without JavaScript.

## What it can do

- Text, formulas (also chemistry), drawn figures, your own images with source and licence, figures with numbered
  labels, tables, timelines, definitions with a glossary, quotes, code, boxes for worked examples and hints.
- YouTube videos behind two clicks: before the click a link with title, channel and a note on privacy, nothing loaded
  from YouTube or Google; "Video abspielen" loads the player from youtube-nocookie.com. The learner may choose to load
  videos directly from then on. The catalog entry of an app with a video says `fitness.thirdParty: on-click`.
- Exercises of the six question types, with feedback, hints and typical mistakes; a question can show content (`material`: the figures, tables, quotes and code of the page's blocks) between its text and its answers.
- Generated exercises: each task draws new numbers or records, up to 67 numbered tasks per exercise, with typical
  mistakes, a hint and the way to the solution. The build tests them over fixed seeds.
- Vue components for what no block can show or check, such as reading a scale, labelling a figure or dragging into
  place; an exercise component draws its own tasks. A component needs its logic module, a test and a text for readers
  without JavaScript.
- Navigation, contents, glossary and an AI tutor prompt per page are generated.
- German, plus English: a page tree per language.

## What it cannot do

- No own colours or layout: the look is the runtime's, calm like a worksheet. Dark mode follows the device.
- No timer, no game.
- At most two section levels in a page.
- An exercise component does not count as a page's required exercise: each page also needs a question or a generated
  exercise.
- Stores nothing but the learner's choice of AI tutor and, if they make it, the choice to load videos directly.
- No video from another platform than YouTube, no thumbnail, no own video files.

## What the app supplies

- The content as YAML in `src/`: the app, a folder per chapter with its pages, data files and images
  ([schema](../runtime/explainer/explainer.v1.schema.json)); Vue components in `src/components/` where
  no block fits.
