// The expression language of generated exercises (`where`, `answer`, `mistakes`, the figure's values): a small
// language, parsed here into a tree and evaluated by walking it, with no eval and no access to anything but the
// values it is given. It has
// - arithmetic on exact fractions: + - * /, parentheses, unary minus; numbers as written (0.1 is 1/10);
// - comparisons == != < <= > >=, and, or, not; true, false; strings in quotes;
// - record fields (e.year), list index (xs[0]), list literals ([1, 2, 3]);
// - the functions round(x, n), abs(x), decimals(x), len(xs), map(xs, field), sortBy(xs, field), reverse(xs),
//   minBy(xs, field), maxBy(xs, field), contains(xs, x), distinct(xs) (whether all are different).
// Errors are ExpressionErrors whose message says what to change.
import { Fraction } from "./fraction.ts";

/** A text in several languages, from a data file or a list: compared and sorted by its German text. */
export class Localized {
  readonly texts: Readonly<Record<string, string>>;
  constructor(texts: Readonly<Record<string, string>>) {
    this.texts = texts;
  }
  in(lang: string): string {
    return this.texts[lang] ?? this.texts["de"] ?? "";
  }
  toString(): string {
    return this.in("de");
  }
}

/** A record of a data file: its fields by name. */
export type Rec = { readonly [field: string]: Value };
export type Value = Fraction | string | boolean | Localized | Rec | readonly Value[];

export class ExpressionError extends Error {}

type Node =
  | { kind: "number"; value: Fraction }
  | { kind: "string"; value: string }
  | { kind: "boolean"; value: boolean }
  | { kind: "name"; name: string }
  | { kind: "list"; items: Node[] }
  | { kind: "field"; of: Node; field: string }
  | { kind: "index"; of: Node; index: Node }
  | { kind: "call"; fn: string; args: Node[] }
  | { kind: "unary"; op: "-" | "not"; arg: Node }
  | { kind: "binary"; op: string; left: Node; right: Node };

export type Expression = Node;

/** The functions, with their number of arguments and which arguments are field names. */
const FUNCTIONS: Readonly<Record<string, { arity: number; field?: number }>> = {
  round: { arity: 2 },
  abs: { arity: 1 },
  decimals: { arity: 1 },
  len: { arity: 1 },
  map: { arity: 2, field: 1 },
  sortBy: { arity: 2, field: 1 },
  reverse: { arity: 1 },
  minBy: { arity: 2, field: 1 },
  maxBy: { arity: 2, field: 1 },
  contains: { arity: 2 },
  distinct: { arity: 1 },
};
const KEYWORDS = new Set(["and", "or", "not", "true", "false"]);

interface Token {
  type: "number" | "string" | "name" | "op" | "end";
  text: string;
  at: number;
}

function tokens(source: string): Token[] {
  const list: Token[] = [];
  const pattern =
    /\s*(?:(\d+(?:\.\d+)?)|"([^"]*)"|'([^']*)'|([A-Za-z_][A-Za-z0-9_]*)|(==|!=|<=|>=|[-+*/()<>[\],.]|=)|(\S))/y;
  let match: RegExpExecArray | null;
  pattern.lastIndex = 0;
  while (pattern.lastIndex < source.length && (match = pattern.exec(source)) !== null) {
    const at = match.index + match[0].length - match[0].trimStart().length;
    if (match[0].trim() === "") break;
    if (match[1] !== undefined) list.push({ type: "number", text: match[1], at });
    else if (match[2] !== undefined || match[3] !== undefined)
      list.push({ type: "string", text: match[2] ?? match[3] ?? "", at });
    else if (match[4] !== undefined) list.push({ type: "name", text: match[4], at });
    else if (match[5] !== undefined) {
      if (match[5] === "=") throw new ExpressionError(`= at ${at + 1}: use == to compare`);
      list.push({ type: "op", text: match[5], at });
    } else throw new ExpressionError(`unexpected ${match[6] ?? "character"} at ${at + 1}`);
  }
  list.push({ type: "end", text: "the end", at: source.length });
  return list;
}

