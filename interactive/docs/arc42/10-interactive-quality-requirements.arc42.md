# Quality Requirements

The interactive archetype's scenarios, besides the generic ones.

<!-- at the top of the generic chapter -->
```arc42
:::ignore W006 two high-priority goals is the owner's decision (2026-10-16): privacy and checkable high; the interactive archetype adds no goal of its own
:::
```
<!-- end -->

## The same inputs play the same twice

At build, every playthrough is played against the core twice, with only the ticks its steps name; a core that draws
from `Math.random` or
the clock gives different states.

```arc42
:::quality-scenario
id: qs-deterministic-core
title: The same inputs give the same states
quality: qg-checkable
stimulus: The build plays a playthrough's seed, route and inputs against the core twice
response: The build fails with one line naming the first step whose state differs, or whose state differs from the expected one
metric: Both plays give identical states at every step and match every expected state, else the build fails
:::
```

## Playthroughs in the browser

`interactiveTests()` plays every playthrough at its address in the browser, at desktop width and at 360 px.

```arc42
:::quality-scenario
id: qs-playthrough-in-browser
title: Playthroughs play the same in the browser
quality: qg-checkable
stimulus: lernapps check --pre-push runs the e2e tests on the built app
response: Each playthrough opens app/?seed=<seed>#<route> on the test clock, gives its inputs and ticks and compares the state and the polite announcement after each step
metric: Every expected state and announcement matches, with no console error, at desktop width and 360 px
:::
```
