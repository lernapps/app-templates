// Client-side generic read-aloud mode for explainers (dec-explainer-read-aloud):
// - On the start page: reveals the "Vorlesen" voice selector and gear button (mirroring the AI tutor section),
//   hydrates the configuration <dialog> from its <template> with the 2-option engine selector (device vs. local Piper
//   AI voice), download/delete controls (~80 MB one-time CacheStorage download from /assets/tts/), AI-voice disclosure,
//   tempo, optional highlighting, scope (all explainers vs. this app), and the bottom activation toggle (disabled with
//   an explanatory note while the Piper model is not yet downloaded).
// - On content pages: keeps the calm lesson header (#226) completely untouched (no top toolbar or header button).
//   While read-aloud is enabled, attaches a compact play/stop button to every readable block, supports optional
//   sentence/part highlighting without mutating the text DOM, coordinates with <audio> players, and stops on Escape.
import { createSettings, type SettingScope } from "@lernapps/tooling/storage";
import { message } from "./messages.ts";
import {
  CONTAINER_BLOCK_TYPES,
  extractSpeechParts,
  findSentenceRange,
  isReadableBlockType,
  isReadAloudSettings,
  normalizeReadAloudSettings,
  piperDownloadSizeMb,
  PiperWasmBackend,
  READ_ALOUD_KEY,
  WebSpeechBackend,
  type ReadAloudEngine,
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

/** Optional backends injected for testing. */
export interface ReadAloudBackends {
  device?: SpeechBackend;
  piper?: PiperWasmBackend;
}

/** Starts the generic read-aloud mode on the explainer page in `root`. */
export function startReadAloud(root: Document = document, backends: ReadAloudBackends = {}): void {
  const win = root.defaultView ?? undefined;
  const deviceBackend: SpeechBackend = backends.device ?? new WebSpeechBackend(win);
  const piperBackend: PiperWasmBackend = backends.piper ?? new PiperWasmBackend(win);
  if (!deviceBackend.available() && !piperBackend.available()) return;

  const main = root.querySelector<HTMLElement>("main.explainer");
  if (!main) return;

  const lang = root.documentElement.lang || "de";
  const storageName = main.dataset["storage"] ?? ARCHETYPE;
  const settingsStore = createSettings(storageName, ARCHETYPE);
  const stored = settingsStore.load(READ_ALOUD_KEY, isReadAloudSettings);
  let state: ReadAloudSettings = normalizeReadAloudSettings(stored?.value);
  let scope: SettingScope = stored?.scope === "app" ? "app" : "archetype";
  let piperDownloaded = false;
  let downloading = false;

  let runId = 0;
  let activeTarget: HTMLElement | undefined;
  let activeButton: HTMLButtonElement | undefined;
  let activeBackend: SpeechBackend | undefined;

  const saveState = () => {
    settingsStore.save(READ_ALOUD_KEY, state, scope);
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
    activeBackend?.stop();
    activeBackend = undefined;
    clearHighlight(root);
    if (activeTarget) activeTarget.classList.remove("explainer-reading");
    if (activeButton) setButtonPlaying(activeButton, false);
    activeTarget = undefined;
    activeButton = undefined;
  };

  const pickBackend = (): SpeechBackend => {
    if (state.engine === "piper" && piperDownloaded && piperBackend.available()) return piperBackend;
    return deviceBackend;
  };

  const readTarget = (target: HTMLElement, button: HTMLButtonElement) => {
    if (activeTarget === target) {
      stop();
      return;
    }
    if (activeTarget !== undefined) stop();
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

    const backend = pickBackend();
    const currentRun = ++runId;
    activeTarget = target;
    activeButton = button;
    activeBackend = backend;
    target.classList.add("explainer-reading");
    setButtonPlaying(button, true);

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

    // Call speakAll synchronously inside the click handler so iOS Safari preserves the user gesture
    void backend
      .speakAll(
        entries.map((entry) => entry.sentence),
        { lang, rate: state.rate },
        onSegment,
      )
      .catch(() => {
        // Keep the UI clean on playback error; button resets in finally
      })
      .finally(() => {
        if (currentRun === runId) {
          clearHighlight(root);
          target.classList.remove("explainer-reading");
          setButtonPlaying(button, false);
          activeTarget = undefined;
          activeButton = undefined;
          activeBackend = undefined;
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

  const syncBlocks = () => {
    root.documentElement.classList.toggle("explainer-read-aloud-on", state.enabled);
    if (state.enabled) attachButtons();
    else {
      stop();
      removeButtons();
    }
  };

  // Start page section & configuration dialog (present only on the start page)
  const template = root.querySelector<HTMLTemplateElement>("template.explainer-read-aloud-dialog-template");
  template?.replaceWith(root.importNode(template.content, true));

  const select = root.querySelector<HTMLSelectElement>("select.explainer-read-aloud-choose");
  const choiceBox = select?.closest<HTMLElement>(".explainer-read-aloud-choice");
  const openBtn = root.querySelector<HTMLButtonElement>("button.explainer-read-aloud-config-open");
  const startHint = root.querySelector<HTMLElement>(".explainer-read-aloud-hint");
  const dialog = root.querySelector<HTMLDialogElement>("dialog.explainer-read-aloud-dialog");

  const engineButtons = dialog
    ? [...dialog.querySelectorAll<HTMLButtonElement>(".explainer-read-aloud-engine-btn")]
    : [];
  const deviceInfo = dialog?.querySelector<HTMLElement>(".explainer-read-aloud-device-info") ?? null;
  const piperInfo = dialog?.querySelector<HTMLElement>(".explainer-read-aloud-piper-info") ?? null;
  const downloadBtn = dialog?.querySelector<HTMLButtonElement>(".explainer-read-aloud-download") ?? null;
  const deleteBtn = dialog?.querySelector<HTMLButtonElement>(".explainer-read-aloud-delete") ?? null;
  const progressEl = dialog?.querySelector<HTMLProgressElement>(".explainer-read-aloud-progress") ?? null;
  const downloadStatus = dialog?.querySelector<HTMLElement>(".explainer-read-aloud-download-status") ?? null;
  const speedButtons = dialog ? [...dialog.querySelectorAll<HTMLButtonElement>(".explainer-read-aloud-rate")] : [];
  const highlightInput = dialog?.querySelector<HTMLInputElement>(".explainer-read-aloud-highlight") ?? null;
  const scopeInputs = dialog ? [...dialog.querySelectorAll<HTMLInputElement>(".explainer-read-aloud-scope")] : [];
  const enableToggle = dialog?.querySelector<HTMLInputElement>(".explainer-read-aloud-enable") ?? null;
  const enableRow = enableToggle?.closest<HTMLElement>(".explainer-read-aloud-enable-row") ?? null;
  const enableHint = dialog?.querySelector<HTMLElement>(".explainer-read-aloud-enable-hint") ?? null;

  const size = String(piperDownloadSizeMb(lang));

  const syncStartAndDialog = () => {
    if (select) {
      select.value = !state.enabled ? "off" : state.engine;
    }
    if (startHint) {
      const text = !state.enabled
        ? ""
        : message(lang, state.engine === "piper" ? "readAloudHintPiper" : "readAloudHintDevice");
      startHint.textContent = text;
      startHint.hidden = text === "";
    }
    for (const button of engineButtons) {
      const selected = button.dataset["engine"] === state.engine;
      button.setAttribute("aria-checked", String(selected));
    }
    if (deviceInfo) deviceInfo.hidden = state.engine !== "device";
    if (piperInfo) piperInfo.hidden = state.engine !== "piper";
    if (downloadBtn) {
      downloadBtn.disabled = piperDownloaded || downloading || !piperBackend.available();
      if (!downloading) {
        downloadBtn.textContent = piperDownloaded
          ? message(lang, "readAloudDownloaded")
          : message(lang, "readAloudDownload", { size });
      }
    }
    if (deleteBtn) deleteBtn.hidden = !piperDownloaded || downloading;
    for (const button of speedButtons) {
      button.setAttribute("aria-pressed", String(Number(button.dataset["rate"]) === state.rate));
    }
    if (highlightInput) highlightInput.checked = state.highlight;
    for (const input of scopeInputs) input.checked = input.value === scope;

    const blocked = state.engine === "piper" && !piperDownloaded;
    if (enableToggle) {
      enableToggle.disabled = blocked;
      enableToggle.checked = !blocked && state.enabled;
    }
    enableRow?.classList.toggle("is-disabled", blocked);
    if (enableHint) {
      enableHint.textContent = message(
        lang,
        blocked ? "readAloudEnableHintBlocked" : state.enabled ? "readAloudEnableHintOn" : "readAloudEnableHintOff",
      );
    }
  };

  if (choiceBox) choiceBox.hidden = false;

  select?.addEventListener("change", () => {
    const value = select.value;
    if (value === "off") {
      state = { ...state, enabled: false };
      saveState();
    } else if (value === "device") {
      state = { ...state, engine: "device", enabled: true };
      saveState();
    } else if (value === "piper") {
      state = { ...state, engine: "piper", enabled: piperDownloaded };
      if (piperDownloaded) saveState();
      else dialog?.showModal();
    }
    syncStartAndDialog();
    syncBlocks();
  });

  const refreshPiperStatus = () => {
    if (!piperBackend.available()) return;
    void piperBackend.isDownloaded(lang).then((cached) => {
      piperDownloaded = cached;
      syncStartAndDialog();
    });
  };

  openBtn?.addEventListener("click", () => {
    syncStartAndDialog();
    dialog?.showModal();
    refreshPiperStatus();
  });

  for (const button of engineButtons) {
    button.addEventListener("click", () => {
      const next = button.dataset["engine"] as ReadAloudEngine;
      const enabled = next === "piper" && !piperDownloaded ? false : state.enabled;
      state = { ...state, engine: next, enabled };
      saveState();
      syncStartAndDialog();
      syncBlocks();
    });
  }

  for (const button of speedButtons) {
    button.addEventListener("click", () => {
      state = { ...state, rate: Number(button.dataset["rate"]) || 1 };
      saveState();
      syncStartAndDialog();
    });
  }

  highlightInput?.addEventListener("change", () => {
    state = { ...state, highlight: highlightInput.checked };
    saveState();
    if (!state.highlight) clearHighlight(root);
    syncStartAndDialog();
  });

  for (const input of scopeInputs) {
    input.addEventListener("change", () => {
      if (!input.checked) return;
      scope = input.value === "app" ? "app" : "archetype";
      saveState();
      syncStartAndDialog();
    });
  }

  enableToggle?.addEventListener("change", () => {
    if (enableToggle.disabled) return;
    state = { ...state, enabled: enableToggle.checked };
    saveState();
    syncStartAndDialog();
    syncBlocks();
  });

  downloadBtn?.addEventListener("click", () => {
    if (downloading || piperDownloaded) return;
    downloading = true;
    if (progressEl) {
      progressEl.value = 0;
      progressEl.hidden = false;
    }
    if (downloadStatus) downloadStatus.textContent = message(lang, "readAloudDownloading", { percent: "0" });
    syncStartAndDialog();
    void piperBackend
      .download(lang, ({ percent }) => {
        if (progressEl) progressEl.value = percent;
        if (downloadStatus)
          downloadStatus.textContent = message(lang, "readAloudDownloading", { percent: String(percent) });
      })
      .then(() => {
        downloading = false;
        piperDownloaded = true;
        if (progressEl) progressEl.hidden = true;
        if (downloadStatus) downloadStatus.textContent = message(lang, "readAloudDownloadDone");
        syncStartAndDialog();
      })
      .catch(() => {
        downloading = false;
        if (progressEl) progressEl.hidden = true;
        if (downloadStatus) downloadStatus.textContent = message(lang, "readAloudDownloadFailed");
        syncStartAndDialog();
      });
  });

  deleteBtn?.addEventListener("click", () => {
    void piperBackend.remove(lang).then(() => {
      piperDownloaded = false;
      if (state.engine === "piper") {
        state = { ...state, enabled: false };
        saveState();
      }
      if (downloadStatus) downloadStatus.textContent = message(lang, "readAloudDeleted");
      syncStartAndDialog();
      syncBlocks();
    });
  });

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

  win?.addEventListener("pagehide", stop);

  syncStartAndDialog();
  syncBlocks();

  // Check local CacheStorage (no network) only when the learner already chose the Piper AI voice
  if (state.engine === "piper") refreshPiperStatus();
}