/** Parses `source` into an expression; throws an ExpressionError that says where it does not parse. */
export function parse(source: string): Expression {
  const list = tokens(source);
  let position = 0;
  const peek = (): Token => list[position] ?? { type: "end", text: "the end", at: source.length };
  const next = (): Token => {
    const token = peek();
    position++;
    return token;
  };
  const isOp = (text: string) => peek().type === "op" && peek().text === text;
  const isWord = (text: string) => peek().type === "name" && peek().text === text;
  const expect = (text: string) => {
    const token = next();
    if (token.text !== text) throw new ExpressionError(`expected ${text} at ${token.at + 1}, found ${token.text}`);
  };

  const or = (): Node => {
    let left = and();
    while (isWord("or")) {
      next();
      left = { kind: "binary", op: "or", left, right: and() };
    }
    return left;
  };
  const and = (): Node => {
    let left = not();
    while (isWord("and")) {
      next();
      left = { kind: "binary", op: "and", left, right: not() };
    }
    return left;
  };
  const not = (): Node => {
    if (isWord("not")) {
      next();
      return { kind: "unary", op: "not", arg: not() };
    }
    return comparison();
  };
  const comparison = (): Node => {
    const left = sum();
    const token = peek();
    if (token.type === "op" && ["==", "!=", "<", "<=", ">", ">="].includes(token.text)) {
      next();
      return { kind: "binary", op: token.text, left, right: sum() };
    }
    return left;
  };
  const sum = (): Node => {
    let left = product();
    while (isOp("+") || isOp("-")) left = { kind: "binary", op: next().text, left, right: product() };
    return left;
  };
  const product = (): Node => {
    let left = unary();
    while (isOp("*") || isOp("/")) left = { kind: "binary", op: next().text, left, right: unary() };
    return left;
  };
  const unary = (): Node => {
    if (isOp("-")) {
      next();
      return { kind: "unary", op: "-", arg: unary() };
    }
    return postfix();
  };
  const postfix = (): Node => {
    let node = primary();
    for (;;) {
      if (isOp(".")) {
        next();
        const field = next();
        if (field.type !== "name") throw new ExpressionError(`expected a field name at ${field.at + 1}`);
        node = { kind: "field", of: node, field: field.text };
      } else if (isOp("[")) {
        next();
        const index = or();
        expect("]");
        node = { kind: "index", of: node, index };
      } else return node;
    }
  };
  const primary = (): Node => {
    const token = next();
    if (token.type === "number") return { kind: "number", value: Fraction.from(Number(token.text)) };
    if (token.type === "string") return { kind: "string", value: token.text };
    if (token.type === "name") {
      if (token.text === "true" || token.text === "false") return { kind: "boolean", value: token.text === "true" };
      if (KEYWORDS.has(token.text)) throw new ExpressionError(`unexpected ${token.text} at ${token.at + 1}`);
      if (!isOp("(")) return { kind: "name", name: token.text };
      const fn = FUNCTIONS[token.text];
      if (fn === undefined || !Object.hasOwn(FUNCTIONS, token.text)) {
        throw new ExpressionError(
          `${token.text} is not a function of the expression language; use one of ${Object.keys(FUNCTIONS).join(", ")}`,
        );
      }
      next();
      const args: Node[] = [];
      if (!isOp(")")) {
        args.push(or());
        while (isOp(",")) {
          next();
          args.push(or());
        }
      }
      expect(")");
      if (args.length !== fn.arity) {
        throw new ExpressionError(`${token.text} takes ${fn.arity} argument${fn.arity === 1 ? "" : "s"}`);
      }
      if (fn.field !== undefined && args[fn.field]?.kind !== "name") {
        throw new ExpressionError(`the argument ${fn.field + 1} of ${token.text} is a field name, e.g. year`);
      }
      return { kind: "call", fn: token.text, args };
    }
    if (token.type === "op" && token.text === "(") {
      const inner = or();
      expect(")");
      return inner;
    }
    if (token.type === "op" && token.text === "[") {
      const items: Node[] = [];
      if (!isOp("]")) {
        items.push(or());
        while (isOp(",")) {
          next();
          items.push(or());
        }
      }
      expect("]");
      return { kind: "list", items };
    }
    throw new ExpressionError(`unexpected ${token.text} at ${token.at + 1}`);
  };

  const tree = or();
  const rest = peek();
  if (rest.type !== "end") throw new ExpressionError(`unexpected ${rest.text} at ${rest.at + 1}`);
  return tree;
}

