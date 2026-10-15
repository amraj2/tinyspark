"""Maths generators: number, fractions, ratio, measures, geometry, algebra, data."""

import math
from fractions import Fraction

from .common import fill, frac_str, mk, money, num_options


def opts(r, ans, **kw):
    return num_options(r, ans, **kw)


def frac_of(r):
    d = r.choice([3, 4, 5, 6, 8, 10])
    n = r.randrange(1, d)
    amt = d * r.randrange(3, 15)
    ans = amt // d * n
    c, ds = opts(r, ans, extras=[amt // d, amt // d * (n + 1), amt - ans])
    return mk(r, f"What is {n}/{d} of {amt}?", c, ds,
              f"Divide {amt} by {d} to get {amt // d}, then multiply by {n} to get {ans}.")


def pct_of(r):
    p = r.choice([5, 10, 15, 20, 25, 30, 40, 60, 75, 80])
    amt = 20 * r.randrange(2, 30)
    ans = amt * p // 100
    c, ds = opts(r, ans, extras=[amt - ans, amt // 10, ans + 10])
    return mk(r, f"What is {p}% of {amt}?", c, ds,
              f"10% of {amt} is {amt // 10}. Build {p}% from that: {amt} × {p} ÷ 100 = {ans}.")


def hhmm(t):
    t %= 1440
    return f"{t // 60:02d}:{t % 60:02d}"


def time_after(r):
    start = r.randrange(6, 20) * 60 + r.choice(range(0, 60, 5))
    dur = r.randrange(25, 200)
    h, m = divmod(dur, 60)
    ans = start + dur
    d = f"{h} hour{'s' if h != 1 else ''} {m} minutes" if h else f"{m} minutes"
    c, ds = opts(r, ans, fmt=hhmm, extras=[ans + 10, ans - 10, ans + 60, ans - 60], nonneg=False)
    return mk(r, f"A film starts at {hhmm(start)} and lasts {d}. At what time does it finish?", c, ds,
              f"Add {d} to {hhmm(start)}: it finishes at {hhmm(ans)}.")


def time_between(r):
    start = r.randrange(6, 18) * 60 + r.choice(range(0, 60, 5))
    dur = r.randrange(35, 260)
    end = start + dur

    def fmt(x):
        return f"{x // 60} h {x % 60} min"
    c, ds = opts(r, dur, fmt=fmt, extras=[dur + 10, dur - 10, dur + 60, dur - 60])
    return mk(r, f"A train leaves at {hhmm(start)} and arrives at {hhmm(end)}. How long is the journey?", c, ds,
              f"From {hhmm(start)} to {hhmm(end)} is {fmt(dur)}.")


def rect(r):
    l, w = r.randrange(4, 20), r.randrange(2, 12)
    if l == w:
        return None
    kind = r.choice(["p", "a", "side"])
    if kind == "p":
        ans = 2 * (l + w)
        c, ds = opts(r, ans, fmt=lambda v: f"{v} cm", extras=[l * w, l + w, ans + 4])
        return mk(r, f"A rectangle is {l} cm long and {w} cm wide. What is its perimeter?", c, ds,
                  f"Perimeter = 2 × ({l} + {w}) = {ans} cm.")
    if kind == "a":
        ans = l * w
        c, ds = opts(r, ans, fmt=lambda v: f"{v} cm²", extras=[2 * (l + w), l + w, ans + l])
        return mk(r, f"A rectangle is {l} cm long and {w} cm wide. What is its area?", c, ds,
                  f"Area = length × width = {l} × {w} = {ans} cm².")
    c, ds = opts(r, w, fmt=lambda v: f"{v} cm", extras=[l * w, l - w, w * 2])
    return mk(r, f"A rectangle has an area of {l * w} cm² and a length of {l} cm. What is its width?", c, ds,
              f"Width = area ÷ length = {l * w} ÷ {l} = {w} cm.")


def lcm_hcf(r):
    a, b = r.sample([4, 6, 8, 9, 10, 12, 14, 15, 16, 18, 20, 24], 2)
    if r.random() < .5:
        ans = a * b // math.gcd(a, b)
        c, ds = opts(r, ans, extras=[a * b if a * b != ans else ans + a, ans * 2, ans // 2 if ans % 2 == 0 else ans + 1])
        return mk(r, f"What is the lowest common multiple of {a} and {b}?", c, ds,
                  f"List multiples of each: the first number in both lists is {ans}.")
    ans = math.gcd(a, b)
    c, ds = opts(r, ans, extras=[1, a, b, ans * 2])
    return mk(r, f"What is the highest common factor of {a} and {b}?", c, ds,
              f"The biggest number that divides exactly into both {a} and {b} is {ans}.")


def order_ops(r):
    a, b, c_, d = r.randrange(2, 20), r.randrange(2, 10), r.randrange(2, 10), r.randrange(1, 15)
    ans = a + b * c_ - d
    wrong = (a + b) * c_ - d
    c, ds = opts(r, ans, extras=[wrong, a + b * (c_ - d)])
    return mk(r, f"Work out {a} + {b} × {c_} − {d}.", c, ds,
              f"Multiply first: {b} × {c_} = {b * c_}. Then {a} + {b * c_} − {d} = {ans}.")


def ratio_share(r):
    a, b = r.sample(range(1, 8), 2)
    k = r.randrange(2, 15)
    total = (a + b) * k
    who = r.choice(["Ava", "Ben"])
    part = a if who == "Ava" else b
    ans = k * part
    c, ds = opts(r, ans, fmt=lambda v: f"£{v}", extras=[k * (a if part == b else b), total // 2, total // part])
    return mk(r, f"£{total} is shared between Ava and Ben in the ratio {a}:{b}. How much does {who} get?", c, ds,
              f"There are {a + b} parts, so one part is £{total} ÷ {a + b} = £{k}. {who} gets {part} × £{k} = £{ans}.")


def simplify_ratio(r):
    a, b = r.choice([(2, 3), (3, 4), (1, 4), (5, 6), (3, 5), (2, 5), (4, 7)])
    k = r.randrange(2, 9)
    ds = [f"{a * k // 2 if (a * k) % 2 == 0 and (b * k) % 2 == 0 else a + 1}:{b * k // 2 if (a * k) % 2 == 0 and (b * k) % 2 == 0 else b}",
          f"{b}:{a}", f"{a * 2}:{b * 2}" if k != 2 else f"{a + 1}:{b + 1}", f"{a}:{b + 1}"]
    return mk(r, f"Write the ratio {a * k}:{b * k} in its simplest form.", f"{a}:{b}", ds,
              f"Divide both sides by {k} to get {a}:{b}.")


def mean(r):
    nums = [r.randrange(2, 30) for _ in range(4)]
    last = (5 - sum(nums) % 5) % 5 + 5 * r.randrange(1, 4)
    nums.append(last)
    ans = sum(nums) // 5
    c, ds = opts(r, ans, extras=[sorted(nums)[2] if sorted(nums)[2] != ans else ans + 3, max(nums) - min(nums)])
    return mk(r, f"What is the mean of {', '.join(map(str, nums))}?", c, ds,
              f"The total is {sum(nums)}. Divide by 5 to get {ans}.")


def median_mode_range(r):
    kind = r.choice(["median", "mode", "range"])
    if kind == "mode":
        m = r.randrange(2, 15)
        nums = [m, m, m] + r.sample([x for x in range(1, 20) if x != m], 4)
        r.shuffle(nums)
        ans = m
        expl = f"{m} appears most often, so it is the mode."
    else:
        nums = r.sample(range(1, 40), 7)
        if kind == "median":
            ans = sorted(nums)[3]
            expl = f"In order: {', '.join(map(str, sorted(nums)))}. The middle value is {ans}."
        else:
            ans = max(nums) - min(nums)
            expl = f"Range = largest − smallest = {max(nums)} − {min(nums)} = {ans}."
    c, ds = opts(r, ans, extras=[nums[3], sum(nums) // 7 if sum(nums) // 7 != ans else ans + 4])
    return mk(r, f"What is the {kind} of {', '.join(map(str, nums))}?", c, ds, expl)


UNITS = [("km", "m", 1000), ("m", "cm", 100), ("kg", "g", 1000), ("litres", "ml", 1000),
         ("cm", "mm", 10), ("hours", "minutes", 60), ("m", "mm", 1000)]


def units(r):
    big, small, k = r.choice(UNITS)
    v = r.choice([2, 3, 4, 5, 6, 7, 8, 9, 12, 15]) + r.choice([0, 0, .5])
    ans = v * k
    fmt = lambda x: f"{x:g} {small}"
    c, ds = opts(r, ans, fmt=fmt, extras=[v * k * 10, v * k / 10, v * k + k])
    return mk(r, f"How many {small} are there in {v:g} {big}?", c, ds, f"1 {big} = {k} {small}, so {v:g} × {k} = {ans:g} {small}.")


def angles(r):
    kind = r.choice(["tri", "line", "point"])
    if kind == "tri":
        a, b = r.randrange(30, 80), r.randrange(30, 80)
        ans = 180 - a - b
        txt, expl = f"Two angles in a triangle are {a}° and {b}°. What is the third angle?", f"Angles in a triangle add to 180°: 180 − {a} − {b} = {ans}°."
    elif kind == "line":
        a = r.randrange(20, 160, 5)
        ans = 180 - a
        txt, expl = f"Two angles on a straight line are {a}° and x. What is x?", f"Angles on a straight line add to 180°: 180 − {a} = {ans}°."
    else:
        a, b = r.randrange(60, 130, 5), r.randrange(60, 130, 5)
        ans = 360 - a - b
        txt, expl = f"Three angles meet at a point. Two are {a}° and {b}°. What is the third?", f"Angles around a point add to 360°: 360 − {a} − {b} = {ans}°."
    c, ds = opts(r, ans, fmt=lambda v: f"{v}°", extras=[ans + 10, 180 - ans if kind != "line" else ans + 20, 90])
    return mk(r, txt, c, ds, expl)


def nth_term(r):
    a, d = r.randrange(1, 20), r.randrange(2, 9)
    n = r.randrange(8, 21)
    ans = a + (n - 1) * d
    seq = ", ".join(str(a + i * d) for i in range(4))
    c, ds = opts(r, ans, extras=[a + n * d, a + (n - 2) * d, n * d])
    return mk(r, f"A sequence begins {seq}, … What is term number {n}?", c, ds,
              f"The sequence goes up by {d} each time, so term {n} = {a} + {n - 1} × {d} = {ans}.")


def equation(r):
    x, a, b = r.randrange(2, 13), r.randrange(2, 10), r.randrange(1, 21)
    c_ = a * x + b
    c, ds = opts(r, x, extras=[(c_ + b) // a if (c_ + b) % a == 0 else x + 3, c_ - b, x + 2])
    return mk(r, f"Solve {a}x + {b} = {c_}.", c, ds, f"Subtract {b}: {a}x = {c_ - b}. Divide by {a}: x = {x}.")


def function_machine(r):
    x, a, b = r.randrange(2, 15), r.randrange(2, 8), r.randrange(1, 15)
    out = a * x - b
    c, ds = opts(r, x, extras=[(out - b) // a if (out - b) % a == 0 else x + 4, out + b, out // a if out % a == 0 else x - 1])
    return mk(r, f"I think of a number, multiply it by {a}, then subtract {b}. My answer is {out}. What was my number?", c, ds,
              f"Work backwards: {out} + {b} = {out + b}, then {out + b} ÷ {a} = {x}.")


def change(r):
    n = r.randrange(2, 8)
    price = r.choice([45, 60, 75, 85, 95, 120, 135, 150, 165, 199])
    paid = r.choice([1000, 2000, 500 if n * price < 500 else 1000])
    total = n * price
    if total >= paid:
        return None
    ans = paid - total
    c, ds = opts(r, ans, fmt=money, extras=[ans + 100, ans - 100, ans + 10, ans - 5])
    return mk(r, f"{n} books cost {money(price)} each. Sam pays with a £{paid // 100} note. How much change does he get?", c, ds,
              f"{n} × {money(price)} = {money(total)}. £{paid // 100}.00 − {money(total)} = {money(ans)}.")


def speed(r):
    s = r.choice([30, 40, 45, 50, 60, 80])
    t = r.choice([1.5, 2, 2.5, 3, 4])
    d = s * t
    if d != int(d):
        return None
    kind = r.choice(["d", "t", "s"])
    if kind == "d":
        c, ds = opts(r, int(d), fmt=lambda v: f"{v} km", extras=[int(d) + s, int(s + t), int(d) - s // 2])
        return mk(r, f"A car travels at {s} km/h for {t:g} hours. How far does it go?", c, ds, f"Distance = speed × time = {s} × {t:g} = {int(d)} km.")
    if kind == "t":
        c, ds = opts(r, t, fmt=lambda v: f"{v:g} hours", extras=[t + .5, t - .5, t + 1])
        return mk(r, f"A car travels {int(d)} km at {s} km/h. How long does the journey take?", c, ds, f"Time = distance ÷ speed = {int(d)} ÷ {s} = {t:g} hours.")
    c, ds = opts(r, s, fmt=lambda v: f"{v} km/h", extras=[s + 10, s - 10, int(d)])
    return mk(r, f"A cyclist rides {int(d)} km in {t:g} hours. What is the average speed?", c, ds, f"Speed = distance ÷ time = {int(d)} ÷ {t:g} = {s} km/h.")


def negatives(r):
    a, b = r.randrange(1, 12), r.randrange(2, 15)
    if r.random() < .5:
        ans = -a + b
        txt = f"The temperature is −{a}°C at night. By midday it has risen by {b}°C. What is the temperature at midday?"
        expl = f"Start at −{a} and go up {b}: −{a} + {b} = {ans}."
    else:
        ans = a - b
        if ans >= 0:
            return None
        txt = f"The temperature is {a}°C at dusk. Overnight it falls by {b}°C. What is the temperature now?"
        expl = f"{a} − {b} = {ans}."
    c, ds = opts(r, ans, fmt=lambda v: f"{v}°C", extras=[-ans, ans + 2 * (a if ans < 0 else 0) + 1], nonneg=False)
    return mk(r, txt, c, ds, expl)


def rounding(r):
    kind = r.choice(["10", "100", "1000", "dp"])
    if kind == "dp":
        x = r.randrange(1000, 9999) / 1000
        ans = round(x + 1e-9, 1)
        c, ds = opts(r, ans, fmt=lambda v: f"{v:.1f}", extras=[ans + .1, ans - .1, round(x, 2)])
        return mk(r, f"Round {x:.3f} to 1 decimal place.", c, ds, f"Look at the second decimal digit to decide whether to round up or down: {ans:.1f}.")
    k = int(kind)
    x = r.randrange(1001, 99999)
    ans = int(math.floor(x / k + .5) * k)
    c, ds = opts(r, ans, fmt=lambda v: f"{v:,}", extras=[ans + k, ans - k, x // k * k if x // k * k != ans else ans + 2 * k])
    return mk(r, f"Round {x:,} to the nearest {k}.", c, ds, f"Look at the digit to the right of the {k}s place. The nearest {k} is {ans:,}.")


def squares(r):
    kind = r.choice(["sq", "root", "cube", "is"])
    if kind == "sq":
        n = r.randrange(6, 16)
        c, ds = opts(r, n * n, extras=[n * 2, n * 3, n * n + n])
        return mk(r, f"What is {n} squared?", c, ds, f"{n} × {n} = {n * n}.")
    if kind == "root":
        n = r.randrange(6, 16)
        c, ds = opts(r, n, extras=[n * 2, n + 2, n * n])
        return mk(r, f"What is the square root of {n * n}?", c, ds, f"{n} × {n} = {n * n}.")
    if kind == "cube":
        n = r.randrange(2, 9)
        c, ds = opts(r, n ** 3, extras=[n * n, n * 3, n ** 3 + n])
        return mk(r, f"What is {n} cubed?", c, ds, f"{n} × {n} × {n} = {n ** 3}.")
    sq = r.choice([16, 25, 36, 49, 64, 81, 100, 121, 144])
    ds = [str(x) for x in r.sample([n for n in range(10, 150) if int(math.sqrt(n)) ** 2 != n], 3)]
    return mk(r, "Which of these is a square number?", str(sq), ds, f"{int(math.sqrt(sq))} × {int(math.sqrt(sq))} = {sq}.")


def prime(r):
    primes = [11, 13, 17, 19, 23, 29, 31, 37, 41, 43, 47]
    comps = [21, 27, 33, 39, 49, 51, 57, 63, 77, 87, 91]
    if r.random() < .5:
        p = r.choice(primes)
        return mk(r, "Which of these numbers is prime?", str(p), [str(x) for x in r.sample(comps, 3)],
                  f"{p} has exactly two factors: 1 and itself. The others can be divided by other numbers.")
    x = r.choice(comps)
    return mk(r, "Which of these numbers is NOT prime?", str(x), [str(p) for p in r.sample(primes, 3)],
              f"{x} can be divided exactly by numbers other than 1 and itself, so it is not prime.")


def probability(r):
    red, blue, green = r.randrange(1, 9), r.randrange(1, 9), r.randrange(1, 9)
    total = red + blue + green
    ans = Fraction(red, total)
    ds = [Fraction(red, total - red), Fraction(total - red, total), Fraction(1, red + 1)]
    return mk(r, f"A bag holds {red} red, {blue} blue and {green} green counters. One is picked without looking. What is the probability it is red?",
              frac_str(ans), [frac_str(d) for d in ds],
              f"There are {red} red counters out of {total} in total: {red}/{total}" + ("." if ans.denominator == total else f", which simplifies to {frac_str(ans)}."))


def volume(r):
    l, w, h = r.sample(range(2, 12), 3)
    ans = l * w * h
    c, ds = opts(r, ans, fmt=lambda v: f"{v} cm³", extras=[2 * (l * w + w * h + l * h), l + w + h, ans + l * w])
    return mk(r, f"What is the volume of a cuboid measuring {l} cm by {w} cm by {h} cm?", c, ds, f"Volume = {l} × {w} × {h} = {ans} cm³.")


def frac_compare(r):
    pool = [Fraction(n, d) for d in (2, 3, 4, 5, 6, 8, 10, 12) for n in range(1, d)]
    fs = list({f for f in pool})
    picked = r.sample(fs, 4)
    if len({p for p in picked}) < 4:
        return None
    big = r.random() < .5
    ans = max(picked) if big else min(picked)
    lab = lambda f: f"{f.numerator}/{f.denominator}"
    strs = [lab(f) for f in picked]
    if len(set(strs)) < 4:
        return None
    return mk(r, f"Which of these fractions is the {'largest' if big else 'smallest'}?  {', '.join(strs)}", lab(ans), [lab(f) for f in picked if f != ans],
              "Compare them by writing each as a decimal or over a common denominator: " + ", ".join(f"{lab(f)} = {float(f):.2f}" for f in picked) + ".")


def simplify_frac(r):
    p, q = r.choice([(1, 2), (2, 3), (3, 4), (3, 5), (5, 6), (4, 5), (5, 8), (7, 10), (2, 5), (3, 7), (5, 12)])
    k = r.choice([2, 3, 4, 5, 6])
    ds = [f"{p * k // 2}/{q * k // 2}" if (p * k) % 2 == 0 and (q * k) % 2 == 0 and k != 2 else f"{p}/{q + 1}",
          f"{q}/{p}", f"{p + 1}/{q}"]
    return mk(r, f"Write {p * k}/{q * k} in its simplest form.", f"{p}/{q}", ds, f"Divide the top and bottom by {k} to get {p}/{q}.")


def frac_add(r):
    b, d = r.sample([2, 3, 4, 5, 6, 8], 2)
    a, c_ = r.randrange(1, b), r.randrange(1, d)
    ans = Fraction(a, b) + Fraction(c_, d)
    ds = [Fraction(a + c_, b + d), ans + Fraction(1, math.lcm(b, d)), max(ans - Fraction(1, math.lcm(b, d)), Fraction(1, 20)), ans + 1]
    return mk(r, f"Work out {a}/{b} + {c_}/{d}. Give your answer as a fraction in its simplest form.", frac_str(ans), [frac_str(x) for x in ds],
              f"Use a common denominator of {math.lcm(b, d)}: {a * math.lcm(b, d) // b}/{math.lcm(b, d)} + {c_ * math.lcm(b, d) // d}/{math.lcm(b, d)} = {frac_str(ans)}.")


def dec(n):
    return f"{n / 100:.2f}".rstrip("0").rstrip(".")


def decimals(r):
    kind = r.choice(["add", "sub", "mul10", "mul100", "div10"])
    a, b = r.randrange(101, 999), r.randrange(101, 700)
    if kind == "add":
        c, ds = opts(r, a + b, fmt=dec, extras=[a + b + 10, a + b - 10, a + b + 100])
        return mk(r, f"Work out {dec(a)} + {dec(b)}.", c, ds, f"Line up the decimal points and add: {dec(a + b)}.")
    if kind == "sub":
        a, b = max(a, b), min(a, b)
        if a == b:
            return None
        c, ds = opts(r, a - b, fmt=dec, extras=[a - b + 10, a - b - 10, a - b + 100])
        return mk(r, f"Work out {dec(a)} − {dec(b)}.", c, ds, f"Line up the decimal points and subtract: {dec(a - b)}.")
    x = r.randrange(11, 990) / 100
    m = {"mul10": 10, "mul100": 100, "div10": .1}[kind]
    ans = round(x * m, 4)
    f = lambda v: f"{v:g}"
    wrong = [ans * 10, ans / 10, ans * 100 if ans * 100 != ans else ans + 1]
    c, ds = opts(r, ans, fmt=f, extras=wrong)
    word = {"mul10": "×10", "mul100": "×100", "div10": "÷10"}[kind]
    return mk(r, f"What is {x:g} {word[0]} {word[1:]}?", c, ds, f"Each digit moves {'up' if kind != 'div10' else 'down'} {len(word) - 1} place{'s' if len(word) > 2 else ''}: {ans:g}.")


def tri_area(r):
    b, h = r.randrange(3, 20), r.randrange(2, 16)
    if (b * h) % 2:
        b += 1
    ans = b * h // 2
    c, ds = opts(r, ans, fmt=lambda v: f"{v} cm²", extras=[b * h, b + h, ans + b])
    return mk(r, f"A triangle has a base of {b} cm and a perpendicular height of {h} cm. What is its area?", c, ds, f"Area = ½ × base × height = ½ × {b} × {h} = {ans} cm².")


def reverse_pct(r):
    m = r.randrange(2, 12)
    orig, sale = 25 * m, 20 * m
    c, ds = opts(r, orig, fmt=lambda v: f"£{v}", extras=[sale + sale // 5, sale + 20, sale * 5 // 4 + 5])
    return mk(r, f"A jacket costs £{sale} in a sale after a 20% discount. What was the original price?", c, ds,
              f"£{sale} is 80% of the original price. 10% is £{sale // 8 if sale % 8 == 0 else sale / 8:g}, so 100% is £{orig}.")


def pct_change(r):
    p = r.choice([10, 20, 25, 50])
    base = 20 * r.randrange(1, 15)
    new = base * (100 + p) // 100
    ds = [f"{x}%" for x in [10, 20, 25, 50, 5, 40] if x != p]
    r.shuffle(ds)
    return mk(r, f"A price rises from £{base} to £{new}. What is the percentage increase?", f"{p}%", ds[:3],
              f"The increase is £{new - base}. £{new - base} out of £{base} is {p}%.")


def frac_to_pct(r):
    d = r.choice([4, 5, 8, 20, 25, 50])
    n = r.randrange(1, d)
    ans = n * 100 / d
    c, ds = opts(r, ans, fmt=lambda v: f"{v:g}%", extras=[n * d, ans + 5, 100 - ans])
    return mk(r, f"Write {n}/{d} as a percentage.", c, ds, f"{n} ÷ {d} = {ans / 100:g}, and × 100 gives {ans:g}%.")


def place_value(r):
    digits = r.sample(range(1, 10), 5)
    pos = r.randrange(0, 5)
    num = int("".join(map(str, digits)))
    d = digits[4 - pos]
    ans = d * 10 ** pos
    c, ds = opts(r, ans, fmt=lambda v: f"{v:,}", extras=[d, d * 10 ** ((pos + 1) % 5), d * 10 ** ((pos + 2) % 5), d * 10 ** (pos + 1)])
    return mk(r, f"What is the value of the digit {d} in {num:,}?", c, ds, f"The {d} is in the {10 ** pos:,}s column, so it is worth {ans:,}.")


def coordinates(r):
    x, y = r.choice([-1, 1]) * r.randrange(1, 9), r.choice([-1, 1]) * r.randrange(1, 9)
    f = lambda p: f"({p[0]}, {p[1]})"
    if r.random() < .5:
        axis = r.choice(["x", "y"])
        ans = (x, -y) if axis == "x" else (-x, y)
        others = [p for p in [(x, y), (-x, y), (x, -y), (-x, -y)] if p != ans]
        return mk(r, f"The point ({x}, {y}) is reflected in the {axis}-axis. What are its new coordinates?", f(ans), [f(p) for p in others],
                  f"Reflecting in the {axis}-axis flips the sign of the {'y' if axis == 'x' else 'x'}-coordinate.")
    dx, dy = r.randrange(1, 7), r.randrange(1, 7)
    rl, ud = r.choice(["right", "left"]), r.choice(["up", "down"])
    ans = (x + (dx if rl == "right" else -dx), y + (dy if ud == "up" else -dy))
    ds = [(x + dx, y + dy), (x - dx, y - dy), (x + dy, y + dx), (ans[0], -ans[1])]
    ds = [d for d in ds if d != ans]
    return mk(r, f"The point ({x}, {y}) moves {dx} {rl} and {dy} {ud}. Where does it end up?", f(ans), [f(p) for p in ds],
              f"Right/left changes x and up/down changes y, giving {f(ans)}.")


def proportion(r):
    p = r.choice([30, 40, 45, 60, 75, 90, 120])
    n, m = r.sample(range(2, 12), 2)
    ans = p * m
    c, ds = opts(r, ans, fmt=money, extras=[p * n, p * (m + 1), p * (m - 1)])
    return mk(r, f"{n} pens cost {money(p * n)}. How much do {m} pens cost?", c, ds, f"One pen costs {money(p)}, so {m} pens cost {money(ans)}.")


def money_words(r):
    a, b = r.randrange(3, 30), r.randrange(2, 10)
    left = 50 + r.randrange(10, 60)
    total = a * b + left
    c, ds = opts(r, left, fmt=lambda v: f"£{v}", extras=[total - a, a * b, left + b])
    return mk(r, f"Priya has £{total}. She buys {b} tickets at £{a} each. How much money does she have left?", c, ds,
              f"{b} × £{a} = £{a * b}. £{total} − £{a * b} = £{left}.")


def missing_angles_polygon(r):
    n = r.choice([5, 6, 8, 10])
    ans = (n - 2) * 180
    c, ds = opts(r, ans, fmt=lambda v: f"{v}°", extras=[n * 180, 360, (n - 1) * 180])
    name = {5: "pentagon", 6: "hexagon", 8: "octagon", 10: "decagon"}[n]
    return mk(r, f"What is the sum of the interior angles of a {name}?", c, ds, f"Split it into {n - 2} triangles: {n - 2} × 180° = {ans}°.")


def clock_angle(r):
    h = r.choice([1, 2, 3, 4, 5, 6, 8, 9, 10])
    ans = h * 30
    ans = min(ans, 360 - ans)
    c, ds = opts(r, ans, fmt=lambda v: f"{v}°", extras=[ans + 30, ans + 60, 180 - ans])
    return mk(r, f"What is the smaller angle between the hands of a clock at {h} o'clock?", c, ds,
              f"Each hour mark is 30° apart, so {h} hours is {h * 30}°" + (f", and the smaller angle is {ans}°." if ans != h * 30 else "."))


def word_problem_multi(r):
    boxes, per = r.randrange(3, 12), r.randrange(6, 24)
    extra = r.randrange(2, 9)
    ans = boxes * per + extra
    c, ds = opts(r, ans, extras=[boxes * per - extra, boxes * (per + extra), boxes + per + extra])
    return mk(r, f"A shop has {boxes} boxes with {per} pencils in each box and {extra} loose pencils. How many pencils are there altogether?", c, ds,
              f"{boxes} × {per} = {boxes * per}, then add {extra} to get {ans}.")


def factors_count(r):
    n = r.choice([12, 18, 20, 24, 28, 30, 36, 40, 42, 48])
    fs = [i for i in range(1, n + 1) if n % i == 0]
    c, ds = opts(r, len(fs), extras=[len(fs) - 1, len(fs) + 2])
    return mk(r, f"How many factors does {n} have?", c, ds, f"The factors of {n} are {', '.join(map(str, fs))}: that is {len(fs)}.")


def circle(r):
    rad = r.choice([7, 14, 21, 3.5])
    kind = r.choice(["c", "a"])
    if kind == "c":
        ans = round(2 * 22 / 7 * rad, 2)
        c, ds = opts(r, ans, fmt=lambda v: f"{v:g} cm", extras=[round(22 / 7 * rad * rad, 2), rad * 2, ans * 2])
        return mk(r, f"A circle has radius {rad:g} cm. Taking π as 22/7, what is its circumference?", c, ds, f"Circumference = 2πr = 2 × 22/7 × {rad:g} = {ans:g} cm.")
    ans = round(22 / 7 * rad * rad, 2)
    c, ds = opts(r, ans, fmt=lambda v: f"{v:g} cm²", extras=[round(2 * 22 / 7 * rad, 2), rad * rad, ans * 2])
    return mk(r, f"A circle has radius {rad:g} cm. Taking π as 22/7, what is its area?", c, ds, f"Area = πr² = 22/7 × {rad:g} × {rad:g} = {ans:g} cm².")


GENERATORS = [
    (frac_of, 8), (pct_of, 8), (time_after, 6), (time_between, 6), (rect, 8), (lcm_hcf, 6), (order_ops, 6),
    (ratio_share, 6), (simplify_ratio, 5), (mean, 6), (median_mode_range, 6), (units, 6), (angles, 6),
    (nth_term, 5), (equation, 6), (function_machine, 5), (change, 5), (speed, 6), (negatives, 5),
    (rounding, 6), (squares, 6), (prime, 4), (probability, 5), (volume, 4), (frac_compare, 5),
    (simplify_frac, 5), (frac_add, 6), (decimals, 8), (tri_area, 4), (reverse_pct, 4), (pct_change, 4),
    (frac_to_pct, 5), (place_value, 5), (coordinates, 6), (proportion, 5), (money_words, 4),
    (missing_angles_polygon, 4), (clock_angle, 4), (word_problem_multi, 4), (factors_count, 4), (circle, 4),
]


def build(seen):
    out = []
    for gen, n in GENERATORS:
        out += fill("maths-" + gen.__name__, gen, n, seen)
    return out
