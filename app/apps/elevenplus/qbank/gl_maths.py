"""GL-style maths: original questions modelled on the question *types* in GL Assessment 11+ papers
(money, timetables, 24-hour time, routes on a grid, charts, tables, divisibility, percentages,
decimals, mass, missing numbers and shape properties). Nothing is copied from a published paper.
"""

import math
from fractions import Fraction

from .common import fill, mk, money, num_options

COLOURS = ["#4d9bff", "#ff6b6b", "#3ddc84", "#ffb020", "#8a6bff", "#ff6bd6"]


def trim(x):
    """Format a number without pointless trailing zeros."""
    s = f"{x:.3f}".rstrip("0").rstrip(".")
    return s if s else "0"


def spread(r, ans, cands, fmt=str):
    """Correct answer + three distinct plausible wrong ones taken from ``cands``, topped up automatically."""
    correct = fmt(ans)
    out = []
    for c in cands:
        s = fmt(c)
        if s != correct and s not in out:
            out.append(s)
    return correct, out


# ---------------------------------------------------------------- money
def money_coins(r):
    denoms = [(1000, "£10 note"), (500, "£5 note"), (200, "£2 coin"), (100, "£1 coin"), (50, "50p coin"), (20, "20p coin"), (10, "10p coin"), (5, "5p coin"), (2, "2p coin"), (1, "1p coin")]
    chosen = sorted(r.sample(denoms, r.choice([3, 4])), key=lambda d: -d[0])
    counts = [r.randrange(1, 5) for _ in chosen]
    total = sum(d[0] * n for d, n in zip(chosen, counts))
    if total > 5000:
        return None
    who = r.choice(["Niamh", "Oliver", "Sana", "Callum", "Freya", "Tomas"])
    parts = [f"{n} × {d[1]}{'s' if n > 1 else ''}" for d, n in zip(chosen, counts)]
    correct, ds = spread(r, total, [total * 10, total + 100, total - 100, total + 10, total - 10], fmt=money)
    ds = [d for d in ds if not d.startswith("£-")]
    return mk(r, f"{who} has {', '.join(parts[:-1])} and {parts[-1]}. How much money does {who} have altogether?", correct, ds[:3],
              " + ".join(f"{money(d[0] * n)}" for d, n in zip(chosen, counts)) + f" = {money(total)}.")


# ---------------------------------------------------------------- time
NUMW = {1: "one", 2: "two", 3: "three", 4: "four", 5: "five", 6: "six", 7: "seven", 8: "eight", 9: "nine", 10: "ten", 11: "eleven", 12: "twelve"}
MINW = {5: "five", 10: "ten", 20: "twenty", 25: "twenty-five"}


def say_time(h, m, part=None):
    def hh(x):
        x %= 12
        return NUMW[12 if x == 0 else x]
    if m == 0:
        t = f"{hh(h)} o'clock"
    elif m == 15:
        t = f"quarter past {hh(h)}"
    elif m == 30:
        t = f"half past {hh(h)}"
    elif m == 45:
        t = f"quarter to {hh(h + 1)}"
    elif m < 30:
        t = f"{MINW[m]} past {hh(h)}"
    else:
        t = f"{MINW[60 - m]} to {hh(h + 1)}"
    if part is None:
        part = "in the morning" if h < 12 else "in the afternoon" if h < 18 else "in the evening"
    return (t + " " + part).capitalize()


def time_words(r):
    h, m = r.randrange(6, 24), r.choice([0, 5, 10, 15, 20, 25, 30, 35, 40, 45, 50, 55])
    ans = say_time(h, m)
    flip = {"in the morning": "in the afternoon", "in the afternoon": "in the morning", "in the evening": "in the morning"}
    natural = "in the morning" if h < 12 else "in the afternoon" if h < 18 else "in the evening"
    cands = [say_time(h, m, flip[natural])]
    if m not in (0, 30):
        cands.append(say_time(h, 60 - m))
    cands += [say_time(h + 1, m), say_time(h - 1, m), say_time(h, (m + 30) % 60)]
    ds = []
    for c in cands:
        if c != ans and c not in ds:
            ds.append(c)
    return mk(r, f"Which of these times is the same as {h:02d}:{m:02d}?", ans, ds[:3], f"{h:02d}:{m:02d} is {ans.lower()}.")


STATIONS = ["Oakfield", "Riverside", "Millbrook", "Hartley", "Westbury", "Kingsmead", "Lakeview", "Ashford", "Pinehurst", "Greenlands"]


