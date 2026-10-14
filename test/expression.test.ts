// The expression language of generated exercises: exact fractions, comparisons, records and lists, the functions of
// the list, parsed without eval; and its errors, which name what to change.
import { describe, expect, test } from "vite-plus/test";
import { Fraction } from "../runtime/explainer/fraction.ts";
import { evaluate, ExpressionError, Localized, parse, variables, type Value } from "../runtime/explainer/expression.ts";

const run = (source: string, env: Record<string, Value> = {}): Value => evaluate(parse(source), env);
const number = (source: string, env: Record<string, Value> = {}): string => {
  const value = run(source, env);
  return value instanceof Fraction || typeof value === "boolean" ? String(value) : JSON.stringify(value);
};

describe("fractions", () => {
  test("are exact", () => {
    expect(Fraction.from(0.1).add(Fraction.from(0.2)).equals(Fraction.from(0.3))).toBe(true);
    expect(String(Fraction.of(2, 6))).toBe("1/3");
    expect(String(Fraction.from(1.25))).toBe("5/4");
    expect(Fraction.of(1, 3).toNumber()).toBeCloseTo(0.3333333, 6);
  });

  test("count their decimals, and say when they never end", () => {
    expect(Fraction.from(12.5).decimals()).toBe(1);
    expect(Fraction.of(1, 8).decimals()).toBe(3);
    expect(Fraction.of(1, 3).decimals()).toBe(Infinity);
  });

  test("round half away from zero", () => {
    expect(Fraction.of(5, 2).round(0).toNumber()).toBe(3);
    expect(Fraction.of(-5, 2).round(0).toNumber()).toBe(-3);
    expect(Fraction.of(2, 3).round(2).toNumber()).toBe(0.67);
  });
});

describe("expressions", () => {
  test("arithmetic on exact fractions, with precedence and parentheses", () => {
    expect(number("1 + 2 * 3")).toBe("7");
    expect(number("(1 + 2) * 3")).toBe("9");
    expect(number("0.1 + 0.2 == 0.3", {})).toBe("true");
    expect(number("G * p / 100", { G: Fraction.from(250), p: Fraction.from(12) })).toBe("30");
    expect(number("-3 + 1")).toBe("-2");
    expect(number("1 / 3 * 3")).toBe("1");
  });

  test("round, abs and decimals", () => {
    expect(number("round(2 / 3, 2)")).toBe("67/100");
    expect(number("abs(0 - 4)")).toBe("4");
    expect(number("decimals(12.25)")).toBe("2");
    expect(run("decimals(1 / 3) <= 2")).toBe(false);
  });

  test("comparisons, and, or, not", () => {
    expect(run("1 < 2 and not (2 < 1)")).toBe(true);
    expect(run("1 > 2 or 2 >= 2")).toBe(true);
    expect(run("1 != 1")).toBe(false);
    expect(run('"a" == "a"')).toBe(true);
  });

  test("record fields, list index and the list functions", () => {
    const events: Value = [
      { year: Fraction.from(1789), title: new Localized({ de: "Bastille", en: "Bastille" }) },
      { year: Fraction.from(1642), title: new Localized({ de: "Rechenmaschine", en: "Calculator" }) },
      { year: Fraction.from(1843), title: new Localized({ de: "Programm", en: "Program" }) },
    ];
    const env = { events };
    expect(number("len(events)", env)).toBe("3");
    expect(number("events[0].year", env)).toBe("1789");
    expect(number("minBy(events, year).year", env)).toBe("1642");
    expect(number("maxBy(events, year).year", env)).toBe("1843");
    const titles = run("map(sortBy(events, year), title)", env) as Value[];
    expect(titles.map(String)).toEqual(["Rechenmaschine", "Bastille", "Programm"]);
    const reversed = run("map(reverse(sortBy(events, year)), title)", env) as Value[];
    expect(reversed.map(String)).toEqual(["Programm", "Bastille", "Rechenmaschine"]);
    expect(run("distinct(map(events, year))", env)).toBe(true);
    expect(run("distinct([1, 2, 1])")).toBe(false);
    expect(run("contains(map(events, year), 1789)", env)).toBe(true);
    expect(run("contains([1, 2], 3)")).toBe(false);
  });

  test("the variables an expression uses, not its functions or field names", () => {
    expect([...variables(parse("map(sortBy(events, year), title)"))]).toEqual(["events"]);
    expect([...variables(parse("e.group != e.period and G > 1"))].sort()).toEqual(["G", "e"]);
  });
});

describe("errors name what to change", () => {
  const fails = (source: string, message: string, env: Record<string, Value> = {}) =>
    expect(() => run(source, env)).toThrow(message);

  test("parse errors, without eval", () => {
    expect(() => parse("1 +")).toThrow(ExpressionError);
    expect(() => parse("G = 1")).toThrow("use == to compare");
    expect(() => parse("alert(1)")).toThrow("alert is not a function of the expression language");
    expect(() => parse("constructor.constructor('x')()")).toThrow(ExpressionError);
    expect(() => parse("1 ; 2")).toThrow("unexpected ;");
  });

  test("evaluation errors", () => {
    fails("1 / 0", "division by zero");
    fails("x + 1", "x is not declared");
    fails("[1, 2][5]", "no element 5");
    fails('1 + "a"', "+ needs numbers");
    fails("round(1.5)", "round takes 2 arguments");
  });
});
