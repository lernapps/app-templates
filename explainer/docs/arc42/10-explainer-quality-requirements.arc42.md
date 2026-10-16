# Quality Requirements

The explainer's goal and scenarios, besides the generic ones.

## Readable without JavaScript (explainer)

An explainer is text-heavy, so every page is complete without JavaScript: text, formulas, figures, the navigation,
every exercise with its solution and every component's `nojs` text (`dec-explainer-complete-without-js`); realised by
the page rendering and checked by `lernapps check` and the explainer's end-to-end tests.

OPEN: Confirm the priority (medium is a proposal).

```arc42
:::quality-goal
id: qg-explainer-readable-without-js
title: Readable without JavaScript (explainer)
priority: medium
:::
```

## Every page complete without JavaScript

`lernapps check` opens every page the runtime marks as an explainer page a second time with JavaScript off, on the
bundle and on the deployed app (rule `explainer-readable-without-js`).

```arc42
:::quality-scenario
id: qs-explainer-without-js
title: Every explainer page is complete without JavaScript
quality: qg-explainer-readable-without-js
stimulus: lernapps check visits every explainer page of the built or deployed app with JavaScript off
response: A page without its h1, a hidden heading, formula or figure, an empty "Lösung" or an empty nojs text is an error
metric: 0 findings of explainer-readable-without-js on every page, in every language
:::
```

## Generated exercises are sound

The build runs each generated exercise and each exercise component's logic over fixed seeds.

```arc42
:::quality-scenario
id: qs-explainer-property-test
title: A generated exercise passes its property test
quality: qg-checkable
stimulus: The build draws the tasks of fixed seeds of each generated exercise and exercise component
response: A task that differs for the same seed, a solution the check rejects, a wrong answer it accepts or a throw fails the build
metric: 50 fixed seeds per exercise component block, every one passes
:::
```