def clock(t):
    return f"{t // 60:02d}:{t % 60:02d}"


def timetable(r):
    names = r.sample(STATIONS, 4)
    interval = r.choice([15, 20, 25, 30])
    start = 8 * 60 + r.choice([0, 5, 10, 15, 20, 30, 40])
    gaps = [0]
    for _ in range(3):
        gaps.append(gaps[-1] + r.randrange(6, 19))
    times = [[start + k * interval + g for g in gaps] for k in range(3)]
    a = r.randrange(0, 2)
    b = r.randrange(a + 1, 4)
    k = r.randrange(1, 3)
    arrive = times[k - 1][a] + r.randrange(1, interval)
    if arrive >= times[k][a]:
        return None
    head = "<tr><th></th>" + "".join(f"<th>Train {i + 1}</th>" for i in range(3)) + "</tr>"
    rows = "".join(f"<tr><th>{names[s]}</th>" + "".join(f"<td>{clock(times[t][s])}</td>" for t in range(3)) + "</tr>" for s in range(4))
    who = r.choice(["Ruby", "Kofi", "Anya", "Jamal", "Leah"])
    ans = times[k][b]
    later = times[k + 1][b] if k + 1 < 3 else ans + interval
    cands = [times[k - 1][b], later, times[k][a], ans + 10, ans - 5]
    correct, ds = spread(r, ans, cands, fmt=clock)
    return mk(r, f"<table class=\"gl-table\">{head}{rows}</table>{who} reaches {names[a]} at {clock(arrive)} and catches the first train possible to {names[b]}. What time does that train arrive at {names[b]}?",
              correct, ds[:3], f"The first train leaving {names[a]} after {clock(arrive)} is Train {k + 1} (at {clock(times[k][a])}). It reaches {names[b]} at {clock(ans)}.")


def route(r):
    x, y = r.randrange(1, 6), r.randrange(1, 6)
    x0, y0 = x, y
    steps, prev = [], ""
    for _ in range(3):
        d = r.choice([c for c in "NESW" if c != prev])
        prev = d
        n = r.randrange(1, 4)
        dx, dy = {"N": (0, 1), "E": (1, 0), "S": (0, -1), "W": (-1, 0)}[d]
        if not (0 <= x + dx * n <= 9 and 0 <= y + dy * n <= 9):
            return None
        x, y = x + dx * n, y + dy * n
        steps.append(f"{n} square{'s' if n > 1 else ''} {dict(N='north', E='east', S='south', W='west')[d]}")
    fmt = lambda p: f"({p[0]}, {p[1]})"
    ans = (x, y)
    cands = [(y, x), (x + 1, y), (x, y - 1), (x0 + 1, y0 + 1), (x - 1, y + 1)]
    correct, ds = spread(r, ans, [c for c in cands if c[0] >= 0 and c[1] >= 0], fmt=fmt)
    return mk(r, f"A robot starts at {fmt((x0, y0))} on a grid. The first number is across (x) and the second is up (y). It moves {steps[0]}, then {steps[1]}, then {steps[2]}. Where does it finish?",
              correct, ds[:3], f"Start at {fmt((x0, y0))}. East/west change the first number and north/south change the second. It finishes at {fmt(ans)}.")


# ---------------------------------------------------------------- charts and tables
BAR_THEMES = [
    ("favourite fruit", ["Apple", "Banana", "Pear", "Plum", "Orange"]),
    ("favourite pet", ["Dog", "Cat", "Rabbit", "Fish", "Hamster"]),
    ("favourite sport", ["Football", "Netball", "Tennis", "Swimming", "Rugby"]),
    ("favourite lunch", ["Pasta", "Pizza", "Salad", "Soup", "Wrap"]),
    ("way of getting to school", ["Walk", "Bus", "Car", "Bike", "Scooter"]),
]


