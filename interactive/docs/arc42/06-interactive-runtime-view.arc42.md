# Runtime View

The interactive archetype's own scenarios, besides the generic ones.

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
involves: bb-interactive-app-page, bb-interactive-main, bb-state-holder, bb-seed, bb-hash-router, bb-input-router, bb-clock, bb-interactive-core, bb-interactive-data, bb-interactive-ui, bb-interactive-messages, bb-i18n, bb-a11y
:::
```

## Building with the playthroughs

The `interactive()` plugin validates `src/app.yaml` and the playthroughs, checks the components, loads the core in a
Vite server of its own, checks its exports and that every route starts, and plays every playthrough twice without
ticks, comparing the two plays and the expected states, before it writes the start page and the app page.

```arc42
:::runtime-scenario
id: scenario-interactive-build
title: Building with the playthroughs
trigger: The creator, a git hook or CI runs the build
involves: bb-interactive-validation, bb-component-rules, bb-core-check, bb-build-playthroughs, bb-interactive-core, bb-interactive-playthroughs, bb-interactive-start-page, bb-interactive-app-page
:::
```

## Browser playthroughs

`interactiveTests()` checks the start page and the app page without JavaScript in every language, then opens each
playthrough at `app/?seed=<seed>#<route>`, presses its keys and compares, after each step, the state read from
`lernappsState` and the announcement of the polite live region.

```arc42
:::runtime-scenario
id: scenario-browser-playthroughs
title: Browser playthroughs in the end-to-end tests
trigger: The pre-push hook or CI runs lernapps check --pre-push
involves: bb-browser-playthroughs, bb-interactive-playthroughs, bb-state-holder, bb-seed, bb-hash-router, bb-input-router, bb-interactive-core, bb-interactive-ui, bb-a11y
:::
```
