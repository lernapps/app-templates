// The parameters of the address of an interactive app (dec-address-params): what the shell gives the core from the
// address, the address a playthrough opens, and the links of the language switch, which keep the address.
import { expect, test } from "vite-plus/test";
import { addressOf, languageHref, paramsOf } from "../runtime/interactive/contract.ts";

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

test("the language switch keeps the search, seed included, and the hash of the address, parsed as URLs", () => {
  const address = new URL("https://lernapps.net/coding/app/?c=eJyr-_0%2B&seed=7&level=2&level=3#schleifen");
  expect(languageHref("../en/app/", address)).toBe(
    "https://lernapps.net/coding/en/app/?c=eJyr-_0%2B&seed=7&level=2&level=3#schleifen",
  );
  // the link's own parameters stay; one the address has too takes the address's values
  expect(languageHref("../en/app/?ref=switch&level=9", address)).toBe(
    "https://lernapps.net/coding/en/app/?ref=switch&c=eJyr-_0%2B&seed=7&level=2&level=3#schleifen",
  );
  // the link is not changed by the round trip through URL: a value is decoded once and encoded once
  const target = new URL(languageHref("../en/app/", address));
  expect(target.searchParams.get("c")).toBe("eJyr-_0+");
  expect(target.searchParams.getAll("level")).toEqual(["2", "3"]);
});

test("an address without search or hash leaves the link as it is, made absolute", () => {
  const address = new URL("https://lernapps.net/coding/en/app/");
  expect(languageHref("../../app/", address)).toBe("https://lernapps.net/coding/app/");
  expect(languageHref("../../app/#erste", new URL("https://lernapps.net/coding/en/app/#zweite"))).toBe(
    "https://lernapps.net/coding/app/#zweite",
  );
});
