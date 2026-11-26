# Runtime View

The interactive archetype's own scenarios, besides the generic ones.

## Playing on the app page

The learner opens the app page, possibly with a seed, a route or data from another app in the address.
The app starts in that round and route; without a seed it starts a random round.
The learner plays with keys, pointer or touch. Each input changes the state, and the app shows the new state.
When the app moves on its own, its state changes with time too.
A route link starts the same round in another mode or level.
The language switch opens the same round in the other language.
Texts follow the page's language, and screen readers announce changes.

```arc42
:::runtime-scenario
id: scenario-play
title: Playing on the app page (input, ticks, route change)
trigger: The learner opens the app page, gives an input, or follows a route link
involves: bb-render, bb-shell, bb-interactive-core, bb-interactive-data, bb-interactive-ui, bb-interactive-messages, bb-tooling
:::
```

## Building with the playthroughs

The creator, a git hook or CI runs the build. It checks the description, the playthroughs and the UI.
It checks that the core keeps its contract and that every route starts.
It plays every playthrough twice and compares both plays with each other and with the expected states.
Only when all of this passes does it write the pages.

```arc42
:::runtime-scenario
id: scenario-interactive-build
title: Building with the playthroughs
trigger: The creator, a git hook or CI runs the build
involves: bb-build, bb-validation, bb-component-rules, bb-interactive-description, bb-interactive-core, bb-interactive-playthroughs, bb-render, bb-runtime-texts
:::
```

## Browser playthroughs

Before a push and in CI, the end-to-end tests check both pages without JavaScript in every language.
Then they play each playthrough in the browser at its address, with no time passing but its ticks.
After each step they compare the state and the announcement with the expected ones.
They also check that a route change and back gives the starting state again.
In an app with more languages they check that the other language shows the same state.

```arc42
:::runtime-scenario
id: scenario-browser-playthroughs
title: Browser playthroughs in the end-to-end tests
trigger: The pre-push hook or CI runs lernapps check --pre-push
involves: bb-e2e, bb-interactive-description, bb-interactive-playthroughs, bb-shell, bb-interactive-core, bb-interactive-ui, bb-runtime-texts, bb-tooling
:::
```

<!-- app: begin -->
<!-- app: end -->
