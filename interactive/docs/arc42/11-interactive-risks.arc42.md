# Risks and Technical Debt

The interactive archetype's risks, besides the generic ones, highest first.

## Time Is Not Replayed by Playthroughs

A playthrough holds only inputs. The build never calls `tick`, so what a core does over time (a letter not typed in time,
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

## Only Keys Reach the Core

The core's input is decided as a typed input (`dec-typed-input`), but the runtime passes only keys: `Core.step` in
`runtime/interactive/contract.ts` takes `key: string`, a playthrough step holds `keys`, the shell listens to
`keydown` and steps the keys the root component emits (`runtime/interactive/interactive.ts`). An app with touch or
gestures must disguise them as keys, and its playthroughs cannot record them.

```arc42
:::risk
id: risk-input-only-keys
title: Only keys reach the core
severity: medium
mitigation: Technical debt; give contract.ts a typed input (key, pointer or touch action, extensible), pass it through the shell, the root component's input event, the playthrough schema and both players. Until then components map pointer and touch to keys.
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

## Skill lernapps-interactive Not Merged

The skill `lernapps-interactive` is provided in the tooling pull request
[lernapps/tooling#90](https://github.com/lernapps/tooling/pull/90): the principles of an interactive app's code, the
advice on low stimulation (no flashing, calm motion, sound off by default, and why), which is advice for the
creator's assistant, not a rule or check, and what is not built yet. Until it is merged, the skill `lernapps-app`
applies alone; the risk ends when it merges. A settings dialog (less motion, sound, pause) is not in scope
(`dec-no-settings`).

```arc42
:::risk
id: risk-interactive-skill-missing
title: Skill lernapps-interactive not merged yet
severity: low
mitigation: Merge lernapps/tooling#90, which provides skills/lernapps-interactive; then remove this risk. Until then lernapps-app applies.
:::
```
