"""GL-style non-verbal reasoning: original SVG questions modelled on the question *types* in GL
Assessment 11+ papers (lines of symmetry, counting shapes, shape codes, rotations, shape analogies).
Nothing is copied from a published paper.
"""

from .common import fill, mk
from .nvr import FILLS, INK, poly, svg

CONSONANTS = list("BCDFGHJKLMNPRSTVWZ")


def sized(pic, px):
    """The site CSS fixes .nvr at 52px, so larger pictures need an inline size."""
    return pic.replace('class="nvr"', f'class="nvr" style="width:{px}px;height:{px}px"', 1)


def shape_body(points, fill_="white"):
    return f'<polygon points="{points}" fill="{FILLS[fill_]}" stroke="{INK}" stroke-width="3" stroke-linejoin="round"/>'


# (svg, lines of symmetry, name)
def _sym_shapes():
    names = {3: "equilateral triangle", 4: "square", 5: "regular pentagon", 6: "regular hexagon", 7: "regular heptagon", 8: "regular octagon"}
    out = [(poly(n, "white", 26), n, names[n]) for n in names]
    out += [
        (svg('<rect x="9" y="19" width="46" height="26" fill="#fff" stroke="#183447" stroke-width="3" stroke-linejoin="round"/>', label="rectangle"), 2, "rectangle"),
        (svg(shape_body("32,10 53,52 11,52"), label="isosceles triangle"), 1, "isosceles triangle"),
        (svg(shape_body("11,50 53,50 40,12"), label="scalene triangle"), 0, "scalene triangle"),
        (svg(shape_body("20,18 55,18 44,46 9,46"), label="parallelogram"), 0, "parallelogram"),
        (svg(shape_body("32,8 55,32 32,56 9,32"), label="rhombus"), 2, "rhombus"),
        (svg(shape_body("32,8 51,27 32,57 13,27"), label="kite"), 1, "kite"),
        (svg(shape_body("21,20 43,20 55,46 9,46"), label="isosceles trapezium"), 1, "isosceles trapezium"),
    ]
    return out


SYM = _sym_shapes()


def symmetry(r):
    pic, n, name = r.choice(SYM)
    pool = [x for x in range(0, 9) if x != n and abs(x - n) <= 3]
    if len(pool) < 3:
        return None
    ds = [str(x) for x in r.sample(pool, 3)]
    if n == 0:
        why = f"The {name} is not symmetrical, so it has no lines of symmetry."
    elif n >= 3 and name in ("equilateral triangle", "square") or name.startswith("regular"):
        why = f"A shape with {n} equal sides and equal angles has {n} lines of symmetry, one for each side."
    else:
        why = f"{'An' if name[0] in 'aeiou' else 'A'} {name} has {n} line{'s' if n != 1 else ''} of symmetry."
    return mk(r, f"How many lines of symmetry does this shape have?<br>{sized(pic, 96)}", str(n), ds, why)


def count_squares(r):
    n, m = r.choice([(2, 2), (2, 3), (3, 3), (3, 4), (4, 4), (2, 4), (3, 5)])
    total = sum((n - k + 1) * (m - k + 1) for k in range(1, min(n, m) + 1))
    cell = 48 / max(n, m)
    w, h = cell * m, cell * n
    x0, y0 = (64 - w) / 2, (64 - h) / 2
    body = "".join(
        f'<rect x="{x0 + c * cell:.1f}" y="{y0 + rr * cell:.1f}" width="{cell:.1f}" height="{cell:.1f}" fill="#fff" stroke="{INK}" stroke-width="2"/>'
        for rr in range(n) for c in range(m))
    pic = sized(svg(body, w=130, h=130, label=f"{n} by {m} grid of squares"), 130)
    cands = [n * m, total + 1, total - 1, total + 2, sum((n - k + 1) * (m - k + 1) for k in range(1, min(n, m))) if min(n, m) > 1 else n * m + 1]
    ds = []
    for c in cands:
        if c != total and c > 0 and str(c) not in ds:
            ds.append(str(c))
    small = " + ".join(f"{(n - k + 1) * (m - k + 1)}" for k in range(1, min(n, m) + 1))
    return mk(r, f"How many squares of any size can you find in this {n} by {m} grid?<br>{pic}", str(total), ds[:3],
              f"Count squares of each size: {small} = {total}. (Don't forget the larger squares made from several small ones.)")


def circle():
    return svg(f'<circle cx="32" cy="32" r="22" fill="#fff" stroke="{INK}" stroke-width="3"/>', label="circle")


