# Solution Strategy

Fixed where it makes the rules checkable, free where the learning happens. A fixed frame of runtime and tooling
surrounds the archetype's part, and the app does not change the frame. For the quiz and the explainer, the runtime
ships the whole part; the creator only writes data. An interactive app's part is free code against a few small
contracts. Machines check all three.

```arc42
:::solution-strategy
id: strategy-fixed-frame-free-app
title: Fixed, checked frame around the archetype's part
addresses: qg-privacy, qg-checkable, qg-accessibility, qg-understandable
:::
```

| Quality goal | Approach |
| --- | --- |
| `qg-privacy` | Static pages, no server; everything bundled; state only on the device; checks forbid network access before a click. |
| `qg-checkable` | The creator writes data under a schema or code under a contract; the build validates it; tests derive their cases from it; seeds make random parts replayable. |
| `qg-accessibility` | The runtime renders the pages and brings accessibility helpers; `lernapps check` tests WCAG and 360 px; deviations are declared. |
| `qg-understandable` | One generic architecture and one extension per archetype, in English and minimal; fixed folders and contracts. |

## System decomposition

The generic part has three roots: the shared runtime, the tooling helpers and the skills. Each archetype's extension
adds its own runtime and the parts the creator writes. An interactive app can add its own blocks below these.

## Technology and communication approach

TypeScript on vite-plus, and Vue for an app's own components (`con-vue-typescript`). The build renders every page,
and a static host serves it (`con-frontend-only`). Deep links and seeds live in the address, so the app overview can
link to them. The app talks to nothing outside the browser. Anything that would leave the device waits for a click
(`con-no-request-before-click`).

## Operational approach

Machines check the rules, not reviewers. The build fails on content or code that breaks the archetype's schema or
contract. The end-to-end tests and `lernapps check` run before a push. Runtime and tooling reach the app as dependency
updates (`con-runtime-unchanged`). The architecture is kept current in `docs/arc42/` (`con-architecture-current`).
