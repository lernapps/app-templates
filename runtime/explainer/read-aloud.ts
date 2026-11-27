// Generic read-aloud logic for explainers (dec-explainer-read-aloud): settings validation, readable block selection,
// text extraction (using build-time `data-speech` on MathML formulas), sentence segmentation, and the exchangeable
// SpeechBackend interface with the default WebSpeechBackend (browser speechSynthesis). Pure and without Node, so both
// unit tests and the browser client module import it.

/** The key under which the learner's read-aloud preferences are kept on the device (archetype-wide). */
export const READ_ALOUD_KEY = "read-aloud";

/** The reading speeds offered in the read-aloud bar, matching the audio player's tempos (audio-client.ts). */
export const READ_ALOUD_TEMPOS = [0.75, 1, 1.25] as const;

/** The speech engine selected by the learner: browser-native `device` or local `piper` AI voice. */
export type ReadAloudEngine = "device" | "piper";

/** Persisted learner preferences for the read-aloud mode. */
export interface ReadAloudSettings {
  enabled: boolean;
  engine: ReadAloudEngine;
  highlight: boolean;
  rate: number;
}

/** Default settings when the learner has not enabled read-aloud yet. */
export const DEFAULT_READ_ALOUD_SETTINGS: Readonly<ReadAloudSettings> = {
  enabled: false,
  engine: "device",
  highlight: false,
  rate: 1,
};

/** Whether `value` is a valid stored `ReadAloudSettings` object (accepts legacy entries without `engine`). */
export function isReadAloudSettings(value: unknown): value is ReadAloudSettings {
  if (typeof value !== "object" || value === null) return false;
  const record = value as Record<string, unknown>;
  const engine = record["engine"];
  return (
    typeof record["enabled"] === "boolean" &&
    (engine === undefined || engine === "device" || engine === "piper") &&
    typeof record["highlight"] === "boolean" &&
    typeof record["rate"] === "number" &&
    Number.isFinite(record["rate"]) &&
    record["rate"] >= 0.5 &&
    record["rate"] <= 2
  );
}

/** Normalizes a loaded settings object so `engine` is always populated. */
export function normalizeReadAloudSettings(settings: Partial<ReadAloudSettings> | undefined): ReadAloudSettings {
  return {
    enabled: settings?.enabled ?? DEFAULT_READ_ALOUD_SETTINGS.enabled,
    engine: settings?.engine === "piper" ? "piper" : "device",
    highlight: settings?.highlight ?? DEFAULT_READ_ALOUD_SETTINGS.highlight,
    rate: settings?.rate ?? DEFAULT_READ_ALOUD_SETTINGS.rate,
  };
}

/** Static Piper/WASM voice metadata hosted under `lernapps.net/assets/tts/`. */
export interface PiperVoiceSpec {
  id: string;
  label: string;
  lang: string;
  sizeMb: number;
  licence: string;
  modelPath: string;
  configPath: string;
}

/** CacheStorage bucket shared across all apps on the same origin (e.g. `lernapps.net`). */
export const PIPER_CACHE_NAME = "lernapps-tts-v1";

/** Default same-origin path where static Piper runtime and voice models live. */
export const PIPER_BASE_URL = "/assets/tts/";

/** Approximate size in MB of the shared Piper WASM + ONNX runtime. */
export const PIPER_ENGINE_SIZE_MB = 17;

/** Pinned Piper voices per explainer language: Thorsten (medium) for German, Alba (medium) for English. */
export const PIPER_VOICES: Readonly<Record<string, PiperVoiceSpec>> = {
  de: {
    id: "de_DE-thorsten-medium",
    label: "Thorsten (Deutsch)",
    lang: "de-DE",
    sizeMb: 63,
    licence: "CC0 1.0",
    modelPath: "voices/de_DE-thorsten-medium.onnx",
    configPath: "voices/de_DE-thorsten-medium.onnx.json",
  },
  en: {
    id: "en_GB-alba-medium",
    label: "Alba (English)",
    lang: "en-GB",
    sizeMb: 63,
    licence: "CC BY 4.0",
    modelPath: "voices/en_GB-alba-medium.onnx",
    configPath: "voices/en_GB-alba-medium.onnx.json",
  },
};

