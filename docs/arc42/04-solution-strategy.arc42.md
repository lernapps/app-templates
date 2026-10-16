# Solution Strategy

Opinionated where it makes the rules checkable, free where the learning happens: a fixed frame (the runtime of
`@lernapps/app-templates` and the tooling helpers) that the app does not change, and inside it the archetype's part.
The quiz and the explainer are generic: the runtime ships their whole part and the creator only feeds it with data.
An interactive app's part is free code against a few small contracts. The build, the end-to-end tests and
`lernapps check` verify all three.

```arc42
:::solution-strategy
id: strategy-fixed-frame-free-app
title: Fixed, checked frame around the archetype's part
addresses: qg-privacy, qg-checkable, qg-accessibility, qg-understandable
:::
```

| Quality goal | Approach |
| --- | --- |
| `qg-privacy` | Static pages without a server; libraries, fonts and data bundled; state only through the storage wrapper on the device; component rules and lint rules forbid network APIs; `lernapps check` sees no request before a click. |
| `qg-checkable` | What the creator writes is data under a JSON Schema or code under a contract; the build validates it and fails with one line per problem; each archetype's end-to-end tests derive their cases from it; seeds in the address make random parts replayable. |
| `qg-accessibility` | The runtime renders the pages and brings the announcer and focus helpers; axe and 360 px are checked on the built app; an app that cannot meet them declares its limits in its entry. |
| `qg-understandable` | One generic architecture and one extension per archetype, English and minimal; fixed folders and contracts, so an interactive app's own blocks go below its extension's. |

## System decomposition

Three generic roots, the shared runtime (`bb-runtime`: page trees, languages, examples check, Vue at build), the
tooling helpers (`bb-tooling`: preset, lint rules, `lernapps check`, storage, i18n, a11y) and the skills the app
commits (`bb-skills`); each
archetype's extension adds its runtime (`bb-archetype-runtime`, which builds the pages, runs the build checks, starts
the archetype's code in the browser in `bb-shell` and brings the end-to-end tests) and the parts the creator writes,
each a root of its own, so that an interactive app can add its own blocks below them.

## Technology and communication approach

TypeScript on vite-plus, and Vue for an app's own components (`con-vue-typescript`), so one set of component rules
holds. Every page is rendered at build and served statically (`con-frontend-only`); deep links and seeds live in the
address, so the app overview can link to them. The app talks to nothing outside the browser; anything that would leave
the device, such as the optional tutor handoff to the learner's own assistant, waits for a click
(`con-no-request-before-click`); no model runs in the browser.

## Operational approach

Rules are checked by machine, not by review: the build fails on content or code that breaks the archetype's schema or
contract; the end-to-end tests and `lernapps check` run before a push. The app's size is not limited; it is stated in
the app's catalog entry. The runtime and tooling reach the app as dependency updates, never as edits
(`con-runtime-unchanged`). The architecture is kept current in `docs/arc42/` (`con-architecture-current`); its
pre-commit diff and validation are decided but not built yet.
