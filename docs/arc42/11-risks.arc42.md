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

Risks and debt of the shared frame, highest first. Each extension adds its archetype's; an interactive app adds its
own.

## Declared Accessibility Limits Not Built

An app may declare accessibility limits and then get warnings instead of errors. Neither the declaration nor the
warnings exist yet. So an app that deviates, such as a game against the clock, fails `lernapps check` today.

```arc42
:::risk
id: risk-accessibility-limits-not-built
title: Declared accessibility limits not built
severity: medium
mitigation: Planned in the sketch (tooling step 2, lernapps/apps step 3); until then an app keeps both rules or cannot be listed.
:::
```

## Storage Quota Not Built

The quota of 100 kB per app is decided, but the storage wrapper has no limit. So one app can fill the storage that
all apps share.

```arc42
:::risk
id: risk-storage-quota-not-built
title: Storage quota of 100 kB not built
severity: medium
mitigation: Build the quota into the tooling's storage wrapper, so that save refuses beyond 100 kB per app; until then apps keep only small values (the quiz's last result, the explainer's chosen way to the tutor).
:::
```

## Shared Origin Storage

All apps on lernapps.net share one origin and so one storage. When a learner clears the site's data, every app
forgets. An app that uses another app's prefix can read and overwrite its values.

```arc42
:::risk
id: risk-shared-origin-storage
title: Storage shared by every app of the origin
severity: medium
mitigation: Accepted (owner): apps keep only small data that may be lost, under their own prefix, and keep working with nothing remembered; the quota limits what one app takes.
:::
```

## Tutor Not Built for Quiz and Interactive Apps

The tutor is decided (`dec-tutor-variant`) but built only for the explainer.

```arc42
:::risk
id: risk-tutor-not-built
title: Tutor handoff not built for quiz and interactive apps
severity: medium
mitigation: Build the handoff with the exercise contract and task numbers from the explainer's parts; until then apps add no tutor of their own.
:::
```

## arc42 Checks Not Wired

The arc42 checks are not wired into apps yet (`dec-arc42-in-app`). So architecture and code can drift unnoticed.

```arc42
:::risk
id: risk-arc42-checks-not-wired
title: arc42 checks not wired into the app
severity: medium
mitigation: Planned in the sketch (tooling step 2); until then the review reads the architecture against the code.
:::
```

