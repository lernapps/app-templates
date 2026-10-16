# Runtime View

The interactive archetype's own scenarios, besides the generic ones.

## Playing on the app page

The learner opens `app/`, possibly with `?seed=<n>` and `#<route>`. `src/main.ts` calls `startInteractive`, which
takes the seed from the address (else a random one) and the route from the hash (else the first route), starts the
core and mounts the root component with the state and the page's language. Decided: components translate any device
input (keys, pointer, touch, …) into typed inputs for `step` (`dec-typed-input`). Today every input is a key
(`risk-input-only-keys`): the shell gives every key typed on the page to `step`, except keys on links, buttons and
form fields or with Ctrl, Alt or Meta, and steps every key the root component emits as `input`; a key that changes the
state loses its default. When the core
has `tick`, the shell calls it every 20 ms. A new route in the hash starts the core again with the same seed and marks
the current route link. The components only show the state, take their texts through the translator and announce
changes through the live region.

```arc42
:::runtime-scenario
id: scenario-play
title: Playing on the app page (input, ticks, route change)
trigger: The learner opens the app page, gives an input, or follows a route link
involves: bb-render, bb-shell, bb-interactive-core, bb-interactive-data, bb-interactive-ui, bb-interactive-messages, bb-tooling
:::
```

## Building with the playthroughs

The `interactive()` plugin validates `src/app.yaml` and the playthroughs, runs the component rules on the UI, loads
the core in a Vite server of its own, checks its exports and that every route starts, and plays every playthrough
twice without ticks, comparing the two plays and the expected states, before it writes the start page and the app
page with the runtime's texts.

```arc42
:::runtime-scenario
id: scenario-interactive-build
title: Building with the playthroughs
trigger: The creator, a git hook or CI runs the build
involves: bb-build, bb-validation, bb-component-rules, bb-interactive-description, bb-interactive-core, bb-interactive-playthroughs, bb-render, bb-runtime-texts
:::
```

## Browser playthroughs

`interactiveTests()` checks the start page and the app page without JavaScript in every language, then opens each
playthrough at `app/?seed=<seed>#<route>`, gives its inputs (today keys, pressed on the keyboard) and compares, after
each step, the state read from `lernappsState` and the announcement of the polite live region.

```arc42
:::runtime-scenario
id: scenario-browser-playthroughs
title: Browser playthroughs in the end-to-end tests
trigger: The pre-push hook or CI runs lernapps check --pre-push
involves: bb-e2e, bb-interactive-description, bb-interactive-playthroughs, bb-shell, bb-interactive-core, bb-interactive-ui, bb-runtime-texts, bb-tooling
:::
```
