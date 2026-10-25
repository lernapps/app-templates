// The type of a single-file component, for src/main.ts, which imports the root component.
declare module "*.vue" {
  import type { Component } from "vue";
  const component: Component;
  export default component;
}
