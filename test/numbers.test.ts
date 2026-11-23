import { describe, expect, it } from "vite-plus/test";
import { numberFormatter, schoolGerman } from "../runtime/shared/numbers.ts";
import { formatNumber } from "../runtime/explainer/generated/texts.ts";
import { Fraction } from "../runtime/explainer/fraction.ts";

describe("numbers as school German writes them", () => {
  const de = numberFormatter("de", "de-DE", { maximumFractionDigits: 3 });

  it("uses the decimal comma, never a point", () => {
    expect(de.format(2236.068)).toBe("2 236,068".replace(" ", ""));
    expect(de.format(2.5)).toBe("2,5");
  });
  it("leaves four digits together and groups from five digits with a narrow no-break space", () => {
    expect(de.format(2024)).toBe("2024");
    expect(de.format(12345)).toBe("12 345");
    expect(de.format(1000000)).toBe("1 000 000");
    expect(de.format(12345.5)).toBe("12 345,5");
  });
  it("writes the minus sign as U+2212", () => {
    expect(de.format(-3)).toBe("−3");
    expect(de.format(-12345)).toBe("−12 345");
    expect(schoolGerman("-0,5")).toBe("−0,5");
  });
  it("leaves other languages to Intl", () => {
    expect(numberFormatter("en", "en-GB").format(-12345.5)).toBe("-12,345.5");
  });
  it("shows a generated number the same way, and a learner can type it back", () => {
    expect(formatNumber(Fraction.of(-3), "de")).toBe("−3");
    expect(formatNumber(Fraction.of(12345), "de")).toBe("12 345");
  });
});
