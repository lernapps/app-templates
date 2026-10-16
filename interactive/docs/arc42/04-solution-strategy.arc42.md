# Solution Strategy

Opinionated where it makes the rules checkable, free where the learning happens: a fixed frame (the interactive
runtime and the tooling helpers) that the app does not change, and a free app inside it, written by the creator's
assistant against a few small contracts that the build, the browser tests and `lernapps check` verify.

```arc42
:::solution-strategy
id: strategy-fixed-frame-free-app
title: Fixed, checked frame around a free app
addresses: qg-privacy, qg-checkable, qg-accessibility, qg-small, qg-understandable
:::
```

| Quality goal | Approach |
| --- | --- |
| `qg-privacy` | Static pages without a server; libraries, fonts and data bundled; state only through the storage wrapper on the device; component rules and lint rules forbid network APIs; `lernapps check` sees no request before a click. |
| `qg-checkable` | A pure core, deterministic by its seed, behind the contract `start`, `step`, `tick`; playthroughs as data, played twice at build and again in the browser. |
| `qg-accessibility` | The shell renders the start page (readable without JavaScript) and the app page; the UI uses the announcer and focus helpers; axe and 360 px are checked on the built app; an app that cannot meet them declares its limits in its entry. |
| `qg-small` | A size budget of 100 kB gzip for the app's own code, failing the build; a storage quota of 100 kB per app (decided, not built). |
| `qg-understandable` | Fixed folders and contracts, so the app's own building blocks go below core, UI and data; the architecture in `docs/arc42/`, English and minimal, kept current with each increment. |

## System decomposition

Three parts: the runtime (`bb-runtime`) builds the pages, runs the build checks and, as the shell, mounts the app, holds
its state, routes keys and pointer input to the core, ticks the clock every 20 ms and reads the route and seed from the
address; the tooling helpers (`bb-tooling`) give preset, lint rules, `lernapps check`, storage, i18n and a11y; the app
(`bb-app`) is only its description, core, UI, data, messages and playthroughs. The core is pure TypeScript without DOM
and its state plain JSON, so the same playthrough plays in Node and in the browser (`concept-core-and-shell`,
`concept-determinism`, `concept-playthroughs`).

## Technology and communication approach

Vue with TypeScript on vite-plus is fixed (`con-vue-typescript`), so one set of component rules holds for every app; the
rendering (DOM, SVG, canvas) and the game logic stay free. Every page is rendered at build and served statically
(`con-frontend-only`); modes and levels are hash routes, so the app overview can link to them. The app talks to nothing
outside the browser; anything that would leave the device, such as a tutor handoff, waits for a click
(`con-no-request-before-click`). The form of the optional tutor is open.

## Operational approach

Rules are checked by machine, not by review: the build fails on a broken description, a core that breaks its contract
or plays differently twice, a component that breaks the component rules, or code over the size budget; the browser
tests and `lernapps check` run before a push. The runtime and tooling reach the app as dependency updates, never as
edits (`con-runtime-unchanged`). The architecture is kept current in `docs/arc42/` (`con-architecture-current`); its
pre-commit diff and validation are decided but not built yet.

OPEN: Is the "client-side AI tutor" a handoff to the learner's own assistant (as in the explainer) or a model running
in the browser?

OPEN: The size budget's scope: the decided sketch counts the whole app including libraries, the build counts only
`src/`. Which holds?
