// The blocks that show content (@lernapps/app-templates/blocks): see block.ts, validate.ts and render.ts.
export * from "./block.ts";
export { highlight, type CodeLanguage } from "./code.ts";
export { bar, hundredGrid } from "./figures.ts";
export { renderCredit, renderMaterial, type MaterialContext } from "./render.ts";
export {
  checkMaterial,
  MATERIAL_DEFINITIONS,
  type AppChecks,
  type BlockChecks,
  type BlockLink,
  type BlockProblem,
} from "./validate.ts";
