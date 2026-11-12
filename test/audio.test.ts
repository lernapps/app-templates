// The marking of an audio file (runtime/shared/audio.ts, dec-audio-metadata): the ID3 frames the audio skill writes and
// the build requires. The fixtures are 0.4 s tones made with ffmpeg and tagged as the skill tags a file.
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, test } from "vite-plus/test";
import { byteRange, isMpegAudio, readAudio, readId3, TRAINED_ALGORITHMIC_MEDIA } from "../runtime/shared/audio.ts";

const fixture = (name: string): Uint8Array => readFileSync(join(import.meta.dirname, "fixtures/audio", name));

describe("the frames of an audio file", () => {
  test("reads the standard frames and the custom ones, with their text as written", () => {
    const id3 = readId3(fixture("je-mappelle.mp3"));
    if ("problem" in id3) throw new Error(id3.problem);
    expect(id3.frames.get("TLAN")).toBe("fra");
    expect(id3.frames.get("TCOP")).toBe("CC BY-SA 4.0");
    expect(id3.frames.get("TDRC")).toBe("2026-11-12");
    expect(id3.frames.get("lernapps-text")).toBe("Je m'appelle Marie.");
    expect(id3.frames.get("lernapps-digital-source-type")).toBe(TRAINED_ALGORITHMIC_MEDIA);
  });

  test("MPEG audio follows the tag", () => {
    const bytes = fixture("je-mappelle.mp3");
    const id3 = readId3(bytes);
    if ("problem" in id3) throw new Error(id3.problem);
    expect(isMpegAudio(bytes, id3.size)).toBe(true);
    expect(isMpegAudio(new Uint8Array([0x49, 0x44, 0x33, 4, 0, 0, 0, 0, 0, 0, 1, 2, 3]), 10)).toBe(false);
  });

  test("a file without an ID3 tag says so", () => {
    expect(readId3(fixture("sans-balises.mp3"))).toEqual({ problem: "has no ID3 tag, so it carries no marking" });
    expect(readId3(new Uint8Array([1, 2, 3]))).toHaveProperty("problem");
  });

  test("an unsupported ID3 version is named", () => {
    const old = new Uint8Array([0x49, 0x44, 0x33, 2, 0, 0, 0, 0, 0, 0]);
    expect(readId3(old)).toEqual({ problem: "has an ID3v2.2 tag; write ID3v2.3 or v2.4" });
  });
});

describe("what the build requires of a file", () => {
  test("a marked file gives its meta", () => {
    const read = readAudio(fixture("je-mappelle.mp3"));
    expect(read.problems).toEqual([]);
    expect(read.meta).toEqual({
      language: "fra",
      licence: "CC BY-SA 4.0",
      date: "2026-11-12",
      synthetic: true,
      digitalSourceType: TRAINED_ALGORITHMIC_MEDIA,
      model: "test-fixture",
      voice: "test-tone",
      generator: "fixture 1",
      attribution: "none",
      text: "Je m'appelle Marie.",
    });
  });

  test("a missing frame is a problem that says what to do", () => {
    const read = readAudio(fixture("sans-texte.mp3"));
    expect(read.meta).toBeUndefined();
    expect(read.problems).toHaveLength(1);
    expect(read.problems[0]).toMatch(/^lernapps-text is missing; .*audio skill \(lernapps-audio\)/);
  });

  test("a file without a tag has the one problem, not one for each frame", () => {
    expect(readAudio(fixture("sans-balises.mp3")).problems).toEqual(["has no ID3 tag, so it carries no marking"]);
  });

  test("a human voice needs no model, voice, generator or attribution", () => {
    const human = tagged({ ...MARKED, "lernapps-synthetic": "false" }, [
      "lernapps-model",
      "lernapps-voice",
      "lernapps-generator",
      "lernapps-attribution",
    ]);
    expect(readAudio(human).problems).toEqual([]);
    expect(readAudio(human).meta?.synthetic).toBe(false);
  });

  test("a synthetic voice needs all four", () => {
    const read = readAudio(tagged(MARKED, ["lernapps-model", "lernapps-attribution"]));
    expect(read.problems.map((problem) => problem.split(" ")[0])).toEqual(["lernapps-model", "lernapps-attribution"]);
  });

  test("lernapps-synthetic is true or false, and a synthetic voice has the IPTC source type", () => {
    expect(readAudio(tagged({ ...MARKED, "lernapps-synthetic": "maybe" })).problems[0]).toMatch(
      /lernapps-synthetic is "maybe"/,
    );
    expect(
      readAudio(tagged({ ...MARKED, "lernapps-digital-source-type": "http://cv.iptc.org/x/humanEdits" })).problems[0],
    ).toMatch(/lernapps-digital-source-type is "http:\/\/cv.iptc.org\/x\/humanEdits"/);
  });

  test("UTF-8, UTF-16 and ISO 8859-1 text are read, ID3v2.3 as well as v2.4", () => {
    for (const [encoding, version] of [
      [3, 4],
      [1, 3],
      [0, 3],
      [2, 4],
    ] as const) {
      const id3 = readId3(tagged({ ...MARKED, "lernapps-text": "Élève" }, [], encoding, version));
      if ("problem" in id3) throw new Error(id3.problem);
      expect(id3.frames.get("lernapps-text"), `encoding ${encoding}, v2.${version}`).toBe("Élève");
      expect(id3.frames.get("TLAN")).toBe("fra");
    }
  });

  test("a frame it does not know, such as a C2PA manifest, is skipped", () => {
    const read = readAudio(tagged(MARKED, [], 3, 4, [["GEOB", Uint8Array.from([0, 1, 2, 3, 4, 5])]]));
    expect(read.problems).toEqual([]);
  });
});

