// What an explainer gives a KI tutor beside the tutor page of each page (tutorpage.test.ts): the check of its links,
// and the assistants a learner may switch on.
import { cpSync, mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, test } from "vite-plus/test";
import { check } from "../runtime/explainer/load.ts";
import { placeholderPrompt, plainAddress, PROVIDERS } from "../runtime/explainer/prompt.ts";
import { linkProblems } from "../runtime/explainer/tutor.ts";

/** A copy of a fixture as an app's src/, its root. */
const fixture = (name: string) => {
  const root = mkdtempSync(join(tmpdir(), "explainer-tutor-"));
  cpSync(join(import.meta.dirname, "fixtures", name), join(root, "src"), { recursive: true });
  return root;
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
  test("an app names no assistants of its own: tutor.providers is a problem", () => {
    const root = fixture("explainer-all-blocks");
    const file = join(root, "src", "app.yaml");
    writeFileSync(
      file,
      readFileSync(file, "utf8").replace(
        /^tutor:\n/m,
        'tutor:\n  providers: [{ name: Other, url: "https://chat.example/?q={prompt}" }]\n',
      ),
    );
    expect(check(root, 0).problems.join("\n")).toMatch(/app\.yaml.*providers/);
  });

  test("Mistral Vibe needs pasting: its address carries a short placeholder, with no address to fetch, in both languages", () => {
    expect(PROVIDERS.filter((provider) => provider.paste).map((provider) => provider.name)).toEqual(["Mistral Vibe"]);
    expect(placeholderPrompt("de")).toBe(
      "Ich brauche Hilfe bei einer Lern-Einheit. Ich schreibe Dir gleich, worum es geht.",
    );
    expect(placeholderPrompt("en")).not.toMatch(/https?:/);
    expect(placeholderPrompt("fr")).toBe(placeholderPrompt("de"));
  });

  test("the assistants: Claude, ChatGPT and Mistral Vibe for every app, a link without the prompt for readers without JavaScript", () => {
    expect(PROVIDERS.map((provider) => provider.name)).toEqual(["Claude", "ChatGPT", "Mistral Vibe"]);
    for (const provider of PROVIDERS) expect(provider.url).toContain("{prompt}");
    expect(plainAddress("https://chatgpt.com/?q={prompt}")).toBe("https://chatgpt.com/");
    expect(plainAddress("https://claude.ai/new?q={prompt}")).toBe("https://claude.ai/new");
    expect(plainAddress("https://example.org/chat?model=a&text={prompt}")).toBe("https://example.org/chat?model=a");
    expect(plainAddress("https://example.org/chat")).toBe("https://example.org/chat");
  });
});
