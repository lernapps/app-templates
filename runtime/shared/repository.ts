// The app's repository on GitHub and the commit the build is of, which the build finds itself, since it runs in the
// app's repository: in CI from the variables GitHub Actions sets (GITHUB_REPOSITORY, GITHUB_SHA), elsewhere from git
// (the remote origin, HEAD). A remote that is not on github.com, a folder without git or without git installed give
// nothing, and the build goes on: what needs the repository (the explainer's link to a new issue) is then left out.
// Build code: it needs Node.
import { execFileSync } from "node:child_process";

/** What the build reads of its environment. */
export type Environment = Readonly<Record<string, string | undefined>>;

const NAME = /^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/;

/** `owner/repo` of a remote's address on github.com, over HTTPS or SSH; undefined for any other. */
export function githubRepository(remote: string): string | undefined {
  const match =
    /^(?:https:\/\/(?:[^@/]+@)?github\.com\/|git@github\.com:|ssh:\/\/git@github\.com\/)([^/]+\/[^/]+?)(?:\.git)?\/?$/.exec(
      remote.trim(),
    );
  const name = match?.[1];
  return name !== undefined && NAME.test(name) ? name : undefined;
}

/** The output of git in `root`, trimmed; undefined when git fails or is missing. */
function git(root: string, args: readonly string[]): string | undefined {
  try {
    const output = execFileSync("git", ["-C", root, ...args], {
      encoding: "utf8",
      stdio: ["ignore", "pipe", "ignore"],
    });
    return output.trim() || undefined;
  } catch {
    return undefined;
  }
}

/** The repository of the app in `root` as `owner/repo`: GITHUB_REPOSITORY, else the remote origin on github.com. */
export function repositoryOf(root: string, env: Environment = process.env): string | undefined {
  const given = env["GITHUB_REPOSITORY"];
  if (given !== undefined && NAME.test(given)) return given;
  const remote = git(root, ["remote", "get-url", "origin"]);
  return remote === undefined ? undefined : githubRepository(remote);
}

/** The commit the build is of, its first 7 digits: GITHUB_SHA, else HEAD of git in `root`. */
export function revisionOf(root: string, env: Environment = process.env): string | undefined {
  const given = env["GITHUB_SHA"] ?? git(root, ["rev-parse", "HEAD"]);
  return given !== undefined && /^[0-9a-f]{7,40}$/.test(given) ? given.slice(0, 7) : undefined;
}
