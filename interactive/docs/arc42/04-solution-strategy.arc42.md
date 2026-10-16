# Solution Strategy

- **A pure core under a runtime.** The app's logic is a pure core; the runtime holds its state, feeds it keys and
  time, and lets the components only show the state. Playthroughs replay the core without a browser (`qg-replayable`).
- **Describe statically, run on the client.** What the app does is built into a static start page from
  `src/app.yaml`; everything else runs on the client, with nothing sent anywhere before a click (`qg-privacy`,
  `qg-accessible-or-declared`).

```arc42
:::solution-strategy
id: strategy-pure-core-static-description
title: A pure core under a runtime, a static description, everything on the client
addresses: qg-privacy, qg-replayable, qg-accessible-or-declared
:::
```
