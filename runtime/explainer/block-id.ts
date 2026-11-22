// The address of a block on a content page, which the build writes on the block's wrapper (render.ts) for the
// feedback mode (feedback-client.ts): its position, the ids of the sections it is in and its place among the blocks
// there, from 1, through the boxes it is in ("regel/3", "regel/4/1"; "2" before the first section), and its id, a short
// hash of its source: the block as the content gives it, in every language, its keys sorted. The id stays when blocks
// are added before it and changes when the block itself changes; two equal blocks on a page share it, their positions
// tell them apart. Build code: it needs Node.
import { createHash } from "node:crypto";

/** `value` as JSON with the keys of every object sorted, so that the order in the YAML does not count. */
export function canonical(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map((item) => canonical(item ?? null)).join(",")}]`;
  if (typeof value === "object" && value !== null) {
    const entries = Object.entries(value)
      .filter(([, item]) => item !== undefined && typeof item !== "function")
      .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0))
      .map(([key, item]) => `${JSON.stringify(key)}:${canonical(item)}`);
    return `{${entries.join(",")}}`;
  }
  return JSON.stringify(value) ?? "null";
}

/** The id of a block: the first 8 hexadecimal digits of the SHA-256 of its canonical JSON. */
export const blockId = (block: unknown): string =>
  createHash("sha256").update(canonical(block)).digest("hex").slice(0, 8);

/** The position of the block at `place` (from 1) among the blocks under `at` (section ids and places of boxes). */
export const blockPosition = (at: readonly (string | number)[], place: number): string => [...at, place].join("/");