def bar_svg(labels, values, ymax=40):
    W, H, left, bottom, top = 340, 210, 44, 165, 14
    ph = bottom - top
    bw = (W - left - 8) / len(values)
    p = [f'<svg class="chart" viewBox="0 0 {W} {H}" width="{W}" role="img" aria-label="Bar chart">']
    for v in range(0, ymax + 1, 5):
        y = bottom - ph * v / ymax
        p.append(f'<line x1="{left}" y1="{y:.1f}" x2="{W - 6}" y2="{y:.1f}" stroke="{"#9fb0bd" if v % 10 == 0 else "#dfe7ec"}" stroke-width="1"/>')
        if v % 10 == 0:
            p.append(f'<text x="{left - 6}" y="{y + 4:.1f}" font-size="11" text-anchor="end" fill="#183447">{v}</text>')
    for i, (lab, val) in enumerate(zip(labels, values)):
        x = left + i * bw + bw * 0.18
        h = ph * val / ymax
        p.append(f'<rect x="{x:.1f}" y="{bottom - h:.1f}" width="{bw * 0.64:.1f}" height="{h:.1f}" fill="{COLOURS[i % 6]}" stroke="#183447" stroke-width="1.5"/>')
        p.append(f'<text x="{x + bw * 0.32:.1f}" y="{bottom + 15}" font-size="10.5" text-anchor="middle" fill="#183447">{lab}</text>')
    p.append(f'<text x="12" y="{(top + bottom) / 2:.0f}" font-size="11" text-anchor="middle" fill="#183447" transform="rotate(-90 12 {(top + bottom) / 2:.0f})">Number of children</text>')
    p.append("</svg>")
    return "".join(p)


def bar_chart(r):
    thing, labels = r.choice(BAR_THEMES)
    values = [r.randrange(1, 9) * 5 for _ in labels]
    i, j = r.sample(range(5), 2)
    chart = bar_svg(labels, values)
    intro = f"Children in a class each chose their {thing}. The bar chart shows the results.<br>{chart}"
    kind = r.choice(["diff", "sum", "diff", "total"])
    if kind == "diff":
        if values[i] <= values[j]:
            i, j = j, i
        if values[i] == values[j]:
            return None
        ans = values[i] - values[j]
        q = f"How many more children chose {labels[i]} than {labels[j]}?"
        expl = f"{labels[i]} has {values[i]} and {labels[j]} has {values[j]}, so {values[i]} − {values[j]} = {ans}."
        cands = [values[i] + values[j], values[i], ans + 5, ans - 5]
    elif kind == "sum":
        ans = values[i] + values[j]
        q = f"How many children chose {labels[i]} or {labels[j]}?"
        expl = f"{values[i]} + {values[j]} = {ans}."
        cands = [abs(values[i] - values[j]), ans + 5, ans - 5, ans + 10]
    else:
        ans = sum(values)
        q = "How many children are there in the class altogether?"
        expl = " + ".join(map(str, values)) + f" = {ans}."
        cands = [ans + 5, ans - 5, ans + 10, ans - 10]
    correct, ds = spread(r, ans, [c for c in cands if c > 0])
    return mk(r, f"{intro}{q}", correct, ds[:3], expl)


PIE_SETS = [
    [Fraction(1, 2), Fraction(1, 4), Fraction(1, 8), Fraction(1, 8)],
    [Fraction(1, 2), Fraction(1, 6), Fraction(1, 6), Fraction(1, 6)],
    [Fraction(1, 3), Fraction(1, 3), Fraction(1, 6), Fraction(1, 6)],
    [Fraction(3, 8), Fraction(1, 4), Fraction(1, 4), Fraction(1, 8)],
    [Fraction(1, 2), Fraction(1, 4), Fraction(1, 12), Fraction(1, 6)],
    [Fraction(1, 3), Fraction(1, 4), Fraction(1, 4), Fraction(1, 6)],
    [Fraction(5, 12), Fraction(1, 3), Fraction(1, 6), Fraction(1, 12)],
]


def pie_svg(labels, fracs):
    cx, cy, R = 150, 108, 74
    p = ['<svg class="chart" viewBox="0 0 300 216" width="300" role="img" aria-label="Pie chart">']
    a0 = -math.pi / 2
    for i, (lab, f) in enumerate(zip(labels, fracs)):
        a1 = a0 + 2 * math.pi * float(f)
        x0, y0, x1, y1 = cx + R * math.cos(a0), cy + R * math.sin(a0), cx + R * math.cos(a1), cy + R * math.sin(a1)
        large = 1 if float(f) > 0.5 else 0
        p.append(f'<path d="M{cx} {cy} L{x0:.1f} {y0:.1f} A{R} {R} 0 {large} 1 {x1:.1f} {y1:.1f} Z" fill="{COLOURS[i]}" stroke="#fff" stroke-width="2"/>')
        am = (a0 + a1) / 2
        lx, ly = cx + (R + 16) * math.cos(am), cy + (R + 16) * math.sin(am)
        anchor = "start" if math.cos(am) > 0.25 else "end" if math.cos(am) < -0.25 else "middle"
        p.append(f'<text x="{lx:.1f}" y="{ly + 4:.1f}" font-size="12" font-weight="700" text-anchor="{anchor}" fill="#183447">{lab}</text>')
        a0 = a1
    p.append("</svg>")
    return "".join(p)


