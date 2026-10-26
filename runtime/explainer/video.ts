// The video block of an explainer: a YouTube video behind two clicks. Nothing loads from YouTube or Google before the
// learner asks for it. The build writes a figure with the video's title as a plain link to its page on youtube.com,
// its channel and a note that playing it sends data to YouTube/Google, among them the learner's IP address: that is
// the whole video without JavaScript. No thumbnail, as YouTube's would load before a click. The client module then
// shows the button "Video abspielen", which puts the player of youtube-nocookie.com into the figure, and the choice
// "Videos immer direkt laden". That choice is kept on the device (@lernapps/tooling/storage, the app's own prefix),
// is the same for every video of the app, loads each player without the click from then on, and goes when the learner
// clears it. The tutor page names the video in its section as a link with title and channel (videoLine). Browser-safe:
// render.ts writes the figure at build, explainer.ts starts it in the browser.
import { createStorage } from "@lernapps/tooling/storage";
import type { BlockOf } from "./content.ts";
import { escape } from "../shared/html.ts";
import { message } from "./messages.ts";

const YOUTUBE_ID = /^[A-Za-z0-9_-]{11}$/;

/** Whether `id` is a YouTube id: 11 letters, digits, - or _. */
export const isYoutubeId = (id: unknown): id is string => typeof id === "string" && YOUTUBE_ID.test(id);

function checked(id: string): string {
  if (!isYoutubeId(id)) throw new Error(`${JSON.stringify(id)} is no YouTube id`);
  return id;
}

/** The video's page on YouTube, which the link opens: no request before the learner clicks it. */
export const watchAddress = (id: string): string => `https://www.youtube.com/watch?v=${checked(id)}`;

/** The player of the video on youtube-nocookie.com, which starts at once when the learner clicked for it. */
export const embedAddress = (id: string, autoplay: boolean): string =>
  `https://www.youtube-nocookie.com/embed/${checked(id)}${autoplay ? "?autoplay=1" : ""}`;

/** A text as Markdown that shows it as written: its brackets, emphasis, code, formulas and HTML escaped. */
const literal = (text: string) =>
  text
    .replace(/\s+/g, " ")
    .trim()
    .replace(/[\\`*_[\]<&$]/g, "\\$&");

/**
 * The video as a KI tutor reads it in the page's content (tutor.ts): one line, `word` (e.g. "Video"), the title as a
 * link to its page on YouTube, and the channel. A source the tutor can name; it cannot watch the video.
 */
export const videoLine = (block: BlockOf<"video">, word: string): string =>
  `${word}: [${literal(block.title)}](${watchAddress(block.youtube)}), ${literal(block.channel)} (YouTube)`;

/** The key "Videos immer direkt laden" is kept under on the device, for every video of the app. */
export const VIDEO_KEY = "videos-direct";

/**
 * A video block as the build writes it: a figure with the title as a link to YouTube and the channel as its caption,
 * the note on privacy, and the button and the choice, hidden until the client module runs. `storage` is the app's
 * name for what it keeps on the device.
 */
export function renderVideo(block: BlockOf<"video">, lang: string, storage: string): string {
  const t = (key: "videoNote" | "videoPlay" | "videoAlways") => escape(message(lang, key));
  return [
    `<figure class="explainer-video" data-youtube="${escape(block.youtube)}" data-storage="${escape(storage)}">`,
    `<figcaption><a class="explainer-video-link" href="${escape(watchAddress(block.youtube))}" rel="noopener">${escape(block.title)}</a>`,
    ` <span class="explainer-video-channel">${escape(message(lang, "videoChannel", { channel: block.channel }))}</span></figcaption>`,
    `<p class="explainer-video-note">${t("videoNote")}</p>`,
    `<p class="explainer-video-controls" hidden><button type="button" class="explainer-video-play">${t("videoPlay")}</button>`,
    ` <label class="explainer-video-always"><input type="checkbox"> ${t("videoAlways")}</label></p>`,
    `</figure>`,
  ].join("");
}

const isTrue = (value: unknown): value is true => value === true;

/**
 * Puts the player of the video into its figure, above the caption, in place of the button. After a click it starts
 * at once and gets the focus; loaded directly, it waits to be scrolled near and to be started.
 */
function loadPlayer(figure: HTMLElement, id: string, clicked: boolean): void {
  if (figure.querySelector("iframe")) return;
  const document = figure.ownerDocument;
  const frame = document.createElement("div");
  frame.className = "explainer-video-frame";
  const player = document.createElement("iframe");
  player.src = embedAddress(id, clicked);
  player.title = figure.querySelector(".explainer-video-link")?.textContent ?? "";
  player.allow = "autoplay; encrypted-media; picture-in-picture; fullscreen";
  player.allowFullscreen = true;
  // YouTube learns the app's origin, never the page's address with its task numbers or von=tutor
  player.referrerPolicy = "strict-origin-when-cross-origin";
  if (!clicked) player.loading = "lazy";
  frame.append(player);
  figure.prepend(frame);
  figure.querySelector(".explainer-video-play")?.remove();
  if (clicked) player.focus();
}

/**
 * Starts every video of the page: the button and the choice show; the button loads the player. The choice is kept
 * on the device as soon as the learner ticks it, goes as soon as they untick it, and is shown alike on every video of
 * the page; while it is kept, each player loads without the click.
 */
export function startVideos(root: Document): void {
  const figures = [...root.querySelectorAll<HTMLElement>("figure.explainer-video")];
  const boxes = figures.flatMap((figure) => [
    ...figure.querySelectorAll<HTMLInputElement>(".explainer-video-always input"),
  ]);
  for (const figure of figures) {
    const id = figure.dataset["youtube"];
    const controls = figure.querySelector<HTMLElement>(".explainer-video-controls");
    if (!isYoutubeId(id) || !controls) continue;
    const storage = createStorage(figure.dataset["storage"] ?? "explainer");
    const box = controls.querySelector<HTMLInputElement>("input");
    const direct = storage.load(VIDEO_KEY, isTrue) === true;
    if (box) {
      box.checked = direct;
      box.addEventListener("change", () => {
        if (box.checked) storage.save(VIDEO_KEY, true);
        else storage.remove(VIDEO_KEY);
        for (const other of boxes) other.checked = box.checked;
      });
    }
    controls
      .querySelector(".explainer-video-play")
      ?.addEventListener("click", () => loadPlayer(figure, id, true), { once: true });
    controls.hidden = false;
    if (direct) loadPlayer(figure, id, false);
  }
}
