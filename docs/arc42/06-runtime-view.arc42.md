# Runtime View

Six scenarios every app shares: opening its pages, learning in the browser, an error path of the device storage,
building with the checks, the end-to-end tests before a push and in CI, and asking the tutor. Each extension adds its
archetype's own scenario.

## Opening the pages

A learner, teacher or parent opens `lernapps.net/<app>/`. The host serves static pages the build rendered from what
the creator wrote; what a page shows without JavaScript depends on the archetype and is in its extension (an
interactive app's app page shows only a `<noscript>` note). The language switch and the alternates are plain links to
the same page in the other language tree; an address the app does not have gets the 404 page, which leads to the
start page.

```arc42
:::runtime-scenario
id: scenario-pages
title: Opening the pages
trigger: A learner, teacher or parent opens the app's address
involves: bb-static-description, bb-page-tree, bb-not-found-page, bb-archetype
:::
```

## Learning in the browser

The page loads the app's client module; `src/main.ts` calls the archetype's start function, which takes a seed from
the address where the archetype draws anything at random, shows the learner's progress, announces changes through the
live region and moves the focus to the feedback. Its texts come in the page's language.

```arc42
:::runtime-scenario
id: scenario-learn
title: Learning in the browser
trigger: The learner opens a page with JavaScript and answers, practises or plays
involves: bb-shell, bb-archetype, bb-a11y, bb-i18n
:::
```

## Remembering on the device, storage blocked or full

An app that remembers something loads and saves JSON values through the storage wrapper, under its own prefix in
`localStorage`. When the browser blocks storage or it is full, `load` gives nothing and `save` returns false; the app
keeps working and remembers nothing. The decided quota of 100 kB, beyond which `save` refuses, is not built yet.

```arc42
:::runtime-scenario
id: scenario-device-storage
title: Remembering on the device, storage blocked or full
trigger: The archetype's code loads or saves a value
involves: bb-shell, bb-small-storage
:::
```

## Building with the checks

`vp build` (and `vp dev` on each request) runs the archetype's plugin inside the tooling preset. It validates what
the creator wrote, runs the archetype's checks (the component rules on any Vue components, the examples through the
checker where the archetype has them), and only then writes every page in every language and the 404 page. Any
problem fails the build with one line per problem.

```arc42
:::runtime-scenario
id: scenario-build
title: Building with the checks
trigger: The creator, a git hook or CI runs the build
involves: bb-preset, bb-build, bb-archetype, bb-build-checks, bb-component-rules, bb-examples-check, bb-static-description, bb-page-tree, bb-not-found-page
:::
```

## End-to-end tests before a push

`lernapps check --pre-push`, run by the pre-push hook and by CI, serves the built app on a free port and runs the
archetype's tests in Chromium at desktop width and at 360 px, with reduced motion, with cases derived from what the
creator wrote. `lernapps check` adds axe, the width check and the request check on the pages it visits.

```arc42
:::runtime-scenario
id: scenario-e2e
title: End-to-end tests before a push
trigger: The pre-push hook or CI runs lernapps check --pre-push
involves: bb-lernapps-check, bb-playwright-config, bb-e2e, bb-archetype, bb-static-description, bb-shell, bb-a11y
:::
```

## Asking the tutor

Built for the explainer, not built for the quiz and interactive apps. The learner clicks "Mit einem KI-Tutor lernen":
a button copies a ready prompt, or a provider link opens the learner's own assistant with it; static `tutor.md` and
`llms.txt` files give the assistant the tasks and solutions the exercise contract describes, numbered by the task
numbers, and nothing leaves the device before the click. No model runs in the browser.

```arc42
:::runtime-scenario
id: scenario-tutor
title: Asking the tutor
trigger: The learner asks for help with a task
involves: bb-tutor-handoff, bb-task-numbers, bb-exercise-contract
:::
```
