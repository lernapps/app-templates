// The audio files of a page in the browser (explainer.ts; dec-audio-player): the player is the browser's own and works
// without this module. Where the browser's control has no tempo menu (iPhone, iPad), this shows buttons for three tempos
// (0.75, 1, 1.25 times the speed, the pitch kept) next to the player, and they set the tempo
// of every player of the page, also of those a task writes later, and lets one player stop the others. The browser's own
// control may have a tempo menu as well (Chrome's does): the two stay one, because a change in the control is read from the
// players (`ratechange`), taken as the tempo of the page and shown on the buttons, which press none when the tempo is
// another than theirs (0.5, 1.5). One listener on the document does it, because a task builds its prompt, and so its
// player, after the page has loaded. The tempo lasts until the page is left; nothing is stored.

/** The tempo of the page, as a factor of the speed of the recording: the last one chosen, with a button or in a control. */
let tempo = 1;

/** Presses the button of the tempo in `scope`, and no other (none when no button has this tempo). */
function pressed(scope: ParentNode): void {
  for (const button of scope.querySelectorAll<HTMLButtonElement>(".explainer-audio-speed button[data-speed]")) {
    button.setAttribute("aria-pressed", String(Number(button.dataset["speed"]) === tempo));
  }
}

/**
 * Gives `audio` the tempo of the page, keeping its pitch. The default rate too: the browser sets a player back to it when the
 * player loads a file, and that must not look like a tempo chosen in the control.
 */
export function applyTempo(audio: HTMLAudioElement): void {
  audio.preservesPitch = true;
  audio.defaultPlaybackRate = tempo;
  if (audio.playbackRate !== tempo) audio.playbackRate = tempo;
}

/** Gives `audio` the tempo of the page and shows it on the buttons of its player. */
function apply(audio: HTMLAudioElement): void {
  applyTempo(audio);
  pressed(audio.closest(".explainer-audio") ?? audio);
}

/**
 * Whether the page shows its own tempo buttons: only where the browser's audio control is known to have no tempo menu, on an
 * iPhone or an iPad (every browser there is WebKit with the system's control). Chrome, Edge, Safari and Firefox on a computer
 * have a tempo menu (Firefox in the context menu), and so has Chrome on Android. An iPad that says it is a Mac is told by its
 * touch screen.
 */
export function needsTempoButtons(userAgent: string, touchPoints = 0): boolean {
  return /\b(iPhone|iPad|iPod)\b/.test(userAgent) || (/\bMacintosh\b/.test(userAgent) && touchPoints > 1);
}

/** Makes the tempo buttons and the players of `root` work. */
export function startAudio(root: Document = document): void {
  // the buttons only where the control has no tempo menu of its own (iPhone, iPad): one control for one thing
  const browser = root.defaultView?.navigator;
  if (needsTempoButtons(browser?.userAgent ?? "", browser?.maxTouchPoints ?? 0)) {
    root.documentElement.classList.add("explainer-tempo");
  }
  // media events do not bubble: catch them on the way down
  root.addEventListener(
    "loadedmetadata",
    (event) => {
      if (event.target instanceof HTMLAudioElement) apply(event.target);
    },
    true,
  );
  root.addEventListener(
    "ratechange",
    (event) => {
      const changed = event.target;
      // a rate that is not the page's tempo was chosen in the browser's control: it becomes the page's tempo
      if (!(changed instanceof HTMLAudioElement) || changed.playbackRate === tempo) return;
      tempo = changed.playbackRate;
      for (const audio of root.querySelectorAll("audio")) apply(audio);
      pressed(root);
    },
    true,
  );
  root.addEventListener(
    "play",
    (event) => {
      const playing = event.target;
      if (!(playing instanceof HTMLAudioElement)) return;
      apply(playing);
      for (const other of root.querySelectorAll("audio")) if (other !== playing && !other.paused) other.pause();
    },
    true,
  );
  root.addEventListener("click", (event) => {
    const button =
      event.target instanceof Element ? event.target.closest<HTMLButtonElement>("button[data-speed]") : null;
    if (button === null || button.closest(".explainer-audio-speed") === null) return;
    tempo = Number(button.dataset["speed"]) || 1;
    pressed(root);
    for (const audio of root.querySelectorAll("audio")) apply(audio);
  });
}
