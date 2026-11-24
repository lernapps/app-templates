import { describe, expect, test } from "vite-plus/test";
import { fractionHtml, fractionProblems } from "../runtime/shared/text/fraction.ts";
import { renderWithFormulas } from "../runtime/shared/text/markdown.ts";

describe("fractions in feedback (fraction.ts)", () => {
  test("a fraction is the MathML the build gives the same formula", () => {
    for (const tex of ["\\frac{3}{4}", "\\frac{1}{2}+\\frac{1}{3}", "x=\\frac{a}{b}"]) {
      expect(fractionHtml(`$${tex}$`), tex).toBe(renderWithFormulas(`$${tex}$`));
    }
  });

  test("the text around a formula is escaped, and the formula stays where it is", () => {
    expect(fractionHtml("Du hast <b>$\\frac{3}{4}$</b> & mehr")).toBe(
      "Du hast &lt;b&gt;<math><mfrac><mn>3</mn><mn>4</mn></mfrac></math>&lt;/b&gt; &amp; mehr",
    );
    expect(fractionHtml("3/4 und ein Preis in €")).toBe("3/4 und ein Preis in €");
  });

  test("a formula outside the part it renders stays text, and the build reports it", () => {
    expect(fractionHtml("$\\sqrt{2}$")).toBe("$\\sqrt{2}$");
    expect(fractionProblems("$\\sqrt{2}$")[0]).toContain("\\sqrt is not supported");
    expect(fractionProblems("$\\frac{1}$")[0]).toContain("\\frac needs two arguments");
    expect(fractionProblems("$\\frac{1}{2$")[0]).toContain("not closed");
    expect(fractionProblems("$\\frac{1}{\\frac{2}{3}}$")[0]).toContain("a fraction inside a fraction");
    expect(fractionProblems("$\\frac{3}{4}$ und $\\frac{1}{2}$")).toEqual([]);
  });
});
