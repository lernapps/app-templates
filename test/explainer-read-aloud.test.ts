// Generic read-aloud mode (dec-explainer-read-aloud): settings validation, readable block filtering, sentence
// splitting, voice selection, and build-time spoken formula annotations (`data-speech` on <math>).
import { cpSync, mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, test } from "vite-plus/test";
import { loadSite } from "../runtime/explainer/load.ts";
import {
  CONTAINER_BLOCK_TYPES,
  DEFAULT_READ_ALOUD_SETTINGS,
  isReadableBlockType,
  isReadAloudSettings,
  NON_READABLE_BLOCK_TYPES,
  pickVoice,
  READ_ALOUD_TEMPOS,
  speechLocale,
  splitSentences,
  WebSpeechBackend,
} from "../runtime/explainer/read-aloud.ts";
import { renderPage } from "../runtime/explainer/render.ts";
import { routes } from "../runtime/explainer/routes.ts";
import { renderInline, renderMarkdown, renderWithFormulas } from "../runtime/shared/text/markdown.ts";
import { renderSpokenFormula } from "../runtime/shared/text/speech.ts";

describe("read-aloud settings", () => {
  test("accepts valid settings and rejects malformed values", () => {
    expect(isReadAloudSettings(DEFAULT_READ_ALOUD_SETTINGS)).toBe(true);
    expect(isReadAloudSettings({ enabled: true, highlight: true, rate: 0.75 })).toBe(true);
    expect(isReadAloudSettings({ enabled: true, highlight: false, rate: 1.25 })).toBe(true);
    expect(isReadAloudSettings(null)).toBe(false);
    expect(isReadAloudSettings("on")).toBe(false);
    expect(isReadAloudSettings({ enabled: true, highlight: false, rate: 0 })).toBe(false);
    expect(isReadAloudSettings({ enabled: true, highlight: false, rate: 3 })).toBe(false);
    expect(isReadAloudSettings({ enabled: "yes", highlight: false, rate: 1 })).toBe(false);
    expect(READ_ALOUD_TEMPOS).toEqual([0.75, 1, 1.25]);
  });
});

describe("readable block types", () => {
  test("includes prose, captions, definitions, boxes, formulas and exercises", () => {
    for (const type of [
      "text",
      "definition",
      "quote",
      "note",
      "example",
      "figure",
      "labelled-figure",
      "timeline",
      "formula",
      "self-test",
      "single-choice",
      "generated",
      "open",
    ]) {
      expect(isReadableBlockType(type), type).toBe(true);
    }
    expect(CONTAINER_BLOCK_TYPES.has("note")).toBe(true);
    expect(CONTAINER_BLOCK_TYPES.has("example")).toBe(true);
  });

  test("excludes code, video, vocabulary, table, vue-component and missing types", () => {
    for (const type of NON_READABLE_BLOCK_TYPES) {
      expect(isReadableBlockType(type), type).toBe(false);
    }
    expect(isReadableBlockType(undefined)).toBe(false);
    expect(isReadableBlockType("")).toBe(false);
  });
});

describe("sentence splitting", () => {
  test("splits German and English prose into clean sentences", () => {
    expect(splitSentences("Erster Satz. Zweiter Satz! Noch eine Frage?", "de")).toEqual([
      "Erster Satz.",
      "Zweiter Satz!",
      "Noch eine Frage?",
    ]);
    expect(splitSentences("  Hello world.   How are you?  ", "en")).toEqual(["Hello world.", "How are you?"]);
    expect(splitSentences("   ", "de")).toEqual([]);
  });
});

describe("voice selection", () => {
  const voice = (name: string, lang: string, localService: boolean): SpeechSynthesisVoice =>
    ({ name, lang, localService }) as SpeechSynthesisVoice;

  test("prefers an exact or language-prefix local voice", () => {
    const voices = [
      voice("Remote DE", "de-DE", false),
      voice("Local DE", "de-DE", true),
      voice("Local EN", "en-US", true),
    ];
    expect(pickVoice(voices, "de")?.name).toBe("Local DE");
    expect(pickVoice(voices, "de-DE")?.name).toBe("Local DE");
    expect(pickVoice(voices, "en")?.name).toBe("Local EN");
    expect(pickVoice(voices, "fr")).toBeUndefined();
  });
});

