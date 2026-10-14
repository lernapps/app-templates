// Exact fractions for the expression language of generated exercises: 0.1 + 0.2 is 0.3, and 1/3 stays 1/3 until it
// is rounded on purpose. Numerator and denominator are BigInts, always reduced, the denominator positive.

const abs = (n: bigint) => (n < 0n ? -n : n);
function gcd(a: bigint, b: bigint): bigint {
  let x = abs(a);
  let y = abs(b);
  while (y !== 0n) [x, y] = [y, x % y];
  return x;
}

export class Fraction {
  readonly n: bigint;
  readonly d: bigint;

  private constructor(n: bigint, d: bigint) {
    if (d === 0n) throw new RangeError("division by zero");
    const sign = d < 0n ? -1n : 1n;
    const g = gcd(n, d) || 1n;
    this.n = (sign * n) / g;
    this.d = (sign * d) / g;
  }

  static of(n: number | bigint, d: number | bigint = 1): Fraction {
    return new Fraction(BigInt(n), BigInt(d));
  }

  /** A number as written: 0.1 is exactly 1/10. */
  static from(value: number): Fraction {
    if (!Number.isFinite(value)) throw new RangeError(`${value} is not a number`);
    const text = String(value);
    const match = /^(-?)(\d+)(?:\.(\d+))?(?:e([+-]\d+))?$/.exec(text);
    if (match === null) throw new RangeError(`${text} is not a number`);
    const [, sign = "", whole = "0", part = "", exponent = "0"] = match;
    let n = BigInt(`${sign}${whole}${part}`);
    let d = 10n ** BigInt(part.length);
    const e = Number(exponent);
    if (e > 0) n *= 10n ** BigInt(e);
    else if (e < 0) d *= 10n ** BigInt(-e);
    return new Fraction(n, d);
  }

  add(other: Fraction): Fraction {
    return new Fraction(this.n * other.d + other.n * this.d, this.d * other.d);
  }
  sub(other: Fraction): Fraction {
    return new Fraction(this.n * other.d - other.n * this.d, this.d * other.d);
  }
  mul(other: Fraction): Fraction {
    return new Fraction(this.n * other.n, this.d * other.d);
  }
  div(other: Fraction): Fraction {
    if (other.n === 0n) throw new RangeError("division by zero");
    return new Fraction(this.n * other.d, this.d * other.n);
  }
  neg(): Fraction {
    return new Fraction(-this.n, this.d);
  }
  abs(): Fraction {
    return new Fraction(abs(this.n), this.d);
  }
  compare(other: Fraction): number {
    const left = this.n * other.d;
    const right = other.n * this.d;
    return left < right ? -1 : left > right ? 1 : 0;
  }
  equals(other: Fraction): boolean {
    return this.n === other.n && this.d === other.d;
  }
  isInteger(): boolean {
    return this.d === 1n;
  }

  /** Rounded to `places` decimals, half away from zero. */
  round(places: number): Fraction {
    const scale = 10n ** BigInt(Math.max(0, places));
    const scaled = abs(this.n) * scale;
    const q = scaled / this.d;
    const r = scaled % this.d;
    const rounded = 2n * r >= this.d ? q + 1n : q;
    return new Fraction(this.n < 0n ? -rounded : rounded, scale);
  }

  /** The number of decimals when written out; Infinity when they never end (1/3). */
  decimals(): number {
    let d = this.d;
    let twos = 0;
    let fives = 0;
    while (d % 2n === 0n) {
      d /= 2n;
      twos++;
    }
    while (d % 5n === 0n) {
      d /= 5n;
      fives++;
    }
    return d === 1n ? Math.max(twos, fives) : Infinity;
  }

  toNumber(): number {
    return Number(this.n) / Number(this.d);
  }

  toString(): string {
    return this.d === 1n ? String(this.n) : `${this.n}/${this.d}`;
  }
}
