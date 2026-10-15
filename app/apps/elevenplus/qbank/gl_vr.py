"""GL-style verbal reasoning: original questions modelled on the question *types* found in GL Assessment
11+ papers (no text is copied from any published paper).

Types: joining letter, move-a-letter, double-bracket synonyms, deductive item puzzles, interleaved and
accelerating number sequences.
"""

import os

from .common import fill, mk, num_options

# ---------------------------------------------------------------- word data
# (stem, letter, tail): stem+letter and letter+tail are both real words.
JOINERS = [
    ("bar", "k", "ing"), ("pin", "k", "ite"), ("boo", "k", "ind"), ("mil", "k", "ing"), ("pea", "k", "ilt"),
    ("ban", "d", "ish"), ("san", "d", "ark"), ("bir", "d", "oor"), ("lan", "d", "ear"), ("woo", "d", "ash"),
    ("ten", "t", "ale"), ("boa", "t", "ime"), ("nea", "t", "ame"), ("hea", "t", "ape"), ("sea", "t", "ail"),
    ("cra", "b", "ook"), ("clu", "b", "ell"), ("tu", "b", "ake"), ("cu", "b", "ird"),
    ("sta", "r", "ace"), ("fa", "r", "ide"), ("pai", "r", "ing"), ("ca", "r", "ain"), ("dea", "r", "oad"),
    ("pla", "n", "est"), ("ow", "n", "ail"), ("ma", "n", "ext"), ("ru", "n", "ice"),
    ("sto", "p", "ail"), ("sho", "p", "ark"), ("ho", "p", "ost"), ("ca", "p", "ain"), ("ti", "p", "ear"),
    ("coo", "l", "ist"), ("fee", "l", "ate"), ("too", "l", "ock"),
    ("fla", "g", "rip"), ("pi", "g", "old"), ("do", "g", "ate"), ("rin", "g", "ame"), ("lon", "g", "lue"),
    ("ma", "y", "ell"), ("bo", "y", "ard"), ("cit", "y", "ear"), ("pla", "y", "ell"),
    ("gam", "e", "ars"), ("ric", "e", "ach"), ("tim", "e", "asy"), ("sam", "e", "ven"), ("cak", "e", "dge"),
    ("bu", "s", "ail"), ("ye", "s", "ing"), ("hi", "s", "ock"), ("plu", "s", "and"), ("thi", "s", "ave"),
    ("bat", "h", "ere"), ("wit", "h", "ill"), ("pat", "h", "ome"), ("ric", "h", "and"),
    ("sno", "w", "ell"), ("gro", "w", "all"), ("lo", "w", "ind"), ("cro", "w", "ave"), ("ne", "w", "ish"),
    ("far", "m", "ilk"), ("roo", "m", "ice"), ("ha", "m", "ind"), ("ar", "m", "ask"), ("tea", "m", "ile"),
    ("bee", "f", "ire"), ("lea", "f", "ast"), ("sel", "f", "ish"), ("hal", "f", "ork"), ("roo", "f", "ear"),
]

# (word1, word2, moved letter, new word1, new word2): remove the letter from word1, insert it into word2
# without rearranging the other letters.
MOVES = [
    ("chair", "ash", "c", "hair", "cash"), ("plate", "ill", "p", "late", "pill"), ("stone", "pot", "s", "tone", "spot"),
    ("bride", "and", "b", "ride", "band"), ("clock", "old", "c", "lock", "cold"), ("fleet", "ace", "l", "feet", "lace"),
    ("brake", "ice", "r", "bake", "rice"), ("thin", "ear", "h", "tin", "hear"), ("flour", "ink", "l", "four", "link"),
    ("scare", "ell", "s", "care", "sell"), ("grain", "old", "g", "rain", "gold"), ("twin", "ale", "t", "win", "tale"),
    ("swing", "hot", "s", "wing", "shot"), ("spark", "and", "s", "park", "sand"), ("smile", "top", "s", "mile", "stop"),
    ("glove", "row", "g", "love", "grow"), ("brush", "ear", "b", "rush", "bear"), ("blast", "lack", "b", "last", "black"),
    ("clamp", "ram", "c", "lamp", "cram"), ("trust", "ape", "t", "rust", "tape"), ("crane", "ate", "r", "cane", "rate"),
    ("drink", "ear", "d", "rink", "dear"), ("plain", "ash", "l", "pain", "lash"), ("crown", "ear", "n", "crow", "near"),
    ("slide", "and", "l", "side", "land"), ("wheat", "ell", "w", "heat", "well"), ("shore", "and", "h", "sore", "hand"),
    ("blame", "ill", "b", "lame", "bill"),
]