/** Returns the Piper voice spec for `lang` (falling back to German for unknown runtime languages). */
export function piperVoiceFor(lang: string): PiperVoiceSpec {
  const base = lang.toLowerCase().split("-")[0] ?? "de";
  return PIPER_VOICES[base] ?? PIPER_VOICES["de"]!;
}

/** Total approximate one-time download size (engine + voice model) in MB for `lang`. */
export function piperDownloadSizeMb(lang: string): number {
  return PIPER_ENGINE_SIZE_MB + piperVoiceFor(lang).sizeMb;
}

/**
 * Block types that do not carry prose suitable for generic read-aloud: source code, video embeds, vocabulary tables
 * (which have mixed languages or dedicated audio), data tables, and Vue islands (owned by Vue hydration).
 */
export const NON_READABLE_BLOCK_TYPES: ReadonlySet<string> = new Set([
  "code",
  "video",
  "vocabulary",
  "table",
  "vue-component",
]);

/** Container block types read as one unit (title + inner blocks) so nested blocks do not get duplicate buttons. */
export const CONTAINER_BLOCK_TYPES: ReadonlySet<string> = new Set(["note", "example"]);

/** Whether an `.explainer-block` with `blockType` can be read aloud. */
export const isReadableBlockType = (blockType: string | undefined): boolean =>
  blockType !== undefined && blockType !== "" && !NON_READABLE_BLOCK_TYPES.has(blockType);

/** Options passed to a speech backend for one utterance. */
export interface SpeechOptions {
  lang: string;
  rate: number;
}

/**
 * Exchangeable speech synthesis backend. The default implementation uses the browser's Web Speech API
 * (`WebSpeechBackend`); a future local WASM engine (e.g. Piper) can implement the same contract without changing the UI.
 */
export interface SpeechBackend {
  /** Whether this backend can speak in the current browser environment. */
  available(): boolean;
  /** Speaks `text` and resolves when finished or cancelled. Rejects only on unexpected synthesis errors. */
  speak(text: string, options: SpeechOptions): Promise<void>;
  /**
   * Speaks `segments` in order, calling `onSegment(index)` as each segment starts. Queueing all segments
   * synchronously within the click handler preserves the user gesture required by iOS Safari.
   */
  speakAll(segments: readonly string[], options: SpeechOptions, onSegment?: (index: number) => void): Promise<void>;
  /** Stops any ongoing speech immediately. */
  stop(): void;
}

/** Full BCP-47 fallback locales for two-letter page languages, used when `getVoices()` is still empty on iOS Safari. */
const DEFAULT_LOCALE: Readonly<Record<string, string>> = {
  de: "de-DE",
  en: "en-US",
  fr: "fr-FR",
  es: "es-ES",
  it: "it-IT",
};

/** Normalizes a page language like `"de"` to a BCP-47 locale tag (`"de-DE"`). */
export function speechLocale(lang: string): string {
  return DEFAULT_LOCALE[lang.toLowerCase()] ?? lang;
}

/** Picks the best matching voice for `lang` from `voices`, preferring the default or local voice. */
export function pickVoice(voices: readonly SpeechSynthesisVoice[], lang: string): SpeechSynthesisVoice | undefined {
  const target = lang.toLowerCase();
  const base = target.split("-")[0] ?? target;
  const exact = voices.filter((voice) => voice.lang.toLowerCase() === target);
  const prefix = voices.filter(
    (voice) => voice.lang.toLowerCase().startsWith(`${base}-`) || voice.lang.toLowerCase() === base,
  );
  const pool = exact.length > 0 ? exact : prefix;
  return pool.find((voice) => voice.default) ?? pool.find((voice) => voice.localService) ?? pool[0];
}

