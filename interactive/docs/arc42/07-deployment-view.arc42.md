# Deployment View

## Static hosting

The checked bundle is published to GitHub Pages at `lernapps.net/<app>/`.

```arc42
:::deployment-node
id: dn-static-hosting
title: GitHub Pages
type: server
hosts: bb-start-page
:::
```

## Learner's browser

Runs the app page; the only storage is the browser's `localStorage`.

```arc42
:::deployment-node
id: dn-browser
title: Learner's browser
type: device
hosts: bb-shell, bb-core, bb-ui, bb-data, bb-tutor-bridge
:::
```

## Build

The creator's machine and CI build the bundle; the build checks run there, never in the learner's browser.

```arc42
:::deployment-node
id: dn-build
title: Build (creator's machine, CI)
type: environment
hosts: bb-build-checks, bb-playthroughs
:::
```
