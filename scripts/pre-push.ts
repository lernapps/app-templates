// The pre-push hook of this repo (.vite-hooks/pre-push). It first asks the change scope of the pushed commits
// (`lernapps changes`, the classifier of lernapps/tooling at TOOLING_REF, with "kind": "app" in package.json): a push of only the plan
// (.vibe/**) or only docs (docs/**/*.md; this repo has no site) checks nothing. Any other push runs the root checks
// (vp check, npm run check:vue, vp test run), and `lernapps check --pre-push` in each template folder the push affects:
// the positive list TEMPLATE_PATHS below. The fixture jobs of check.yml (quiz-many-questions, quiz-bilingual,
// explainer-all-blocks, explainer-history, question-page) run only in CI, and CI runs everything a change can affect:
// it is the superset that catches what this list lets through.
//
//   node scripts/pre-push.ts [<remote> [<url>]]   reads git's lines "<local ref> <local sha> <remote ref> <remote sha>"
//
// Quiet like the pre-commit hook: what the checks print goes to node_modules/.cache/lernapps/pre-push.log; the hook
// prints one line saying what it checked, or on a failure one line naming the step and the log. Without lines on
// standard input (run by hand) it runs everything it can: the root checks and every template's check.
import { spawn, spawnSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, renameSync, rmSync, writeFileSync } from "node:fs";
import { delimiter, dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

/**
 * The commit of lernapps/tooling whose classifier (`lernapps changes`) the hook runs. As in CI (changes.yml), only its
 * folders changes/ and src/ are fetched, once per commit into .git/lernapps/, and run with node: the
 * classifier needs only Node's own modules. Not a devDependency, which every app's install of this package from git
 * would fetch and build once more; not npx, which resolves a git package again on every run (13 to 18 s, and npm 10
 * fails on this one). The same commit as `tooling-ref` in .github/workflows/check.yml (test/pre-push.test.ts checks it).
 */
export const TOOLING_REF = "9b9a34c25af4fa397b64f5e01b1640245a1d3726";

export const TEMPLATES = ["quiz", "explainer", "interactive"] as const;
export type Template = (typeof TEMPLATES)[number];

/** What every template builds on: the shared runtime, the package (dependencies, exports) and its build (vp pack). */
const SHARED = ["runtime/shared/", "package.json", "package-lock.json", "vite.config.ts", "tsconfig.json"];

/**
 * A POSITIVE list: a push that changes one of a template's paths (a folder ends with "/") runs `lernapps check
 * --pre-push` in that template's folder before it leaves the machine. A push that changes none runs only the root
 * checks. A path missing here is still checked by CI, which checks every template on every change: when CI finds what
 * the hook let through, add the path here (test/pre-push.test.ts checks that every listed path exists).
 */
export const TEMPLATE_PATHS: Record<Template, readonly string[]> = {
  quiz: ["quiz/", "runtime/quiz/", ...SHARED],
  explainer: ["explainer/", "runtime/explainer/", ...SHARED],
  interactive: ["interactive/", "runtime/interactive/", ...SHARED],
};

/**
 * The paths no template's check needs: the generic architecture (docs/), what the root checks cover (the tests and
 * their fixtures, this hook), or what only CI reads (the workflows; the fixture jobs). Not a gate, any path off
 * TEMPLATE_PATHS runs the root checks only; listed so that test/pre-push.test.ts can tell a new folder, which must be
 * put on one of the two lists, from a known one.
 */
export const ROOT_ONLY = [
  "docs/",
  ".arc42ignore", // the paths the architecture leaves out (scripts/arc42.ts)
  "test/",
  "scripts/",
  ".vite-hooks/",
  ".github/",
  "tsconfig.vue.json",
  "README.md",
  "LICENSE",
  ".gitignore",
  "renovate.json",
];

/** Whether a path (relative to the repo root, with "/") is one of the patterns: the path, or below a folder "x/". */
export const covers = (path: string, patterns: readonly string[]) =>
  patterns.some((pattern) => (pattern.endsWith("/") ? path.startsWith(pattern) : path === pattern));

/** The templates a push affects; every template when its changed paths are not known. */
export function templatesFor(files: readonly string[] | undefined): Template[] {
  return TEMPLATES.filter(
    (template) => files === undefined || files.some((file) => covers(file, TEMPLATE_PATHS[template])),
  );
}

/** A command in a folder of the repo ("." the root); its program from that folder's node_modules/.bin, then PATH. */
export interface Step {
  name: string;
  cwd: string;
  command: string[];
}
/** Steps one after the other; the lanes of a run run at the same time. */
export type Lane = Step[];
/** Runs the lanes; the step that failed and its exit code, or undefined when every step passed. */
export type Run = (lanes: Lane[]) => Promise<{ step: Step; code: number } | undefined>;

/** The lanes of a push of scope all: each root check on its own; the templates one after the other (one port). */
export function lanes(files: readonly string[] | undefined): Lane[] {
  const templates = templatesFor(files).map((template) => ({
    name: `lernapps check --pre-push in ${template}/`,
    cwd: template,
    command: ["lernapps", "check", "--pre-push"],
  }));
  return [
    [{ name: "vp check", cwd: ".", command: ["vp", "check"] }],
    [{ name: "npm run check:vue", cwd: ".", command: ["npm", "run", "--silent", "check:vue"] }],
    [{ name: "vp test run", cwd: ".", command: ["vp", "test", "run"] }],
    ...(templates.length > 0 ? [templates] : []),
  ];
}

const ZERO = /^0+$/;

/**
 * The files a push changes, as the tooling's classifier reads them (pushedFiles of changes/changes.ts): what each
 * pushed ref adds to the remote's commit; for a new branch, what it adds to its merge base with origin/main.
 * Undefined when that cannot be known: no lines (run by hand), an unknown commit, no origin/main.
 */
export function pushedFiles(lines: string, cwd: string): string[] | undefined {
  const git = (...args: string[]) => spawnSync("git", args, { cwd, encoding: "utf8", maxBuffer: 64 * 1024 * 1024 });
  const refs = lines
    .split("\n")
    .map((line) => line.trim().split(/\s+/))
    .filter((fields) => fields.length === 4);
  if (refs.length === 0) return undefined;
  const paths = new Set<string>();
  for (const [, local = "", , remote = ""] of refs) {
    if (ZERO.test(local)) continue; // a deleted branch
    const base = ZERO.test(remote) ? git("merge-base", local, "origin/main").stdout.trim() : remote;
    if (base === "" || git("cat-file", "-e", `${base}^{commit}`).status !== 0) return undefined;
    const diff = git("diff", "--name-only", "--no-renames", "-z", base, local);
    if (diff.error || diff.status !== 0) return undefined;
    for (const path of diff.stdout.split("\0")) if (path !== "") paths.add(path);
  }
  return [...paths];
}

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const LOG = "node_modules/.cache/lernapps/pre-push.log";

/** The classifier's entry point at TOOLING_REF, fetched on first use (changes/ and src/ only); undefined if it cannot be. */
function classifier(): string | undefined {
  // in the clone's git folder: node refuses TypeScript below node_modules/, and npm ci would delete it
  const gitDir = spawnSync("git", ["rev-parse", "--git-common-dir"], { cwd: ROOT, encoding: "utf8" }).stdout.trim();
  if (gitDir === "") return undefined;
  const dir = resolve(ROOT, gitDir, "lernapps", `tooling-${TOOLING_REF}`);
  const main = join(dir, "changes", "main.ts");
  if (existsSync(main)) return main;
  const temp = `${dir}.${process.pid}`;
  rmSync(temp, { recursive: true, force: true });
  mkdirSync(temp, { recursive: true });
  const git = (...args: string[]) => spawnSync("git", args, { cwd: temp, stdio: "ignore" }).status === 0;
  const fetched =
    git("init", "--quiet") &&
    git("sparse-checkout", "set", "--no-cone", "/changes/", "/src/") &&
    git(
      "fetch",
      "--quiet",
      "--depth",
      "1",
      "--filter=blob:none",
      "https://github.com/lernapps/tooling.git",
      TOOLING_REF,
    ) &&
    git("checkout", "--quiet", "FETCH_HEAD");
  if (fetched) {
    try {
      renameSync(temp, dir);
    } catch {
      // another push fetched it at the same time
    }
  }
  rmSync(temp, { recursive: true, force: true });
  return existsSync(main) ? main : undefined;
}

/** The installation of the tooling the root's type check needs, as check.yml's job runtime runs it. */
const INSTALL_TOOLING = `npm install --no-save "$(node -p 'require("./quiz/package.json").devDependencies["@lernapps/tooling"]')"`;

/** Runs the lanes, each step's output into the log; on the first failure stops the other steps. */
function runLogged(cwd: string, log: string): Run {
  return (all) =>
    new Promise((done) => {
      const running = new Set<ReturnType<typeof spawn>>();
      let failed: { step: Step; code: number } | undefined;
      let open = all.length;
      const finish = () => {
        if (--open === 0) done(failed);
      };
      const next = (lane: Lane, index: number) => {
        const step = lane[index];
        if (step === undefined || failed !== undefined) return finish();
        const dir = join(cwd, step.cwd);
        const [program = "", ...args] = step.command;
        const bin = join(dir, "node_modules", ".bin");
        if (step.cwd !== "." && !existsSync(join(bin, program))) {
          writeFileSync(log, `$ ${step.name}: ${step.cwd}/node_modules is missing; npm install in ${step.cwd}/\n`, {
            flag: "a",
          });
          failed ??= { step, code: 1 };
          for (const child of running) kill(child);
          return finish();
        }
        const env = {
          ...process.env,
          PATH: [bin, join(cwd, "node_modules", ".bin"), process.env["PATH"]].join(delimiter),
        };
        // stdin ignored: a check that asks the change scope itself sees no pushed lines and checks everything
        const child = spawn(program, args, { cwd: dir, env, stdio: ["ignore", "pipe", "pipe"], detached: true });
        running.add(child);
        const output: Buffer[] = [Buffer.from(`$ (${step.cwd}) ${step.command.join(" ")}\n`)];
        child.stdout?.on("data", (chunk: Buffer) => output.push(chunk));
        child.stderr?.on("data", (chunk: Buffer) => output.push(chunk));
        child.on("error", (error) => output.push(Buffer.from(`${error.message}\n`)));
        child.on("close", (code, signal) => {
          running.delete(child);
          writeFileSync(log, Buffer.concat(output), { flag: "a" });
          if (failed !== undefined) return finish(); // stopped by another step's failure
          if (code !== 0) {
            failed = { step, code: code ?? (signal === null ? 1 : 128) };
            for (const other of running) kill(other);
            return finish();
          }
          next(lane, index + 1);
        });
      };
      if (all.length === 0) return done(undefined);
      // the root's type check needs the optional peer @lernapps/tooling, as check.yml's job runtime installs it
      if (!existsSync(join(cwd, "node_modules", "@lernapps", "tooling", "package.json"))) {
        const step = all[0]?.[0] ?? { name: "vp check", cwd: ".", command: [] };
        writeFileSync(log, "@lernapps/tooling is not installed\n", { flag: "a" });
        return done({ step: { ...step, name: `${step.name} (needs @lernapps/tooling: ${INSTALL_TOOLING})` }, code: 1 });
      }
      for (const lane of all) next(lane, 0);
    });
}

/** Stops a step and what it started (its process group: the build, the preview server, the browsers). */
function kill(child: ReturnType<typeof spawn>) {
  try {
    if (child.pid !== undefined) process.kill(-child.pid, "SIGTERM");
  } catch {
    // already ended
  }
}

export interface Options {
  /** The root of the repo whose push this is. */
  cwd: string;
  write: (text: string) => void;
  run?: Run;
}

/** The hook: the exit code of the push. */
export async function prePush(lines: string, { cwd, write, run }: Options): Promise<number> {
  const say = (message: string) => write(`lernapps pre-push: ${message}\n`);
  const files = pushedFiles(lines, cwd);
  let scope = "all";
  let reason = "the changed paths are not known";
  if (files !== undefined) {
    const main = classifier();
    if (main === undefined) {
      say(`cannot fetch the classifier of lernapps/tooling at ${TOOLING_REF} (offline?)`);
      return 1;
    }
    const result = spawnSync(process.execPath, [main, "--", ...files], {
      cwd,
      encoding: "utf8",
      maxBuffer: 64 * 1024 * 1024,
    });
    if (result.status !== 0) {
      say(`lernapps changes failed (exit ${result.status ?? 1}): ${result.stderr.trim()}`);
      return result.status ?? 1;
    }
    scope = result.stdout.trim();
    reason = /^lernapps changes: \S+ in a repo of kind \S+: (.*)$/m.exec(result.stderr)?.[1] ?? reason;
  }
  if (scope === "none") {
    say(`nothing to check, the push changes only the plan (${reason})`);
    return 0;
  }
  if (scope === "docs") {
    say(`nothing to check, the push changes only docs and this repo has no site (${reason})`);
    return 0;
  }
  const log = join(cwd, LOG);
  mkdirSync(dirname(log), { recursive: true });
  writeFileSync(log, `lernapps pre-push: scope ${scope} (${reason})\n`);
  const plan = lanes(files);
  const templates = templatesFor(files);
  const failure = await (run ?? runLogged(cwd, log))(plan);
  if (failure !== undefined) {
    say(`${failure.step.name} failed (exit ${failure.code}); the full output is in ${LOG}`);
    return failure.code;
  }
  say(
    templates.length === 0
      ? "the root checks passed; the push changes no template's paths (CI checks the templates and the fixtures)"
      : `the root checks and ${templates.map((template) => `${template}/`).join(", ")} passed (CI checks the rest and the fixtures)`,
  );
  return 0;
}

if (process.argv[1] !== undefined && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  let lines = "";
  try {
    lines = process.stdin.isTTY ? "" : readFileSync(0, "utf8");
  } catch {
    // no standard input: run by hand
  }
  process.exitCode = await prePush(lines, { cwd: process.cwd(), write: (text) => process.stdout.write(text) });
}
