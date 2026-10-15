import re

# Browsing themes for the picture library. Images are tagged by matching
# keywords in their prompt, so no extra metadata is needed.
THEMES = [
    {"id": "animals", "label": "Animals", "emoji": "\U0001F98A", "keywords": [
        "fox", "mouse", "owl", "penguin", "turtle", "snail", "dinosaur",
        "cat", "dog", "rabbit", "bear", "bird", "animal", "pet", "puppy",
        "kitten", "elephant", "lion", "monkey", "frog"]},
    {"id": "space", "label": "Space & robots", "emoji": "\U0001F680",
     "keywords": [
         "robot", "rocket", "space", "star", "planet", "moon", "machine",
         "inventor", "invent", "astronaut", "alien", "laser", "skateboard"]},
    {"id": "magic", "label": "Magic & fantasy", "emoji": "\U0001F409",
     "keywords": [
         "dragon", "magic", "wizard", "giant", "fairy", "spell", "glowing",
         "castle", "treasure", "map", "door", "enchant", "teapot", "unicorn",
         "talking"]},
    {"id": "sea-sky", "label": "Sea & sky", "emoji": "\U0001F30A",
     "keywords": [
         "whale", "sea", "ocean", "octopus", "boat", "raft", "kite",
         "cloud", "lighthouse", "pond", "puddle", "sail", "rain", "sky",
         "river", "island"]},
    {"id": "everyday", "label": "Everyday adventures", "emoji": "\U0001F3E1",
     "keywords": [
         "family", "picnic", "cake", "birthday", "garden", "village",
         "town", "friend", "children", "girl", "boy", "school", "book",
         "library", "forest", "hill", "meadow"]},
]

THEME_IDS = [t["id"] for t in THEMES]

_PATTERNS = {
    t["id"]: re.compile(
        r"\b(?:" + "|".join(re.escape(k) for k in t["keywords"]) + ")"
    )
    for t in THEMES
}


def themes_for(prompt: str) -> list[str]:
    """Theme ids a prompt belongs to (always at least one)."""
    text = prompt.lower()
    found = [tid for tid, pat in _PATTERNS.items() if pat.search(text)]
    return found or ["everyday"]


def public_themes() -> list[dict]:
    return [
        {"id": t["id"], "label": t["label"], "emoji": t["emoji"]}
        for t in THEMES
    ]
