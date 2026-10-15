"""Non-verbal reasoning: shape sequences, odd one out, reflections, matrices, spatial facts."""

import math

from .common import fill, mk

INK = "#183447"
FILLS = {"white": "#fff", "grey": "#9fb6c0", "black": INK}


def svg(body, w=56, h=56, label="shape"):
    return f'<svg class="nvr" viewBox="0 0 64 64" width="{w}" height="{h}" role="img" aria-label="{label}">{body}</svg>'


def polygon_pts(n, rad=24, rot=0):
    return " ".join(f"{32 + rad * math.sin(math.radians(rot + 360 * i / n)):.1f},{32 - rad * math.cos(math.radians(rot + 360 * i / n)):.1f}" for i in range(n))


def poly(n, fill="white", size=24, rot=0):
    return svg(f'<polygon points="{polygon_pts(n, size, rot)}" fill="{FILLS[fill]}" stroke="{INK}" stroke-width="3" stroke-linejoin="round"/>', label=f"{n}-sided shape")


def arrow(rot):
    return svg(f'<g transform="rotate({rot} 32 32)"><path d="M32 8 L46 28 H37 V54 H27 V28 H18 Z" fill="{INK}"/></g>', label=f"arrow turned {rot} degrees")


def flag(rot):
    return svg(f'<g transform="rotate({rot} 32 32)"><path d="M26 10 V54" stroke="{INK}" stroke-width="4" stroke-linecap="round"/><path d="M28 12 H50 L28 30 Z" fill="{FILLS["grey"]}" stroke="{INK}" stroke-width="3" stroke-linejoin="round"/></g>', label="flag")


def seq_html(items, answer_slot=True):
    cells = "".join(f'<span class="seq-item">{i}</span>' for i in items)
    return f'<span class="seq">{cells}<span class="seq-item seq-q">?</span></span>'


def rotation_seq(r):
    step = r.choice([45, 90, 135])
    start = r.choice([0, 45, 90, 180, 270])
    draw = r.choice([arrow, flag])
    rots = [(start + i * step) % 360 for i in range(5)]
    ans = rots[4]
    allr = [a for a in range(0, 360, 45) if a != ans]
    wrong = [(ans - step) % 360, (ans + step) % 360, (ans + 180) % 360]
    wrong = [w for w in wrong if w != ans] + [w for w in allr if w not in wrong]
    q = seq_html([draw(x) for x in rots[:4]])
    return mk(r, f"Which shape comes next in the sequence?<br>{q}", draw(ans), [draw(w) for w in wrong[:3]],
              f"The shape turns {step}° clockwise each time.")


def polygon_seq(r):
    start, step = r.randrange(3, 5), 1
    ns = [start + i for i in range(4)]
    ans = start + 4
    fillc = r.choice(["white", "grey"])
    wrong = [ans - 1 - 1, ans + 1, ans - 4 + 1] if False else [ans + 1, ans - 2, ans + 2]
    q = seq_html([poly(n, fillc) for n in ns])
    return mk(r, f"Which shape comes next?<br>{q}", poly(ans, fillc), [poly(w, fillc) for w in wrong if w >= 3][:3],
              f"Each shape has one more side than the last, so the next has {ans} sides.")