/** The variables an expression uses: its names, not its functions or the field names they take. */
export function variables(node: Expression, into = new Set<string>()): Set<string> {
  switch (node.kind) {
    case "name":
      into.add(node.name);
      break;
    case "list":
      for (const item of node.items) variables(item, into);
      break;
    case "field":
      variables(node.of, into);
      break;
    case "index":
      variables(node.of, into);
      variables(node.index, into);
      break;
    case "call":
      node.args.forEach((arg, index) => {
        if (FUNCTIONS[node.fn]?.field !== index) variables(arg, into);
      });
      break;
    case "unary":
      variables(node.arg, into);
      break;
    case "binary":
      variables(node.left, into);
      variables(node.right, into);
      break;
    default:
      break;
  }
  return into;
}

const isList = (value: Value): value is readonly Value[] => Array.isArray(value);
const isRecord = (value: Value): value is Rec =>
  typeof value === "object" && !Array.isArray(value) && !(value instanceof Fraction) && !(value instanceof Localized);

/** Whether two values are the same: numbers by value, texts by their German text, lists and records item by item. */
export function same(a: Value, b: Value): boolean {
  if (a instanceof Fraction || b instanceof Fraction) {
    return a instanceof Fraction && b instanceof Fraction && a.equals(b);
  }
  if (isList(a) || isList(b)) {
    return isList(a) && isList(b) && a.length === b.length && a.every((item, index) => same(item, b[index] as Value));
  }
  if (typeof a === "boolean" || typeof b === "boolean") return a === b;
  if (isRecord(a) || isRecord(b)) {
    if (!isRecord(a) || !isRecord(b)) return false;
    const keys = Object.keys(a);
    return (
      keys.length === Object.keys(b).length && keys.every((key) => key in b && same(a[key] as Value, b[key] as Value))
    );
  }
  return String(a) === String(b);
}

/** The order of two values: numbers by value, texts by their German text. */
function order(a: Value, b: Value, what: string): number {
  if (a instanceof Fraction && b instanceof Fraction) return a.compare(b);
  const text = (value: Value) => (typeof value === "string" || value instanceof Localized ? String(value) : undefined);
  const left = text(a);
  const right = text(b);
  if (left === undefined || right === undefined) throw new ExpressionError(`${what} compares numbers or texts`);
  return left < right ? -1 : left > right ? 1 : 0;
}

const describe = (value: Value): string =>
  value instanceof Fraction
    ? "a number"
    : typeof value === "string" || value instanceof Localized
      ? "a text"
      : typeof value === "boolean"
        ? "true or false"
        : isList(value)
          ? "a list"
          : "a record";

function asNumber(value: Value, what: string): Fraction {
  if (!(value instanceof Fraction)) throw new ExpressionError(`${what} needs numbers, not ${describe(value)}`);
  return value;
}
function asList(value: Value, what: string): readonly Value[] {
  if (!isList(value)) throw new ExpressionError(`${what} needs a list, not ${describe(value)}`);
  return value;
}
function asBoolean(value: Value, what: string): boolean {
  if (typeof value !== "boolean") throw new ExpressionError(`${what} needs true or false, not ${describe(value)}`);
  return value;
}
function fieldOf(value: Value, field: string): Value {
  if (!isRecord(value)) throw new ExpressionError(`.${field} needs a record, not ${describe(value)}`);
  if (!Object.hasOwn(value, field)) {
    throw new ExpressionError(`the record has no field ${field}; it has ${Object.keys(value).join(", ")}`);
  }
  return value[field] as Value;
}
function integer(value: Fraction, what: string): number {
  if (!value.isInteger()) throw new ExpressionError(`${what} needs a whole number`);
  return Number(value.n);
}

