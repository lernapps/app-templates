// The pre-push hook (scripts/pre-push.ts): what a push checks before it leaves the machine. A push of only the plan or
// only docs checks nothing; any other push runs the root checks, and `lernapps check --pre-push` only in the template
// folders its paths affect (the positive list TEMPLATE_PATHS). The list names only paths that exist, and every folder
// of the repo is either on it or known to need no template check.
import { spawnSync } from "node:child_process";
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { afterAll, describe, expect, test } from "vite-plus/test";
import {
  covers,
  prePush,
  ROOT_ONLY,
  TEMPLATE_PATHS,
  TEMPLATES,
  templatesFor,
  TOOLING_REF,
  type Lane,
} from "../scripts/pre-push.ts";

const root = join(import.meta.dirname, "..");
const ZERO = "0".repeat(40);

/** A repo with this repo's package.json and a commit on origin/main; `push` commits files and pushes a new branch. */
function repo() {
  const dir = mkdtempSync(join(tmpdir(), "athooks-pre-push-"));
  const git = (...args: string[]) => {
    const result = spawnSync("git", args, { cwd: dir, encoding: "utf8" });
    if (result.status !== 0) throw new Error(`git ${args.join(" ")}: ${result.stderr}`);
    return result.stdout.trim();
  };
  git("init", "--quiet", "--initial-branch=main");
  git("config", "user.email", "test@example.invalid");
  git("config", "user.name", "test");
  git("config", "commit.gpgsign", "false");
  writeFileSync(join(dir, "package.json"), readFileSync(join(root, "package.json")));
  git("add", ".");
  git("commit", "--quiet", "--no-verify", "-m", "main");
  git("update-ref", "refs/remotes/origin/main", "HEAD");
  return {
    dir,
    /** Commits the files, and returns git's line of the pre-push hook for a new branch at that commit. */
    push: (...files: string[]): string => {
      for (const file of files) {
        mkdirSync(dirname(join(dir, file)), { recursive: true });
        writeFileSync(join(dir, file), "changed\n");
      }
      git("add", ".");
      git("commit", "--quiet", "--no-verify", "-m", "change");
      return `refs/heads/topic ${git("rev-parse", "HEAD")} refs/heads/topic ${ZERO}\n`;
    },
  };
}

const dirs: string[] = [];
afterAll(() => {
  for (const dir of dirs) rmSync(dir, { recursive: true, force: true });
});

/** Runs the hook on a push of these files: what it printed, and the lanes it ran (none: it ran nothing). */
async function hook(...files: string[]) {
  const { dir, push } = repo();
  dirs.push(dir);
  const lines = push(...files);
  let ran: Lane[] | undefined;
  let out = "";
  const code = await prePush(lines, {
    cwd: dir,
    write: (text) => (out += text),
    run: async (lanes) => {
      ran = lanes;
      return undefined;
    },
  });
  const commands = (ran ?? []).flat().map((step) => `${step.cwd}: ${step.command.join(" ")}`);
  return { code, out, ran, commands };
}

describe("what a push checks", () => {
  test("a push of only the plan checks nothing, in one line", async () => {
    const { code, out, ran } = await hook(".vibe/plan.md");
    expect(code).toBe(0);
    expect(ran).toBeUndefined();
    expect(out.trim().split("\n")).toHaveLength(1);
    expect(out).toContain("nothing to check");
  });

  test("a push of only docs checks nothing: this repo has no site", async () => {
    const { code, out, ran } = await hook("docs/guide.md", ".vibe/plan.md");
    expect(code).toBe(0);
    expect(ran).toBeUndefined();
    expect(out.trim().split("\n")).toHaveLength(1);
    expect(out).toContain("only docs");
  });

  test("a push of only quiz/ runs the root checks and the quiz's check, not the explainer's", async () => {
    const { code, commands } = await hook("quiz/src/quiz.json");
    expect(code).toBe(0);
    expect(commands).toEqual(
      expect.arrayContaining([
        ".: vp check",
        ".: vp test run",
        ".: npm run --silent check:vue",
        "quiz: lernapps check --pre-push",
      ]),
    );
    expect(commands.filter((command) => command.startsWith("explainer"))).toEqual([]);
  });

  test("the explainer's runtime runs the explainer's check; the shared runtime runs both; other paths neither", () => {
    expect(templatesFor(["runtime/explainer/render.ts"])).toEqual(["explainer"]);
    expect(templatesFor(["explainer/src/app.yaml", "README.md"])).toEqual(["explainer"]);
    expect(templatesFor(["runtime/shared/pages.ts"])).toEqual(["quiz", "explainer", "interactive"]);
    expect(templatesFor(["package-lock.json"])).toEqual(["quiz", "explainer", "interactive"]);
    expect(templatesFor(["test/fixtures/quiz-bilingual.json", "scripts/pre-push.ts", "new-folder/x.ts"])).toEqual([]);
  });

  test("a push whose changed paths are not known runs the root checks and every template's check", async () => {
    let ran: Lane[] = [];
    await prePush("", {
      cwd: root,
      write: () => {},
      run: async (lanes) => {
        ran = lanes;
        return undefined;
      },
    });
    const commands = ran.flat().map((step) => `${step.cwd}: ${step.command.join(" ")}`);
    expect(commands).toContain("quiz: lernapps check --pre-push");
    expect(commands).toContain("explainer: lernapps check --pre-push");
    expect(commands).toContain("interactive: lernapps check --pre-push");
  });
});

describe("the positive list", () => {
  const listed = [...Object.values(TEMPLATE_PATHS).flat(), ...ROOT_ONLY];

  test("names only paths that exist", () => {
    expect(listed.filter((path) => !existsSync(join(root, path)))).toEqual([]);
  });

  test("covers every folder and file at the root and every folder of runtime/", () => {
    const tracked = spawnSync("git", ["ls-files"], { cwd: root, encoding: "utf8" }).stdout.split("\n");
    const entries = new Set<string>();
    for (const file of tracked.filter((path) => path !== "")) {
      const [first = "", second, third] = file.split("/");
      entries.add(second === undefined ? first : `${first}/`);
      if (first === "runtime" && third !== undefined) entries.add(`runtime/${second}/`);
    }
    entries.delete("runtime/");
    expect([...entries].filter((entry) => !covers(entry, listed))).toEqual([]);
  });

  test("names a folder of each template and of its runtime", () => {
    for (const template of TEMPLATES) {
      expect(TEMPLATE_PATHS[template]).toContain(`${template}/`);
      expect(TEMPLATE_PATHS[template]).toContain(`runtime/${template}/`);
    }
  });
});

test("the hook's classifier is the commit of lernapps/tooling that CI's change scope runs", () => {
  const workflow = readFileSync(join(root, ".github/workflows/check.yml"), "utf8");
  expect(/^\s*tooling-ref: (\S+)/m.exec(workflow)?.[1]).toBe(TOOLING_REF);
  expect(/lernapps\/tooling\/\.github\/workflows\/changes\.yml@(\S+)/.exec(workflow)?.[1]).toBe(TOOLING_REF);
});