def pie_chart(r):
    fracs = list(r.choice(PIE_SETS))
    r.shuffle(fracs)
    thing, cats = r.choice([("subject", ["Art", "Music", "Maths", "Science"]), ("holiday", ["Beach", "City", "Camping", "Cruise"]),
                            ("film type", ["Comedy", "Action", "Animated", "Fantasy"]), ("break-time game", ["Tag", "Football", "Skipping", "Cards"])])
    total = r.choice([24, 48, 72, 96, 120])
    k = r.randrange(4)
    ans = int(total * fracs[k])
    chart = pie_svg(cats, fracs)
    others = [int(total * f) for i, f in enumerate(fracs) if i != k]
    correct, ds = spread(r, ans, others + [ans + 6, ans - 6])
    ds = [d for d in ds if int(d) > 0]
    return mk(r, f"{total} children voted for their favourite {thing}. The pie chart shows the votes.<br>{chart}How many children voted for {cats[k]}?",
              correct, ds[:3], f"The {cats[k]} sector is {fracs[k]} of the circle, and {fracs[k]} of {total} = {ans}.")


def table_total(r):
    teams = ["Red", "Yellow", "Blue"]
    grid = [[r.randrange(10, 60), r.randrange(10, 60)] for _ in range(3)]
    col = [sum(grid[i][c] for i in range(3)) for c in range(2)]
    hide = r.randrange(3)
    ans = sum(grid[hide])
    cell = lambda i, c: "?" if i == hide else str(grid[i][c])
    rows = "".join(f"<tr><th>{teams[i]}</th><td>{cell(i, 0)}</td><td>{cell(i, 1)}</td><td>{'?' if i == hide else sum(grid[i])}</td></tr>" for i in range(3))
    rows += f"<tr><th>Total</th><td>{col[0]}</td><td>{col[1]}</td><td>{sum(col)}</td></tr>"
    head = "<tr><th>Team</th><th>Year 5</th><th>Year 6</th><th>Total</th></tr>"
    correct, ds = spread(r, ans, [ans + 10, ans - 10, ans + 1, ans - 1, sum(col) - ans])
    return mk(r, f"Points won in a school sports day are shown in the table. Some numbers are missing.<table class=\"gl-table\">{head}{rows}</table>How many points did the {teams[hide]} team win altogether?",
              correct, ds[:3], f"Subtract the other teams from each column total: the {teams[hide]} team has {grid[hide][0]} + {grid[hide][1]} = {ans}.")


