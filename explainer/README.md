# Archetype explainer

Chapters of pages that explain a topic, with exercises on every page. Every page is complete without JavaScript.

## What it can do

- Text, formulas (also chemistry), drawn figures, tables, timelines, definitions with a glossary, quotes, code, and
  boxes for worked examples and hints.
- Your own images with source and licence. An image with words in it can have one file per language:
  `image: { de: images/plan-de.svg, en: images/plan-en.svg }`. Figures can have numbered labels.
- YouTube videos behind two clicks. Before the click, the page shows a link with title and channel and a note on
  privacy, and loads nothing from YouTube or Google. "Video abspielen" loads the player from youtube-nocookie.com.
  The learner may choose to load videos directly from then on. The catalog entry of an app with a video says
  `fitness.thirdParty: on-click`.
- Exercises of the six question types of the quiz, with feedback, hints and typical mistakes. A question can show
  content between its text and its answers (`material`): figures, tables, quotes and code.
- Language tasks (`language-task`): the learner writes a word, a form or sentences, and the page checks it against
  the answers the task lists. An item starts from the other language, a cue or a marker of a labelled figure. The
  modes are `write`, `gap`, `choice` and `table`. Mistakes of form count as wrong unless the task loosens them. The
  example app is [`examples/franzoesisch`](examples/franzoesisch/src/app.yaml).
- Listening and speaking with synthetic voices. They run on the creator's machine, never in the learner's browser
  or on a server. An item of a language task may start from `audio`: a dictation, a gap dictation or a listening
  task. A `speaking-task` lets the learner record themself, compare with the original and rate their pronunciation.
  The recording stays in the browser's memory; it is not stored and not sent.
- The audio files are MP3s in `src/audio/`. The audio skill (`lernapps-audio`) makes them and marks them as
  AI-generated. The build stops when a file lacks that mark. The player shows a small "KI" label.
- A page "Medienübersicht" (`medien/`) lists every image, audio file and video with credit, licence and use.
- Generated exercises (`generated`): each task draws new numbers or records, with typical mistakes, a hint and the
  way to the solution. They can use roots, powers, trigonometry and chemical formulas from a data file. The build
  tests them over fixed seeds. Without JavaScript, three worked tasks show with their solutions. How to write them is
  in the [schema](../runtime/explainer/explainer.v1.schema.json) (`$defs/generated`).
- Task numbers: every generated exercise and exercise component numbers its different tasks, up to 67. The page shows
  "Aufgabe Nr. <n>" and "Neue Aufgabe". The address holds the number of each exercise (`?<id>=<n>`), so a link opens
  the same tasks, for example in class. An exercise starts at a random number, or at 1 with `tasks: { start: first }`
  in `app.yaml`.