# (answer, (sense 1 synonyms), (sense 2 synonyms))
POLYSEMES = [
    ("fair", ("just", "reasonable"), ("carnival", "funfair")), ("bark", ("yelp", "howl"), ("rind", "covering")),
    ("kind", ("type", "sort"), ("gentle", "caring")), ("light", ("lamp", "beam"), ("weightless", "slight")),
    ("match", ("equal", "pair"), ("game", "contest")), ("rock", ("stone", "boulder"), ("sway", "swing")),
    ("spring", ("leap", "bound"), ("fountain", "well")), ("bank", ("shore", "edge"), ("deposit", "save")),
    ("pitch", ("throw", "hurl"), ("field", "ground")), ("ring", ("band", "hoop"), ("call", "phone")),
    ("wave", ("ripple", "swell"), ("greet", "signal")), ("point", ("tip", "end"), ("aim", "purpose")),
    ("story", ("tale", "account"), ("floor", "level")), ("fine", ("thin", "delicate"), ("penalty", "punishment")),
    ("novel", ("book", "story"), ("new", "original")), ("current", ("stream", "flow"), ("present", "modern")),
    ("fall", ("autumn", "season"), ("drop", "tumble")), ("bear", ("carry", "hold"), ("endure", "tolerate")),
    ("mean", ("signify", "imply"), ("cruel", "unkind")), ("left", ("departed", "gone"), ("remaining", "spare")),
    ("stand", ("rise", "get up"), ("stall", "booth")), ("miss", ("fail", "overlook"), ("yearn for", "long for")),
    ("plain", ("simple", "ordinary"), ("prairie", "flatland")), ("tie", ("draw", "stalemate"), ("bind", "fasten")),
    ("sound", ("noise", "din"), ("sensible", "reliable")), ("letter", ("character", "symbol"), ("note", "message")),
    ("fan", ("supporter", "follower"), ("cooler", "blower")), ("plot", ("scheme", "conspiracy"), ("allotment", "patch")),
    ("board", ("plank", "panel"), ("embark", "enter")), ("park", ("garden", "playground"), ("leave", "stop")),
    ("file", ("folder", "record"), ("rasp", "smooth")), ("chest", ("box", "trunk"), ("torso", "breast")),
    ("spot", ("mark", "stain"), ("notice", "see")), ("cross", ("angry", "annoyed"), ("traverse", "go over")),
    ("kid", ("child", "youngster"), ("tease", "joke")), ("sink", ("basin", "washbowl"), ("go under", "submerge")),
    ("tap", ("faucet", "valve"), ("knock", "rap")), ("nail", ("claw", "talon"), ("hammer", "fix")),
]

NAMES = ["Amara", "Ben", "Chloe", "Dev", "Ella", "Finn", "Grace", "Hamza", "Isla", "Jack", "Kira", "Leo", "Mia", "Noah", "Priya", "Sam", "Tara", "Zain"]
THEMES = [
    ("Five children went to a pet shop. Each of them chose some pets.", "chose", ["a hamster", "a rabbit", "a goldfish", "a parrot"], "pets"),
    ("Five children made posters using different materials.", "used", ["glitter", "felt", "foil", "sequins"], "materials"),
    ("Five friends packed their own picnic lunches.", "packed", ["sandwiches", "apples", "crisps", "juice"], "items"),
    ("Five pupils checked what was in their school bags.", "had", ["a ruler", "some glue", "scissors", "a compass"], "items"),
    ("Five children joined a cooking club and each chose ingredients.", "chose", ["flour", "eggs", "butter", "cherries"], "ingredients"),
]

LETTERS = "abcdefghijklmnoprstwy"


# ---------------------------------------------------------------- optional dictionary (dev machines only)
def _dictionary():
    for path in ("/usr/share/dict/words", "/usr/share/dict/web2"):
        if os.path.exists(path):
            with open(path, encoding="utf-8", errors="ignore") as f:
                return {w.strip().lower() for w in f}
    return None


_DICT = _dictionary()


def _is_word(w):
    """True if ``w`` is a word (or if no dictionary is available, so distractor checks stay conservative)."""
    return _DICT is None or w in _DICT


# ---------------------------------------------------------------- generators
def complete_word(r):
    by_letter = {}
    for stem, letter, tail in JOINERS:
        by_letter.setdefault(letter, []).append((stem, tail))
    letter = r.choice([k for k, v in by_letter.items() if len(v) >= 2])
    a, b = r.sample(by_letter[letter], 2)
    p1, p2 = (a[0], b[1]), (b[0], a[1])
    bad = []
    for d in r.sample(LETTERS, len(LETTERS)):
        if d == letter:
            continue
        works = all(_is_word(s + d) and _is_word(d + t) for s, t in (p1, p2))
        if not works:
            bad.append(d)
    prompt = ("Find the letter that will finish the first word and start the second word of each pair. "
              f"The same letter must be used for both pairs.<br><b>{p1[0]} ( ? ) {p1[1]}</b> &nbsp;&nbsp; <b>{p2[0]} ( ? ) {p2[1]}</b>")
    expl = f"“{p1[0]}{letter}” and “{letter}{p1[1]}” are words, and so are “{p2[0]}{letter}” and “{letter}{p2[1]}”."
    return mk(r, prompt, letter, bad[:3], expl)


