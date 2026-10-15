"""Verbal reasoning: sequences, codes, analogies, odd ones out, logic, word puzzles."""

import string

from .common import fill, mk, num_options, rng
from .english import SYNONYMS

A = string.ascii_uppercase


def wrap(i):
    return A[i % 26]


def letter_seq(r):
    step, start = r.randrange(1, 5), r.randrange(0, 12)
    n = 5
    seq = [wrap(start + i * step) for i in range(n)]
    ans = wrap(start + n * step)
    ds = [wrap(start + n * step + k) for k in (1, -1, step)]
    return mk(r, f"Which letter comes next? {' '.join(seq)} …", ans, ds, f"The letters go up by {step} each time, so the next is {ans}.")


def letter_pairs(r):
    step = r.randrange(1, 4)
    start = r.randrange(0, 8)
    pairs = [wrap(start + 2 * i * step) + wrap(start + 2 * i * step + 1) for i in range(4)]
    nxt = wrap(start + 8 * step) + wrap(start + 8 * step + 1)
    ds = [wrap(start + 8 * step + 1) + wrap(start + 8 * step + 2), wrap(start + 8 * step - 1) + wrap(start + 8 * step), wrap(start + 8 * step) + wrap(start + 8 * step + 2)]
    return mk(r, f"Which pair comes next? {', '.join(pairs)}, …", nxt, ds, f"The first letter of each pair moves on by {2 * step}, so the next pair is {nxt}.")


WORDS = ["CAT", "DOG", "SUN", "PEN", "MAP", "BOX", "TEN", "HAT", "FISH", "BIRD", "LAMP", "TREE", "MILK", "STAR", "MOON", "BOOK", "RAIN", "CAKE"]


def shift_code(r):
    w = r.choice(WORDS)
    v = r.randrange(1, 4)
    sign = r.choice([1, -1])
    enc = lambda s: "".join(wrap(A.index(c) + sign * v) for c in s)
    ex = r.choice([x for x in WORDS if x != w and len(x) == len(w)] or [x for x in WORDS if x != w])
    tgt = r.choice([x for x in WORDS if x not in (w, ex)])
    ans = enc(tgt)
    ds = ["".join(wrap(A.index(c) + sign * (v + 1)) for c in tgt), "".join(wrap(A.index(c) - sign * v) for c in tgt), "".join(wrap(A.index(c) + sign * (v - 1)) if v > 1 else wrap(A.index(c) + 2) for c in tgt)]
    direction = "forward" if sign == 1 else "back"
    return mk(r, f"In a code, {ex} is written as {enc(ex)}. How is {tgt} written in the same code?", ans, ds,
              f"Each letter moves {v} place{'s' if v > 1 else ''} {direction} in the alphabet, so {tgt} becomes {ans}.")


