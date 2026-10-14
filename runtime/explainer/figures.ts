// The figures drawn from data at build time, as inline SVG with role="img" and the figure's alternative text as its
// name: hundred-grid (a field of 100 squares, some shaded) and bar (a strip with a shaded part and its percentage).
const escape = (text: string) =>
  text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

const ON = "#1d4ed8";
const OFF = "#ffffff";
const LINE = "#4a4a4a";

/** A field of 10 × 10 squares, the first `filled` shaded, row by row. */
export function hundredGrid(filled: number, alt: string): string {
  const cells: string[] = [];
  for (let index = 0; index < 100; index++) {
    const x = 1 + (index % 10) * 11;
    const y = 1 + Math.floor(index / 10) * 11;
    cells.push(
      `<rect x="${x}" y="${y}" width="10" height="10" fill="${index < filled ? ON : OFF}" stroke="${LINE}" stroke-width="0.5"/>`,
    );
  }
  return `<svg class="explainer-drawing explainer-hundred-grid" role="img" aria-label="${escape(alt)}" viewBox="0 0 111 111" xmlns="http://www.w3.org/2000/svg">${cells.join("")}</svg>`;
}

/** A strip for `whole`, `part` of it shaded; under it 0, part and whole, and their percentages. */
export function bar(part: number, whole: number, alt: string, locale: string): string {
  const numbers = new Intl.NumberFormat(locale, { maximumFractionDigits: 2 });
  const share = Math.min(part / whole, 1);
  const width = 298 * share;
  const at = Math.min(Math.max(1 + width, 50), 250);
  const label = (x: number, y: number, anchor: string, text: string) =>
    `<text x="${x.toFixed(1)}" y="${y}" text-anchor="${anchor}" font-size="12" fill="#1a1a1a">${escape(text)}</text>`;
  return [
    `<svg class="explainer-drawing explainer-bar" role="img" aria-label="${escape(alt)}" viewBox="0 0 300 74" xmlns="http://www.w3.org/2000/svg">`,
    `<rect x="1" y="1" width="298" height="36" fill="${OFF}" stroke="${LINE}"/>`,
    `<rect x="1" y="1" width="${width.toFixed(1)}" height="36" fill="${ON}"/>`,
    label(1, 54, "start", "0"),
    label(at, 54, "middle", numbers.format(part)),
    label(299, 54, "end", numbers.format(whole)),
    label(1, 70, "start", "0 %"),
    label(at, 70, "middle", `${numbers.format(share * 100)} %`),
    label(299, 70, "end", "100 %"),
    `</svg>`,
  ].join("");
}
