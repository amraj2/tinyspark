"""Shared helpers for the question generators.

A question is ``[prompt, [four options], correct_index, explanation]``; the build step appends a
``[topic, level]`` tag as a fifth element (see ``tags.py``).
"""

import random
from fractions import Fraction

from .tags import for_generator

SEED = 1111


def rng(name):
    return random.Random(f"{SEED}-{name}")


def mk(r, prompt, correct, distractors, explanation):
    """Build a question with the correct answer at a random position."""
    options = [correct]
    for d in distractors:
        if d not in options:
            options.append(d)
        if len(options) == 4:
            break
    if len(options) != 4:
        return None
    r.shuffle(options)
    return [prompt, options, options.index(correct), explanation]


def num_options(r, ans, fmt=str, extras=(), nonneg=True):
    """Return (correct, three plausible distractors) as strings."""
    cands = list(extras)
    spare = [ans + 1, ans - 1, ans + 2, ans - 2, ans + 10, ans - 10, ans * 2, ans + 5, ans - 5, ans + 20]
    r.shuffle(spare)
    cands += spare
    correct = fmt(ans)
    out = []
    for c in cands:
        if nonneg and c < 0:
            continue
        s = fmt(c)
        if s != correct and s not in out:
            out.append(s)
    return correct, out[:3]


def frac_str(f):
    f = Fraction(f)
    if f.denominator == 1:
        return str(f.numerator)
    if f.numerator > f.denominator:
        whole, rem = divmod(f.numerator, f.denominator)
        return f"{whole} {rem}/{f.denominator}"
    return f"{f.numerator}/{f.denominator}"


def money(pence):
    return f"£{pence / 100:.2f}"


def fill(name, generator, target, seen):
    """Call ``generator(r)`` until ``target`` new unique questions exist."""
    r = rng(name)
    out, tries = [], 0
    while len(out) < target and tries < target * 60:
        tries += 1
        q = generator(r)
        if q is None or q[0] in seen and q[0].count("<svg") == 0:
            continue
        key = (q[0], tuple(sorted(q[1])))
        if key in seen:
            continue
        seen.add(key)
        seen.add(q[0])
        out.append(list(q[:4]) + [for_generator(name)])
    return out
