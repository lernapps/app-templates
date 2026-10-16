// Vue at build time, shared by the build steps of the archetypes with Vue components (the explainer, the interactive
// archetype): vue resolved to the copy this runtime depends on, so that an app's components and the runtime share one
// Vue, the options of @vitejs/plugin-vue, and a Vite server of its own that loads an app's modules for Node.
import { createRequire } from "node:module";
import { dirname } from "node:path";
import type { Alias } from "vite-plus";

const require = createRequire(import.meta.url);
/** vue, and vue/<path>, resolved to the copy this runtime depends on. */
export const vueAlias = (): Alias[] => [
  { find: /^vue(?=$|\/)/, replacement: dirname(require.resolve("vue/package.json")) },
];
/** The options of @vitejs/plugin-vue: a component's scope id from its file and source alone, the same in the build and
 * in the server that renders it. */
export const VUE_OPTIONS = { features: { componentIdGenerator: "filepath-source" } } as const;

/** Loads a module of an app for Node, by its id from the app's root (/src/core/index.ts). */
export type Load = (id: string) => Promise<Record<string, unknown>>;

/** Loads modules of the app in `root` for Node in a Vite server of its own, with the components compiled for it. */
export async function withServer<T>(root: string, act: (load: Load) => Promise<T>): Promise<T> {
  const [{ createServer }, { default: vue }] = await Promise.all([import("vite-plus"), import("@vitejs/plugin-vue")]);
  const server = await createServer({
    root,
    configFile: false,
    logLevel: "silent",
    plugins: [vue(VUE_OPTIONS)],
    resolve: { alias: vueAlias() },
    appType: "custom",
    server: { middlewareMode: true, hmr: false, ws: false, watch: null },
    optimizeDeps: { noDiscovery: true, include: [] },
  });
  try {
    return await act((id) => server.ssrLoadModule(id));
  } finally {
    await server.close();
  }
}
