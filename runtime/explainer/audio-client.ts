// The audio files of a page in the browser (explainer.ts; dec-audio-player): the player is the browser's own and works
// without this module. This adds the tempo the learner chose (0.75, 1, 1.25 times the speed, the pitch kept) to every
// player of the page, also to those a task writes later, and lets one player stop the others. One listener on the
// document does it, because a task builds its prompt, and so its player, after the page has loaded. The choice lasts
// until the page is left; nothing is stored.

/** The tempo the learner chose, as a factor of the speed of the recording. */
let tempo = 1;

/** Sets the tempo of `audio`, keeping its pitch, and presses the button of that tempo in its player. */
function apply(audio: HTMLAudioElement): void {
  audio.preservesPitch = true;
  audio.playbackRate = tempo;
  pressed(audio.closest(".explainer-audio") ?? audio);
}

/** Presses the tempo button of the chosen tempo in `scope`, and no other. */
function pressed(scope: ParentNode): void {
  for (const button of scope.querySelectorAll<HTMLButtonElement>(".explainer-audio-speed button[data-speed]")) {
    button.setAttribute("aria-pressed", String(Number(button.dataset["speed"]) === tempo));
  }
}

/** Makes the tempo buttons and the players of `root` work. */
export function startAudio(root: Document = document): void {
  // media events do not bubble: catch them on the way down
  root.addEventListener(
    "loadedmetadata",
    (event) => {
      if (event.target instanceof HTMLAudioElement) apply(event.target);
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
