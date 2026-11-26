// The template's core (typing.ts, the template's src/core/index.ts) with the parameters of the address: it keeps
// them in its state, and the challenge ?c=<base64url> if it is one, else null; the parameters stay the same for every
// round, also the next one, which typing.ts starts without them. A fixture of the runtime's parameters of the
// address (start(seed, route, params)), not an app.
import type { Input, Params } from "@lernapps/app-templates/interactive";
import * as typing from "./typing.ts";

export { lessonOf } from "./typing.ts";

export interface State extends typing.State {
  /** The challenge of the address, ?c=, if it is base64url text; else null. */
  challenge: string | null;
  /** The parameters of the address, as the runtime gave them. */
  params: Record<string, string>;
}

/** What the app takes as a challenge: base64url text, as lernapps/coding links with. */
const CHALLENGE = /^[\w-]+$/;

export function start(seed: number, route: string, params: Params = {}): State {
  const c = params["c"];
  return {
    ...typing.start(seed, route),
    challenge: c !== undefined && CHALLENGE.test(c) ? c : null,
    params: { ...params },
  };
}

/** `next` of typing.ts with the parameters of `state`, or `state` itself when nothing changed. */
function keep(state: State, next: typing.State): State {
  return next === state ? state : { ...next, challenge: state.challenge, params: state.params };
}

export function step(state: State, input: Input): State {
  return keep(state, typing.step(state, input));
}

export function tick(state: State, dt: number): State {
  return keep(state, typing.tick(state, dt));
}
