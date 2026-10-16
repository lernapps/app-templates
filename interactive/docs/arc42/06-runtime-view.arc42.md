# Runtime View

Five representative scenarios: reading the start page without JavaScript, playing on the app page, an error path of
the device storage, building with the checks, and the browser playthroughs before a push and in CI. The tutor is
described last as a scenario that is not built.

## Opening the start page without JavaScript

A learner, teacher or parent opens `lernapps.net/<app>/`. The host serves a static page the build rendered from
`src/app.yaml`: what the app does, the link into the app, a link per route, how to play, the competencies and the
background sections, a `<noscript>` note that the app needs JavaScript, and no script at all. The language switch and
the alternates are plain links to the same page in the other language tree; an address the app does not have gets the
404 page, which leads to the start page.

```arc42
:::runtime-scenario
id: scenario-start-page
title: Opening the start page without JavaScript
trigger: A learner, teacher or parent opens the app's address
involves: bb-start-page, bb-page-tree, bb-not-found-page, bb-description
:::
```

## Playing on the app page

The learner opens `app/`, possibly with `?seed=<n>` and `#<route>`. `src/main.ts` calls `startInteractive`, which
takes the seed from the address (else a random one) and the route from the hash (else the first route), starts the
core and mounts the root component with the state and the page's language. Every key typed on the page goes to
`step`, except keys on links, buttons and form fields or with Ctrl, Alt or Meta; a key that changes the state loses its
default. Pointer input reaches `step` as a key the root component emits as `input`. When the core has `tick`, the clock
calls it every 20 ms. A new route in the hash starts the core again with the same seed and marks the current route
link. The components only show the state, take their texts through the translator and announce changes through the
live region.

```arc42
:::runtime-scenario
id: scenario-play
title: Playing on the app page (keys, ticks, route change)
trigger: The learner opens the app page, types a key, uses the pointer, or follows a route link
involves: bb-app-page, bb-main, bb-shell, bb-seed, bb-hash-router, bb-input-router, bb-clock, bb-core, bb-data, bb-ui, bb-messages, bb-i18n, bb-a11y
:::
```

## Remembering on the device, storage blocked or full

An app that remembers something (the template app does not) loads and saves JSON values through the storage wrapper,
under its own prefix in `localStorage`. When the browser blocks storage or it is full, `load` gives nothing and `save`
returns false; the app keeps working and remembers nothing. The decided quota of 100 kB, beyond which `save` refuses,
is not built yet.

```arc42
:::runtime-scenario
id: scenario-device-storage
title: Remembering on the device, storage blocked or full
trigger: A component loads or saves a value
involves: bb-ui, bb-small-storage
:::
```

## Building with the checks and playthroughs

`vp build` (and `vp dev` on each request) runs the `interactive()` plugin inside the tooling preset. It validates
`src/app.yaml` and the playthroughs, checks the components on the SFC compiler's output, loads the core in a Vite
server of its own, checks its exports and that every route starts, and plays every playthrough twice without ticks,
comparing the two plays and the expected states. Only then does it write the start page and the app page in every
language and the 404 page, and finally checks the size budget. Any problem fails the build with one line per problem.

```arc42
:::runtime-scenario
id: scenario-build
title: Building with the checks and playthroughs
trigger: The creator, a git hook or CI runs the build
involves: bb-preset, bb-build, bb-description, bb-playthroughs, bb-app-validation, bb-component-rules, bb-core-check, bb-core, bb-build-playthroughs, bb-start-page, bb-app-page, bb-page-tree, bb-not-found-page, bb-size-budget
:::
```

## Browser playthroughs in the end-to-end tests

`lernapps check --pre-push`, run by the pre-push hook and by CI, serves the built app on a free port and runs
`interactiveTests()` in Chromium at desktop width and at 360 px, with reduced motion. Without JavaScript it checks the
start page and the app page in every language; with JavaScript it opens each playthrough at `app/?seed=<seed>#<route>`,
presses its keys and compares, after each step, the state read from `lernappsState` and the announcement of the polite
live region. `lernapps check` adds axe and the width check on the pages it visits.

```arc42
:::runtime-scenario
id: scenario-browser-playthroughs
title: Browser playthroughs in the end-to-end tests
trigger: The pre-push hook or CI runs lernapps check --pre-push
involves: bb-lernapps-check, bb-playwright-config, bb-browser-playthroughs, bb-playthroughs, bb-description, bb-start-page, bb-app-page, bb-shell, bb-seed, bb-hash-router, bb-input-router, bb-core, bb-ui, bb-a11y
:::
```

## Asking the tutor (not built)

Not built for interactive apps. In the explainer the learner clicks "Mit einem KI-Tutor lernen": a button copies a
ready prompt, or a provider link opens the learner's own assistant with it; static `tutor.md` and `llms.txt` files give
the assistant the tasks, and nothing leaves the device before the click. Whether the interactive tutor works this way
or as a model in the browser is open.

OPEN: Is the "client-side AI tutor" a handoff to the learner's own assistant (as in the explainer) or a model running
in the browser?

```arc42
:::runtime-scenario
id: scenario-tutor
title: Asking the tutor (not built)
trigger: The learner asks for help with a task
involves: bb-tutor-handoff, bb-tutor-in-browser, bb-task-numbers, bb-exercise-contract
:::
```