function call(fn: string, args: readonly Node[], env: Readonly<Record<string, Value>>): Value {
  const value = (index: number) => evaluate(args[index] as Node, env);
  const field = () => (args[1] as Extract<Node, { kind: "name" }>).name;
  switch (fn) {
    case "round":
      return asNumber(value(0), "round").round(integer(asNumber(value(1), "round"), "round"));
    case "abs":
      return asNumber(value(0), "abs").abs();
    case "decimals": {
      const places = asNumber(value(0), "decimals").decimals();
      // a decimal that never ends: more places than any limit
      return Fraction.of(places === Infinity ? 1_000_000 : places);
    }
    case "len":
      return Fraction.of(asList(value(0), "len").length);
    case "map":
      return asList(value(0), "map").map((item) => fieldOf(item, field()));
    case "sortBy": {
      const name = field();
      return [...asList(value(0), "sortBy")].sort((a, b) => order(fieldOf(a, name), fieldOf(b, name), "sortBy"));
    }
    case "reverse":
      return [...asList(value(0), "reverse")].reverse();
    case "minBy":
    case "maxBy": {
      const list = asList(value(0), fn);
      const name = field();
      if (list.length === 0) throw new ExpressionError(`${fn} needs a list that is not empty`);
      const sign = fn === "minBy" ? -1 : 1;
      return list.reduce((best, item) =>
        sign * order(fieldOf(item, name), fieldOf(best, name), fn) > 0 ? item : best,
      );
    }
    case "contains": {
      const needle = value(1);
      return asList(value(0), "contains").some((item) => same(item, needle));
    }
    case "distinct": {
      const list = asList(value(0), "distinct");
      return list.every((item, index) => list.findIndex((other) => same(other, item)) === index);
    }
    default:
      throw new ExpressionError(`${fn} is not a function of the expression language`);
  }
}

/** The value of an expression with the variables of `env`; throws an ExpressionError when it has none. */
export function evaluate(node: Expression, env: Readonly<Record<string, Value>>): Value {
  switch (node.kind) {
    case "number":
    case "string":
    case "boolean":
      return node.value;
    case "name":
      if (!Object.hasOwn(env, node.name)) throw new ExpressionError(`${node.name} is not declared`);
      return env[node.name] as Value;
    case "list":
      return node.items.map((item) => evaluate(item, env));
    case "field":
      return fieldOf(evaluate(node.of, env), node.field);
    case "index": {
      const list = asList(evaluate(node.of, env), "[…]");
      const index = integer(asNumber(evaluate(node.index, env), "[…]"), "[…]");
      if (index < 0 || index >= list.length) {
        throw new ExpressionError(`the list has no element ${index}; it has ${list.length}, from 0`);
      }
      return list[index] as Value;
    }
    case "call":
      return call(node.fn, node.args, env);
    case "unary": {
      const arg = evaluate(node.arg, env);
      return node.op === "-" ? asNumber(arg, "-").neg() : !asBoolean(arg, "not");
    }
    case "binary": {
      if (node.op === "and")
        return asBoolean(evaluate(node.left, env), "and") && asBoolean(evaluate(node.right, env), "and");
      if (node.op === "or")
        return asBoolean(evaluate(node.left, env), "or") || asBoolean(evaluate(node.right, env), "or");
      const left = evaluate(node.left, env);
      const right = evaluate(node.right, env);
      switch (node.op) {
        case "+":
          return asNumber(left, "+").add(asNumber(right, "+"));
        case "-":
          return asNumber(left, "-").sub(asNumber(right, "-"));
        case "*":
          return asNumber(left, "*").mul(asNumber(right, "*"));
        case "/": {
          const divisor = asNumber(right, "/");
          if (divisor.n === 0n) throw new ExpressionError("division by zero");
          return asNumber(left, "/").div(divisor);
        }
        case "==":
          return same(left, right);
        case "!=":
          return !same(left, right);
        default: {
          const sign = order(left, right, node.op);
          return node.op === "<" ? sign < 0 : node.op === "<=" ? sign <= 0 : node.op === ">" ? sign > 0 : sign >= 0;
        }
      }
    }
  }
}
