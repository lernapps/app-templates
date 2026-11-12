// A speaking task in the browser (explainer.ts; dec-speaking-task): the learner hears the model, records themself with the
// microphone, listens to the original, to their own recording or to both one after the other, and rates how their
// pronunciation sounds: the same as the original (right), understandable but bumpy (partly right) or again (wrong). The
// page checks nothing. The microphone is asked for only when the learner presses "Aufnehmen". The recording is a Blob in the
// browser's memory, played through an object URL: never stored, never sent, dropped when the learner records again or
// leaves the page, and the microphone is released as soon as the recording stops. Without a microphone, or when it is
// refused, the learner says it aloud and compares with the original, and still rates.
import type { SpeakingTaskData } from "./exercises.ts";
import { escape } from "../shared/html.ts";

type Rating = "same" | "bumpy" | "again";
const RATINGS: readonly Rating[] = ["same", "bumpy", "again"];

export interface SpeakingTaskOptions {
  /** Every sentence is rated: whether all sound the same, the input as text, and what the page said. */
  onResult?: (right: boolean, input: string, said: string) => void;
}

/** The longest recording, in milliseconds: a sentence, not a speech. */
const LONGEST = 60_000;
/** The pause between the original and the recording when both play, in milliseconds. */
const PAUSE = 500;

/** The recording format this browser can make, in the order of what plays best everywhere. */
function recordingType(): string | undefined {
  return ["audio/webm;codecs=opus", "audio/webm", "audio/mp4", "audio/ogg;codecs=opus"].find((type) =>
    MediaRecorder.isTypeSupported(type),
  );
}

