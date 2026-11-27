// Client-side generic read-aloud mode for explainers (dec-explainer-read-aloud): adds a global toggle bar when the
// speech backend is available, persists settings across all explainers on the device (createSettings), attaches a
// compact read button to every readable block when active, supports optional sentence/part highlighting without
// mutating the block's text DOM, coordinates with <audio> players, and stops cleanly on Escape or navigation.
import { createSettings } from "@lernapps/tooling/storage";
import { message } from "./messages.ts";
import {
  CONTAINER_BLOCK_TYPES,
  DEFAULT_READ_ALOUD_SETTINGS,
  extractSpeechParts,
  findSentenceRange,
  isReadableBlockType,
  isReadAloudSettings,
  READ_ALOUD_KEY,
  READ_ALOUD_TEMPOS,
  WebSpeechBackend,
  type ReadAloudSettings,
  type SpeechBackend,
} from "./read-aloud.ts";
import { SHOWN_EVENT } from "./tasks.ts";

const ARCHETYPE = "explainer";
const HIGHLIGHT_NAME = "explainer-read-aloud";

const SPEAKER_ICON =
  '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/><path d="M15.54 8.46a5 5 0 0 1 0 7.07"/><path d="M19.07 4.93a10 10 0 0 1 0 14.14"/></svg>';

const STOP_ICON =
  '<svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" focusable="false"><rect x="6" y="6" width="12" height="12" rx="2"/></svg>';

/** Whether `block` sits inside a container block (`note` or `example`) that already gets its own read-aloud button. */
function insideReadableContainer(block: HTMLElement): boolean {
  let parent = block.parentElement?.closest<HTMLElement>(".explainer-block[data-block-type]");
  while (parent !== null && parent !== undefined) {
    const type = parent.dataset["blockType"];
    if (type !== undefined && CONTAINER_BLOCK_TYPES.has(type)) return true;
    parent = parent.parentElement?.closest<HTMLElement>(".explainer-block[data-block-type]");
  }
  return false;
}

/** Finds all readable targets inside `main`: readable `.explainer-block`s (without nested duplicates) plus intro/glossary prose. */
export function readableTargets(main: HTMLElement): HTMLElement[] {
  const targets: HTMLElement[] = [];
  const seen = new Set<HTMLElement>();
  const add = (element: HTMLElement) => {
    if (seen.has(element)) return;
    seen.add(element);
    targets.push(element);
  };
  for (const intro of main.querySelectorAll<HTMLElement>(".explainer-intro, .explainer-chapter-summary")) {
    add(intro);
  }
  for (const block of main.querySelectorAll<HTMLElement>(".explainer-block[data-block-type]")) {
    if (!isReadableBlockType(block.dataset["blockType"])) continue;
    if (insideReadableContainer(block)) continue;
    add(block);
  }
  for (const entry of main.querySelectorAll<HTMLElement>(".explainer-glossary > div")) {
    add(entry);
  }
  return targets;
}

/** Formats a tempo factor in the page's language (e.g. "0,75×" in German, "0.75×" in English). */
function formatTempo(rate: number, lang: string): string {
  const text = String(rate);
  return `${lang.startsWith("de") ? text.replace(".", ",") : text}×`;
}

/** Registry interface for the optional CSS Custom Highlight API. */
interface HighlightRegistry {
  set(name: string, highlight: unknown): void;
  delete(name: string): void;
}

/** Clears any active sentence or element highlight in `root`. */
function clearHighlight(root: Document): void {
  const win = root.defaultView as (Window & { CSS?: { highlights?: HighlightRegistry } }) | null;
  win?.CSS?.highlights?.delete(HIGHLIGHT_NAME);
  for (const element of root.querySelectorAll(".explainer-reading-part")) {
    element.classList.remove("explainer-reading-part");
  }
}