def grid_cells(k, total):
    cols = 3
    cells = []
    for i in range(total):
        x, y = 5 + (i % cols) * 18, 8 + (i // cols) * 18
        cells.append(f'<rect x="{x}" y="{y}" width="15" height="15" rx="2" fill="{INK if i < k else "#fff"}" stroke="{INK}" stroke-width="2"/>')
    return svg("".join(cells), label=f"{k} of {total} squares shaded")


def shading_seq(r):
    total = r.choice([4, 5, 6])
    step = r.choice([1, 1, 2])
    start = r.choice([0, 1])
    counts = [start + i * step for i in range(4)]
    ans = start + 4 * step
    if ans > total:
        return None
    wrong = [w for w in (ans - 1, ans + 1, ans - step * 2) if 0 <= w <= total and w != ans]
    wrong += [w for w in range(total + 1) if w not in wrong and w != ans]
    q = seq_html([grid_cells(k, total) for k in counts])
    return mk(r, f"How many squares will be shaded next?<br>{q}", grid_cells(ans, total), [grid_cells(w, total) for w in wrong[:3]],
              f"The number of shaded squares goes up by {step} each time: {', '.join(map(str, counts))}, then {ans}.")


def size_seq(r):
    sizes = [8, 12, 16, 20]
    shape = r.choice([3, 4, 5, 6])
    ans = 24
    q = seq_html([poly(shape, "white", s) for s in sizes])
    return mk(r, f"Which shape comes next?<br>{q}", poly(shape, "white", ans), [poly(shape, "white", s) for s in (28, 14, 10)],
              "The shape grows by the same amount each time.")


def odd_one_out(r):
    prop = r.choice(["sides", "fill", "size", "rot"])
    n, fillc, size, rot = r.choice([3, 4, 5, 6]), r.choice(list(FILLS)), 24, 0
    base = dict(n=n, fill=fillc, size=size, rot=rot)
    odd = dict(base)
    if prop == "sides":
        odd["n"] = r.choice([x for x in (3, 4, 5, 6, 8) if x != n])
        expl = "It has a different number of sides."
    elif prop == "fill":
        odd["fill"] = r.choice([f for f in FILLS if f != fillc])
        expl = "It is shaded differently."
    elif prop == "size":
        odd["size"] = 14
        expl = "It is a different size."
    else:
        base["n"] = odd["n"] = r.choice([3, 5])
        odd["rot"] = 180 if base["n"] == 3 else 36
        expl = "It is turned round differently."
    d = lambda p: poly(p["n"], p["fill"], p["size"], p["rot"])
    # Three identical options would fail the unique-options rule, so show four labelled shapes and ask for a letter.
    pos = r.randrange(4)
    row = [d(base)] * 3
    row.insert(pos, d(odd))
    letters = "ABCD"
    cells = "".join(f'<span class="seq-item"><small>{letters[i]}</small>{row[i]}</span>' for i in range(4))
    ans = letters[pos]
    return mk(r, f'Which shape is the odd one out?<br><span class="seq">{cells}</span>', ans, [x for x in letters if x != ans], expl)


def blob(flipx=False, flipy=False):
    tf = f"translate({64 if flipx else 0} {64 if flipy else 0}) scale({-1 if flipx else 1} {-1 if flipy else 1})"
    return svg(f'<g transform="{tf}">{SHAPE_PATH}</g>', label="pattern")


SHAPE_PATH = f'<path d="M16 12 H36 V22 H26 V30 H34 V40 H26 V52 H16 Z" fill="{FILLS["grey"]}" stroke="{INK}" stroke-width="3" stroke-linejoin="round"/>'


def mirror_line(vertical):
    if vertical:
        body = f'<line x1="48" y1="4" x2="48" y2="60" stroke="{INK}" stroke-width="3" stroke-dasharray="5 4"/><g transform="scale(.85)">{SHAPE_PATH}</g>'
    else:
        body = f'<line x1="4" y1="56" x2="60" y2="56" stroke="{INK}" stroke-width="3" stroke-dasharray="5 4"/><g transform="translate(0 2) scale(.8)">{SHAPE_PATH}</g>'
    return svg(body, label="shape and mirror line")


def reflection(r):
    vertical = r.random() < .5
    combos = {"orig": (False, False), "mx": (True, False), "my": (False, True), "both": (True, True)}
    correct = "mx" if vertical else "my"
    opts = {k: blob(*v) for k, v in combos.items()}
    ans = opts[correct]
    ds = [opts[k] for k in combos if k != correct]
    line = "vertical" if vertical else "horizontal"
    prompt = f"The shape is reflected in the {line} mirror line (dotted). What does the reflection look like?<br>{mirror_line(vertical)}"
    return mk(r, prompt, ans, ds, "A reflection is a mirror image: it flips across the mirror line, so left-right swap for a vertical line and up-down swap for a horizontal one.")


SHAPES = ["circle", "square", "triangle"]


def cell(shape, fillc, size=13):
    c = 16
    if shape == "circle":
        return f'<circle cx="{c}" cy="{c}" r="{size}" fill="{FILLS[fillc]}" stroke="{INK}" stroke-width="2.5"/>'
    if shape == "square":
        return f'<rect x="{c - size}" y="{c - size}" width="{2 * size}" height="{2 * size}" fill="{FILLS[fillc]}" stroke="{INK}" stroke-width="2.5"/>'
    pts = f"{c},{c - size} {c + size},{c + size - 2} {c - size},{c + size - 2}"
    return f'<polygon points="{pts}" fill="{FILLS[fillc]}" stroke="{INK}" stroke-width="2.5" stroke-linejoin="round"/>'


def matrix(r):
    sp, fp = r.sample(range(3), 1)[0], 0
    shapes, fills = r.sample(SHAPES, 3), r.sample(list(FILLS), 3)
    a, b = r.choice([(1, 1), (1, 2)]), r.choice([(1, 2), (2, 1)])
    grid = [[(shapes[(x + y) % 3], fills[(x + 2 * y) % 3]) for x in range(3)] for y in range(3)]
    mx, my = r.randrange(3), r.randrange(3)
    ans = grid[my][mx]
    body = ""
    for y in range(3):
        for x in range(3):
            body += f'<g transform="translate({x * 21 + 1} {y * 21 + 1}) scale(.62)">'
            body += cell(*grid[y][x]) if (x, y) != (mx, my) else f'<rect x="3" y="3" width="26" height="26" fill="none" stroke="{INK}" stroke-dasharray="4 3" stroke-width="2"/><text x="16" y="23" font-size="20" text-anchor="middle" fill="{INK}">?</text>'
            body += "</g>"
    main = svg(body, w=110, h=110, label="3 by 3 pattern grid with one missing")
    one = lambda s, f: svg(f'<g transform="translate(16 16)">{cell(s, f)}</g>', label=f"{f} {s}")
    ds = [(ans[0], f) for f in FILLS if f != ans[1]][:2] + [(s, ans[1]) for s in SHAPES if s != ans[0]][:1]
    return mk(r, f"Which shape completes the pattern? Each row and column contains every shape and every shading once.<br>{main}", one(*ans), [one(*d) for d in ds],
              f"The missing cell must contain the {ans[1]} {ans[0]}: the row and column already have the other shapes and shadings.")


def _text(pool):
    def gen(r):
        q = r.choice(pool)
        return mk(r, q[0], q[1], q[2], q[3])
    return gen


FACTS = [
    ("How many faces does a cube have?", "6", ["4", "8", "12"], "A cube has six square faces."),
    ("How many edges does a cube have?", "12", ["6", "8", "10"], "A cube has 12 edges."),
    ("How many vertices (corners) does a cube have?", "8", ["6", "12", "4"], "A cube has 8 corners."),
    ("How many faces does a square-based pyramid have?", "5", ["4", "6", "8"], "One square base plus four triangular faces."),
    ("How many vertices does a triangular prism have?", "6", ["5", "8", "9"], "Three corners at each end."),
    ("How many faces does a triangular prism have?", "5", ["3", "4", "6"], "Two triangles and three rectangles."),
    ("How many edges does a square-based pyramid have?", "8", ["4", "6", "10"], "Four around the base plus four sloping edges."),
    ("How many lines of symmetry does a square have?", "4", ["2", "1", "8"], "Two through the sides’ midpoints and two diagonals."),
    ("How many lines of symmetry does a rectangle (not a square) have?", "2", ["1", "4", "0"], "One in each direction through the centre."),
    ("How many lines of symmetry does an equilateral triangle have?", "3", ["1", "2", "6"], "One from each corner to the opposite side."),
    ("How many lines of symmetry does a regular hexagon have?", "6", ["3", "4", "8"], "A regular polygon has as many lines of symmetry as sides."),
    ("How many lines of symmetry does a regular pentagon have?", "5", ["1", "3", "10"], "A regular polygon has as many lines of symmetry as sides."),
    ("How many lines of symmetry does an isosceles triangle have?", "1", ["0", "2", "3"], "It is symmetrical about the line through its apex."),
    ("How many lines of symmetry does a parallelogram (not a rectangle or rhombus) have?", "0", ["1", "2", "4"], "It has rotational symmetry but no mirror lines."),
    ("What is the order of rotational symmetry of a square?", "4", ["1", "2", "8"], "It looks the same 4 times in a full turn."),
    ("Which shape has exactly one pair of parallel sides?", "Trapezium", ["Rectangle", "Rhombus", "Parallelogram"], "A trapezium has one pair; the others have two."),
    ("Which shape has four equal sides but no right angles (in general)?", "Rhombus", ["Square", "Rectangle", "Kite"], "A rhombus has four equal sides; a square would have right angles."),
    ("How many sides does an octagon have?", "8", ["6", "7", "10"], "Oct- means eight."),
    ("How many sides does a decagon have?", "10", ["8", "9", "12"], "Deca- means ten."),
    ("A cube is painted red and cut into 27 equal small cubes (3×3×3). How many small cubes have exactly 3 red faces?", "8", ["6", "12", "1"], "Only the 8 corner cubes show three painted faces."),
    ("How many small squares of every size are in a 2 × 2 grid of squares?", "5", ["4", "6", "8"], "Four small squares plus the one big square."),
    ("How many small squares of every size are in a 3 × 3 grid of squares?", "14", ["9", "12", "13"], "9 + 4 + 1 = 14."),
    ("A shape has 4 equal sides and 4 right angles. What is it?", "Square", ["Rhombus", "Rectangle", "Kite"], "A square is the shape with equal sides and right angles."),
    ("Which 3D shape has one curved surface, one flat circular face and one point?", "Cone", ["Cylinder", "Sphere", "Prism"], "It is a cone."),
    ("Which 3D shape has no edges and no vertices?", "Sphere", ["Cylinder", "Cone", "Cube"], "A sphere is completely smooth."),
]


def compass(r):
    dirs = ["north", "north-east", "east", "south-east", "south", "south-west", "west", "north-west"]
    i = r.randrange(8)
    turn = r.choice([90, 180, 270, 45, 135])
    cw = r.random() < .5
    j = (i + (turn // 45) * (1 if cw else -1)) % 8
    ans = dirs[j]
    ds = [dirs[(i - (turn // 45) * (1 if cw else -1)) % 8], dirs[(j + 1) % 8], dirs[(j + 4) % 8]]
    return mk(r, f"An arrow points {dirs[i]}. It turns {turn}° {'clockwise' if cw else 'anticlockwise'}. Which way does it point now?", ans, ds,
              f"Each 45° is one step round the compass; a {turn}° turn is {turn // 45} steps {'clockwise' if cw else 'anticlockwise'}.")


def net_faces(r):
    pairs = [("top", "bottom"), ("front", "back"), ("left", "right")]
    a, b = r.choice(pairs)
    colours = {"top": "red", "bottom": "blue", "front": "green", "back": "yellow", "left": "orange", "right": "purple"}
    others = [c for f, c in colours.items() if f not in (a, b)]
    return mk(r, f"A cube has six differently coloured faces. The {a} is {colours[a]}. Which colour must be on the opposite face if the cube's {b} face is {colours[b]}?",
              colours[b], others[:3], f"Opposite faces of a cube are the {a} and the {b}, so the {b} is {colours[b]}.")


def build(seen):
    plan = [(rotation_seq, 10), (polygon_seq, 3), (shading_seq, 6), (size_seq, 3), (odd_one_out, 10), (reflection, 8), (matrix, 12),
            (_text(FACTS), len(FACTS)), (compass, 10), (net_faces, 3)]
    out = []
    for gen, n in plan:
        out += fill("nvr-" + gen.__name__, gen, n, seen)
    return out
