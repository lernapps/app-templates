// The audio files of an explainer and its media overview (media.ts, dec-audio-metadata): src/audio/ holds MP3 files that
// carry their marking, a file without it stops the build with the place and what to do, the overview "Medienübersicht"
// lists every image, audio file and video with its credit, names an AI voice as such and links the pages that use it.
import { cpSync, copyFileSync, existsSync, mkdirSync, mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, test } from "vite-plus/test";
import { build } from "vite-plus";
import { explainer } from "../runtime/explainer/plugin.ts";
import { ContentError, loadSite } from "../runtime/explainer/load.ts";
import { mediaOf } from "../runtime/explainer/media.ts";
import { renderPage } from "../runtime/explainer/render.ts";
import { routes } from "../runtime/explainer/routes.ts";

const fixtures = join(import.meta.dirname, "fixtures");

/** An app's root with the all-blocks content as src/, and the audio files `audio` (fixture names) in src/audio/. */
function app(audio: Record<string, string> = {}): string {
  const root = mkdtempSync(join(tmpdir(), "explainer-media-"));
  cpSync(join(fixtures, "explainer-all-blocks"), join(root, "src"), { recursive: true });
  if (Object.keys(audio).length > 0) mkdirSync(join(root, "src/audio"));
  for (const [name, from] of Object.entries(audio))
    copyFileSync(join(fixtures, "audio", from), join(root, "src/audio", name));
  return root;
}

const problemsOf = (root: string): readonly string[] => {
  try {
    loadSite(root, 0);
  } catch (error) {
    if (error instanceof ContentError) return error.problems;
    throw error;
  }
  return [];
};

describe("src/audio/", () => {
  test("a marked file is read, with its marking", () => {
    const site = loadSite(app({ "je-mappelle.mp3": "je-mappelle.mp3" }), 0);
    const file = site.audio.get("audio/je-mappelle.mp3");
    expect(file?.meta.text).toBe("Je m'appelle Marie.");
    expect(file?.meta.synthetic).toBe(true);
  });

  test("an app without audio has none", () => {
    expect(loadSite(app(), 0).audio.size).toBe(0);
  });

  test("a file without a frame stops the build: its place, the frame and what to do", () => {
    const problems = problemsOf(app({ "sans-texte.mp3": "sans-texte.mp3" }));
    expect(problems).toHaveLength(1);
    expect(problems[0]).toMatch(/^src\/audio\/sans-texte\.mp3: lernapps-text is missing; .*lernapps-audio/);
  });

  test("a file without any tag stops the build with one line", () => {
    expect(problemsOf(app({ "sans-balises.mp3": "sans-balises.mp3" }))).toEqual([
      "src/audio/sans-balises.mp3: has no ID3 tag, so it carries no marking",
    ]);
  });

  test("a wrong file name or a file that is no audio file is named", () => {
    const root = app({ "Je-Mappelle.mp3": "je-mappelle.mp3" });
    writeFileSync(join(root, "src/audio/notes.txt"), "x");
    const problems = problemsOf(root);
    expect(problems.some((problem) => problem.startsWith("src/audio/Je-Mappelle.mp3: not an audio file"))).toBe(true);
    expect(problems.some((problem) => problem.startsWith("src/audio/notes.txt: not an audio file"))).toBe(true);
  });
});

describe("the media overview", () => {
  const withAudio = () => loadSite(app({ "je-mappelle.mp3": "je-mappelle.mp3" }), 0);

  test("every language has the page, and an app without media has none", () => {
    const paths = routes(withAudio())
      .filter((route) => route.kind === "media")
      .map((route) => route.path);
    expect(paths).toEqual(["medien/", "en/medien/"]);
    const none = loadSite(app(), 0);
    const bare = { ...none, audio: new Map(), chapters: [] };
    expect(routes(bare).some((route) => route.kind === "media")).toBe(false);
  });

  test("it lists images, audio and videos once each, in order of use, with their pages", () => {
    const items = mediaOf(withAudio());
    expect(items.map((item) => item.kind)).toEqual(expect.arrayContaining(["image", "audio", "video"]));
    const names = items.flatMap((item) => (item.kind === "image" ? [item.name] : []));
    expect(new Set(names).size).toBe(names.length);
    expect(items.find((item) => item.kind === "audio")?.uses).toEqual([]);
    expect(items.find((item) => item.kind === "image")?.uses.length).toBeGreaterThan(0);
  });

  test("the page names an AI voice as such, with model, voice, licence and text, and links to the start page", () => {
    const site = withAudio();
    const page = routes(site).find((route) => route.kind === "media");
    if (page === undefined) throw new Error("no media page");
    const html = renderPage(site, page).body;
    expect(html).toContain("<h1>Medienübersicht</h1>");
    expect(html).toContain('<span class="explainer-ai-voice">KI-Stimme</span>');
    expect(html).toContain("Modell test-fixture, Stimme test-tone. Erzeugt am 2026-11-12.");
    expect(html).toContain("Lizenz: CC BY-SA 4.0.");
    expect(html).toContain('<audio controls preload="none" src="../audio/je-mappelle.mp3"');
    expect(html).toContain('<span lang="fr">Je m\'appelle Marie.</span>');
    expect(html).toContain("Auf keiner Seite verwendet.");
    expect(html).toMatch(/<h2>Bilder<\/h2>/);
    expect(html).toMatch(/<h2>Videos<\/h2>/);
    expect(html).toContain("https://www.youtube.com/watch?v=");
    expect(html).not.toContain("<iframe");
    const start = renderPage(site, routes(site)[0]!).body;
    expect(start).toContain('<a href="medien/">Medienübersicht</a>');
    const english = routes(site).find((route) => route.kind === "media" && route.lang === "en");
    expect(renderPage(site, english!).body).toContain("<h1>Media overview</h1>");
  });
});

describe("the build", () => {
  test("writes the audio file next to the pages and the overview in every language", async () => {
    const root = app({ "je-mappelle.mp3": "je-mappelle.mp3" });
    writeFileSync(
      join(root, "index.html"),
      '<!doctype html>\n<html lang="de">\n  <head>\n    <meta charset="utf-8" />\n    <script type="module" src="/src/main.ts"></script>\n  </head>\n  <body>\n    <!-- explainer -->\n  </body>\n</html>\n',
    );
    writeFileSync(join(root, "src/main.ts"), 'document.documentElement.dataset["js"] = "on";\n');
    await build({ root, base: "./", logLevel: "silent", configFile: false, plugins: [explainer()] });
    const bytes = readFileSync(join(root, "dist/audio/je-mappelle.mp3"));
    expect(bytes.equals(readFileSync(join(fixtures, "audio/je-mappelle.mp3")))).toBe(true);
    for (const path of ["medien/index.html", "en/medien/index.html"]) {
      expect(existsSync(join(root, "dist", path)), path).toBe(true);
    }
    expect(readFileSync(join(root, "dist/medien/index.html"), "utf8")).toContain("KI-Stimme");
  }, 60_000);
});
