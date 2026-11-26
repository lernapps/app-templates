# Runtime View

Six scenarios that every app shares. Each extension adds its archetype's own scenarios.

## Opening the pages

A learner, teacher or parent opens the app's address. The host serves static pages that the build rendered. What a
page shows without JavaScript depends on the archetype. The language switch is a plain link to the same page in the
other language. An unknown address gets the 404 page, which leads to the start page.

```arc42
:::runtime-scenario
id: scenario-pages
title: Opening the pages
trigger: A learner, teacher or parent opens the app's address
involves: bb-render, bb-runtime
:::
```

## Learning in the browser

The page starts the archetype's code. Where the archetype draws at random, it takes the seed from the address. The
code shows the learner's progress and announces changes to screen readers. Its texts are in the page's language.

```arc42
:::runtime-scenario
id: scenario-learn
title: Learning in the browser
trigger: The learner opens a page with JavaScript and answers, practises or plays
involves: bb-shell, bb-tooling
:::
```

## Remembering on the device, storage blocked or full

The app loads and saves values through the storage wrapper. When storage is blocked or full, loading gives nothing
and saving fails. The app keeps working and remembers nothing.

```arc42
:::runtime-scenario
id: scenario-device-storage
title: Remembering on the device, storage blocked or full
trigger: The archetype's code loads or saves a value
involves: bb-shell, bb-tooling
:::
```

## Working with the skills

The creator's assistant loads the app's skills. It writes what the archetype allows and runs `lernapps check`.
`lernapps update` brings new versions of the platform's skills.

```arc42
:::runtime-scenario
id: scenario-skills
title: Working with the skills
trigger: The creator's assistant starts work on the app
involves: bb-skills, bb-tooling
:::
```

## Building with the checks

The build first validates what the creator wrote and runs the archetype's checks. Only then does it write every page
in every language. Any problem fails the build with one line per problem.

```arc42
:::runtime-scenario
id: scenario-build
title: Building with the checks
trigger: The creator, a git hook or CI runs the build
involves: bb-tooling, bb-archetype-runtime, bb-build, bb-validation, bb-render, bb-runtime-texts, bb-runtime
:::
```

## End-to-end tests before a push

The pre-push hook and CI serve the built app and run the archetype's tests in a browser, at desktop width and at
360 px. The test cases come from what the creator wrote. `lernapps check` also tests accessibility, width and requests
on every page it visits.

```arc42
:::runtime-scenario
id: scenario-e2e
title: End-to-end tests before a push
trigger: The pre-push hook or CI runs lernapps check --pre-push
involves: bb-tooling, bb-e2e, bb-render, bb-shell, bb-runtime-texts
:::
```