/** Highlights `sentence` in `partElement` via `CSS.highlights` when available, else marks `partElement` with a class. */
function highlightSentence(root: Document, partElement: Element, sentence: string, fromOffset: number): number {
  clearHighlight(root);
  const win = root.defaultView as
    | (Window & { CSS?: { highlights?: HighlightRegistry }; Highlight?: new (...ranges: Range[]) => unknown })
    | null;
  if (win?.CSS?.highlights !== undefined && typeof win.Highlight === "function") {
    const found = findSentenceRange(root, partElement, sentence, fromOffset);
    if (found !== undefined) {
      win.CSS.highlights.set(HIGHLIGHT_NAME, new win.Highlight(found.range));
      return found.nextOffset;
    }
  }
  partElement.classList.add("explainer-reading-part");
  return fromOffset;
}

/** Starts the generic read-aloud mode on the explainer page in `root`. */
export function startReadAloud(
  root: Document = document,
  backend: SpeechBackend = new WebSpeechBackend(root.defaultView ?? undefined),
): void {
  if (!backend.available()) return;
  const main = root.querySelector<HTMLElement>("main.explainer");
  if (!main) return;

  const lang = root.documentElement.lang || "de";
  const storageName = main.dataset["storage"] ?? ARCHETYPE;
  const settingsStore = createSettings(storageName, ARCHETYPE);
  const stored = settingsStore.load(READ_ALOUD_KEY, isReadAloudSettings)?.value;
  let state: ReadAloudSettings = stored ? { ...stored } : { ...DEFAULT_READ_ALOUD_SETTINGS };

  let runId = 0;
  let activeTarget: HTMLElement | undefined;
  let activeButton: HTMLButtonElement | undefined;

  // Global read-aloud toolbar
  const bar = root.createElement("div");
  bar.className = "explainer-read-aloud";
  bar.setAttribute("role", "region");
  bar.setAttribute("aria-label", message(lang, "readAloudRegion"));

  const toggle = root.createElement("button");
  toggle.type = "button";
  toggle.className = "explainer-read-aloud-toggle";
  toggle.innerHTML = `${SPEAKER_ICON}<span>${message(lang, "readAloudMode")}</span>`;

  const controls = root.createElement("div");
  controls.className = "explainer-read-aloud-controls";

  const speedGroup = root.createElement("div");
  speedGroup.className = "explainer-read-aloud-speed";
  speedGroup.setAttribute("role", "group");
  speedGroup.setAttribute("aria-label", message(lang, "audioSpeed"));

  const speedButtons: HTMLButtonElement[] = [];
  for (const rate of READ_ALOUD_TEMPOS) {
    const button = root.createElement("button");
    button.type = "button";
    button.dataset["rate"] = String(rate);
    button.textContent = formatTempo(rate, lang);
    button.addEventListener("click", () => {
      state = { ...state, rate };
      saveState();
      syncBar();
    });
    speedButtons.push(button);
    speedGroup.append(button);
  }

  const highlightLabel = root.createElement("label");
  highlightLabel.className = "explainer-read-aloud-highlight";
  const highlightInput = root.createElement("input");
  highlightInput.type = "checkbox";
  highlightInput.addEventListener("change", () => {
    state = { ...state, highlight: highlightInput.checked };
    saveState();
    if (!state.highlight) clearHighlight(root);
  });
  highlightLabel.append(highlightInput, " ", message(lang, "readAloudHighlight"));

  const stopButton = root.createElement("button");
  stopButton.type = "button";
  stopButton.className = "explainer-read-aloud-stop";
  stopButton.innerHTML = `${STOP_ICON}<span>${message(lang, "readAloudStop")}</span>`;
  stopButton.hidden = true;

  const status = root.createElement("span");
  status.className = "explainer-read-aloud-status";
  status.setAttribute("role", "status");
  status.setAttribute("aria-live", "polite");

  controls.append(speedGroup, highlightLabel, stopButton);
  bar.append(toggle, controls, status);
  main.prepend(bar);

  const saveState = () => {
    settingsStore.save(READ_ALOUD_KEY, state, "archetype");
  };

  const setButtonPlaying = (button: HTMLButtonElement, playing: boolean) => {
    button.dataset["playing"] = playing ? "true" : "false";
    button.setAttribute("aria-pressed", String(playing));
    const label = message(lang, playing ? "readAloudStop" : "readAloudPlay");
    button.setAttribute("aria-label", label);
    button.title = label;
    button.innerHTML = playing ? STOP_ICON : SPEAKER_ICON;
  };

  const stop = () => {
    runId += 1;
    backend.stop();
    clearHighlight(root);
    if (activeTarget) activeTarget.classList.remove("explainer-reading");
    if (activeButton) setButtonPlaying(activeButton, false);
    activeTarget = undefined;
    activeButton = undefined;
    stopButton.hidden = true;
  };

  const readTarget = (target: HTMLElement, button: HTMLButtonElement) => {
    if (activeTarget === target) {
      stop();
      return;
    }
    if (activeTarget !== undefined) stop();
    status.textContent = "";
    const parts = extractSpeechParts(target, lang);
    const entries: { element: Element; sentence: string }[] = [];
    for (const part of parts) {
      for (const sentence of part.sentences) entries.push({ element: part.element, sentence });
    }
    if (entries.length === 0) return;

    // Pause any playing <audio> element on the page so voices do not overlap
    for (const audio of root.querySelectorAll("audio")) {
      if (!audio.paused) audio.pause();
    }

    const currentRun = ++runId;
    activeTarget = target;
    activeButton = button;
    target.classList.add("explainer-reading");
    setButtonPlaying(button, true);
    stopButton.hidden = false;

    const offsets = new WeakMap<Element, number>();
    const onSegment = (index: number) => {
      if (currentRun !== runId) return;
      const entry = entries[index];
      if (!entry) return;
      if (state.highlight) {
        const nextOffset = highlightSentence(root, entry.element, entry.sentence, offsets.get(entry.element) ?? 0);
        offsets.set(entry.element, nextOffset);
      } else {
        clearHighlight(root);
      }
    };

    // Call speakAll synchronously within the click handler so iOS Safari preserves the user gesture for all sentences
    void backend
      .speakAll(
        entries.map((entry) => entry.sentence),
        { lang, rate: state.rate },
        onSegment,
      )
      .catch(() => {
        if (currentRun === runId) {
          status.textContent = message(lang, "readAloudError");
        }
      })
      .finally(() => {
        if (currentRun === runId) {
          clearHighlight(root);
          target.classList.remove("explainer-reading");
          setButtonPlaying(button, false);
          activeTarget = undefined;
          activeButton = undefined;
          stopButton.hidden = true;
        }
      });
  };

  const attachButtons = () => {
    if (!state.enabled) return;
    for (const target of readableTargets(main)) {
      if (target.querySelector(":scope > .explainer-read-btn") !== null) continue;
      if (extractSpeechParts(target, lang).length === 0) continue;
      const button = root.createElement("button");
      button.type = "button";
      button.className = "explainer-read-btn";
      setButtonPlaying(button, false);
      button.addEventListener("click", () => {
        readTarget(target, button);
      });
      target.prepend(button);
    }
  };

  const removeButtons = () => {
    for (const button of main.querySelectorAll(".explainer-read-btn")) button.remove();
  };

  const syncBar = () => {
    toggle.setAttribute("aria-pressed", String(state.enabled));
    controls.hidden = !state.enabled;
    highlightInput.checked = state.highlight;
    for (const button of speedButtons) {
      button.setAttribute("aria-pressed", String(Number(button.dataset["rate"]) === state.rate));
    }
    root.documentElement.classList.toggle("explainer-read-aloud-on", state.enabled);
  };

  toggle.addEventListener("click", () => {
    state = { ...state, enabled: !state.enabled };
    saveState();
    if (!state.enabled) {
      stop();
      removeButtons();
    } else {
      attachButtons();
    }
    syncBar();
  });

  stopButton.addEventListener("click", stop);

  // Dynamic generated exercises replace their inner DOM on SHOWN_EVENT: keep buttons synced
  root.addEventListener(SHOWN_EVENT, () => {
    if (state.enabled) attachButtons();
  });

  // Coordinate with <audio> players: playing an audio file stops read-aloud
  root.addEventListener(
    "play",
    (event) => {
      if (event.target instanceof HTMLAudioElement && activeTarget !== undefined) stop();
    },
    true,
  );

  // Keyboard shortcut: Escape stops active reading
  root.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && activeTarget !== undefined) stop();
  });

  root.defaultView?.addEventListener("pagehide", stop);

  syncBar();
  if (state.enabled) attachButtons();
}