describe("the byte range of a request", () => {
  test("a range, an open end and the last bytes", () => {
    expect(byteRange("bytes=0-99", 1000)).toEqual({ start: 0, end: 99 });
    expect(byteRange("bytes=900-", 1000)).toEqual({ start: 900, end: 999 });
    expect(byteRange("bytes=-50", 1000)).toEqual({ start: 950, end: 999 });
    expect(byteRange("bytes=990-5000", 1000)).toEqual({ start: 990, end: 999 });
    expect(byteRange("bytes=0-0,5-9", 1000)).toEqual({ start: 0, end: 0 });
  });

  test("no header, or one it cannot use, sends the whole file; a range outside the file is invalid", () => {
    expect(byteRange(undefined, 1000)).toBeUndefined();
    expect(byteRange("items=0-9", 1000)).toBeUndefined();
    expect(byteRange("bytes=-", 1000)).toBeUndefined();
    expect(byteRange("bytes=1000-", 1000)).toBe("invalid");
    expect(byteRange("bytes=500-100", 1000)).toBe("invalid");
  });
});

/** A complete marking of a synthetic voice. */
const MARKED: Record<string, string> = {
  TLAN: "fra",
  TCOP: "CC BY-SA 4.0",
  TDRC: "2026-11-12",
  "lernapps-synthetic": "true",
  "lernapps-digital-source-type": TRAINED_ALGORITHMIC_MEDIA,
  "lernapps-model": "test",
  "lernapps-voice": "tone",
  "lernapps-generator": "test 1",
  "lernapps-attribution": "none",
  "lernapps-text": "Bonjour.",
};

const encoders: Record<number, (text: string) => number[]> = {
  0: (text) => [...Buffer.from(text, "latin1")],
  1: (text) => [0xff, 0xfe, ...Buffer.from(text, "utf16le")],
  2: (text) => [...Buffer.from(text, "utf16le").swap16()],
  3: (text) => [...Buffer.from(text, "utf8")],
};

/** ID3 bytes with the frames of `frames` (TXXX for the names with a hyphen), then MPEG audio, as a file. */
function tagged(
  frames: Record<string, string>,
  without: readonly string[] = [],
  encoding = 3,
  version: 3 | 4 = 4,
  extra: readonly (readonly [string, Uint8Array])[] = [],
): Uint8Array {
  const wide = encoding === 1 || encoding === 2;
  const zero = wide ? [0, 0] : [0];
  const frame = (id: string, body: number[]): number[] => {
    const size =
      version === 4
        ? [(body.length >> 21) & 0x7f, (body.length >> 14) & 0x7f, (body.length >> 7) & 0x7f, body.length & 0x7f]
        : [(body.length >> 24) & 0xff, (body.length >> 16) & 0xff, (body.length >> 8) & 0xff, body.length & 0xff];
    return [...Buffer.from(id, "latin1"), ...size, 0, 0, ...body];
  };
  const body = Object.entries(frames)
    .filter(([key]) => !without.includes(key))
    .flatMap(([key, value]) =>
      key.includes("-")
        ? frame("TXXX", [encoding, ...encoders[encoding]!(key), ...zero, ...encoders[encoding]!(value)])
        : frame(key, [encoding, ...encoders[encoding]!(value)]),
    )
    .concat(extra.flatMap(([id, bytes]) => frame(id, [...bytes])));
  const size = [(body.length >> 21) & 0x7f, (body.length >> 14) & 0x7f, (body.length >> 7) & 0x7f, body.length & 0x7f];
  return Uint8Array.from([0x49, 0x44, 0x33, version, 0, 0, ...size, ...body, 0xff, 0xfb, 0x90, 0x00]);
}
