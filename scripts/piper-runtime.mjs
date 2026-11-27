// Browser ESM runtime for local Piper/WASM speech synthesis (dec-explainer-read-aloud).
// Hosted statically at /app-templates/assets/tts/piper.mjs alongside ./ort/ and ./phonemize/.
// Zero external CDN requests: every WASM and data file is loaded relative to import.meta.url.
import { createPiperPhonemize } from "./phonemize/piper_phonemize.mjs";

let ortPromise;
const sessions = new Map();

function loadOrt() {
  if (ortPromise) return ortPromise;
  ortPromise = new Promise((resolve, reject) => {
    if (globalThis.ort) {
      resolve(globalThis.ort);
      return;
    }
    const script = document.createElement("script");
    script.src = new URL("./ort/ort.wasm.min.js", import.meta.url).href;
    script.onload = () => {
      if (globalThis.ort) resolve(globalThis.ort);
      else reject(new Error("onnxruntime-web did not initialize globalThis.ort"));
    };
    script.onerror = () => reject(new Error("Failed to load onnxruntime-web"));
    document.head.appendChild(script);
  }).then((ort) => {
    if (ort.env?.wasm) {
      // Single-threaded WASM needs no SharedArrayBuffer / COOP / COEP headers on GitHub Pages
      ort.env.wasm.numThreads = 1;
      ort.env.wasm.wasmPaths = new URL("./ort/", import.meta.url).href;
    }
    return ort;
  });
  return ortPromise;
}

async function getSession(ort, cacheKey, modelBytes) {
  let session = sessions.get(cacheKey);
  if (!session) {
    session = await ort.InferenceSession.create(modelBytes, { executionProviders: ["wasm"] });
    sessions.set(cacheKey, session);
  }
  return session;
}

async function phonemize(text, espeakVoice) {
  const wasmUrl = new URL("./phonemize/piper_phonemize.wasm", import.meta.url).href;
  const dataUrl = new URL("./phonemize/piper_phonemize.data", import.meta.url).href;
  const input = JSON.stringify([{ text: text.trim() }]);
  const allIds = [];
  let fatalError;
  const mod = await createPiperPhonemize({
    print(data) {
      try {
        const parsed = JSON.parse(data);
        if (Array.isArray(parsed.phoneme_ids) && parsed.phoneme_ids.length > 0) {
          allIds.push(...parsed.phoneme_ids);
        }
      } catch {
        // ignore non-JSON stdout lines
      }
    },
    printErr(msg) {
      if (msg && /error|fatal/i.test(String(msg))) {
        fatalError = new Error(String(msg));
      }
    },
    locateFile(url) {
      if (url.endsWith(".wasm")) return wasmUrl;
      if (url.endsWith(".data")) return dataUrl;
      return url;
    },
  });
  mod.callMain(["-l", espeakVoice, "--input", input, "--espeak_data", "/espeak-ng-data"]);
  if (allIds.length > 0) return allIds;
  if (fatalError) throw fatalError;
  throw new Error("piper_phonemize produced no phoneme IDs");
}

function pcm2wav(samples, sampleRate) {
  const byteLength = samples.length * 2;
  const buffer = new ArrayBuffer(44 + byteLength);
  const view = new DataView(buffer);
  const write = (offset, text) => {
    for (let i = 0; i < text.length; i += 1) view.setUint8(offset + i, text.charCodeAt(i));
  };
  write(0, "RIFF");
  view.setUint32(4, 36 + byteLength, true);
  write(8, "WAVE");
  write(12, "fmt ");
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true); // PCM
  view.setUint16(22, 1, true); // mono
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * 2, true);
  view.setUint16(32, 2, true);
  view.setUint16(34, 16, true);
  write(36, "data");
  view.setUint32(40, byteLength, true);
  let pos = 44;
  for (let i = 0; i < samples.length; i += 1) {
    const clamped = Math.max(-1, Math.min(1, samples[i]));
    view.setInt16(pos, clamped < 0 ? clamped * 0x8000 : clamped * 0x7fff, true);
    pos += 2;
  }
  return buffer;
}

/** Synthesizes `text` using the cached ONNX model bytes and Piper config JSON, returning a WAV Blob. */
export async function synthesize(text, { modelBytes, config }) {
  const trimmed = String(text ?? "").trim();
  if (trimmed === "") return new Blob([], { type: "audio/wav" });
  const ort = await loadOrt();
  const voiceKey = `${config.espeak?.voice ?? "de"}:${modelBytes.byteLength}`;
  const [session, phonemeIds] = await Promise.all([
    getSession(ort, voiceKey, modelBytes),
    phonemize(trimmed, config.espeak?.voice ?? "de"),
  ]);
  const ids = BigInt64Array.from(phonemeIds.map((id) => BigInt(id)));
  const feeds = {
    input: new ort.Tensor("int64", ids, [1, ids.length]),
    input_lengths: new ort.Tensor("int64", BigInt64Array.from([BigInt(ids.length)]), [1]),
    scales: new ort.Tensor(
      "float32",
      Float32Array.from([
        config.inference?.noise_scale ?? 0.667,
        config.inference?.length_scale ?? 1.0,
        config.inference?.noise_w ?? 0.8,
      ]),
      [3],
    ),
  };
  if (config.speaker_id_map && Object.keys(config.speaker_id_map).length > 0) {
    feeds.sid = new ort.Tensor("int64", BigInt64Array.from([0n]), [1]);
  }
  const result = await session.run(feeds);
  const pcm = result.output.data;
  const sampleRate = config.audio?.sample_rate ?? 22050;
  return new Blob([pcm2wav(pcm, sampleRate)], { type: "audio/wav" });
}
