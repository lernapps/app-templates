# Runtime View

The explainer's own scenarios, besides the generic ones.

## Practising on a page

The learner opens a page, possibly with the task number of an exercise in the address. Without JavaScript the page is
complete: text, formulas, figures, each exercise with its solution folded, a generated one with worked tasks. With
JavaScript the exercises become live. A generated exercise shows the task of its number, and "Neue Aufgabe" draws the
next one. A wrong answer gets its reason. The solution shows after the right answer or on "Lösung".

```arc42
:::runtime-scenario
id: scenario-explainer-practise
title: Practising on a page of the explainer
trigger: The learner opens a page or answers one of its exercises
involves: bb-render, bb-shell, bb-islands, bb-generated-exercises, bb-questions, bb-task-numbers, bb-explainer-content, bb-explainer-data, bb-explainer-components, bb-runtime-texts, bb-tooling
:::
```

## Building the explainer

The build validates the content, its data files and its components and tests every generated exercise and exercise
component. Then it writes the pages and the tutor pages. It warns when a component's tasks do not all fit on its tutor
page.

```arc42
:::runtime-scenario
id: scenario-explainer-build
title: Building the explainer
trigger: The creator, a git hook or CI runs the build
involves: bb-archetype-runtime, bb-build, bb-validation, bb-component-rules, bb-generated-exercises, bb-tutor-handoff, bb-task-numbers, bb-questions, bb-blocks, bb-explainer-content, bb-explainer-data, bb-explainer-components
:::
```

## Asking the tutor

The learner switches an assistant on once; the choice stays on the device.

Way A: the learner clicks "Mit <name> lernen" beside the page title. Their own assistant opens with one sentence that
names the page's tutor page. The assistant reads it, asks what the child does not understand, explains with the page's
example and sends links to tasks of the page. The learner solves a task and clicks "Zurück zum Tutor". The page copies
how each task went, and the learner pastes it into the chat. The assistant talks about the mistake.

Way B: stuck at a task, the learner clicks "Hilfe", or "Warum?" after a wrong answer. A new chat opens with the task,
the input and the app's message; in a running chat the learner pastes them. The assistant starts from the app's message
and helps without giving the solution away.

Nothing leaves the device before a click, and the app reports nothing back.

```arc42
:::runtime-scenario
id: scenario-tutor
title: Asking the tutor
trigger: The learner wants to learn a page with a tutor, or is stuck at a task
involves: bb-shell, bb-tutor-handoff, bb-task-numbers, bb-explainer-components
:::
```

## Watching a video

Before a click, a video is a link with its channel and a note that playing sends data to YouTube/Google. The page
requests nothing from another host. The learner clicks "Video abspielen", and the player loads and starts. Ticking
"Videos immer direkt laden" keeps that choice on the device until the learner unticks it.

```arc42
:::runtime-scenario
id: scenario-explainer-video
title: Watching a video on a page
trigger: The learner clicks "Video abspielen", or opens a page after choosing to load videos directly
involves: bb-render, bb-shell, bb-video, bb-runtime-texts, bb-tooling
:::
```

## Giving feedback

A teacher or parent switches the feedback mode on in an app and notes what to improve at the blocks it concerns. The
notes stay on their device. To hand them over, the mode copies them and opens a new issue in the app's repository,
where the person pastes them with their own GitHub account.

```arc42
:::runtime-scenario
id: scenario-explainer-feedback
title: Giving feedback on an app as an issue
trigger: A teacher or parent switches the feedback mode on, notes what to improve and hands the notes over
involves: bb-render, bb-shell, bb-feedback-mode, bb-runtime-texts, bb-tooling
:::
```

## Reviewing a change in the preview

A reviewer opens the preview of a pull request that changes an explainer. Every page marks what changed against the
target branch: new, changed, removed and moved blocks. A bar steps from one change to the next. An overview lists all
changes, including pages and chapters that are gone.

```arc42
:::runtime-scenario
id: scenario-explainer-diff
title: Reviewing a change to an explainer in the pull request's preview
trigger: A reviewer opens the preview of a pull request that changes an explainer's content
involves: bb-build, bb-render, bb-shell, bb-diff-mode, bb-runtime-texts
:::
```

## Doing a self-assessment

The start page or a chapter's page offers the self-assessment and names the last result, if any. The learner starts a
run with new tasks and goes through its pages, without feedback. "Auswerten" checks everything and keeps the result on
the device. It shows, per content page, whether the learner probably knows it, should look at it again or should read
it.

The learner may take the result to their assistant with a click. The tutor then guides chapter by chapter: it sends the
learner to the pages that do not stick and then into a new round. The learner brings each result back by pasting it.
After each round the tutor decides on the next chapter or another round. The learner can start anew or delete the
result.

```arc42
:::runtime-scenario
id: scenario-explainer-self-assessment
title: Doing a self-assessment
trigger: The learner starts the self-assessment offered on the start page or a chapter's page
involves: bb-render, bb-shell, bb-self-assessment, bb-generated-exercises, bb-questions, bb-task-numbers, bb-tutor-handoff, bb-runtime-texts, bb-tooling
:::
```