def code_shapes(r):
    shapes = [("circle", circle()), ("triangle", poly(3, "white", 24)), ("square", poly(4, "white", 24, rot=45)), ("pentagon", poly(5, "white", 24)), ("hexagon", poly(6, "white", 24))]
    letters = r.sample(CONSONANTS, 5)
    key = {name: (pic, letters[i]) for i, (name, pic) in enumerate(shapes)}
    used = r.sample([s[0] for s in shapes], 4)
    keyhtml = "".join(f'<span class="seq-item">{key[n][0]}<b>{key[n][1]}</b></span>' for n in used)
    seq = [r.choice(used) for _ in range(3)]
    if len(set(seq)) < 2:
        return None
    code = "".join(key[n][1] for n in seq)
    wrong = {code[::-1], code[1:] + code[0], code[-1] + code[:-1]}
    other = [key[n][1] for n in used]
    i = r.randrange(3)
    wrong.add(code[:i] + r.choice([c for c in other if c != code[i]]) + code[i + 1:])
    wrong.discard(code)
    ds = sorted(wrong)
    if len(ds) < 3:
        return None
    ds = r.sample(ds, 3)
    seqhtml = "".join(f'<span class="seq-item">{key[n][0]}</span>' for n in seq)
    return mk(r, f"Each shape has a letter code.<br><span class=\"seq\">{keyhtml}</span><br>What is the code for these shapes, in order?<br><span class=\"seq\">{seqhtml}</span>",
              code, ds, "Read the shapes left to right and swap each for its letter: " + " + ".join(key[n][1] for n in seq) + f" = {code}.")


def flag_svg(rot, mirror=False):
    inner = (f'<path d="M26 10 V54" stroke="{INK}" stroke-width="4" stroke-linecap="round"/>'
             f'<path d="M28 12 H50 L28 30 Z" fill="{FILLS["grey"]}" stroke="{INK}" stroke-width="3" stroke-linejoin="round"/>')
    if mirror:
        inner = f'<g transform="translate(64 0) scale(-1 1)">{inner}</g>'
    return svg(f'<g transform="rotate({rot} 32 32)">{inner}</g>', label="flag" + (" (flipped)" if mirror else f" turned {rot} degrees"))


def rotate_flag(r):
    turn, words = r.choice([(90, "a quarter turn clockwise"), (180, "a half turn"), (270, "a quarter turn anticlockwise")])
    others = [x for x in (0, 90, 180, 270) if x != turn]
    picks = r.sample(others, 2)
    options = [flag_svg(turn), flag_svg(picks[0]), flag_svg(picks[1]), flag_svg(turn, mirror=True)]
    correct = options[0]
    r.shuffle(options)
    return [f"This flag is turned by {words}. Which picture shows the result?<br>{sized(flag_svg(0), 80)}", options, options.index(correct),
            f"Turn the picture {words}: the flag ends up pointing the way the correct answer shows. The wrong options are turned by a different amount or flipped over."]


def analogy(r):
    kind = r.choice(["fill", "size", "sides"])
    n1, n2 = r.sample([3, 4, 5, 6, 8], 2)
    if kind == "fill":
        a, b, c = poly(n1, "white"), poly(n1, "black"), poly(n2, "white")
        correct = poly(n2, "black")
        ds = [poly(n2, "grey"), poly(n1, "black"), poly(n2, "white", 14)]
        why = "The shape changes from white to black, so the second shape should also turn black."
    elif kind == "size":
        a, b, c = poly(n1, "grey", 14), poly(n1, "grey", 26), poly(n2, "grey", 14)
        correct = poly(n2, "grey", 26)
        ds = [poly(n2, "grey", 14), poly(n1, "grey", 26), poly(n2, "black", 26)]
        why = "The shape gets bigger, so the second shape should also get bigger."
    else:
        a, b, c = poly(n1, "white"), poly(n1 + 1, "white"), poly(n2, "white")
        correct = poly(n2 + 1, "white")
        ds = [poly(n2, "white"), poly(n2 + 2, "white"), poly(n1 + 1, "white")]
        why = "The shape gains one side, so the second shape should have one extra side too."
    pair = lambda x, y: f'<span class="seq"><span class="seq-item">{x}</span><span>→</span><span class="seq-item">{y}</span></span>'
    prompt = f'The first pair of shapes changes in a certain way. Which picture completes the second pair in the same way?<br>{pair(a, b)} &nbsp; {pair(c, "<b>?</b>")}'
    if kind == "sides":
        ds += [poly(max(3, n2 - 1), "white"), poly(n2 + 3, "white")]
    uniq = []
    for d in ds:
        if d != correct and d not in uniq:
            uniq.append(d)
    if len(uniq) < 3:
        return None
    options = [correct] + uniq[:3]
    r.shuffle(options)
    return [prompt, options, options.index(correct), why]


PLAN = [(symmetry, 14), (count_squares, 7), (code_shapes, 14), (rotate_flag, 12), (analogy, 14)]


def build(seen):
    out = []
    for gen, n in PLAN:
        out += fill("glnvr-" + gen.__name__, gen, n, seen)
    return out