describe("spoken formula annotations at build time", () => {
  test("adds data-speech to display and inline formulas when a language is given", () => {
    const display = renderSpokenFormula("2^7", true, "de");
    expect(display).toContain("<math data-speech=");
    expect(display).toContain("2");

    const md = renderMarkdown("Hier steht $2^7$ im Text.", (href) => href, "de");
    expect(md).toContain("<math data-speech=");

    const inline = renderInline("Wert: $x^2$", (href) => href, "en");
    expect(inline).toContain("<math data-speech=");

    const plainFormulas = renderWithFormulas("Berechne $2^7$.", "de");
    expect(plainFormulas).toContain("<math data-speech=");

    // Without a language argument, renderWithFormulas keeps its existing output
    expect(renderWithFormulas("Berechne $2^7$.")).not.toContain("data-speech=");
  });

  test("rendered explainer pages include data-speech on MathML formulas", () => {
    const root = mkdtempSync(join(tmpdir(), "explainer-read-aloud-"));
    cpSync(join(import.meta.dirname, "fixtures/explainer-all-blocks"), join(root, "src"), { recursive: true });
    const site = loadSite(root, 0);
    const contentRoutes = routes(site).filter((route) => route.kind === "page");
    const bodies = contentRoutes.map((route) => renderPage(site, route).body);
    const withMath = bodies.filter((html) => html.includes("<math"));
    expect(withMath.length).toBeGreaterThan(0);
    for (const html of withMath) {
      expect(html).toContain("<math data-speech=");
    }
  });
});

describe("WebSpeechBackend iOS Safari compatibility", () => {
  test("maps two-letter page languages to BCP-47 locales", () => {
    expect(speechLocale("de")).toBe("de-DE");
    expect(speechLocale("en")).toBe("en-US");
    expect(speechLocale("fr")).toBe("fr-FR");
    expect(speechLocale("de-AT")).toBe("de-AT");
  });

  test("queues all segments synchronously without cancelling when idle", async () => {
    const spoken: { text: string; lang: string; rate: number; onstart?: () => void; onend?: () => void }[] = [];
    let cancels = 0;
    class FakeUtterance {
      text: string;
      lang = "";
      rate = 1;
      voice: SpeechSynthesisVoice | null = null;
      onstart: (() => void) | null = null;
      onend: (() => void) | null = null;
      onerror: ((event: SpeechSynthesisErrorEvent) => void) | null = null;
      constructor(text: string) {
        this.text = text;
      }
    }
    const synth = {
      speaking: false,
      pending: false,
      paused: false,
      getVoices: () => [],
      resume: () => {},
      cancel: () => {
        cancels += 1;
      },
      speak: (utterance: FakeUtterance) => {
        spoken.push({
          text: utterance.text,
          lang: utterance.lang,
          rate: utterance.rate,
          onstart: () => utterance.onstart?.(),
          onend: () => utterance.onend?.(),
        });
      },
    };
    const fakeWindow = {
      speechSynthesis: synth,
      SpeechSynthesisUtterance: FakeUtterance,
    } as unknown as Window;

    const backend = new WebSpeechBackend(fakeWindow);
    backend.stop();
    expect(cancels).toBe(0);

    const started: number[] = [];
    const done = backend.speakAll(["Erster Satz.", "Zweiter Satz."], { lang: "de", rate: 0.75 }, (i) =>
      started.push(i),
    );
    // Both utterances must be queued synchronously inside the user gesture
    expect(spoken).toHaveLength(2);
    expect(spoken[0]?.lang).toBe("de-DE");
    expect(spoken[0]?.rate).toBe(0.75);
    spoken[0]?.onstart?.();
    spoken[1]?.onstart?.();
    spoken[1]?.onend?.();
    await done;
    expect(started).toEqual([0, 1]);
  });
});
