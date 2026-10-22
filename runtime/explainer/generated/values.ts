// The values of a generated exercise: the arbitraries (`given`) drawn from a seed, the preconditions (`where`), the
// compiled expressions, and the task of a seed.
import { evaluate, type Expression, ExpressionError, Localized, parse, type Rec, type Value } from "../expression.ts";
import { Fraction } from "../fraction.ts";
import { hash, random, shuffled } from "../../shared/questions/question.ts";
import { type Text } from "../../shared/languages.ts";
import { type Arbitrary, type Data, type Generated, type Literal, type Source, type Task } from "./types.ts";
import { kindOf } from "./comparator.ts";

/** How many draws a seed may take until `where` holds. */
export const ATTEMPTS = 100;

const literal = (value: Literal): Value =>
  typeof value === "number" ? Fraction.from(value) : typeof value === "string" ? value : new Localized(value);

export function record(source: Readonly<Record<string, number | boolean | Text>>): Rec {
  const fields: Record<string, Value> = {};
  for (const [key, value] of Object.entries(source)) {
    fields[key] =
      typeof value === "number"
        ? Fraction.from(value)
        : typeof value === "boolean" || typeof value === "string"
          ? value
          : new Localized(value);
  }
  return fields;
}

export function items(source: Source, data: Data): Value[] {
  if (Array.isArray(source)) return (source as readonly Literal[]).map(literal);
  const name = (source as { data: string }).data;
  const records = data[name];
  if (records === undefined) throw new ExpressionError(`src/data/${name}.yaml does not exist`);
  return records.map(record);
}

/** The value of one arbitrary, drawn with `next`. */
export function draw(arbitrary: Arbitrary, next: () => number, data: Data): Value {
  const range = arbitrary.int ?? arbitrary.decimal;
  if (range !== undefined) {
    const [min, max] = range;
    const step = Fraction.from(arbitrary.step ?? 1);
    const low = Fraction.from(min);
    const count = Math.floor(Fraction.from(max).sub(low).div(step).toNumber() + 1e-9) + 1;
    return low.add(step.mul(Fraction.of(Math.floor(next() * count))));
  }
  if (arbitrary.oneOf !== undefined) {
    const list = arbitrary.oneOf;
    return literal(list[Math.floor(next() * list.length)] as Literal);
  }
  const list = items(arbitrary.from ?? [], data);
  const count = arbitrary.pick ?? 1;
  const picked: Value[] = [];
  if (arbitrary.distinct === true) {
    const order = shuffled(list.length, Math.floor(next() * 2 ** 31));
    for (const index of order.slice(0, count)) picked.push(list[index] as Value);
  } else {
    for (let i = 0; i < count; i++) picked.push(list[Math.floor(next() * list.length)] as Value);
  }
  return count === 1 && arbitrary.pick === 1 ? (picked[0] as Value) : picked;
}

/** The parsed expressions of an exercise, once per exercise. */
interface Compiled {
  where: Expression[];
  answer: Expression;
  mistakes: Expression[];
  options?: Expression;
}
const compiledCache = new WeakMap<Generated, Compiled>();
export function compiled(spec: Generated): Compiled {
  let found = compiledCache.get(spec);
  if (found === undefined) {
    const kind = kindOf(spec.answer.compare);
    found = {
      where: (spec.where ?? []).map((source) => parse(source)),
      answer: parse(spec.answer.value),
      mistakes: (spec.mistakes ?? []).map((mistake) => parse(mistake.value)),
      ...(kind.kind === "choice" && typeof kind.options === "string" ? { options: parse(kind.options) } : {}),
    };
    compiledCache.set(spec, found);
  }
  return found;
}

/** The values of `given` for a seed and an attempt. */
export function values(spec: Generated, seed: number, attempt: number, data: Data): Record<string, Value> {
  const next = random(hash(`${spec.id}#${seed}#${attempt}`));
  const drawn: Record<string, Value> = {};
  for (const [name, arbitrary] of Object.entries(spec.given)) drawn[name] = draw(arbitrary, next, data);
  return drawn;
}

/** Whether every precondition holds for these values. */
export function holds(spec: Generated, env: Record<string, Value>): boolean {
  return compiled(spec).where.every((condition, index) => {
    const value = evaluate(condition, env);
    if (typeof value !== "boolean") {
      throw new ExpressionError(`where[${index}] needs true or false, not a value`);
    }
    return value;
  });
}

/** Thrown when no draw of a seed passes `where`. */
export class StarvedError extends ExpressionError {}

/** The task of `seed`: the first draw whose values pass `where`, with the answer, the mistakes and the options. */
export function generate(spec: Generated, seed: number, data: Data): Task {
  const code = compiled(spec);
  for (let attempt = 0; attempt < ATTEMPTS; attempt++) {
    const env = values(spec, seed, attempt, data);
    if (!holds(spec, env)) continue;
    const answer = evaluate(code.answer, env);
    const task: Task = { seed, values: env, answer, mistakes: code.mistakes.map((mistake) => evaluate(mistake, env)) };
    const kind = kindOf(spec.answer.compare);
    if (kind.kind === "choice") {
      const options =
        code.options === undefined ? (kind.options as readonly Literal[]).map(literal) : evaluate(code.options, env);
      if (!Array.isArray(options)) throw new ExpressionError(`the options of choice are not a list`);
      task.options = [...(options as Value[])];
    }
    return task;
  }
  throw new StarvedError(`where holds in none of ${ATTEMPTS} draws for seed ${seed}`);
}
