// The audio files of an app (src/audio/<name>.mp3) and what they say about themselves. Every file carries its marking
// as ID3v2 frames, because the EU AI Act asks for machine-readable marking of synthetic speech (Article 50(2)): that it
// is AI-generated, by which model and voice, under which licence, and the text it speaks. The build reads them here
// and stops when a required one is missing (dec-audio-metadata). Pure and without Node, so a test and the browser's
// modules may import it; the file is read by the caller.

/** The frames the files carry, by the name the build uses: ID3 frames TLAN, TCOP, TDRC and TXXX:lernapps-… . */
export interface AudioMeta {
  /** ISO 639-2 code of the spoken language (TLAN): fra, eng, spa, ita. */
  language: string;
  /** The licence of the file (TCOP), e.g. "CC BY-SA 4.0". */
  licence: string;
  /** The day the file was made (TDRC), e.g. "2026-11-12". */
  date: string;
  /** Whether a model made the voice (lernapps-synthetic: true or false). */
  synthetic: boolean;
  /** The IPTC value for the kind of source (lernapps-digital-source-type). */
  digitalSourceType: string;
  /** The model with its version (lernapps-model); of a synthetic voice. */
  model?: string;
  /** The voice (lernapps-voice); of a synthetic voice. */
  voice?: string;
  /** The tool that made the file (lernapps-generator); of a synthetic voice. */
  generator?: string;
  /** The credit its data source asks for, or "none" (lernapps-attribution); of a synthetic voice. */
  attribution?: string;
  /** The spoken text (lernapps-text): the transcript the player offers. */
  text: string;
}

/** The IPTC digital source type of speech that a trained model made. */
export const TRAINED_ALGORITHMIC_MEDIA = "http://cv.iptc.org/newscodes/digitalsourcetype/trainedAlgorithmicMedia";

/** The languages of the files, as ISO 639-2 codes, by the two-letter code of the app's languages. */
export const AUDIO_LANGUAGES: Readonly<Record<string, string>> = {
  de: "deu",
  en: "eng",
  fr: "fra",
  es: "spa",
  it: "ita",
};

/** The two-letter code of a language that an audio file names with its ISO 639-2 code, else the code itself. */
export const languageOfAudio = (code: string): string =>
  Object.entries(AUDIO_LANGUAGES).find(([, three]) => three === code)?.[0] ?? code;

/** The frames of a file: TXXX by its description ("lernapps-model"), the other frames by their id ("TLAN"). */
export type Id3Frames = ReadonlyMap<string, string>;

const decoders: Record<number, (bytes: Uint8Array) => string> = {
  0: (bytes) => new TextDecoder("iso-8859-1").decode(bytes),
  1: (bytes) => new TextDecoder(bytes[0] === 0xff && bytes[1] === 0xfe ? "utf-16le" : "utf-16be").decode(bytes),
  2: (bytes) => new TextDecoder("utf-16be").decode(bytes),
  3: (bytes) => new TextDecoder("utf-8").decode(bytes),
};

/** The text of a frame's body after its encoding byte, without the terminating zero. */
function decode(encoding: number, bytes: Uint8Array): string {
  const decoder = decoders[encoding] ?? decoders[0]!;
  return decoder(bytes).replace(/\0+$/, "").replace(/^﻿/, "");
}

/** The index where a zero ends the text in `bytes` from `from`, for the encoding (two bytes for UTF-16). */
function terminator(encoding: number, bytes: Uint8Array, from: number): number {
  const wide = encoding === 1 || encoding === 2;
  for (let index = from; index < bytes.length; index += wide ? 2 : 1) {
    if (bytes[index] === 0 && (!wide || bytes[index + 1] === 0)) return index;
  }
  return bytes.length;
}

/** The number a synchsafe integer of four bytes holds (seven bits each). */
const synchsafe = (bytes: Uint8Array, at: number): number =>
  ((bytes[at] ?? 0) << 21) | ((bytes[at + 1] ?? 0) << 14) | ((bytes[at + 2] ?? 0) << 7) | (bytes[at + 3] ?? 0);

/** What `readId3` found: the frames, the size of the tag, or why the file has no usable tag. */
export type Id3 = { frames: Id3Frames; size: number } | { problem: string };

/** Reads the ID3v2.3 or v2.4 tag at the start of `bytes`. Frames it does not know (a C2PA manifest) are skipped. */
export function readId3(bytes: Uint8Array): Id3 {
  if (bytes.length < 10 || bytes[0] !== 0x49 || bytes[1] !== 0x44 || bytes[2] !== 0x33) {
    return { problem: "has no ID3 tag, so it carries no marking" };
  }
  const version = bytes[3] ?? 0;
  if (version !== 3 && version !== 4) return { problem: `has an ID3v2.${version} tag; write ID3v2.3 or v2.4` };
  const flags = bytes[5] ?? 0;
  const size = synchsafe(bytes, 6);
  let tag = bytes.subarray(10, 10 + size);
  if ((flags & 0x80) !== 0) {
    // the whole tag is unsynchronised: 0xFF 0x00 stands for 0xFF
    const clean: number[] = [];
    for (let index = 0; index < tag.length; index += 1) {
      clean.push(tag[index] ?? 0);
      if (tag[index] === 0xff && tag[index + 1] === 0x00) index += 1;
    }
    tag = Uint8Array.from(clean);
  }
  let at = 0;
  if ((flags & 0x40) !== 0) {
    // an extended header comes first: its size is synchsafe in v2.4 and without its own four bytes in v2.3
    at = version === 4 ? synchsafe(tag, 0) : 4 + new DataView(tag.buffer, tag.byteOffset).getUint32(0);
  }
  const frames = new Map<string, string>();
  while (at + 10 <= tag.length && tag[at] !== 0) {
    const id = String.fromCharCode(tag[at] ?? 0, tag[at + 1] ?? 0, tag[at + 2] ?? 0, tag[at + 3] ?? 0);
    const length =
      version === 4 ? synchsafe(tag, at + 4) : new DataView(tag.buffer, tag.byteOffset + at + 4).getUint32(0);
    const body = tag.subarray(at + 10, at + 10 + length);
    at += 10 + length;
    if (body.length === 0 || (id[0] !== "T" && id[0] !== "W")) continue;
    const encoding = body[0] ?? 0;
    if (id === "TXXX") {
      const end = terminator(encoding, body, 1);
      const wide = encoding === 1 || encoding === 2;
      const description = decode(encoding, body.subarray(1, end));
      if (description !== "") frames.set(description, decode(encoding, body.subarray(end + (wide ? 2 : 1))));
    } else if (id[0] === "T" && !frames.has(id)) {
      frames.set(id, decode(encoding, body.subarray(1)));
    }
  }
  return { frames, size: 10 + size };
}