def move_letter(r):
    w1, w2, letter, n1, n2 = r.choice(MOVES)
    cands = []
    for i, c in enumerate(w1):
        rest = w1[:i] + w1[i + 1:]
        if c != letter and c not in cands and not _is_word(rest):
            cands.append(c)
    if len(cands) < 3:
        return None
    prompt = (f"Move one letter from the first word to the second word to make two new words. Do not rearrange the other letters.<br>"
              f"<b>{w1}</b> &nbsp;|&nbsp; <b>{w2}</b><br>Which letter moves?")
    return mk(r, prompt, letter, r.sample(cands, 3), f"Take “{letter}” out of {w1} to make “{n1}” and add it to {w2} to make “{n2}”.")


def polyseme(r):
    ans, s1, s2 = r.choice(POLYSEMES)
    others = [p[0] for p in POLYSEMES if p[0] != ans]
    ds = r.sample(others, 3)
    return mk(r, f"Choose the word that has a similar meaning to a word in each set of brackets.<br><b>({s1[0]}, {s1[1]}) &nbsp; ({s2[0]}, {s2[1]})</b>",
              ans, ds, f"“{ans}” can mean “{s1[0]}” and it can also mean “{s2[0]}”.")


def _list_names(names):
    return names[0] if len(names) == 1 else ", ".join(names[:-1]) + " and " + names[-1]


def item_logic(r):
    setting, verb, items, thing = r.choice(THEMES)
    people = r.sample(NAMES, 5)
    grid = {p: set() for p in people}
    statements = []
    for item in items:
        h = r.choice([1, 2, 2, 3, 3, 4, 5])
        holders = r.sample(people, h)
        for p in holders:
            grid[p].add(item)
        if h == 1:
            statements.append(f"Only {holders[0]} {verb} {item}.")
        elif h == 5:
            statements.append(f"Everyone {verb} {item}.")
        elif h == 4:
            out = [p for p in people if p not in holders][0]
            statements.append(f"Everyone except {out} {verb} {item}.")
        else:
            statements.append(f"Only {_list_names(holders)} {verb} {item}.")
    r.shuffle(statements)
    counts = {p: len(v) for p, v in grid.items()}
    kind = r.choice(["most", "fewest", "count"])
    if kind == "count":
        who = r.choice(people)
        ans = counts[who]
        correct = str(ans)
        ds = [str(d) for d in range(0, len(items) + 1) if d != ans]
        if len(ds) < 3:
            return None
        ds = r.sample(ds, 3)
        q = f"How many {thing} did {who} have?"
        return mk(r, f"{setting}<br>{' '.join(statements)}<br>{q}", correct, ds, f"Count the statements that include {who}: {who} had {ans}.")
    target = max(counts.values()) if kind == "most" else min(counts.values())
    winners = [p for p, c in counts.items() if c == target]
    if len(winners) != 1:
        return None
    ans = winners[0]
    ds = [p for p in people if p != ans]
    q = f"Who had the {'most' if kind == 'most' else 'fewest'} {thing}?"
    tally = ", ".join(f"{p} {counts[p]}" for p in people)
    return mk(r, f"{setting}<br>{' '.join(statements)}<br>{q}", ans, r.sample(ds, 3), f"Tally the {thing}: {tally}. So {ans} had the {kind}.")


def interleaved_seq(r):
    a, sa = r.randrange(1, 15), r.randrange(2, 7)
    b, sb = r.randrange(30, 60), -r.randrange(2, 6)
    terms = []
    for i in range(4):
        terms += [a + sa * i, b + sb * i]
    ans = a + sa * 4
    shown = ", ".join(map(str, terms))
    correct, ds = num_options(r, ans, extras=[b + sb * 4, ans + sa, ans - 1])
    return mk(r, f"Which number continues the sequence?<br><b>{shown}, ?</b>", correct, ds,
              f"Two sequences are mixed together. The 1st, 3rd, 5th… terms go up by {sa}, and the others go down by {-sb}. The next term is {ans}.")


def growing_diff(r):
    start, d0, inc = r.randrange(1, 12), r.randrange(1, 4), r.randrange(1, 4)
    terms, cur, d = [start], start, d0
    for _ in range(5):
        cur += d
        terms.append(cur)
        d += inc
    ans = cur + d
    correct, ds = num_options(r, ans, extras=[cur + d - inc, cur + d + inc, cur + d0])
    return mk(r, f"Find the number that continues the sequence.<br><b>{', '.join(map(str, terms))}, ?</b>", correct, ds,
              f"The gaps grow by {inc} each time ({', '.join(str(d0 + inc * i) for i in range(5))}…), so the next gap is {d} and the next term is {ans}.")


PLAN = [(complete_word, 26), (move_letter, 26), (polyseme, 36), (item_logic, 24), (interleaved_seq, 12), (growing_diff, 8)]


def build(seen):
    out = []
    for gen, n in PLAN:
        out += fill("glvr-" + gen.__name__, gen, n, seen)
    return out
