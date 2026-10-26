# Runtime View

The explainer's own scenarios, besides the generic ones.

## Practising on a page

The learner opens a page, possibly with `?<id>=<n>` for the task number of an exercise. Without JavaScript the page
is complete: the text, formulas, figures, each exercise with its solution in a `<details>` "Lösung", a generated one
with three worked tasks, each component's `nojs` text. With JavaScript `startExplainer()` makes the exercises live: a
quiz-type exercise gets the quiz's controls and checker, a generated exercise a live task from its task number and
"Neue Aufgabe", which writes the next number into the address; the islands hydrate their components. A wrong answer
gets its reason, the solution shows after the right answer or "Lösung", the feedback in view with the focus.
The worked tasks stay hidden with JavaScript; the sentence above the live
task is the exercise's `practice`, else a neutral default.

```arc42
:::runtime-scenario
id: scenario-explainer-practise
title: Practising on a page of the explainer
trigger: The learner opens a page or answers one of its exercises
involves: bb-render, bb-shell, bb-islands, bb-generated-exercises, bb-questions, bb-task-numbers, bb-explainer-content, bb-explainer-data, bb-explainer-components, bb-runtime-texts, bb-tooling
:::
```

## Building the explainer

The `explainer()` plugin validates the content, its data files and its components, runs the component rules and the
property test of each generated exercise and exercise component over fixed seeds, and writes the pages and, where the
tutor is on, the tutor page of each page from its content, each exercise's tasks by number and a component's
`describe` and `about`; it warns when a component's numbers do not all fit on its tutor page.

```arc42
:::runtime-scenario
id: scenario-explainer-build
title: Building the explainer
trigger: The creator, a git hook or CI runs the build
involves: bb-archetype-runtime, bb-build, bb-validation, bb-component-rules, bb-generated-exercises, bb-tutor-handoff, bb-task-numbers, bb-questions, bb-blocks, bb-explainer-content, bb-explainer-data, bb-explainer-components
:::
```

## Asking the tutor

The learner switches an assistant on once, on the start page or beside the title of a page; the choice stays on the
device. Way A: the bar beside the title of a page opens the learner's own assistant with one sentence that names the
page's tutor page with the page's task numbers, or copies that sentence with the tutor page's Markdown. The assistant
fetches the tutor page, looks the numbers up in its tables, asks what the child does not understand, explains with
the page's own example and sends links to tasks of the page with `von=tutor`. On such a page the learner solves the
task and presses "Zurück zum Tutor": the page copies a result line with the try, the input and the tutor page with
the task, closes the tab, and the learner pastes the line into the chat; the assistant knows the task's solution and
mistakes from the tutor page and talks about the mistake. Way B: stuck at a task, the learner clicks "Hilfe"
("Warum?" after a wrong answer) in the exercise. Without a chat the assistant opens with one sentence that names the
tutor page and the task, then the input and the app's message word for word; on a page a tutor opened the page copies
the task, the same lines and the tutor page and closes the tab, and the learner pastes them into the running chat.
The assistant starts from the app's message and helps without giving the solution away, as the tutor page's guide
says. Nothing leaves the device before a click, and the app reports nothing back. No model runs in the browser.

```arc42
:::runtime-scenario
id: scenario-tutor
title: Asking the tutor
trigger: The learner wants to learn a page with a tutor, or is stuck at a task
involves: bb-shell, bb-tutor-handoff, bb-task-numbers, bb-explainer-components
:::
```

## Watching a video

Without JavaScript, and with it before a click, a video is its title as a link to youtube.com, its channel and the
note that playing it sends data, among them the IP address, to YouTube/Google; the page requests nothing from another
host. The learner clicks "Video abspielen": the player of youtube-nocookie.com loads into the figure and starts, and
from then on YouTube gets the learner's IP address and the app's origin. Ticking "Videos immer direkt laden" keeps that
choice on the device, so every page of the app loads its players without the click, until the learner unticks it.

```arc42
:::runtime-scenario
id: scenario-explainer-video
title: Watching a video on a page
trigger: The learner clicks "Video abspielen", or opens a page after choosing to load videos directly
involves: bb-render, bb-shell, bb-video, bb-runtime-texts, bb-tooling
:::
```