def num_seq(r):
    kind = r.choice(["add", "mult", "square", "alt", "fib", "sub", "triangle"])
    if kind == "add":
        a, d = r.randrange(1, 20), r.randrange(2, 12)
        s = [a + i * d for i in range(6)]
        expl = f"Add {d} each time."
    elif kind == "mult":
        a, m = r.randrange(1, 5), r.choice([2, 3])
        s = [a * m ** i for i in range(6)]
        expl = f"Multiply by {m} each time."
    elif kind == "square":
        o = r.randrange(1, 5)
        s = [(i + o) ** 2 for i in range(6)]
        expl = "These are square numbers."
    elif kind == "alt":
        a, d1, d2 = r.randrange(1, 10), r.randrange(2, 8), r.randrange(1, 6)
        s = [a]
        for i in range(5):
            s.append(s[-1] + (d1 if i % 2 == 0 else d2))
        if d1 == d2:
            return None
        expl = f"The differences alternate: +{d1}, +{d2}, +{d1}, ..."
    elif kind == "fib":
        a, b = r.randrange(1, 6), r.randrange(1, 6)
        s = [a, b]
        for _ in range(4):
            s.append(s[-1] + s[-2])
        expl = "Each term is the sum of the two before it."
    elif kind == "sub":
        d = r.randrange(3, 12)
        a = d * 8 + r.randrange(0, 5)
        s = [a - i * d for i in range(6)]
        expl = f"Subtract {d} each time."
    else:
        s = [i * (i + 1) // 2 for i in range(2, 8)]
        expl = "The gaps grow by 1 each time: these are triangle numbers."
    shown, ans = s[:5], s[5]
    c, ds = num_options(r, ans, extras=[ans + 1, ans - 1, s[4] + (s[4] - s[3]) + 2 if s[4] + (s[4] - s[3]) + 2 != ans else ans + 3])
    return mk(r, f"What comes next? {', '.join(map(str, shown))}, …", c, ds, expl)


def missing_num(r):
    a, d = r.randrange(2, 20), r.randrange(3, 10)
    s = [a + i * d for i in range(6)]
    i = r.randrange(1, 5)
    ans = s[i]
    show = [("?" if j == i else str(v)) for j, v in enumerate(s)]
    c, ds = num_options(r, ans, extras=[ans + 1, ans - 1, ans + d])
    return mk(r, f"Find the missing number: {', '.join(show)}", c, ds, f"The numbers go up by {d} each time, so the missing number is {ans}.")


ODD = [
    (["apple", "banana", "cherry", "grape"], "carrot", "Carrot is a vegetable; the others are fruit."),
    (["oak", "elm", "birch", "willow"], "rose", "A rose is a flower; the others are trees."),
    (["violin", "cello", "guitar", "flute"], "drum", "…"), (["Paris", "Rome", "Madrid", "Cairo"], "London", "…"),
    (["red", "blue", "green", "yellow"], "circle", "Circle is a shape; the others are colours."),
    (["hammer", "spanner", "screwdriver", "saw"], "nail", "A nail is fixed with tools; the others are tools."),
    (["Mercury", "Venus", "Mars", "Jupiter"], "Sun", "The Sun is a star; the others are planets."),
    (["cat", "dog", "hamster", "rabbit"], "wolf", "A wolf is wild; the others are common pets."),
    (["triangle", "square", "pentagon", "cube"], "cube", "A cube is 3D; the others are flat shapes."),
    (["run", "jog", "sprint", "walk"], "sleep", "Sleep is not a way of travelling on foot."),
    (["whisper", "murmur", "mutter", "shout"], "shout", "Shout is loud; the others are quiet."),
    (["Monday", "Friday", "Sunday", "April"], "April", "April is a month; the others are days."),
    (["kilogram", "gram", "tonne", "litre"], "litre", "A litre measures volume; the others measure mass."),
    (["poem", "novel", "story", "sculpture"], "sculpture", "A sculpture is not written."),
    (["eagle", "sparrow", "penguin", "bat"], "bat", "A bat is a mammal; the others are birds."),
    (["knife", "fork", "spoon", "plate"], "plate", "A plate is not cutlery."),
    (["lake", "river", "pond", "mountain"], "mountain", "A mountain is not a body of water."),
    (["swim", "dive", "paddle", "climb"], "climb", "Climb is not done in water."),
    (["tulip", "daisy", "poppy", "cactus"], "oak", "…"),
]
ODD = [o for o in ODD if o[2] != "…"]


def odd_one(r):
    items, odd, e = r.choice(ODD)
    return mk(r, "Which word does not belong with the others?", odd, items[:3], e)


PAIRS = [
    ("Hand", "glove", "foot", "sock", ["shoe", "toe", "leg"]), ("Bird", "nest", "bee", "hive", ["honey", "wing", "sting"]),
    ("Book", "read", "song", "sing", ["hear", "music", "note"]), ("Kitten", "cat", "puppy", "dog", ["bark", "pet", "wolf"]),
    ("Day", "night", "hot", "cold", ["warm", "sun", "winter"]), ("Doctor", "hospital", "teacher", "school", ["pupil", "lesson", "book"]),
    ("Pen", "write", "knife", "cut", ["fork", "sharp", "eat"]), ("Fish", "swim", "bird", "fly", ["nest", "sing", "feather"]),
    ("Petal", "flower", "page", "book", ["word", "paper", "read"]), ("Wheel", "car", "wing", "plane", ["bird", "sky", "fly"]),
    ("Chef", "kitchen", "pilot", "cockpit", ["plane", "sky", "airport"]), ("Cow", "calf", "horse", "foal", ["mare", "stable", "pony"]),
    ("Glass", "window", "brick", "wall", ["house", "red", "hard"]), ("Painter", "brush", "writer", "pen", ["poem", "book", "ink"]),
    ("Thermometer", "temperature", "clock", "time", ["watch", "hour", "tick"]), ("Captain", "ship", "conductor", "orchestra", ["music", "baton", "violin"]),
    ("Sheep", "flock", "fish", "shoal", ["sea", "net", "school of"]), ("Tail", "dog", "trunk", "elephant", ["tree", "big", "zoo"]),
    ("Sapling", "tree", "cub", "lion", ["mane", "roar", "jungle"]), ("Ear", "hear", "eye", "see", ["look", "blink", "glasses"]),
    ("Cold", "freezing", "hot", "boiling", ["warm", "fire", "steam"]), ("Sculptor", "statue", "baker", "bread", ["oven", "flour", "shop"]),
]


def analogy(r):
    a, b, c_, ans, ds = r.choice(PAIRS)
    return mk(r, f"{a} is to {b} as {c_} is to …", ans, ds, f"{a} goes with {b} in the same way that {c_} goes with {ans}.")


HIDDEN = [("The old sea gull dived quickly.", "seagull", None), ]


def hidden_word(r):
    animals = ["cat", "dog", "hen", "owl", "ant", "bee", "pig", "rat", "fox", "ape", "emu", "yak"]
    filler = ["The", "shop", "keeper", "sat", "on", "a", "big", "red", "chair", "and", "smiled", "at", "us", "all", "day"]
    for _ in range(50):
        w = r.choice(animals)
        cut = r.randrange(1, 3)
        first, second = w[:cut], w[cut:]
        pre = [x for x in filler if x.endswith(first) and x != first]
        post = [x for x in filler if x.startswith(second) and x != second]
        cand_pre = [x for x in ["Sit", "Ask", "Unit", "Goat", "Shop", "Ball", "Swan", "Toad", "Seat", "Pub"] if x.lower().endswith(first)]
        cand_post = [x for x in ["Ride", "Aggy", "Ring", "Hold", "Tea", "Wler", "Vent", "Keeper", "Nest", "Ask", "Ate"] if x.lower().startswith(second)]
        if cand_pre and cand_post:
            a_, b_ = r.choice(cand_pre), r.choice(cand_post)
            sentence = f"{a_.capitalize()} {b_.lower()}"
            joined = (a_ + b_).lower()
            if w in joined and w not in a_.lower() and w not in b_.lower():
                others = [x for x in animals if x != w and x not in joined]
                return mk(r, f"Find the hidden animal that runs across the two words: “{a_.lower()} {b_.lower()}”", w, r.sample(others, 3),
                          f"The last letters of “{a_.lower()}” and the first letters of “{b_.lower()}” spell {w}.")
    return None


def alphabet_pos(r):
    kind = r.choice(["after", "before", "sum", "mirror"])
    if kind == "after":
        i, k = r.randrange(0, 20), r.randrange(2, 7)
        ans = wrap(i + k)
        return mk(r, f"Which letter is {k} places after {A[i]} in the alphabet?", ans, [wrap(i + k + 1), wrap(i + k - 1), wrap(i - k)], f"Count on {k} letters from {A[i]} to reach {ans}.")
    if kind == "before":
        i, k = r.randrange(8, 26), r.randrange(2, 7)
        ans = wrap(i - k)
        return mk(r, f"Which letter is {k} places before {A[i]} in the alphabet?", ans, [wrap(i - k + 1), wrap(i - k - 1), wrap(i + k)], f"Count back {k} letters from {A[i]} to reach {ans}.")
    if kind == "sum":
        w = r.choice(["CAB", "BED", "DAD", "FAD", "BAG", "HIDE", "JADE", "FACE"])
        ans = sum(A.index(c) + 1 for c in w)
        c, ds = num_options(r, ans, extras=[ans + 1, ans - 1, ans + 2])
        return mk(r, f"If A = 1, B = 2, C = 3 and so on, what is the total value of the letters in {w}?", c, ds, "Add the value of each letter: " + " + ".join(str(A.index(x) + 1) for x in w) + f" = {ans}.")
    i = r.randrange(0, 26)
    ans = A[25 - i]
    return mk(r, f"Imagine the alphabet written backwards (A ↔ Z, B ↔ Y …). Which letter is opposite {A[i]}?", ans, [wrap(25 - i + 1), wrap(25 - i - 1), wrap(i + 1)], f"{A[i]} is letter {i + 1}; its mirror partner is letter {26 - i}, which is {ans}.")


NAMES = ["Ali", "Beth", "Chen", "Dev", "Ella", "Farah", "Grace", "Harry"]


def logic_order(r):
    n = r.choice([3, 4])
    people = r.sample(NAMES, n)
    attr, hi, lo = r.choice([("tall", "taller", "shortest"), ("old", "older", "youngest"), ("fast", "faster", "slowest")])
    order = people[:]  # order[0] biggest
    clues = [f"{order[i]} is {hi} than {order[i + 1]}." for i in range(n - 1)]
    r.shuffle(clues)
    if r.random() < .5:
        return mk(r, " ".join(clues) + f" Who is the {lo}?", order[-1], order[:-1][:3], f"Chain the clues: {' > '.join(order)}. The last person is the {lo}.")
    top = {"taller": "tallest", "older": "oldest", "faster": "fastest"}[hi]
    return mk(r, " ".join(clues) + f" Who is the {top}?", order[0], order[1:][:3] + ([] if n == 4 else []), f"Chain the clues: {' > '.join(order)}. The first person is the {top}.") if n == 4 else \
        mk(r, " ".join(clues) + f" Who is the {top}?", order[0], order[1:] + [r.choice([x for x in NAMES if x not in people])], f"Chain the clues: {' > '.join(order)}. The first person is the {top}.")


DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"]


def days(r):
    i, k = r.randrange(7), r.randrange(9, 40)
    ans = DAYS[(i + k) % 7]
    ds = [DAYS[(i + k + 1) % 7], DAYS[(i + k - 1) % 7], DAYS[(i + k + 2) % 7]]
    return mk(r, f"Today is {DAYS[i]}. What day of the week will it be in {k} days?", ans, ds, f"{k} ÷ 7 leaves remainder {k % 7}, so count on {k % 7} days from {DAYS[i]}: {ans}.")


ANAGRAMS = [("LEMON", "fruit"), ("MELON", "fruit"), ("PEACH", "fruit"), ("TIGER", "animal"), ("HORSE", "animal"), ("ZEBRA", "animal"), ("CAMEL", "animal"),
            ("TABLE", "furniture"), ("CHAIR", "furniture"), ("PARIS", "city"), ("ROME", "city"), ("GREEN", "colour"), ("BROWN", "colour"), ("SPAIN", "country"), ("ITALY", "country"),
            ("PIANO", "instrument"), ("VIOLIN", "instrument"), ("EARTH", "planet"), ("SATURN", "planet")]


def anagram(r):
    ans, cat = r.choice(ANAGRAMS)
    letters = list(ans)
    for _ in range(20):
        r.shuffle(letters)
        if "".join(letters) != ans:
            break
    else:
        return None
    pool = [w for w, c in ANAGRAMS if c == cat and w != ans]
    others = [w for w, c in ANAGRAMS if c != cat]
    ds = (r.sample(pool, min(1, len(pool))) + r.sample(others, 3))[:3]
    ds = [d for d in ds if sorted(d) != sorted(ans)]
    return mk(r, f"Rearrange the letters “{''.join(letters)}” to make a {cat}. Which word is it?", ans, ds, f"The letters spell {ans}, which is a {cat}.")


def number_pairs(r):
    a, b = r.sample(range(2, 12), 2)
    c_, d = r.sample(range(2, 12), 2)
    op = r.choice(["+", "×", "−"])
    f = {"+": lambda x, y: x + y, "×": lambda x, y: x * y, "−": lambda x, y: abs(x - y)}[op]
    ans = f(c_, d)
    ex = f(a, b)
    if ans == ex:
        return None
    c, ds = num_options(r, ans, extras=[c_ + d if op != "+" else c_ * d, abs(c_ - d) if op != "−" else c_ + d])
    return mk(r, f"The numbers in each pair follow the same rule. {a}, {b} → {ex}. {c_}, {d} → ?", c, ds,
              f"The rule is {'add' if op == '+' else 'multiply' if op == '×' else 'find the difference of'} the two numbers: {c_} {op} {d} gives {ans}.")


def closest_pair(r):
    (w1, w2, _), (u1, _, _), (u2, _, _) = r.sample(SYNONYMS, 3)
    _, s1, _ = next((a, b, c) for a, b, c in SYNONYMS if a == w1)
    if len({w1, s1, u1, u2}) < 4:
        return None
    correct = f"{w1}, {s1}"
    ds = [f"{w1}, {u1}", f"{s1}, {u2}", f"{u1}, {u2}"]
    return mk(r, f"Which two words are closest in meaning?  {w1}, {u1}, {s1}, {u2}", correct, ds, f"{w1.capitalize()} and {s1} mean nearly the same thing.")


COMPOUND = [("sun", ["light", "flower", "burn"], "sunlight, sunflower, sunburn"), ("fire", ["work", "place", "fly"], "firework, fireplace, firefly"),
            ("rain", ["bow", "coat", "drop"], "rainbow, raincoat, raindrop"), ("foot", ["ball", "print", "path"], "football, footprint, footpath"),
            ("book", ["shop", "mark", "case"], "bookshop, bookmark, bookcase"), ("day", ["light", "break", "dream"], "daylight, daybreak, daydream"),
            ("moon", ["light", "beam", "shine"], "moonlight, moonbeam, moonshine"), ("air", ["port", "plane", "craft"], "airport, airplane, aircraft")]


def compound(r):
    base, parts, e = r.choice(COMPOUND)
    others = [b for b, _, _ in COMPOUND if b != base]
    return mk(r, f"Which word can go in front of each of these to make new words?  ___{parts[0]}, ___{parts[1]}, ___{parts[2]}", base, r.sample(others, 3), f"It makes: {e}.")


def word_link(r):
    pairs = [("cat", "dog", "pet"), ("rose", "tulip", "flower"), ("chair", "table", "furniture"), ("red", "blue", "colour"), ("Paris", "Rome", "city"), ("spoon", "fork", "cutlery")]
    a, b, cat = r.choice(pairs)
    others = [c for _, _, c in pairs if c != cat]
    return mk(r, f"Which word describes both {a} and {b}?", cat, r.sample(others, 3), f"{a.capitalize()} and {b} are both types of {cat}.")


def logic_syllogism(r):
    a, b, c_ = r.choice([("cats", "mammals", "Tom is a cat"), ("roses", "flowers", "This plant is a rose"), ("squares", "rectangles", "This shape is a square")])
    concl = {"cats": "Tom is a mammal", "roses": "This plant is a flower", "squares": "This shape is a rectangle"}[a]
    wrong = {"cats": ["Tom is a dog", "All mammals are cats", "Tom is not a mammal"], "roses": ["Every flower is a rose", "This plant is a tree", "This plant is not a flower"],
             "squares": ["Every rectangle is a square", "This shape is a circle", "This shape is not a rectangle"]}[a]
    return mk(r, f"All {a} are {b}. {c_}. Which statement must be true?", concl, wrong, "If all of one group belong to a second group, anything in the first group belongs to the second.")


def coded_numbers(r):
    letters = r.sample(A[:10], 4)
    vals = r.sample(range(1, 10), 4)
    m = dict(zip(letters, vals))
    word = "".join(r.choices(letters, k=3))
    ans = "".join(str(m[c]) for c in word)
    key = ", ".join(f"{k} = {v}" for k, v in m.items())
    ds = ["".join(str(m[c]) for c in word[::-1]), "".join(str(m[c] + 1) for c in word), "".join(str(m[c]) for c in (word[1:] + word[0]))]
    return mk(r, f"Using the code {key}, what is the code for {word}?", ans, ds, "Replace each letter with its number: " + ", ".join(f"{c} = {m[c]}" for c in word) + ".")


def build(seen):
    plan = [(letter_seq, 8), (letter_pairs, 5), (shift_code, 10), (num_seq, 14), (missing_num, 5), (odd_one, 16), (analogy, 20), (hidden_word, 6), (alphabet_pos, 14),
            (logic_order, 8), (days, 6), (anagram, 12), (number_pairs, 6), (closest_pair, 10), (compound, 8), (word_link, 6), (logic_syllogism, 3), (coded_numbers, 8)]
    out = []
    for gen, n in plan:
        out += fill("vr-" + gen.__name__, gen, n, seen)
    return out
