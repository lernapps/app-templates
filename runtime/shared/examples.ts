// The examples of an exercise (`examples: { accepted, rejected }`): test cases for the build, never shown to learners.
// The build runs each through the same check the page uses: the quiz's checker for its question types
// (../quiz/validate.ts), the comparator of a generated exercise (../explainer/generated.ts), the exported check of an
// exercise component (../explainer/components.ts). An accepted example the check rejects, or a rejected one it
// accepts, fails the build with this message.

/**
 * What to do about an example the check judges otherwise than it is listed: `right`, whether the check accepts it;
 * `check`, what judges it; `fix`, what to change so that the check agrees.
 */
export function verdict(
  example: string,
  right: boolean,
  check = "the check",
  fix = "change the exercise so that its check",
): string {
  return right
    ? `${check} accepts ${example}, but it is listed as rejected; if the task's text rules it out, ${fix} rejects it, else move it to accepted`
    : `${check} rejects ${example}, but it is listed as accepted; if the task's text allows it, ${fix} accepts it, else move it to rejected`;
}
