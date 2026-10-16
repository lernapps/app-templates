# Risks and Technical Debt

<!--
Arc42 chapter 11. Document known risks and areas of technical debt ordered by priority.
Risk management is about making technical risks visible to the people who need to act on them.

A risk is a known threat whose severity has not yet been fully mitigated.
Technical debt is a shortcut taken consciously or accidentally whose cost will have to be
paid later. Both belong here.

For each risk or debt item, write a ## section with a prose paragraph describing the risk,
its cause, its potential impact, and the current situation, followed by a DSL block.

The `mitigation` field describes the planned or accepted response. Even "accepted without
action until X" is a valid mitigation — it shows the team made a conscious choice.

Order entries by priority — highest risk first.

See https://docs.arc42.org/section-11/ for further guidance.

Example:

## No Automated Performance Regression Tests

The performance quality goal has no automated gate in CI. Performance regressions can be
introduced without detection until a production incident occurs.

```arc42
:::risk
id: risk-no-perf-tests
title: No Automated Performance Regression Tests
severity: high
mitigation: Add k6 load test suite as a nightly CI job with a p95 threshold gate.
:::
```
-->

Risks and debt of the frame every interactive app shares, highest first. An app adds its own below these.

## Time Is Not Replayed by Playthroughs

A playthrough holds only keys. The build never calls `tick`, so what a core does over time (a letter not typed in time,
letters flying across the screen) is not checked there; in the browser the clock runs in real time between key
presses, so a playthrough of a real-time core depends on how fast the test types. The pilot, a real-time typing game,
puts the most pressure on exactly this.

```arc42
:::risk
id: risk-time-not-replayed
title: Time is not replayed by playthroughs
severity: high
mitigation: Accepted for now; tick logic is tested only by the app's own unit tests. OPEN: whether playthroughs get a step that lets time pass, played as ticks in the build and in the browser.
:::
```

## Declared Accessibility Limits Not Built

An app may declare its limits in its entry and then get warnings instead of errors from `accessible` and
`usable-at-360px`; neither the entry field nor the warnings exist yet, so an app that deviates (a game against the
clock) fails `lernapps check` today.

```arc42
:::risk
id: risk-accessibility-limits-not-built
title: Declared accessibility limits not built
severity: medium
mitigation: Planned in the sketch (tooling step 2, lernapps/apps step 3); until then an app keeps both rules or cannot be listed.
:::
```

## Storage Quota Not Built

The quota of 100 kB per app is decided, but the storage wrapper has no limit: `save` succeeds until the browser
refuses, so one app can fill the origin's shared 5 MiB.

```arc42
:::risk
id: risk-storage-quota-not-built
title: Storage quota of 100 kB not built
severity: medium
mitigation: Build the quota into the tooling's storage wrapper, so that save refuses beyond 100 kB per app; until then no template app stores anything.
:::
```

## Shared Origin Storage

Every app on lernapps.net shares one origin and so one `localStorage`. A learner who clears the site's data, or a
browser that evicts it, loses what every app remembered, and an app that picks another app's storage name reads and
overwrites its values.

```arc42
:::risk
id: risk-shared-origin-storage
title: Storage shared by every app of the origin
severity: medium
mitigation: Accepted: apps keep only small data that may be lost, under their own prefix, and keep working with nothing remembered; the quota limits what one app takes.
:::
```

## Tutor Not Built

The optional tutor is part of the frame but undecided (handoff or model in the browser) and built only for the
explainer, so an interactive app has no tutor and nothing tells it how one will fit.

```arc42
:::risk
id: risk-tutor-not-built
title: Tutor undecided and not built
severity: medium
mitigation: The owner decides the variant (dec-tutor-variant); until then apps add no tutor of their own.
:::
```

## arc42 Checks Not Wired

The architecture is meant to be kept current by `arc42 diff --staged --strict` before a commit and `arc42 validate` in
`lernapps check`; neither is wired into an app yet, so architecture and code can drift unnoticed.

```arc42
:::risk
id: risk-arc42-checks-not-wired
title: arc42 checks not wired into the app
severity: medium
mitigation: Planned in the sketch (tooling step 2); until then the review reads the architecture against the code.
:::
```

## Size Budget Scope Contradiction

The sketch puts bundled libraries inside a size budget for the whole app; the build counts only the app's own code in
`src/`. A large library can make an app slow on school devices without failing the build.

OPEN: Which holds: should Vue, the runtime and bundled libraries count against a budget too?

```arc42
:::risk
id: risk-size-budget-scope
title: Size budget scope contradicts the sketch
severity: low
mitigation: The owner decides the scope; until then the build checks the app's own code only.
:::
```

## Core Property Tests Not Built

The sketch has the build run the core's property tests over fixed seeds; the build plays only the playthroughs, so a
core is checked for the seeds its playthroughs name and no others.

```arc42
:::risk
id: risk-no-core-property-tests
title: Core property tests over fixed seeds not built
severity: low
mitigation: Accepted for now; the build checks determinism with every playthrough played twice.
:::
```
