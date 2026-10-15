"""Rebuild data/questions.json:  python -m app.apps.elevenplus.qbank

Keeps the hand-written seed questions and adds original generated/curated ones.
Every question is checked for four distinct options and a valid answer index.
"""

import json
from pathlib import Path

from .tags import for_untagged
from . import english, gl_english, gl_maths, gl_nvr, gl_vr, maths, nvr, vr

HERE = Path(__file__).parent
OUT = HERE.parent / "data" / "questions.json"


def validate(subject, q):
    prompt, options, answer, explanation = q[:4]
    topic, level = q[4]
    assert level in (1, 2, 3) and topic, (subject, prompt)
    assert len(options) == 4 and len(set(options)) == 4, (subject, prompt, options)
    assert 0 <= answer < 4 and explanation, (subject, prompt)
    assert prompt.strip(), subject


def main():
    bank = json.loads((HERE / "seed_questions.json").read_text(encoding="utf-8"))
    builders = {"Maths": maths, "English": english, "Verbal reasoning": vr, "Non-verbal reasoning": nvr}
    # GL-style question families (original questions modelled on GL Assessment 11+ question types).
    gl_builders = {"Maths": gl_maths, "English": gl_english, "Verbal reasoning": gl_vr, "Non-verbal reasoning": gl_nvr}
    imported = json.loads((HERE / "chatgpt_questions.json").read_text(encoding="utf-8"))
    for subject, module in builders.items():
        seen = {q[0] for q in bank[subject]["questions"]}
        bank[subject]["questions"] += module.build(seen)
        # Questions imported from an outside ChatGPT-written set; skip exact repeats (same prompt and options).
        have = {(q[0], tuple(sorted(q[1]))) for q in bank[subject]["questions"]}
        for q in imported[subject]:
            key = (q[0], tuple(sorted(q[1])))
            if key not in have:
                have.add(key)
                bank[subject]["questions"].append(q)
        bank[subject]["questions"] += gl_builders[subject].build(seen)
        for q in bank[subject]["questions"]:
            if len(q) == 4:
                q.append(for_untagged(subject, q))
            validate(subject, q)
        print(f"{subject}: {len(bank[subject]['questions'])}")
    OUT.write_text(json.dumps(bank, ensure_ascii=False, separators=(",", ":")) + "\n", encoding="utf-8")


main()
