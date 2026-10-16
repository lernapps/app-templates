# Risks and Technical Debt

The interactive archetype's risks, besides the generic ones, highest first.

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
mitigation: Playthroughs get a time step that lets n ticks pass, played in the build and in the browser (decided, not built yet); until then tick logic is tested only by the app's own unit tests.
:::
```

## Size Budget Left in the Build

The app's size is not limited, but `runtime/interactive/plugin.ts` still fails the build when the app's own code is
over `SIZE_BUDGET` = 100 kB gzip, so a large app cannot be built today.

```arc42
:::risk
id: risk-size-budget-left
title: SIZE_BUDGET still in the build plugin
severity: low
mitigation: Technical debt; remove SIZE_BUDGET and its check from runtime/interactive/plugin.ts.
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
mitigation: Planned; until then the build checks determinism with every playthrough played twice.
:::
```