- Vue components for what no block can show or check, such as reading a scale or labelling a figure. See
  [Components](#components).
- Navigation, contents and glossary are generated.
- An AI tutor that the learner brings: see [AI tutor](#ai-tutor).
- Optional self-assessments: one per chapter (`selfAssessment` in its `chapter.yaml`, at `<chapter>/einschaetzung/`),
  and one for the app at `einschaetzung/` with every chapter's together. It shows two to five exercises per page,
  without "Prüfen", and checks them all together. The result says per page whether the learner probably knows it,
  should look at it again or should read it. The learner can take the result to the tutor. The example chapter has
  one.
- German, plus English: a page tree per language.
- A diff mode for reviewing a change. Build the app with `EXPLAINER_BASE` set to the folder of another version. Every
  page then marks new, changed, moved and removed blocks, and `aenderungen/` lists every change. The preview of a pull
  request is built this way. A production build never sets it.

## Components

An app's components are Vue single-file components in `src/components/<Name>.vue`, with typed props and a test
`<Name>.test.ts`. A `vue-component` block uses one, with its `props` and a `nojs` text for readers without
JavaScript. The example is `src/components/ProzentFeld` on the page `prozent/prozentwert`: colour p % of a field of G
squares.

- The build checks each block's props against the component's prop types. A string prop is a text to translate,
  unless its doc comment says `@verbatim`, for example for an id.
- The build also checks the component's code: no network, no `eval` or `innerHTML`, browser globals only after it
  mounts, and at most 20 kB gzip. It may import only from `vue`, this runtime, `@lernapps/tooling/storage`, `i18n`,
  `a11y` and `src/components/` itself.
- Once the component runs, it replaces its `nojs` text. With `defineOptions({ nojs: "caption" })` it keeps the text
  as a folded description below it.

A component that emits `answer` is an exercise component. It is only the input of its task: the page adds "Prüfen",
the feedback and "Lösung zeigen". It emits the learner's answer at each change (`undefined` while there is none). It
may declare the props `checked: boolean` (true while the checked answer stands) and `seed: number` (the seed of its
task number).

Its logic module `<Name>.ts` exports:

- `generate(seed, props)`: the task for a seed.
- `check(task, answer)`: whether an answer is right.
- `solution(task)`: the right answer.
- `wrong(task)`: a wrong answer, for the build's tests.
- `reason(task, answer, props, lang)`: the message for a wrong answer, or `undefined`.
- `unanswered` (optional): the message when the learner checks without an answer.
- `describe(task, props, lang)`: the task and its solution as text (`{ task, solution }`, restricted Markdown). The
  build writes the page's text without JavaScript from it, so the block needs no `nojs`.
- `about`: what the exercise is for a tutor (`{ task, answer, correct, mistakes }`).
- For a table of all tasks on the tutor page, all four or none: `template(props, lang)`, the task once with `{name}`
  for each input; `params(task, props, lang)`, the inputs of a task by name; `mistakes(task, props)`, the answer each
  typical mistake gives; `show(answer, task, props, lang)`, an answer as text. Without them the build gives a hint.

The build tests these exports over fixed seeds and every task number. The block of an exercise component needs at
least one accepted and one rejected example.

## AI tutor

The learner can bring an AI assistant of their own, with their own account. The app does not offer it; lernapps.net
only provides the content and the exercises.

- For every content page the app writes a tutor page (`<chapter>/<page>/tutor/`), as HTML and as Markdown. Parents
  and teachers can read it too. It tells the tutor how to guide a child and holds the page's content and every task of
  its exercises, with solutions and typical mistakes. The app adds its own rules in `tutor.rules` in `app.yaml`.
- The learner switches an assistant on once, on the start page or beside the title of a page. The choice stays on the
  device. "Ein anderer: Text kopieren" works with any assistant.
- Then a button beside the title of each page opens the assistant with the page.
- Every exercise has a help button: "Hilfe", or "Warum?" after a wrong answer. It hands the tutor the task, the
  learner's input and the app's message. Input and message leave the page only with this click.
- A page opened from the tutor shows "Zurück zum Tutor". It copies how each task of the session went, for the learner
  to paste into the chat.
- Without JavaScript, the page has a plain link per assistant.

## What it cannot do

- No speech recognition: nothing judges how a learner speaks. A language task checks only what is written. A right
  version that the task does not list counts as wrong; the page tells the learner they may ask. In a speaking task the
  learner rates their own pronunciation.
- Audio is in four languages for now: English (US, GB), French, Spanish and Italian.
- No own colours or layout: the look is the runtime's, calm like a worksheet. Dark mode follows the device.
- No timer, no game.
- At most two section levels in a page.
- An exercise component does not count as a page's required exercise. Each page also needs a question or a generated
  exercise. A recap page needs none and has at most two.
- Stores only the learner's choice of AI tutor, the choice to load videos directly, and the last result of each
  self-assessment.
- A self-assessment needs JavaScript. Without it, it is not offered.
- No video from another platform than YouTube, no thumbnail, no own video files.

## What the app supplies

- The content as YAML in `src/`: `app.yaml`, a folder per chapter with `chapter.yaml` and its pages, `data/` and
  `images/` ([schema](../runtime/explainer/explainer.v2.schema.json), format 2). Vue components in
  `src/components/` where no block fits.
- Its place on the catalog's learning map (format 2): the app's strand, and the competencies each page practises. A
  unit app may instead name a subject and span its strands, if the subject's map allows it.
- A recap page repeats one or more competencies from elsewhere that the app needs (`recap: physik/kraft`, or
  `recap: [physik/kraft, physik/masse]` for one short recap at the start of a chapter). The runtime links each on the
  learning map, and the page's text names each.
- Format 1 ([schema](../runtime/explainer/explainer.v1.schema.json)) stays valid, without a place on the map.