/** Whether the bytes after the tag begin like MPEG audio (an 11-bit frame sync). */
export function isMpegAudio(bytes: Uint8Array, from: number): boolean {
  // skip zero padding that the tag may end with
  let at = from;
  while (at < bytes.length && bytes[at] === 0) at += 1;
  return (bytes[at] ?? 0) === 0xff && ((bytes[at + 1] ?? 0) & 0xe0) === 0xe0;
}

/** A required frame and the name the author knows it by. */
const REQUIRED: readonly { key: string; name: string }[] = [
  { key: "TLAN", name: "language (TLAN)" },
  { key: "TCOP", name: "licence (TCOP)" },
  { key: "TDRC", name: "date (TDRC)" },
  { key: "lernapps-synthetic", name: "lernapps-synthetic" },
  { key: "lernapps-digital-source-type", name: "lernapps-digital-source-type" },
  { key: "lernapps-text", name: "lernapps-text" },
];

/** The frames of a synthetic voice, besides the required ones. */
const SYNTHETIC: readonly string[] = ["lernapps-model", "lernapps-voice", "lernapps-generator", "lernapps-attribution"];

/** What the file says about itself, or what is wrong with it. */
export type AudioRead = { meta: AudioMeta; problems: [] } | { meta?: undefined; problems: string[] };

/** The problem about a missing frame: what to do about it. */
const missing = (name: string): string =>
  `${name} is missing; the file must carry the marking of AI-generated audio: generate it again with the audio skill (lernapps-audio) and do not edit its tags with another tool`;

/** Reads the marking of the file `bytes` and checks that every required frame is there. */
export function readAudio(bytes: Uint8Array): AudioRead {
  const id3 = readId3(bytes);
  if ("problem" in id3) return { problems: [id3.problem] };
  const { frames } = id3;
  const problems: string[] = [];
  if (!isMpegAudio(bytes, id3.size))
    problems.push("is not an MP3 file; src/audio/ holds MP3 files made by the audio skill");
  for (const { key, name } of REQUIRED) {
    if ((frames.get(key) ?? "").trim() === "") problems.push(missing(name));
  }
  const synthetic = frames.get("lernapps-synthetic");
  if (synthetic !== undefined && synthetic !== "true" && synthetic !== "false") {
    problems.push(`lernapps-synthetic is "${synthetic}"; it is true for a voice a model made, false for a human voice`);
  }
  if (synthetic === "true") {
    for (const key of SYNTHETIC) if ((frames.get(key) ?? "").trim() === "") problems.push(missing(key));
    const kind = frames.get("lernapps-digital-source-type");
    if (kind !== undefined && kind !== TRAINED_ALGORITHMIC_MEDIA) {
      problems.push(`lernapps-digital-source-type is "${kind}"; speech a model made is ${TRAINED_ALGORITHMIC_MEDIA}`);
    }
  }
  if (problems.length > 0) return { problems };
  const get = (key: string): string => frames.get(key) ?? "";
  return {
    meta: {
      language: get("TLAN"),
      licence: get("TCOP"),
      date: get("TDRC"),
      synthetic: synthetic === "true",
      digitalSourceType: get("lernapps-digital-source-type"),
      ...(get("lernapps-model") === "" ? {} : { model: get("lernapps-model") }),
      ...(get("lernapps-voice") === "" ? {} : { voice: get("lernapps-voice") }),
      ...(get("lernapps-generator") === "" ? {} : { generator: get("lernapps-generator") }),
      ...(get("lernapps-attribution") === "" ? {} : { attribution: get("lernapps-attribution") }),
      text: get("lernapps-text"),
    },
    problems: [],
  };
}

/** The media type of the audio files. */
export const AUDIO_TYPE = "audio/mpeg";

/**
 * The bytes a `Range` request header asks for, both ends included: "bytes=0-99", "bytes=100-" (to the end), "bytes=-50"
 * (the last 50). Undefined when there is no usable header (the whole file is sent), "invalid" when the range lies
 * outside the file (the answer is 416). Only the first range of a list counts.
 */
export function byteRange(
  header: string | undefined,
  size: number,
): { start: number; end: number } | "invalid" | undefined {
  const match = /^bytes=(\d*)-(\d*)/.exec(header ?? "");
  if (match === null || (match[1] === "" && match[2] === "")) return undefined;
  let start: number;
  let end: number;
  if (match[1] === "") {
    const last = Number(match[2]);
    start = Math.max(0, size - last);
    end = size - 1;
  } else {
    start = Number(match[1]);
    end = match[2] === "" ? size - 1 : Math.min(Number(match[2]), size - 1);
  }
  return start > end || start >= size ? "invalid" : { start, end };
}
