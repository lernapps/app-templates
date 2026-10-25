// The video block of an explainer (video.ts): a YouTube video behind two clicks. Its addresses: the page on YouTube
// for the link, the player of youtube-nocookie.com only for the click. The page as the build writes it: the title as a
// link to YouTube, the channel and the note on privacy, the button and the choice "Videos immer direkt laden" hidden
// until the client module runs, and nothing of YouTube or Google that a browser would load. llms.txt and the page's
// tutor file name the video as a link. A block with a wrong id fails the build (explainer-broken.test.ts).
import { cpSync, mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, test } from "vite-plus/test";
import { loadSite } from "../runtime/explainer/load.ts";
import { message } from "../runtime/explainer/messages.ts";
import { llmsTxt, renderPage } from "../runtime/explainer/render.ts";
import { contentPages, routes } from "../runtime/explainer/routes.ts";
import { tutorFile } from "../runtime/explainer/tutor.ts";
import { embedAddress, isYoutubeId, watchAddress } from "../runtime/explainer/video.ts";

const ID = "rkLmLaFHodo";
const TITLE = "einstufiger Zufallsversuch | Wahrscheinlichkeitsrechnung - einfach erklärt";

/** The site of the all-blocks fixture, which is an app's src/. */
function site() {
  const root = mkdtempSync(join(tmpdir(), "explainer-video-"));
  cpSync(join(import.meta.dirname, "fixtures/explainer-all-blocks"), join(root, "src"), { recursive: true });
  return loadSite(root, 0);
}

/** The body of the page at `path` (from the app's root), as the build writes it. */
function body(path: string): string {
  const app = site();
  const route = routes(app).find((candidate) => candidate.path === path);
  if (route === undefined) throw new Error(`no page ${path}`);
  return renderPage(app, route).body;
}

describe("the addresses of a video", () => {
  test("a YouTube id is 11 letters, digits, - or _", () => {
    expect(isYoutubeId(ID)).toBe(true);
    expect(isYoutubeId("D_D4gvqNDdE")).toBe(true);
    expect(isYoutubeId("rkLmLaFHod")).toBe(false);
    expect(isYoutubeId("rkLmLaFHodo1")).toBe(false);
    expect(isYoutubeId("rkLmLaFH&do")).toBe(false);
    expect(isYoutubeId(42)).toBe(false);
  });

  test("the link goes to the video's page on YouTube, the player comes from youtube-nocookie.com", () => {
    expect(watchAddress(ID)).toBe("https://www.youtube.com/watch?v=rkLmLaFHodo");
    expect(embedAddress(ID, true)).toBe("https://www.youtube-nocookie.com/embed/rkLmLaFHodo?autoplay=1");
    expect(embedAddress(ID, false)).toBe("https://www.youtube-nocookie.com/embed/rkLmLaFHodo");
    expect(() => watchAddress('x"><script>')).toThrow(/YouTube id/);
    expect(() => embedAddress("x", true)).toThrow(/YouTube id/);
  });
});

describe("a video on the page, before any click", () => {
  test("the title as a link to YouTube, the channel and the note; the controls hidden", () => {
    const html = body("zahlen/zahlen-01/");
    const video = /<figure class="explainer-video"[^>]*data-youtube="rkLmLaFHodo"[\s\S]*?<\/figure>/.exec(html)?.[0];
    expect(video, "the video's figure").toBeDefined();
    expect(video).toContain(
      `<a class="explainer-video-link" href="https://www.youtube.com/watch?v=${ID}" rel="noopener">`,
    );
    expect(video).toContain(`${TITLE}</a>`);
    expect(video).toContain(
      `<span class="explainer-video-channel">${message("de", "videoChannel", { channel: "Lehrerschmidt" })}</span>`,
    );
    expect(video).toContain(message("de", "videoNote"));
    expect(video).toMatch(/<p class="explainer-video-controls" hidden>/);
    expect(video).toContain(
      `<button type="button" class="explainer-video-play">${message("de", "videoPlay")}</button>`,
    );
    expect(video).toContain(message("de", "videoAlways"));
    // what the client module keeps the choice under: the app's name for its storage
    expect(video).toMatch(/data-storage="[a-z0-9-]+"/);
  });

  test("nothing a browser would load from YouTube or Google: no iframe, no player, no thumbnail", () => {
    for (const path of ["zahlen/zahlen-01/", "en/zahlen/zahlen-01/"]) {
      const html = body(path);
      expect(html).toContain("explainer-video");
      expect(html).not.toMatch(/<iframe|youtube-nocookie|ytimg|googlevideo/);
      // the one address of YouTube is the link, which loads only on a click
      expect(html.match(/youtube\.com[^"]*/g)).toEqual([
        `youtube.com/watch?v=${ID}`,
        "youtube.com/watch?v=D_D4gvqNDdE",
      ]);
    }
  });

  test("in English, the English texts around the video's own title", () => {
    const html = body("en/zahlen/zahlen-01/");
    expect(html).toContain(`${TITLE}</a>`);
    expect(html).toContain(message("en", "videoNote"));
    expect(html).toContain(message("en", "videoPlay"));
    expect(message("en", "videoPlay")).not.toBe(message("de", "videoPlay"));
  });
});

describe("a tutor learns of the video as a link", () => {
  test("llms.txt names it under its page: title, channel, address", () => {
    const text = llmsTxt(site(), "de");
    expect(text).toContain(`- [Zahlen 1](zahlen/zahlen-01/): Seite 1 der Fixture mit allen Blöcken.\n  - [Grundlagen]`);
    expect(text).toContain(`  - Video: [${TITLE}](https://www.youtube.com/watch?v=${ID}), Lehrerschmidt (YouTube)\n`);
    expect(llmsTxt(site(), "en")).toContain(
      `  - Video: [${TITLE}](https://www.youtube.com/watch?v=${ID}), Lehrerschmidt (YouTube)\n`,
    );
  });

  test("the page's tutor file lists it with its section", () => {
    const app = site();
    const page = contentPages(app)[0];
    if (page === undefined) throw new Error("no page");
    const file = tutorFile(app, page, "de", new Map());
    expect(file).toContain("## Videos\n");
    expect(file).toContain(
      `- [${TITLE}](https://www.youtube.com/watch?v=${ID}) von Lehrerschmidt, im Abschnitt „Bilder“ (./#anwendung/bilder)`,
    );
    expect(tutorFile(app, page, "en", new Map())).toContain(
      `- [${TITLE}](https://www.youtube.com/watch?v=${ID}) by Lehrerschmidt, in the section „Pictures“ (./#anwendung/bilder)`,
    );
  });
});
