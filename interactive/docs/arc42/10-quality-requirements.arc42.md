# Quality Requirements

The five quality goals chapter 1 proposes, in its order, each made testable by scenarios from the runtime, the tooling
and the decided sketch. Scenarios marked "not built yet" describe a decided check that does not exist today.

OPEN: The quality goals are agent inference from the decided sketch and the organisation rules; the owner has not
confirmed the set, the order or the ids, and no source gives their priorities. The `priority` of every goal below is
therefore left out until the owner sets it (high, medium or low).

## 10.1 Quality Goals

## Privacy

The app sends nothing anywhere and requests nothing from another server before a click; what it remembers stays on the
learner's device. The privacy notice of lernapps.net promises this for every app.

OPEN: Priority of `qg-privacy`?

```arc42
:::quality-goal
id: qg-privacy
title: Privacy
:::
```

## Checkable

The rules an app keeps are verified by machine, at build and in the browser, so that an assistant can change free code
and still learn at once when it breaks the frame.

OPEN: Priority of `qg-checkable`?

```arc42
:::quality-goal
id: qg-checkable
title: Checkable by machine
:::
```

## Accessibility

Start page and app page meet WCAG 2.1 AA and work at 360 px by default; an app that cannot declares its limits in its
entry.

OPEN: Priority of `qg-accessibility`?

```arc42
:::quality-goal
id: qg-accessibility
title: Accessibility by default
:::
```

## Small

An app loads fast and takes little: its own code within a size budget, its storage within a quota.

OPEN: Priority of `qg-small`?

```arc42
:::quality-goal
id: qg-small
title: Small
:::
```

## Understandable

An AI assistant that did not write the app can extend it, because its architecture is written down early, in English
and minimal, and kept current with the code.

OPEN: Priority of `qg-understandable`?

```arc42
:::quality-goal
id: qg-understandable
title: Understandable for the next assistant
:::
```

## 10.2 Quality Scenarios

## No request before a click

`lernapps check` visits every page of the built app, blocks and records requests to other hosts while it loads.

```arc42
:::quality-scenario
id: qs-no-request-before-click
title: No request to another host before a click
quality: qg-privacy
stimulus: lernapps check loads every page of the built app without clicking
response: Requests to other hosts are recorded; each one is an error of no-request-before-click
metric: 0 requests to another origin on every page before a click
:::
```

## State stays on the device

An app's code that uses the browser's storage directly, sets a cookie or calls a network API is reported by the lint
rules on commit and by the component rules at build.

```arc42
:::quality-scenario
id: qs-state-on-device
title: Remembered state stays on the device
quality: qg-privacy
stimulus: A component stores progress with localStorage directly or sends it with fetch
response: storage-through-wrapper or vue-component-no-network reports it; the build's component rules fail on the network call
metric: 0 findings; all storage goes through createStorage under the prefix lernapps:<app>:
:::
```

## The same keys play the same twice

At build, every playthrough is played against the core twice, without ticks; a core that draws from `Math.random` or
the clock gives different states.

```arc42
:::quality-scenario
id: qs-deterministic-core
title: The same keys give the same states
quality: qg-checkable
stimulus: The build plays a playthrough's seed, route and keys against the core twice
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
response: Each playthrough opens app/?seed=<seed>#<route>, presses its keys and compares the state and the polite announcement after each step
metric: Every expected state and announcement matches, with no console error, at desktop width and 360 px
:::
```

## No WCAG violation found by axe

`lernapps check` runs axe-core for WCAG 2.1 A and AA on each page it visits. For an app whose entry declares its limits
the finding should become a warning; that is not built yet, so it is an error for every app today.

```arc42
:::quality-scenario
id: qs-axe-clean
title: axe finds no WCAG 2.1 A or AA violation
quality: qg-accessibility
stimulus: lernapps check visits the start page and the app page of the built app
response: Each axe violation is reported as an error of accessible, naming the page and element
metric: 0 axe violations of WCAG 2.1 A or AA on every page
:::
```

## Usable at 360 px

`lernapps check` measures each page in a 360 px wide window; the start page meets it in any case.

```arc42
:::quality-scenario
id: qs-usable-at-360px
title: No page wider than 360 px
quality: qg-accessibility
stimulus: lernapps check opens every page of the built app in a 360 px wide window
response: A wider page is an error of usable-at-360px, naming the elements that are too wide
metric: Page width at most 360 px on every page
:::
```

## Size budget

The build gzips the app's own modules of `src/` in the built chunks together.

```arc42
:::quality-scenario
id: qs-size-budget
title: The app's own code stays within 100 kB
quality: qg-small
stimulus: The creator's assistant adds code or data to src/ and builds
response: Over the budget the build fails, naming the size and asking for less code or data in a smaller form
metric: At most 100 kB gzip for the app's own code in src/
:::
```

## Storage quota

Not built yet (owner, 2026-10-16): all apps share the 5 MiB of `localStorage` on lernapps.net, so `save` refuses
beyond 100 kB per app; today the wrapper has no limit.

```arc42
:::quality-scenario
id: qs-storage-quota
title: Saving beyond the quota is refused
quality: qg-small
stimulus: An app saves a value that would take its stored data beyond 100 kB
response: save returns false and stores nothing; the app keeps working
metric: At most 100 kB stored per app under its prefix
:::
```

## Code no block claims

Not built yet (decided sketch, step 12, section 4): before a commit, `arc42 diff --staged --strict` compares the staged
code with the architecture.

```arc42
:::quality-scenario
id: qs-architecture-current
title: New code without a building block fails the commit
quality: qg-understandable
stimulus: An assistant stages new code under src/ that no building block claims, or a block changed without its prose
response: arc42 diff --staged --strict fails the commit and names the unclaimed path or the block
metric: 0 unclaimed paths under src/ at every commit, in about 0.2 s
:::
```
