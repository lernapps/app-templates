// The architecture check of this repo: the generic architecture (docs/arc42/) with each archetype's extension
// (<archetype>/docs/arc42/), validated by `arc42 validate --strict` with --root at the repo root, so that the runtime's
// paths (runtime/...) resolve as they are. Any finding fails, errors, warnings and hints alike. Run by the pre-commit
// hook when an *.arc42.md or .arc42ignore file is staged (the staged section of vite.config.ts) and by CI (job
// architecture of .github/workflows/check.yml).
//
//   node scripts/arc42.ts [<archetype>...]   every archetype when none is named (other arguments are ignored: the
//                                            pre-commit hook passes the staged files)
//
// An app will run `arc42 diff --staged --strict` on its own docs/arc42/; this repo has no single architecture but one
// per archetype, so this script is its gate. Each combination is built in a temporary folder as an app's
// architecture would be: a chapter's extension file is appended to the generic file of the same chapter (without its
// own title), because the validator expects a building block's parts, its interfaces and the diagrams that show them
// in one file. Findings are reported at their place in the original files.
import { spawnSync } from "node:child_process";
import { mkdtempSync, readdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, relative, resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const ARCHETYPES = ["quiz", "explainer", "interactive"] as const;
const GENERIC = "docs/arc42";
const CLI = join(ROOT, "node_modules", ".bin", "arc42");

/** Where a line of a combined file comes from. */
interface Origin {
  file: string;
  line: number;
}

interface Diagnostic {
  code: string;
  severity: string;
  message: string;
  file: string;
  line: number;
}

const chapterFiles = (dir: string) =>
  readdirSync(join(ROOT, dir))
    .filter((name) => /^\d{2}-.*\.arc42\.md$/.test(name))
    .sort();

/** Builds the combination of the generic part and `archetype`'s extension in `workspace`; the origin of every line. */
function combine(archetype: string, workspace: string): Map<string, Origin[]> {
  const origins = new Map<string, Origin[]>();
  const extension = `${archetype}/${GENERIC}`;
  const extensionFiles = chapterFiles(extension);
  for (const name of chapterFiles(GENERIC)) {
    const lines: string[] = [];
    const from: Origin[] = [];
    const add = (file: string, skipTitle: boolean) => {
      readFileSync(join(ROOT, file), "utf8")
        .replace(/\n$/, "")
        .split("\n")
        .forEach((text, index) => {
          if (skipTitle && index === 0 && text.startsWith("# ")) return;
          lines.push(text);
          from.push({ file, line: index + 1 });
        });
    };
    add(`${GENERIC}/${name}`, false);
    for (const own of extensionFiles.filter((candidate) => candidate.slice(0, 3) === name.slice(0, 3))) {
      lines.push("");
      from.push({ file: `${extension}/${own}`, line: 0 });
      add(`${extension}/${own}`, true);
    }
    writeFileSync(join(workspace, name), `${lines.join("\n")}\n`);
    origins.set(join(workspace, name), from);
  }
  const generic = new Set(chapterFiles(GENERIC).map((name) => name.slice(0, 3)));
  for (const own of extensionFiles.filter((name) => !generic.has(name.slice(0, 3)))) {
    throw new Error(`${extension}/${own}: no generic chapter ${own.slice(0, 2)} to extend in ${GENERIC}/`);
  }
  return origins;
}

/** Validates one combination; its findings, at their place in the original files. */
function validate(archetype: string): Diagnostic[] {
  const workspace = mkdtempSync(join(tmpdir(), `arc42-${archetype}-`));
  try {
    const origins = combine(archetype, workspace);
    const run = spawnSync(CLI, ["--dir", workspace, "--root", ROOT, "validate", "--strict", "--format", "json"], {
      cwd: ROOT,
      encoding: "utf8",
      maxBuffer: 64 * 1024 * 1024,
    });
    let report: { diagnostics: Diagnostic[] };
    try {
      report = JSON.parse(run.stdout) as { diagnostics: Diagnostic[] };
    } catch {
      throw new Error(`arc42 validate gave no report (exit ${run.status}): ${run.stderr || run.error?.message}`);
    }
    const findings = report.diagnostics.map((diagnostic) => {
      const origin = origins.get(diagnostic.file)?.[diagnostic.line - 1];
      return origin
        ? { ...diagnostic, file: origin.file, line: origin.line }
        : { ...diagnostic, file: relative(ROOT, diagnostic.file) || diagnostic.file };
    });
    if (run.status !== 0 && findings.length === 0) {
      throw new Error(`arc42 validate failed (exit ${run.status}) without a finding: ${run.stderr}`);
    }
    return findings;
  } finally {
    rmSync(workspace, { recursive: true, force: true });
  }
}

const named = process.argv
  .slice(2)
  .filter((arg): arg is (typeof ARCHETYPES)[number] => ARCHETYPES.includes(arg as never));
let failed = false;
for (const archetype of named.length > 0 ? named : ARCHETYPES) {
  const findings = validate(archetype);
  const count = (severity: string) => findings.filter((finding) => finding.severity === severity).length;
  for (const { severity, code, file, line, message } of findings)
    console.log(`${severity} ${code}  ${file}:${line}  ${message}`);
  console.log(
    `arc42 ${archetype} (generic + ${archetype}/${GENERIC}): ${count("error")} errors, ${count("warning")} warnings, ${count("hint")} hints`,
  );
  if (findings.length > 0) failed = true;
}
process.exit(failed ? 1 : 0);
