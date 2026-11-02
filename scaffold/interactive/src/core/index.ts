// The app's logic, a placeholder: a count from 0 to the goal of src/data/count.json, one step for each "weiter" (the
// button of the component).
// Pure TypeScript without DOM; the runtime keeps the state and calls start and step
// (@lernapps/app-templates/interactive). Replace it with the planned core.
import type { Input } from "@lernapps/app-templates/interactive";
import count from "../data/count.json" with { type: "json" };

export interface State {
  seed: number;
  count: number;
  done: boolean;
}

/** How far the count goes. */
export const GOAL: number = count.goal;

export function start(seed: number): State {
  return { seed, count: 0, done: false };
}

export function step(state: State, input: Input): State {
  if (state.done || input.kind !== "action" || input.name !== "weiter") return state;
  const count = state.count + 1;
  return { ...state, count, done: count >= GOAL };
}
