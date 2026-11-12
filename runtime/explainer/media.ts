// The media of an explainer, for its overview page "Medienübersicht" (medien/): every image, audio file and video the
// pages use, with where they come from and under which licence. For speech a model made, it names the model and the
// voice and says that it is AI-generated, as the file's own marking does (shared/audio.ts), so that anyone can check
// the quality and the credits in one place. Pure and without Node: the build writes the page from it.
import { allBlocks, type Block, type Chapter, type Page, type Site, type Text } from "./content.ts";
import type { AudioMeta } from "../shared/audio.ts";

/** A page that uses a medium. */
export interface PageRef {
  chapter: Chapter;
  page: Page;
}

export type MediaItem =
  | { kind: "image"; name: string; alt: Text; source?: Text; licence?: string; uses: PageRef[] }
  | { kind: "audio"; name: string; meta: AudioMeta; uses: PageRef[] }
  | { kind: "video"; youtube: string; title: string; channel: string; uses: PageRef[] };

/** The blocks of a block's material (a task's figures and tables), which are no blocks of the page. */
function materialOf(block: Block): readonly Block[] {
  return "material" in block && Array.isArray(block.material) ? (block.material as readonly Block[]) : [];
}

/** The names (audio/<name>.mp3) of the audio files a block uses, in order. */
export function audioOf(block: Block): string[] {
  const items = "items" in block && Array.isArray(block.items) ? (block.items as readonly { audio?: unknown }[]) : [];
  return items.flatMap((item) => (typeof item.audio === "string" ? [`audio/${item.audio}`] : []));
}

/** Every medium of the app, once, in the order of first use; audio files no page uses come last. */
export function mediaOf(site: Site): MediaItem[] {
  const items = new Map<string, MediaItem>();
  const use = (key: string, make: () => MediaItem, at: PageRef) => {
    const item = items.get(key) ?? make();
    items.set(key, item);
    if (!item.uses.some((ref) => ref.page === at.page)) item.uses.push(at);
  };
  for (const chapter of site.chapters) {
    for (const page of chapter.pages) {
      const at = { chapter, page };
      for (const outer of allBlocks(page.blocks)) {
        for (const block of [outer, ...materialOf(outer)]) {
          if ((block.type === "figure" || block.type === "labelled-figure") && block.image !== undefined) {
            const { image, alt, source, licence } = block;
            use(
              image,
              () => ({
                kind: "image",
                name: image,
                alt,
                ...(source === undefined ? {} : { source }),
                ...(licence === undefined ? {} : { licence }),
                uses: [],
              }),
              at,
            );
          } else if (block.type === "video") {
            const { youtube, title, channel } = block;
            use(`video:${youtube}`, () => ({ kind: "video", youtube, title, channel, uses: [] }), at);
          }
          for (const name of audioOf(block)) {
            const file = site.audio.get(name);
            if (file !== undefined) use(name, () => ({ kind: "audio", name, meta: file.meta, uses: [] }), at);
          }
        }
      }
    }
  }
  for (const [name, file] of site.audio) {
    if (!items.has(name)) items.set(name, { kind: "audio", name, meta: file.meta, uses: [] });
  }
  return [...items.values()];
}
