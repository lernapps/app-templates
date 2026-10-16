# Architecture Constraints

## Frontend only

The app is static files. There is no server of the app, and it sends no request to another server before a click.

```arc42
:::constraint
id: con-frontend-only
title: Static files, no request before a click
category: technical
source: lernapps.net organisation rules
:::
```

## Vue with TypeScript

Components are Vue single-file components in TypeScript, built with vite-plus, so that one set of build checks and
lint rules holds for every app. Canvas, SVG and bundled libraries are allowed inside a component.

```arc42
:::constraint
id: con-vue
title: Vue with TypeScript on vite-plus
category: technical
source: lernapps tooling, archetype interactive
:::
```

## Small storage on the device

The app keeps state only in memory or in `localStorage` through the tooling's wrapper, within 100 kB, because all apps
share the origin lernapps.net.

```arc42
:::constraint
id: con-small-storage
title: localStorage through the wrapper, 100 kB per app
category: technical
source: lernapps tooling, archetype interactive
:::
```
