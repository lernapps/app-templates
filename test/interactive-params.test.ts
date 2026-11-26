// The parameters of the address of an interactive app (dec-address-params): what the shell gives the core from the
// address, and the address a playthrough opens.
import { expect, test } from "vite-plus/test";
import { addressOf, paramsOf } from "../runtime/interactive/contract.ts";

test("every search parameter but seed, as text, the first value of a name given twice, frozen", () => {
  const params = paramsOf(new URLSearchParams("c=eJyr-_0&seed=7&level=2&level=3&empty="));
  expect({ ...params }).toEqual({ c: "eJyr-_0", level: "2", empty: "" });
  expect(Object.isFrozen(params)).toBe(true);
  expect({ ...paramsOf(new URLSearchParams("seed=1")) }).toEqual({});
});

test("a parameter is passed whole, however long, and __proto__ is a name like any other", () => {
  const long = "A-_z9".repeat(500);
  const params = paramsOf(new URLSearchParams(`c=${long}&__proto__=x`));
  expect(params["c"]).toHaveLength(2500);
  expect(params["__proto__"]).toBe("x");
  expect(Object.keys(params)).toEqual(["c", "__proto__"]);
});

test("a playthrough's address: the seed, then its params, then its route", () => {
  expect(addressOf({ seed: 3, steps: [] }, "grundreihe")).toBe("?seed=3#grundreihe");
  expect(addressOf({ seed: 3, params: { c: "a+b/=", level: "2" }, steps: [] }, undefined)).toBe(
    "?seed=3&c=a%2Bb%2F%3D&level=2",
  );
  const params = paramsOf(
    new URLSearchParams(addressOf({ seed: 3, params: { c: "a+b/= ä" }, steps: [] }, "x").slice(1, -2)),
  );
  expect({ ...params }).toEqual({ c: "a+b/= ä" });
});