/** Makes a speaking task live in `element`. */
export function startSpeakingTask(
  element: HTMLElement,
  data: SpeakingTaskData,
  options: SpeakingTaskOptions = {},
): void {
  const live = element.querySelector<HTMLElement>(".explainer-speaking-live");
  if (!live) return;
  const { texts } = data;
  const t = (key: keyof typeof texts, params: Readonly<Record<string, string>> = {}) =>
    texts[key].replace(/\{(\w+)\}/g, (placeholder, name: string) => params[name] ?? placeholder);
  const ratingTexts: Record<Rating, string> = { same: t("speakSame"), bumpy: t("speakBumpy"), again: t("speakAgain") };
  const id = data.id;
  const items = data.items;
  const ratings: (Rating | undefined)[] = items.map(() => undefined);
  const recorded: boolean[] = items.map(() => false);
  const urls: (string | undefined)[] = items.map(() => undefined);
  let recording: { index: number; recorder: MediaRecorder; stream: MediaStream; timer: number } | undefined;
  let playing = 0;

  live.innerHTML = [
    `<p class="explainer-speaking-privacy">${escape(t("speakPrivacy"))}</p>`,
    `<ol class="explainer-speaking-items">`,
    ...items.map((item, index) =>
      [
        `<li class="explainer-speaking-item" data-item="${index}">`,
        `<p class="explainer-speaking-title"><strong>${escape(t("speakItem", { n: String(index + 1) }))}</strong></p>`,
        `<div class="explainer-speaking-model">${item.player}${
          item.text === undefined
            ? ""
            : ` <span class="explainer-speaking-sentence" lang="${escape(data.language)}">${escape(item.text)}</span>`
        }</div>`,
        `<p class="explainer-speaking-controls"><button type="button" class="explainer-speaking-record">${escape(t("speakRecord"))}</button> <span class="explainer-speaking-status" role="status"></span></p>`,
        `<div class="explainer-speaking-mine" hidden>`,
        `<audio controls preload="metadata" aria-label="${escape(t("speakMine"))}"></audio>`,
        `<div role="group" aria-label="${escape(t("speakCompare"))}" class="explainer-speaking-compare">`,
        `<button type="button" data-play="original">${escape(t("speakOriginal"))}</button>`,
        `<button type="button" data-play="mine">${escape(t("speakMine"))}</button>`,
        `<button type="button" data-play="both">${escape(t("speakBoth"))}</button>`,
        `</div></div>`,
        `<p class="explainer-speaking-nomic" hidden>${escape(t("speakNoMic"))} <button type="button" class="explainer-speaking-spoken">${escape(t("speakSpoken"))}</button></p>`,
        `<fieldset class="explainer-speaking-rate" hidden><legend>${escape(t("speakRate"))}</legend>`,
        ...RATINGS.map(
          (rating) =>
            `<label><input type="radio" name="${escape(id)}-${index}" value="${rating}"> ${escape(ratingTexts[rating])}</label>`,
        ),
        `</fieldset>`,
        `</li>`,
      ].join(""),
    ),
    `</ol>`,
    `<p class="explainer-speaking-result" role="status"></p>`,
  ].join("");
  live.hidden = false;
  element.querySelector<HTMLElement>(".explainer-speaking-static")?.setAttribute("hidden", "");
  element.querySelector<HTMLElement>(".explainer-speaking-nojs")?.setAttribute("hidden", "");

  const rows = [...live.querySelectorAll<HTMLElement>(".explainer-speaking-item")];
  const part = <T extends HTMLElement>(index: number, selector: string): T => {
    const found = rows[index]?.querySelector<T>(selector);
    if (!found) throw new Error(`speaking task ${id}: ${selector} is missing`);
    return found;
  };
  const original = (index: number) => part<HTMLAudioElement>(index, ".explainer-speaking-model audio");
  const mine = (index: number) => part<HTMLAudioElement>(index, ".explainer-speaking-mine audio");
  const status = (index: number, text: string) => {
    part(index, ".explainer-speaking-status").textContent = text;
  };

  /** Stops every player of the task, and whatever "both" still has to play. */
  const silence = () => {
    playing += 1;
    for (const audio of live.querySelectorAll("audio")) audio.pause();
  };

  /** The state of the whole task once every sentence is rated; else nothing. */
  const report = () => {
    const rated = ratings.filter((rating): rating is Rating => rating !== undefined);
    const target = live.querySelector<HTMLElement>(".explainer-speaking-result");
    if (!target || rated.length < items.length) {
      if (target) target.textContent = "";
      return;
    }
    const right = rated.every((rating) => rating === "same");
    const wrong = rated.every((rating) => rating === "again");
    const said = right ? t("speakAllRight") : wrong ? t("speakWrong") : t("speakSomeRight");
    target.textContent = said;
    const input = rated
      .map((rating, index) =>
        t("speakResultLine", {
          n: t("speakItem", { n: String(index + 1) }),
          rating: ratingTexts[rating],
          recorded: recorded[index] ? t("speakResultRecorded") : t("speakResultNotRecorded"),
        }),
      )
      .join("; ");
    options.onResult?.(right, input, said);
  };

  const showRating = (index: number) => {
    part(index, ".explainer-speaking-rate").hidden = false;
  };

  /** A recording of sentence `index` is ready: offer it, the comparison and the rating. */
  const keep = (index: number, blob: Blob) => {
    const url = urls[index];
    if (url !== undefined) URL.revokeObjectURL(url);
    const next = URL.createObjectURL(blob);
    urls[index] = next;
    const player = mine(index);
    player.src = next;
    part(index, ".explainer-speaking-mine").hidden = false;
    part(index, ".explainer-speaking-nomic").hidden = true;
    recorded[index] = true;
    part<HTMLButtonElement>(index, ".explainer-speaking-record").textContent = t("speakRerecord");
    status(index, "");
    showRating(index);
  };

  /** No microphone, or none allowed: the learner says it aloud, compares by ear, and rates. */
  const withoutMicrophone = (index: number) => {
    part(index, ".explainer-speaking-nomic").hidden = false;
    part<HTMLButtonElement>(index, ".explainer-speaking-record").textContent = t("speakRecord");
    status(index, "");
  };

  const finish = () => {
    if (!recording) return;
    window.clearTimeout(recording.timer);
    if (recording.recorder.state !== "inactive") recording.recorder.stop();
  };

  const record = async (index: number) => {
    if (recording) {
      const same = recording.index === index;
      finish();
      if (same) return;
    }
    silence();
    if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === "undefined") {
      withoutMicrophone(index);
      return;
    }
    let stream: MediaStream;
    try {
      stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    } catch {
      withoutMicrophone(index);
      return;
    }
    const type = recordingType();
    const recorder = type === undefined ? new MediaRecorder(stream) : new MediaRecorder(stream, { mimeType: type });
    const chunks: Blob[] = [];
    recorder.ondataavailable = (event) => {
      if (event.data.size > 0) chunks.push(event.data);
    };
    recorder.onstop = () => {
      // release the microphone at once: the browser's recording sign goes off
      for (const track of stream.getTracks()) track.stop();
      recording = undefined;
      if (chunks.length > 0) keep(index, new Blob(chunks, { type: recorder.mimeType }));
      else withoutMicrophone(index);
    };
    recording = { index, recorder, stream, timer: window.setTimeout(finish, LONGEST) };
    part<HTMLButtonElement>(index, ".explainer-speaking-record").textContent = t("speakStop");
    status(index, t("speakRecording"));
    recorder.start();
  };

  const play = (index: number, what: "original" | "mine" | "both") => {
    silence();
    const token = playing;
    const first = original(index);
    const second = mine(index);
    const start = (audio: HTMLAudioElement) => {
      audio.currentTime = 0;
      void audio.play().catch(() => undefined);
    };
    if (what === "original") start(first);
    else if (what === "mine") start(second);
    else {
      start(first);
      first.addEventListener(
        "ended",
        () => {
          // another press has taken over: the second part does not play
          if (token === playing) window.setTimeout(() => token === playing && start(second), PAUSE);
        },
        { once: true },
      );
    }
  };

  rows.forEach((row, index) => {
    row.querySelector(".explainer-speaking-record")?.addEventListener("click", () => void record(index));
    row.querySelector(".explainer-speaking-spoken")?.addEventListener("click", () => showRating(index));
    for (const button of row.querySelectorAll<HTMLButtonElement>("[data-play]")) {
      button.addEventListener("click", () => play(index, button.dataset["play"] as "original" | "mine" | "both"));
    }
    for (const radio of row.querySelectorAll<HTMLInputElement>("input[type=radio]")) {
      radio.addEventListener("change", () => {
        ratings[index] = radio.value as Rating;
        report();
      });
    }
  });

  // nothing of a recording outlives the page
  window.addEventListener("pagehide", () => {
    finish();
    for (const url of urls) if (url !== undefined) URL.revokeObjectURL(url);
  });
}
