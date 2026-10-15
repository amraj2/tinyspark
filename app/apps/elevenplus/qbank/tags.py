"""Topic + difficulty tags for generated questions.

Every question may carry a 5th element ``[topic, level]`` where level is 1 (easier), 2 (typical) or 3 (harder).
Spark Stumble uses the level to pick gentler questions in early rounds and for newer players.
Practice mode ignores the tag.
"""

# generator function name -> level (topic is the generator name itself)
LEVELS = {
    # maths
    "frac_of": 1, "pct_of": 2, "time_after": 1, "time_between": 2, "rect": 1, "lcm_hcf": 2, "order_ops": 2, "ratio_share": 3,
    "simplify_ratio": 2, "mean": 2, "median_mode_range": 2, "units": 1, "angles": 2, "nth_term": 3, "equation": 2,
    "function_machine": 2, "change": 1, "speed": 3, "negatives": 2, "rounding": 1, "squares": 2, "prime": 2, "probability": 2,
    "volume": 3, "frac_compare": 2, "simplify_frac": 1, "frac_add": 2, "decimals": 1, "tri_area": 2, "reverse_pct": 3,
    "pct_change": 3, "frac_to_pct": 2, "place_value": 1, "coordinates": 1, "proportion": 2, "money_words": 1,
    "missing_angles_polygon": 3, "clock_angle": 3, "word_problem_multi": 3, "factors_count": 2, "circle": 3,
    "money_coins": 1, "time_words": 1, "timetable": 2, "route": 1, "bar_chart": 1, "pie_chart": 2, "table_total": 2,
    "divisibility": 2, "equal_expression": 2, "discount_each": 3, "out_of_every": 3, "groups_needed": 1, "decimal_sums": 2,
    "total_mass": 2, "per_portion": 3, "missing_equation": 2, "pictogram": 1, "shape_props": 1,
    # verbal reasoning
    "letter_seq": 1, "letter_pairs": 2, "shift_code": 2, "num_seq": 2, "missing_num": 2, "odd_one": 1, "analogy": 2,
    "hidden_word": 3, "alphabet_pos": 2, "logic_order": 2, "days": 2, "anagram": 2, "number_pairs": 3, "closest_pair": 3,
    "compound": 1, "word_link": 2, "logic_syllogism": 3, "coded_numbers": 3, "complete_word": 2, "move_letter": 3,
    "polyseme": 3, "item_logic": 3, "interleaved_seq": 3, "growing_diff": 2,
    # non-verbal reasoning
    "rotation_seq": 1, "polygon_seq": 1, "shading_seq": 2, "size_seq": 1, "odd_one_out": 2, "reflection": 2, "matrix": 3,
    "compass": 2, "net_faces": 3, "symmetry": 2, "count_squares": 3, "code_shapes": 2, "rotate_flag": 2,
}


def for_generator(name):
    """``name`` looks like ``maths-frac_of`` or ``glvr-complete_word``."""
    key = name.split("-", 1)[-1]
    return [key, LEVELS.get(key, 2)]


def for_untagged(subject, q):
    """Best-effort tag for hand-written questions (seed set, imported set, English)."""
    prompt = q[0]
    if 'class="passage"' in prompt:
        return ["comprehension", 3]
    easy = ("plural of", "opposite in meaning", "collective noun", "correct spelling", "closest in meaning", "prefix", "suffix")
    hard = ("Which technique", "What does the phrase", "figurative", "passive", "metaphor", "personification", "What does “")
    if "spelt wrongly" in prompt:
        return ["spelling", 2]
    if any(k in prompt for k in easy):
        return [subject.lower().replace(" ", "-") + "-basics", 1]
    if any(k in prompt for k in hard):
        return [subject.lower().replace(" ", "-") + "-language", 3]
    if "punctuated" in prompt or "grammatically" in prompt:
        return ["grammar", 2]
    return [subject.lower().replace(" ", "-"), 2]