/** Window with optional SpeechSynthesisUtterance constructor (present on browser windows with Web Speech API). */
type SpeechWindow = Window & { SpeechSynthesisUtterance?: typeof SpeechSynthesisUtterance };

/** Browser-native speech synthesis backend using `window.speechSynthesis`. */
export class WebSpeechBackend implements SpeechBackend {
  readonly #win: SpeechWindow | undefined;
  #active: (() => void) | undefined;
  /** Strong references to queued utterances so WebKit/Blink do not garbage-collect them before `onend`. */
  #utterances: SpeechSynthesisUtterance[] = [];

  constructor(win: Window | undefined = typeof window === "undefined" ? undefined : window) {
    this.#win = win as SpeechWindow | undefined;
  }

  available(): boolean {
    return (
      this.#win !== undefined &&
      "speechSynthesis" in this.#win &&
      typeof this.#win.speechSynthesis?.speak === "function" &&
      typeof this.#win.SpeechSynthesisUtterance === "function"
    );
  }

  speak(text: string, options: SpeechOptions): Promise<void> {
    return this.speakAll([text], options);
  }

  speakAll(segments: readonly string[], options: SpeechOptions, onSegment?: (index: number) => void): Promise<void> {
    if (!this.available() || this.#win === undefined || this.#win.SpeechSynthesisUtterance === undefined) {
      return Promise.resolve();
    }
    const items = segments.map((text, index) => ({ text: text.trim(), index })).filter((item) => item.text !== "");
    if (items.length === 0) return Promise.resolve();
    const synth = this.#win.speechSynthesis;
    const Utterance = this.#win.SpeechSynthesisUtterance;
    const ua = this.#win.navigator?.userAgent ?? "";
    const touchPoints = this.#win.navigator?.maxTouchPoints ?? 0;
    const isIos = /\b(iPhone|iPad|iPod)\b/.test(ua) || (/\bMacintosh\b/.test(ua) && touchPoints > 1);
    // On iOS Safari, forcing a voice from getVoices() can select an un-downloaded or silent voice; rely on BCP-47 lang.
    const voice = isIos ? undefined : pickVoice(synth.getVoices(), options.lang);
    const locale = voice?.lang || speechLocale(options.lang);

    if (synth.paused) synth.resume();

    return new Promise<void>((resolve, reject) => {
      let settled = false;
      const finish = () => {
        if (settled) return;
        settled = true;
        this.#utterances = [];
        if (this.#active === finish) this.#active = undefined;
        resolve();
      };
      this.#active = finish;
      const queued: SpeechSynthesisUtterance[] = [];
      for (let i = 0; i < items.length; i += 1) {
        const item = items[i]!;
        const utterance = new Utterance(item.text);
        utterance.lang = locale;
        utterance.rate = options.rate;
        utterance.volume = 1;
        if (voice !== undefined) utterance.voice = voice;
        utterance.onstart = () => {
          if (!settled) onSegment?.(item.index);
        };
        if (i === items.length - 1) utterance.onend = finish;
        utterance.onerror = (event: SpeechSynthesisErrorEvent) => {
          if (settled) return;
          settled = true;
          this.#utterances = [];
          if (this.#active === finish) this.#active = undefined;
          // "canceled" and "interrupted" happen routinely when the learner stops or switches blocks
          if (event.error === "canceled" || event.error === "interrupted") resolve();
          else reject(new Error(`Speech synthesis error: ${event.error}`));
        };
        queued.push(utterance);
      }
      this.#utterances = queued;
      // Queue all utterances synchronously inside the user gesture so iOS Safari does not block later sentences
      for (const utterance of queued) synth.speak(utterance);
    });
  }

  stop(): void {
    if (!this.available() || this.#win === undefined) return;
    const synth = this.#win.speechSynthesis;
    // Avoid calling cancel() when idle: on iOS Safari a cancel() right before speak() can silence the new utterance
    if (this.#utterances.length > 0 || synth.speaking || synth.pending) synth.cancel();
    this.#utterances = [];
    this.#active?.();
  }
}

/** Module contract exported by `/assets/tts/piper.mjs` (hosted statically under `lernapps.net/assets/tts/`). */
interface PiperRuntimeModule {
  synthesize(
    text: string,
    options: { modelBytes: ArrayBuffer; config: Record<string, unknown>; baseUrl: string },
  ): Promise<Blob | ArrayBuffer>;
}

/** Progress callback reported while downloading Piper runtime and voice files. */
export interface DownloadProgress {
  loadedBytes: number;
  totalBytes: number;
  percent: number;
}

/**
 * Local in-browser Piper/WASM backend backed by `CacheStorage` (`lernapps-tts-v1`).
 * Never fetches anything before an explicit user click (`download()`). Once downloaded from same-origin
 * `/assets/tts/`, the model is shared across all explainer apps on the origin and played via `HTMLAudioElement`
 * (which also works on iPhones in Silent Mode).
 */
export class PiperWasmBackend implements SpeechBackend {
  readonly #win: Window | undefined;
  readonly #baseUrl: string;
  #activeAudio: HTMLAudioElement | undefined;
  #activeUrl: string | undefined;
  #aborted = false;
  #runtimePromise: Promise<PiperRuntimeModule> | undefined;

  constructor(win: Window | undefined = typeof window === "undefined" ? undefined : window, baseUrl = PIPER_BASE_URL) {
    this.#win = win;
    this.#baseUrl = baseUrl.endsWith("/") ? baseUrl : `${baseUrl}/`;
  }

  available(): boolean {
    return (
      this.#win !== undefined &&
      typeof this.#win.caches?.open === "function" &&
      typeof this.#win.fetch === "function" &&
      typeof Audio !== "undefined"
    );
  }

  #urlsFor(lang: string): { runtime: string; config: string; model: string } {
    const voice = piperVoiceFor(lang);
    return {
      runtime: `${this.#baseUrl}piper.mjs`,
      config: `${this.#baseUrl}${voice.configPath}`,
      model: `${this.#baseUrl}${voice.modelPath}`,
    };
  }

  /** Whether the Piper runtime and voice model for `lang` are cached locally on the device (never creates a cache). */
  async isDownloaded(lang: string): Promise<boolean> {
    if (!this.available() || this.#win === undefined) return false;
    try {
      if (!(await this.#win.caches.has(PIPER_CACHE_NAME))) return false;
      const cache = await this.#win.caches.open(PIPER_CACHE_NAME);
      const urls = this.#urlsFor(lang);
      const [runtime, config, model] = await Promise.all([
        cache.match(urls.runtime),
        cache.match(urls.config),
        cache.match(urls.model),
      ]);
      return runtime !== undefined && config !== undefined && model !== undefined;
    } catch {
      return false;
    }
  }

  /** Downloads the Piper runtime and voice model for `lang` into `CacheStorage`, reporting byte progress. */
  async download(lang: string, onProgress?: (progress: DownloadProgress) => void): Promise<void> {
    if (!this.available() || this.#win === undefined) {
      throw new Error("CacheStorage is not available in this browser.");
    }
    const cache = await this.#win.caches.open(PIPER_CACHE_NAME);
    const urls = this.#urlsFor(lang);
    const list = [urls.runtime, urls.config, urls.model];
    const estimatedTotal = piperDownloadSizeMb(lang) * 1024 * 1024;
    let loadedBytes = 0;

    for (const url of list) {
      const response = await this.#win.fetch(url, { credentials: "same-origin" });
      if (!response.ok) throw new Error(`HTTP ${response.status} for ${url}`);
      const contentLength = Number(response.headers.get("content-length") ?? 0);
      const totalBytes = Math.max(estimatedTotal, loadedBytes + contentLength);
      if (response.body !== null) {
        const reader = response.body.getReader();
        const chunks: Uint8Array<ArrayBuffer>[] = [];
        for (;;) {
          const { done, value } = await reader.read();
          if (done) break;
          if (value) {
            chunks.push(new Uint8Array(value));
            loadedBytes += value.byteLength;
            const percent = Math.min(99, Math.round((loadedBytes / Math.max(totalBytes, 1)) * 100));
            onProgress?.({ loadedBytes, totalBytes, percent });
          }
        }
        const blob = new Blob(chunks, {
          type: response.headers.get("content-type") ?? "application/octet-stream",
        });
        await cache.put(url, new Response(blob, { headers: response.headers }));
      } else {
        const buf = await response.arrayBuffer();
        loadedBytes += buf.byteLength;
        await cache.put(url, new Response(buf, { headers: response.headers }));
        const percent = Math.min(99, Math.round((loadedBytes / Math.max(totalBytes, 1)) * 100));
        onProgress?.({ loadedBytes, totalBytes, percent });
      }
    }
    onProgress?.({ loadedBytes, totalBytes: loadedBytes, percent: 100 });
  }

  /** Deletes the cached voice model for `lang` from `CacheStorage`. */
  async remove(lang: string): Promise<void> {
    if (!this.available() || this.#win === undefined) return;
    const cache = await this.#win.caches.open(PIPER_CACHE_NAME);
    const urls = this.#urlsFor(lang);
    await Promise.all([cache.delete(urls.config), cache.delete(urls.model)]);
  }

  async #loadRuntime(runtimeUrl: string): Promise<PiperRuntimeModule> {
    if (this.#runtimePromise === undefined) {
      const resolved = this.#win ? new URL(runtimeUrl, this.#win.location.href).href : runtimeUrl;
      this.#runtimePromise = import(/* @vite-ignore */ resolved) as Promise<PiperRuntimeModule>;
    }
    return this.#runtimePromise;
  }

  speak(text: string, options: SpeechOptions): Promise<void> {
    return this.speakAll([text], options);
  }

  async speakAll(
    segments: readonly string[],
    options: SpeechOptions,
    onSegment?: (index: number) => void,
  ): Promise<void> {
    if (!this.available() || this.#win === undefined) return;
    const items = segments.map((text, index) => ({ text: text.trim(), index })).filter((item) => item.text !== "");
    if (items.length === 0) return;

    this.#aborted = false;
    const cache = await this.#win.caches.open(PIPER_CACHE_NAME);
    const urls = this.#urlsFor(options.lang);
    const [configRes, modelRes] = await Promise.all([cache.match(urls.config), cache.match(urls.model)]);
    if (configRes === undefined || modelRes === undefined) {
      throw new Error("Piper voice model is not downloaded.");
    }
    const [config, modelBytes, runtime] = await Promise.all([
      configRes.json() as Promise<Record<string, unknown>>,
      modelRes.arrayBuffer(),
      this.#loadRuntime(urls.runtime),
    ]);

    for (const item of items) {
      if (this.#aborted) return;
      const synthesized = await runtime.synthesize(item.text, { modelBytes, config, baseUrl: this.#baseUrl });
      if (this.#aborted) return;
      const blob = synthesized instanceof Blob ? synthesized : new Blob([synthesized], { type: "audio/wav" });
      await this.#playBlob(blob, options.rate, () => onSegment?.(item.index));
    }
  }

  #playBlob(blob: Blob, rate: number, onStart: () => void): Promise<void> {
    return new Promise<void>((resolve, reject) => {
      const url = URL.createObjectURL(blob);
      const audio = new Audio(url);
      audio.preservesPitch = true;
      audio.defaultPlaybackRate = rate;
      audio.playbackRate = rate;
      this.#activeAudio = audio;
      this.#activeUrl = url;
      let settled = false;
      const cleanup = () => {
        if (this.#activeAudio === audio) this.#activeAudio = undefined;
        if (this.#activeUrl === url) this.#activeUrl = undefined;
        URL.revokeObjectURL(url);
      };
      const done = () => {
        if (settled) return;
        settled = true;
        cleanup();
        resolve();
      };
      audio.onplay = onStart;
      audio.onended = done;
      audio.onpause = () => {
        if (this.#aborted) done();
      };
      audio.onerror = () => {
        if (settled) return;
        settled = true;
        cleanup();
        reject(new Error("Audio playback error"));
      };
      void audio.play().catch((err: unknown) => {
        if (settled) return;
        settled = true;
        cleanup();
        reject(err instanceof Error ? err : new Error(String(err)));
      });
    });
  }

  stop(): void {
    this.#aborted = true;
    if (this.#activeAudio !== undefined) {
      this.#activeAudio.pause();
      this.#activeAudio = undefined;
    }
    if (this.#activeUrl !== undefined) {
      URL.revokeObjectURL(this.#activeUrl);
      this.#activeUrl = undefined;
    }
  }
}

/** Splits `text` into non-empty trimmed sentences using `Intl.Segmenter` when available, else punctuation rules. */
export function splitSentences(text: string, lang: string): string[] {
  const normalized = text.replace(/\s+/g, " ").trim();
  if (normalized === "") return [];
  if (typeof Intl !== "undefined" && "Segmenter" in Intl) {
    try {
      const segmenter = new Intl.Segmenter(lang, { granularity: "sentence" });
      const parts: string[] = [];
      for (const { segment } of segmenter.segment(normalized)) {
        const clean = segment.trim();
        if (clean !== "") parts.push(clean);
      }
      if (parts.length > 0) return parts;
    } catch {
      // fall through to regex splitter
    }
  }
  return normalized
    .split(/(?<=[.!?…])\s+/)
    .map((part) => part.trim())
    .filter((part) => part !== "");
}

/** Selectors ignored when extracting readable text from a block. */
const IGNORED_SELECTOR = [
  ".explainer-read-btn",
  ".explainer-feedback-add",
  ".block-credit",
  ".explainer-island",
  ".explainer-worked-intro",
  ".explainer-worked",
  ".explainer-diff-before",
  ".explainer-diff-chip",
  ".explainer-diff-label",
  ".explainer-task-number",
  ".question-actions",
  "script",
  "style",
  "template",
  "audio",
  "video",
  "svg",
  "[hidden]",
  '[aria-hidden="true"]',
].join(",");

/** Block-level tags that separate readable parts (paragraphs, list items, headings, definitions, captions). */
const PART_TAGS = new Set([
  "P",
  "LI",
  "DT",
  "DD",
  "H1",
  "H2",
  "H3",
  "H4",
  "H5",
  "H6",
  "FIGCAPTION",
  "LEGEND",
  "SUMMARY",
]);

/** One readable part of a block: the DOM element (for optional highlight fallback) and its spoken sentences. */
export interface SpeechPart {
  element: Element;
  text: string;
  sentences: string[];
}

/** Whether `element` or any ancestor up to `boundary` should be skipped when reading aloud. */
function isIgnored(element: Element): boolean {
  return element.matches(IGNORED_SELECTOR);
}

/**
 * Extracts spoken text from `node`, replacing `<math data-speech="…">` with its build-time spoken words and skipping
 * UI controls, hidden elements, credits, and closed `<details>` bodies (so solutions/hints are not spoiled).
 */
export function extractNodeText(node: Node): string {
  if (node.nodeType === 3 /* TEXT_NODE */) return node.textContent ?? "";
  if (node.nodeType !== 1 /* ELEMENT_NODE */) return "";
  const element = node as Element;
  if (isIgnored(element)) return "";
  if (element.tagName.toLowerCase() === "math") {
    const spoken = element.getAttribute("data-speech");
    const text = spoken !== null && spoken.trim() !== "" ? spoken.trim() : (element.textContent ?? "").trim();
    return text === "" ? "" : ` ${text} `;
  }
  if (element.tagName === "BR") return " ";
  if (element.tagName === "DETAILS" && !(element as HTMLDetailsElement).open) {
    const summary = element.querySelector(":scope > summary");
    return summary ? extractNodeText(summary) : "";
  }
  let out = "";
  for (const child of element.childNodes) {
    const piece = extractNodeText(child);
    if (piece !== "") {
      if (
        out !== "" &&
        !/\s$/.test(out) &&
        !/^\s/.test(piece) &&
        child.nodeType === 1 &&
        PART_TAGS.has((child as Element).tagName)
      ) {
        out += " ";
      }
      out += piece;
    }
  }
  return out;
}

/**
 * Extracts ordered readable parts (and their sentences) from `root`. Each leaf block-level element (`p`, `li`, `dd`,
 * `figcaption`, `h2`–`h6`, `legend`, `dt`) becomes a part so optional highlighting can follow along cleanly.
 */
export function extractSpeechParts(root: Element, lang: string): SpeechPart[] {
  const parts: SpeechPart[] = [];
  const collect = (element: Element): void => {
    if (isIgnored(element)) return;
    if (element.tagName === "DETAILS" && !(element as HTMLDetailsElement).open) {
      const summary = element.querySelector(":scope > summary");
      if (summary) collect(summary);
      return;
    }
    if (element.tagName.toLowerCase() === "math") {
      const text = extractNodeText(element).replace(/\s+/g, " ").trim();
      if (text !== "") parts.push({ element, text, sentences: splitSentences(text, lang) });
      return;
    }
    const children = [...element.children];
    const hasNestedPart = children.some(
      (child) =>
        !isIgnored(child) &&
        (PART_TAGS.has(child.tagName) ||
          child.tagName === "DIV" ||
          child.tagName === "SECTION" ||
          child.tagName === "UL" ||
          child.tagName === "OL" ||
          child.tagName === "DL" ||
          child.tagName === "BLOCKQUOTE" ||
          child.tagName === "FIGURE" ||
          child.tagName === "FIELDSET" ||
          child.tagName === "DETAILS" ||
          child.tagName === "ARTICLE"),
    );
    if (PART_TAGS.has(element.tagName) && !hasNestedPart) {
      const text = extractNodeText(element).replace(/\s+/g, " ").trim();
      if (text !== "") parts.push({ element, text, sentences: splitSentences(text, lang) });
      return;
    }
    if (!hasNestedPart && children.length === 0) {
      const text = extractNodeText(element).replace(/\s+/g, " ").trim();
      if (text !== "") parts.push({ element, text, sentences: splitSentences(text, lang) });
      return;
    }
    for (const child of children) collect(child);
  };
  collect(root);
  if (parts.length === 0) {
    const fallback = extractNodeText(root).replace(/\s+/g, " ").trim();
    if (fallback !== "") parts.push({ element: root, text: fallback, sentences: splitSentences(fallback, lang) });
  }
  return parts;
}

/** Finds a DOM `Range` matching `sentence` inside `element` for the CSS Custom Highlight API, if it is plain text. */
export function findSentenceRange(
  root: Document,
  element: Element,
  sentence: string,
  fromOffset = 0,
): { range: Range; nextOffset: number } | undefined {
  const needle = sentence.replace(/\s+/g, " ").trim();
  if (needle === "") return undefined;
  const walker = root.createTreeWalker(element, 4 /* NodeFilter.SHOW_TEXT */);
  const nodes: { node: Text; start: number; end: number }[] = [];
  let combined = "";
  let current = walker.nextNode();
  while (current !== null) {
    const parent = current.parentElement;
    if (parent !== null && parent.closest(IGNORED_SELECTOR) === null && parent.closest("math") === null) {
      const raw = current.textContent ?? "";
      const start = combined.length;
      combined += raw;
      nodes.push({ node: current as Text, start, end: combined.length });
    }
    current = walker.nextNode();
  }
  const index = combined.indexOf(needle, fromOffset);
  if (index < 0) return undefined;
  const endIndex = index + needle.length;
  const startEntry = nodes.find((entry) => index >= entry.start && index < entry.end);
  const endEntry = nodes.find((entry) => endIndex > entry.start && endIndex <= entry.end);
  if (!startEntry || !endEntry) return undefined;
  const range = root.createRange();
  range.setStart(startEntry.node, index - startEntry.start);
  range.setEnd(endEntry.node, endIndex - endEntry.start);
  return { range, nextOffset: endIndex };
}
