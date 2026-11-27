#!/usr/bin/env node
// Assembles the static Piper/WASM TTS assets into <outDir> (default: preview/assets/tts) during CI builds so that
// no large binary files are committed to Git. Published at https://lernapps.net/app-templates/assets/tts/ (and in
// PR previews at /app-templates/pr-preview/pr-<n>/assets/tts/).
import { copyFileSync, existsSync, mkdirSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { execFileSync } from "node:child_process";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";

const outDir = resolve(process.argv[2] ?? "preview/assets/tts");
const repoRoot = resolve(dirname(new URL(import.meta.url).pathname), "..");

const VOICES = [
  {
    name: "de_DE-thorsten-medium",
    base: "https://huggingface.co/rhasspy/piper-voices/resolve/v1.0.0/de/de_DE/thorsten/medium",
  },
  {
    name: "en_GB-alba-medium",
    base: "https://huggingface.co/rhasspy/piper-voices/resolve/v1.0.0/en/en_GB/alba/medium",
  },
];

async function download(url, dest) {
  if (existsSync(dest)) return;
  mkdirSync(dirname(dest), { recursive: true });
  const response = await fetch(url, { redirect: "follow" });
  if (!response.ok) throw new Error(`Failed to fetch ${url}: HTTP ${response.status}`);
  const buffer = Buffer.from(await response.arrayBuffer());
  writeFileSync(dest, buffer);
}

mkdirSync(join(outDir, "ort"), { recursive: true });
mkdirSync(join(outDir, "phonemize"), { recursive: true });
mkdirSync(join(outDir, "voices"), { recursive: true });

// 1. Copy our self-hosted browser ESM runtime entry
copyFileSync(join(repoRoot, "scripts/piper-runtime.mjs"), join(outDir, "piper.mjs"));

// 2. Fetch pinned ONNX Runtime Web WASM and Piper phonemizer via npm in a temp dir
const temp = mkdtempSync(join(tmpdir(), "lernapps-tts-build-"));
try {
  execFileSync(
    "npm",
    [
      "--prefix",
      temp,
      "install",
      "--no-save",
      "--no-audit",
      "--no-fund",
      "--ignore-scripts",
      "onnxruntime-web@1.18.0",
      "@mintplex-labs/piper-tts-web@1.0.5",
      "@diffusionstudio/piper-wasm@1.0.0",
    ],
    { stdio: "inherit" },
  );

  const ortDist = join(temp, "node_modules/onnxruntime-web/dist");
  for (const file of ["ort.wasm.min.js", "ort-wasm-simd.wasm", "ort-wasm.wasm"]) {
    copyFileSync(join(ortDist, file), join(outDir, "ort", file));
  }

  // ESM phonemizer loader from @mintplex-labs/piper-tts-web + wasm/data from @diffusionstudio/piper-wasm
  copyFileSync(
    join(temp, "node_modules/@mintplex-labs/piper-tts-web/dist/piper-o91UDS6e.js"),
    join(outDir, "phonemize/piper_phonemize.mjs"),
  );
  const wasmBuild = join(temp, "node_modules/@diffusionstudio/piper-wasm/build");
  for (const file of ["piper_phonemize.wasm", "piper_phonemize.data"]) {
    copyFileSync(join(wasmBuild, file), join(outDir, "phonemize", file));
  }
} finally {
  rmSync(temp, { recursive: true, force: true });
}

// 3. Download pinned Piper voice models (.onnx + .onnx.json)
for (const voice of VOICES) {
  for (const ext of [".onnx", ".onnx.json"]) {
    const file = `${voice.name}${ext}`;
    console.log(`Downloading ${file} ...`);
    await download(`${voice.base}/${file}`, join(outDir, "voices", file));
  }
}

console.log(`TTS assets ready in ${outDir}`);
