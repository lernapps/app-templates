# Cross-cutting Concepts

## Deterministic core

All randomness comes from the seed; the core never reads time, the DOM or storage. The same seed, route and keys give
the same states, at build and in the browser.

```arc42
:::concept
id: concept-deterministic-core
title: Deterministic core
category: testability
:::
```

## State in the runtime

The runtime holds the one state; components receive it as a prop and send keys back. Nothing else keeps game state.

```arc42
:::concept
id: concept-state-in-runtime
title: State in the runtime
category: structure
:::
```

## Small storage

Progress and preferences go through the wrapper of `@lernapps/tooling/storage` under the app's prefix, within the
quota. When an app needs more, a second wrapper is added to this architecture.

```arc42
:::concept
id: concept-small-storage
title: Small storage on the device
category: privacy
:::
```

## No request before a click

Everything is bundled. Anything from another server, the tutor's assistant too, is reached only after the learner
clicks for it.

```arc42
:::concept
id: concept-no-request-before-click
title: No request before a click
category: privacy
:::
```