# ---------------------------------------------------------------- number
def divisibility(r):
    k = r.choice([3, 4, 6, 8, 9])
    want_not = r.random() < 0.5
    multiples, non = [], []
    while len(multiples) < 4:
        n = k * r.randrange(40, 900 // 1)
        if n not in multiples and 200 < n < 9000:
            multiples.append(n)
    while len(non) < 4:
        n = k * r.randrange(40, 900) + r.randrange(1, k)
        if n not in non and 200 < n < 9000:
            non.append(n)
    if want_not:
        ans, others = non[0], multiples[:3]
        q = f"Which of these numbers is <b>not</b> divisible by {k}?"
        expl = f"{ans} ÷ {k} leaves a remainder of {ans % k}. The others are all multiples of {k}."
    else:
        ans, others = multiples[0], non[:3]
        q = f"Which of these numbers is divisible by {k}?"
        expl = f"{ans} ÷ {k} = {ans // k} exactly. The others leave remainders."
    return mk(r, q, str(ans), [str(x) for x in others], expl)


def expr_value(nums, ops):
    s = str(nums[0]) + "".join(f" {o} {n}" for o, n in zip(ops, nums[1:]))
    v = eval(s.replace("×", "*").replace("÷", "/"))  # our own generated strings only
    return s, v


def equal_expression(r):
    pool = {}
    for _ in range(400):
        k = r.choice([2, 3])
        nums = [r.randrange(2, 13) for _ in range(k + 1)]
        ops = [r.choice(["+", "−", "×", "÷"]) for _ in range(k)]
        s, v = expr_value(nums, [o.replace("−", "-") for o in ops])
        if isinstance(v, float) and not v.is_integer() or v <= 0 or v > 80:
            continue
        s = s.replace("*", "×").replace("/", "÷").replace(" - ", " − ")
        pool.setdefault(int(v), []).append(s)
    target = r.choice([t for t, e in pool.items() if len(e) >= 1 and 12 <= t <= 60])
    correct = r.choice(pool[target])
    ds = []
    for t, exprs in r.sample(list(pool.items()), len(pool)):
        if t != target and 5 <= t <= 70:
            ds.append(r.choice(exprs))
        if len(ds) == 3:
            break
    return mk(r, f"Which of these is equal to {target}?", correct, ds, f"Do × and ÷ first, then + and −: {correct} = {target}.")


def discount_each(r):
    d = r.choice([10, 20, 25, 50])
    step = {10: 10, 20: 5, 25: 4, 50: 2}[d]
    unit = step * r.randrange(1, 10)
    n = r.choice([4, 5, 6, 8, 10])
    total = unit * n
    ans = unit * (100 - d) // 100
    item = r.choice([("sweets", "pack"), ("pencils", "box"), ("stickers", "sheet"), ("cards", "pack")])
    correct, ds = spread(r, ans, [unit, total * (100 - d) // 100, unit - d, ans + step, ans - 1], fmt=lambda p: f"{p}p")
    return mk(r, f"A {item[1]} of {n} {item[0]} costs {total}p. In a sale there is {d}% off. What is the cost of one of the {item[0]} after the discount?",
              correct, ds[:3], f"Each one costs {total} ÷ {n} = {unit}p. {d}% off leaves {100 - d}%: {unit} × {100 - d}/100 = {ans}p.")


def out_of_every(r):
    b = r.choice([5, 6, 7, 9, 10, 12])
    a = r.randrange(1, b)
    m = a * r.randrange(3, 10)
    total = m * b // a
    items = r.choice([("books", "poetry books", "story books"), ("sweets", "mints", "toffees"), ("animals", "sheep", "goats"), ("cars", "red cars", "blue cars")])
    ask_total = r.random() < 0.6
    if ask_total:
        ans = total
        q = f"How many {items[0]} are there altogether?"
        expl = f"{m} ÷ {a} = {m // a} groups, and each group has {b}, so {m // a} × {b} = {total}."
        cands = [m + (b - a), m * b, total + b, total - b]
    else:
        ans = total - m
        q = f"How many of the {items[0]} are {items[2]}?"
        expl = f"There are {total} {items[0]} altogether ({m // a} groups of {b}), so {total} − {m} = {ans} are {items[2]}."
        cands = [m * (b - a), ans + a, ans - a, total]
    correct, ds = spread(r, ans, [c for c in cands if c > 0])
    return mk(r, f"{a} out of every {b} {items[0]} are {items[1]} and the rest are {items[2]}. There are {m} {items[1]}. {q}", correct, ds[:3], expl)


def groups_needed(r):
    per = r.choice([4, 5, 6, 7, 8, 9])
    n = r.randrange(per * 3 + 1, per * 9)
    if n % per == 0:
        return None
    thing = r.choice([("children", "tent", "tents", "can sleep in each tent"), ("pupils", "minibus", "minibuses", "fit in each minibus"), ("eggs", "box", "boxes", "fit in each box"), ("players", "team", "teams", "play in each team")])
    ans = math.ceil(n / per)
    correct, ds = spread(r, ans, [n // per, ans + 1, ans - 1, ans + 2, n - per])
    return mk(r, f"There are {n} {thing[0]}. {per} {thing[0]} {thing[3]}. How many {thing[2]} are needed for all of them?", correct, ds[:3],
              f"{n} ÷ {per} = {n // per} remainder {n % per}, so one more {thing[1]} is needed: {ans}.")


def decimal_sums(r):
    if r.random() < 0.55:
        a = r.choice([1, 2, 5, 10, 20])
        b = r.randrange(5, a * 100 - 3)
        ans = a * 100 - b
        cands = [ans + 100, ans - 100, ans + 10, ans - 10, ans + 90, ans - 90]
        f = lambda h: f"{h / 100:.2f}".rstrip("0").rstrip(".")
        correct, ds = spread(r, ans, [c for c in cands if c > 0], fmt=f)
        return mk(r, f"What is {a} − {f(b)}?", correct, ds[:3], f"{a} − {f(b)} = {f(ans)}. (Line up the decimal points and borrow carefully.)")
    parts = [r.randrange(5, 60) for _ in range(3)]
    ans = sum(parts)
    f = lambda t: f"{t / 10:.1f}"
    liquids = r.choice([("lemonade", "lime juice", "orange juice"), ("milk", "cream", "water"), ("apple juice", "pineapple juice", "sparkling water")])
    correct, ds = spread(r, ans, [ans + 10, ans - 10, ans + 1, ans - 1, ans + 9], fmt=f)
    return mk(r, f"A bowl of punch is made from {f(parts[0])} litres of {liquids[0]}, {f(parts[1])} litres of {liquids[1]} and {f(parts[2])} litres of {liquids[2]}. How many litres of punch is that?",
              correct, ds[:3], f"{f(parts[0])} + {f(parts[1])} + {f(parts[2])} = {f(ans)} litres.")


def total_mass(r):
    g = r.choice([120, 150, 180, 200, 250, 300, 350, 75, 125])
    k = r.randrange(3, 13)
    total = g * k
    if total < 1000:
        return None
    ans = total / 1000
    item = r.choice(["apples", "potatoes", "oranges", "tins of beans", "bags of flour"])
    correct, ds = spread(r, ans, [ans * 10, ans / 10, total / 100, total, ans + 1, ans - 0.5], fmt=trim)
    ds = [d for d in ds if float(d) > 0]
    return mk(r, f"A basket holds {k} {item}. Each one has a mass of {g} g. What is the total mass of the {item} in kilograms?", correct, ds[:3],
              f"{k} × {g} g = {total} g, and {total} g = {trim(ans)} kg.")


def per_portion(r):
    q = r.choice([4, 5, 8, 10])
    n = r.randrange(2, q)
    val10 = r.randrange(12, 130)
    ans10 = val10 * n
    thing = r.choice([("carbohydrate", "packet of crisps"), ("protein", "tin of soup"), ("sugar", "carton of juice"), ("fibre", "box of cereal")])
    frac = {4: "a quarter", 5: "a fifth", 8: "an eighth", 10: "a tenth"}[q]
    correct, ds = spread(r, ans10 / 10, [val10 * q / 10, val10 * (q - n) / 10, ans10 / 100, val10 / 10 + n, ans10 / 10 + 1], fmt=trim)
    return mk(r, f"A label says that {frac} of a {thing[1]} contains {trim(val10 / 10)} g of {thing[0]}. Kiran eats {n}/{q} of the {thing[1]}. How many grams of {thing[0]} does Kiran eat?",
              correct, ds[:3], f"{n}/{q} is {n} lots of {frac}. {n} × {trim(val10 / 10)} = {trim(ans10 / 10)} g.")


def missing_equation(r):
    if r.random() < 0.5:
        a = r.randrange(12, 99)
        total = 3 * a
        ks = [k for k in (2, 4, 6, 9, 12) if total % k == 0 and k != 3]
        if not ks:
            return None
        k = r.choice(ks)
        ans = total // k
        return mk(r, f"What is the missing number? &nbsp; <b>{a} + {a} + {a} = □ × {k}</b>", *_num(r, ans), f"{a} + {a} + {a} = {total}, and {total} ÷ {k} = {ans}.")
    m, n = r.randrange(4, 15), r.randrange(4, 15)
    prod = m * n
    ks = [k for k in (2, 3, 4, 6, 8) if prod % k == 0 and k not in (m, n)]
    if not ks:
        return None
    k = r.choice(ks)
    ans = prod // k
    return mk(r, f"What is the missing number? &nbsp; <b>{m} × {n} = □ × {k}</b>", *_num(r, ans), f"{m} × {n} = {prod}, and {prod} ÷ {k} = {ans}.")


def _num(r, ans):
    correct, ds = spread(r, ans, [ans + 1, ans - 1, ans * 2, ans + 10, ans - 2, ans + 2])
    return correct, ds[:3]


def pictogram(r):
    k = r.choice([2, 4, 10])
    a, b, c = r.randrange(2, 6), r.randrange(2, 6), r.randrange(1, 5)
    star = "★"
    dogs, cats, fish = star * a, star * b + "½", star * c
    ans_map = {"dogs": a * k, "cats": b * k + k // 2, "fish": c * k}
    kind = r.choice(["total", "diff"])
    rows = f"<table class=\"gl-table\"><tr><th>Dogs</th><td>{dogs}</td></tr><tr><th>Cats</th><td>{cats}</td></tr><tr><th>Fish</th><td>{fish}</td></tr></table>"
    intro = f"A pictogram shows the pets owned by some children. Each ★ stands for {k} pets, and ½ stands for {k // 2}.{rows}"
    if kind == "total":
        ans = sum(ans_map.values())
        q, expl = "How many pets are there altogether?", f"{ans_map['dogs']} + {ans_map['cats']} + {ans_map['fish']} = {ans}."
        cands = [ans + k, ans - k, ans + k // 2, (a + b + c) * k]
    else:
        ans = ans_map["cats"] - ans_map["dogs"] if ans_map["cats"] > ans_map["dogs"] else ans_map["dogs"] - ans_map["cats"]
        more = "cats" if ans_map["cats"] > ans_map["dogs"] else "dogs"
        less = "dogs" if more == "cats" else "cats"
        q, expl = f"How many more {more} than {less} are there?", f"{ans_map[more]} − {ans_map[less]} = {ans}."
        cands = [ans + k, abs(ans - k), ans + k // 2, ans * 2]
    if ans <= 0:
        return None
    correct, ds = spread(r, ans, [c for c in cands if c > 0])
    return mk(r, intro + q, correct, ds[:3], expl)


# ---------------------------------------------------------------- shapes
SHAPES = [
    ("I have four sides. Opposite sides are equal and parallel, but my angles are not right angles and my sides are not all equal.", "parallelogram", ["rectangle", "square", "kite"]),
    ("I have four equal sides but my angles are not right angles.", "rhombus", ["square", "rectangle", "regular pentagon"]),
    ("A triangle with all three sides different lengths.", "scalene triangle", ["equilateral triangle", "isosceles triangle", "rhombus"]),
    ("A triangle with exactly two sides the same length.", "isosceles triangle", ["scalene triangle", "equilateral triangle", "kite"]),
    ("A flat shape with six equal sides and six equal angles.", "regular hexagon", ["regular pentagon", "regular octagon", "regular heptagon"]),
    ("A flat shape with eight straight sides.", "octagon", ["hexagon", "pentagon", "decagon"]),
    ("A quadrilateral with two pairs of equal adjacent sides, but opposite sides that are not equal.", "kite", ["rhombus", "parallelogram", "rectangle"]),
    ("A quadrilateral with exactly one pair of parallel sides.", "trapezium", ["parallelogram", "rhombus", "rectangle"]),
    ("A 3D shape with 6 rectangular faces, 12 edges and 8 vertices.", "cuboid", ["triangular prism", "square-based pyramid", "cylinder"]),
    ("A 3D shape with 5 faces: one square and four triangles.", "square-based pyramid", ["triangular prism", "cuboid", "cone"]),
    ("A 3D shape with two circular faces and one curved surface.", "cylinder", ["cone", "sphere", "cuboid"]),
    ("A 3D shape with 5 faces: two triangles and three rectangles.", "triangular prism", ["square-based pyramid", "cuboid", "cylinder"]),
    ("A quadrilateral with exactly 4 lines of symmetry.", "square", ["rectangle", "rhombus", "kite"]),
    ("A quadrilateral with 4 right angles and exactly 2 lines of symmetry.", "rectangle", ["square", "kite", "parallelogram"]),
    ("A flat shape with five equal sides and five equal angles.", "regular pentagon", ["regular hexagon", "regular octagon", "rhombus"]),
]


def shape_props(r):
    prop, ans, ds = r.choice(SHAPES)
    article = "an" if ans[0] in "aeiou" else "a"
    return mk(r, f"Which shape is being described?<br><b>{prop}</b>", ans, ds, f"The description matches {article} {ans}.")


PLAN = [
    (money_coins, 10), (time_words, 14), (timetable, 12), (route, 10), (bar_chart, 16), (pie_chart, 12), (table_total, 8), (divisibility, 12),
    (equal_expression, 10), (discount_each, 10), (out_of_every, 10), (groups_needed, 10), (decimal_sums, 12), (total_mass, 8),
    (per_portion, 10), (missing_equation, 10), (pictogram, 8), (shape_props, len(SHAPES)),
]


def build(seen):
    out = []
    for gen, n in PLAN:
        out += fill("glmaths-" + gen.__name__, gen, n, seen)
    return out
