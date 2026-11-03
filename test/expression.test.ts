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
    expect(number("events[0].year", env)).toBe("1789");
    const titles = run("map(sortBy(events, year), title)", env) as Value[];
    expect(titles.map(String)).toEqual(["Rechenmaschine", "Bastille", "Programm"]);
    const reversed = run("map(reverse(sortBy(events, year)), title)", env) as Value[];
    expect(reversed.map(String)).toEqual(["Programm", "Bastille", "Rechenmaschine"]);
  });

  test("the variables an expression uses, not its functions or field names", () => {
    expect([...variables(parse("map(sortBy(events, year), title)"))]).toEqual(["events"]);
    expect([...variables(parse("e.group != e.period and G > 1"))].sort()).toEqual(["G", "e"]);
  });
});

describe("roots, powers and trigonometry in degrees", () => {
  test("sqrt and pow are exact where the result is rational", () => {
    expect(number("sqrt(9 / 4)")).toBe("3/2");
    expect(number("sqrt(0)")).toBe("0");
    expect(number("pow(2, 10)")).toBe("1024");
    expect(number("pow(2 / 3, 2)")).toBe("4/9");
    expect(number("pow(2, -2)")).toBe("1/4");
    expect(number("pow(5, 0)")).toBe("1");
  });

  test("an irrational result has 12 decimal places, which round(x, n) rounds", () => {
    expect(number("round(sqrt(2), 3)")).toBe("707/500");
    expect(run("decimals(sqrt(2))")).toEqual(Fraction.of(12));
    expect(number("round(pow(2, 0.5), 2)")).toBe("141/100");
  });

  test("sin, cos and tan take degrees, exact at the angles with a rational value", () => {
    expect(number("sin(30)")).toBe("1/2");
    expect(number("sin(90)")).toBe("1");
    expect(number("sin(-30)")).toBe("-1/2");
    expect(number("sin(390)")).toBe("1/2");
    expect(number("cos(60)")).toBe("1/2");
    expect(number("cos(90)")).toBe("0");
    expect(number("cos(180)")).toBe("-1");
    expect(number("tan(45)")).toBe("1");
    expect(number("tan(135)")).toBe("-1");
    expect(number("tan(180)")).toBe("0");
    expect(number("round(sin(60), 4)")).toBe("433/500");
    expect(number("round(tan(30), 3)")).toBe("577/1000");
  });

  test("asin, acos and atan give degrees, exact at the values of those angles", () => {
    expect(number("asin(1 / 2)")).toBe("30");
    expect(number("acos(1 / 2)")).toBe("60");
    expect(number("acos(-1)")).toBe("180");
    expect(number("atan(1)")).toBe("45");
    expect(number("atan(-1)")).toBe("-45");
    expect(number("round(asin(0.6), 2)")).toBe("3687/100");
    expect(number("round(atan(2), 1)")).toBe("317/5");
  });

  // property tests over every whole angle and a fixed list of values
  const close = (value: Value, expected: number, places = 9) =>
    expect((value as Fraction).toNumber()).toBeCloseTo(expected, places);

  test("sin² + cos² is 1, and tan is sin / cos, for every whole angle", () => {
    for (let angle = -360; angle <= 720; angle++) {
      const env = { x: Fraction.of(angle) };
      close(run("pow(sin(x), 2) + pow(cos(x), 2)", env), 1);
      if (angle % 180 !== 90 && angle % 180 !== -90) close(run("tan(x) - sin(x) / cos(x)", env), 0, 6);
      close(run("sin(x)", env), Math.sin((angle * Math.PI) / 180));
    }
  });

  test("asin, acos and atan undo sin, cos and tan within their range", () => {
    for (let angle = -90; angle <= 90; angle++) {
      close(run("asin(sin(x))", { x: Fraction.of(angle) }), angle, 6);
      if (angle > -90 && angle < 90) close(run("atan(tan(x))", { x: Fraction.of(angle) }), angle, 6);
    }
    for (let angle = 0; angle <= 180; angle++) close(run("acos(cos(x))", { x: Fraction.of(angle) }), angle, 6);
  });

  test("sqrt undoes pow(x, 2) for x ≥ 0", () => {
    for (let tenth = 0; tenth <= 1000; tenth += 7) {
      const x = Fraction.of(tenth, 10);
      expect(run("sqrt(pow(x, 2))", { x })).toEqual(x);
      close(run("pow(sqrt(x), 2)", { x }), x.toNumber());
    }
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
    fails("sqrt(-1)", "sqrt needs a number ≥ 0");
    fails("asin(2)", "asin needs a number from -1 to 1");
    fails("tan(90)", "tan(90) has no value");
    fails("pow(0, -1)", "pow(0, n) needs n ≥ 0");
    fails("pow(-8, 1 / 3)", "needs a whole exponent");
    fails('sin("a")', "sin needs numbers");
  });
});
