// What an explainer gives a KI tutor beside the tutor page of each page (tutorpage.test.ts): the check of its links,
// and the assistants a learner may switch on.
import { cpSync, mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, test } from "vite-plus/test";
import { loadSite } from "../runtime/explainer/load.ts";
import { DEFAULT_PROVIDERS, plainAddress, providersOf } from "../runtime/explainer/prompt.ts";
import { linkProblems } from "../runtime/explainer/tutor.ts";

/** The site of a fixture, which is an app's src/. */
const fixture = (name: string) => {
  const root = mkdtempSync(join(tmpdir(), "explainer-tutor-"));
  cpSync(join(import.meta.dirname, "fixtures", name), join(root, "src"), { recursive: true });
  return loadSite(root, 0);
};

describe("the links for a tutor", () => {
  test("a link to a file the build does not write, or to an anchor its page does not have, is a problem", () => {
    const files = new Set(["a/b/", "a/b/tutor/"]);
    const anchors = new Map([["a/b/", new Set(["uebung"])]]);
    expect(
      linkProblems(
        "a/b/tutor/",
        "[ok](../?uebung=3#uebung) [x](../#fehlt) [y](../../c/) [z](https://example.org/)",
        files,
        anchors,
      ),
    ).toEqual([
      "a/b/tutor/: the link ../#fehlt names the anchor #fehlt, which a/b/ does not have",
      "a/b/tutor/: the link ../../c/ leads to a/c/, which the build does not write",
    ]);
  });
});

describe("the tutor prompt", () => {
  test("the providers: Claude, ChatGPT and Le Chat by default, a link without the prompt for readers without JavaScript", () => {
    const site = fixture("explainer-all-blocks");
    expect(providersOf(site)).toEqual(DEFAULT_PROVIDERS);
    expect(DEFAULT_PROVIDERS.map((provider) => provider.name)).toEqual(["Claude", "ChatGPT", "Le Chat"]);
    for (const provider of DEFAULT_PROVIDERS) expect(provider.url).toContain("{prompt}");
    expect(plainAddress("https://chatgpt.com/?q={prompt}")).toBe("https://chatgpt.com/");
    expect(plainAddress("https://claude.ai/new?q={prompt}")).toBe("https://claude.ai/new");
    expect(plainAddress("https://example.org/chat?model=a&text={prompt}")).toBe("https://example.org/chat?model=a");
    expect(plainAddress("https://example.org/chat")).toBe("https://example.org/chat");
  });
});
