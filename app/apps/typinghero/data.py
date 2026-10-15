"""Typing Hero curriculum: keys, fingers, levels, words and sentences.

The levels teach touch typing in a deliberate order (home row, index
reaches, top row, bottom row, capitals/punctuation, numbers, words,
sentences). Every level lists exactly which characters it may use, so the
client can generate a chart from nothing but this data.
"""

# Lane order on the highway: left hand pinky -> index, thumbs, right hand.
LANE_ORDER = ["lp", "lr", "lm", "li", "th", "ri", "rm", "rr", "rp"]

FINGER_NAMES = {
    "lp": "Left pinky", "lr": "Left ring", "lm": "Left middle",
    "li": "Left index", "th": "Thumbs", "ri": "Right index",
    "rm": "Right middle", "rr": "Right ring", "rp": "Right pinky",
}

# Which finger types which key (standard touch-typing, QWERTY).
FINGER_KEYS = {
    "lp": "qaz1",
    "lr": "wsx2",
    "lm": "edc3",
    "li": "rfvtgb45",
    "th": " ",
    "ri": "yhnujm67",
    "rm": "ik,8",
    "rr": "ol.9",
    "rp": "p;/0'-",
}

# Shifted characters typed with the finger of their base key.
SHIFTED = {"!": "1", "?": "/"}

KEYBOARD_ROWS = [
    list("1234567890-"),
    list("qwertyuiop"),
    list("asdfghjkl;'"),
    list("zxcvbnm,./"),
    [" "],
]

HOME_KEYS = list("asdfjkl;")

# Common, kid-friendly words (lower case). Levels filter by allowed letters.
WORDS = """
add ads all alas ask asks dad dads fad fads fall falls flask lad lads lass sad salad sass
ash dash flash flag flags gas glad gal gala had half hall halls has hash lag lags lash sag sags sash shall slash slag gash
kid kids lid lids fill hill hills silk sill ill is if lie lies life like likes side sides hide hides slide slides glide
dies idea ideas aisle elf elk else sled sleds shed sheds heal hail sail said sale sell sells fell feel feels field fields
flies leaf lake lakes sake safe file files flake flakes shake shakes skate skates slide kiss kissed glass sheds
see seed seeds feed deed needs leaked jelly keel heels jaded
red rid ride rides rise rises read reads real feather rule rules user urge us use used slug rush rushed
dark darker drive drives alive large hare hair air fair fire fires fur furl hurl hurdle sure sugar sugary
let lets tell tells test tests tale tales list lists tile tiles that this these thus tree trees treat treats
street strike stir stairs star start stars state steel stage staged taste tastes sit sits site sites
yes yet toy toys joy joys day days play plays stay stays say says easy eye eyes yell yells style story stories
off ought out oat oats old oil oils only open opens over owl owls our hour hours hello holly hold holds
pie pies pit pits pet pets pen pens pop pops pup pups paper pepper puppy poppy pool pools page pages paid
who why what when where while with wish wishes wide wind winds window wing wings wolf wool word words
quit quiet quick quack quilt quest queen quiz quote quotes squid square equal
cat cats can cap cup cups cut cute come came car cars catch clock cloud clouds cook cool coat cold
very vet van view vine vines voice valley velvet visit visits river rivers drive give gave live lives
box boy boys big bag bags bat bats bear beat bed bee bees bell best bird birds blue book books boat
nice nine nap net new next noise nest night nights now note not nut nuts needle nectar
mom map maps mat milk mix moon moons more most mouse music mud mug magic make makes maze mail
fox six wax mix next tax relax exit exam expert extra
zoo zero zip zap zebra zone zoom zigzag zest dozen size prize
and any are at be but by do for from go has her him his how in into it its may me my no of on or she so the them then they to up we you
one two three four five six seven eight nine ten
red blue green pink black white gold brown grey orange purple yellow
run jump skip hop walk talk sing play read write draw paint climb swim fly dance
apple bread cheese juice milk cake candy pizza pasta honey lemon melon peach grape
sun moon star sky cloud rain snow wind tree leaf grass flower river lake sea hill rock sand
baby friend friends teacher school class desk bag ball game toy kite drum bike bus train boat ship plane truck
house home door wall roof room bed chair table lamp clock window garden pocket jacket button ribbon picture
happy funny silly brave kind quick quiet loud soft warm cold tall short long fast slow round sweet fresh
dragon castle wizard robot rocket planet space ocean island forest jungle desert mountain
tiger horse sheep goat snake whale shark panda koala camel eagle rabbit monkey turtle parrot dolphin penguin
morning evening winter summer spring autumn rainbow thunder lightning sunshine
adventure treasure mystery journey kingdom princess knight giant
""".split()

SENTENCES = {
    1: [
        "The cat sat on the mat.",
        "I like to read books.",
        "We can run and jump.",
        "Dogs bark at the moon.",
        "A red kite flew high.",
        "The sun is warm today.",
        "Birds sing in the trees.",
        "I have a big green frog.",
        "She plays the drums.",
        "We eat lunch at noon.",
        "The fish swims fast.",
        "My dad makes good pancakes.",
    ],
    2: [
        "My friend and I built a rocket out of boxes.",
        "The little fox found a tiny door in the tree.",
        "Every morning the baker makes fresh warm bread.",
        "Can you spell the word elephant without looking?",
        "A gentle breeze moved the leaves on the old oak tree.",
        "We painted a huge rainbow on the garden wall.",
        "The brave knight climbed up the tall tower.",
        "Please bring your umbrella because it might rain.",
        "A sleepy dragon guarded the shiny golden treasure.",
        "My sister taught the parrot to say hello.",
    ],
    3: [
        "When the rain stopped, we splashed in every puddle on the way to school.",
        "Jack's dragon loved to read stories, but it never learned to turn the pages!",
        "Why did the robot bring a ladder to the party? It wanted to reach the high notes!",
        "Quick, grab your coat and boots, because the snow is falling fast.",
        "The explorers crossed the river, climbed the mountain, and found a secret cave.",
        "Nobody noticed the tiny star that was winking in the window.",
        "Our teacher said that a little practice every day will help you improve.",
        "Under the old bridge, a family of ducks quietly paddled home.",
    ],
}


def _w(letters: str) -> list[str]:
    """Words that can be typed using only these lower-case letters."""
    allowed = set(letters)
    seen: list[str] = []
    for w in WORDS:
        if set(w) <= allowed and w not in seen:
            seen.append(w)
    return seen


def word_pool(keys: list[str]) -> list[str]:
    return _w("".join(k for k in keys if k.isalpha() and k.islower()))


# ----- curriculum -----------------------------------------------------
# Each world introduces key "chunks"; levels use everything unlocked so far.
_WORLDS = [
    {"id": 1, "name": "Home Row Hills", "color": "#2f9e44", "emoji": "⛰️",
     "blurb": "Rest your fingers on the home row: A S D F and J K L ;",
     "bpm": 60, "step": 4},
    {"id": 2, "name": "Index Reach", "color": "#1c7ed6", "emoji": "\U0001F3AF",
     "blurb": "Your pointer fingers stretch to G and H.", "bpm": 66, "step": 4},
    {"id": 3, "name": "Middle Heights", "color": "#7048e8", "emoji": "\U0001F3D4️",
     "blurb": "Middle fingers climb up to E and I.", "bpm": 70, "step": 4},
    {"id": 4, "name": "Top Row Riff", "color": "#e8590c", "emoji": "\U0001F3B8",
     "blurb": "R, U, T and Y join the band.", "bpm": 74, "step": 4},
    {"id": 5, "name": "Top Row Finale", "color": "#d6336c", "emoji": "\U0001F386",
     "blurb": "O, P, W and Q complete the top row.", "bpm": 78, "step": 4},
    {"id": 6, "name": "Bottom Row Basement", "color": "#0c8599", "emoji": "\U0001F3DA️",
     "blurb": "Curl your fingers down to V M C B N X Z.", "bpm": 82, "step": 3},
    {"id": 7, "name": "Capital Stage", "color": "#f08c00", "emoji": "⬆️",
     "blurb": "Hold SHIFT with the opposite pinky for capitals and ! ?",
     "bpm": 84, "step": 3},
    {"id": 8, "name": "Number Crunch", "color": "#5f3dc4", "emoji": "\U0001F522",
     "blurb": "Optional: reach up for the number row.", "bpm": 80, "step": 3,
     "optional": True},
    {"id": 9, "name": "Word Rock", "color": "#c2255c", "emoji": "\U0001F4A5",
     "blurb": "Real words, falling fast. Keep the streak alive!", "bpm": 90,
     "step": 0},
    {"id": 10, "name": "Sentence Stage", "color": "#e03131", "emoji": "\U0001F3A4",
     "blurb": "Type whole sentences, karaoke style.", "bpm": 90, "step": 0},
]


def _bars(bpm: int) -> int:
    """Bars so a song lasts roughly 70 seconds."""
    return max(12, round(70 * bpm / 240))


def build_levels() -> list[dict]:
    worlds = {w["id"]: dict(w, levels=[]) for w in _WORLDS}
    unlocked: list[str] = []
    prev_required: str | None = None
    lvl_id_by_world: dict[int, int] = {}
    world_last: dict[int, str] = {}

    def add(world_id, name, blurb, mode, new_keys=None, keys=None, rhythm=1,
            bpm=None, wpm=None, count=None, tier=None, boss=False,
            caps=False, tip=None):
        nonlocal prev_required
        w = worlds[world_id]
        idx = lvl_id_by_world.get(world_id, 0) + 1
        lvl_id_by_world[world_id] = idx
        level_keys = list(keys if keys is not None else unlocked)
        lvl = {
            "id": f"{world_id}-{idx}", "world": world_id, "name": name,
            "blurb": blurb, "mode": mode, "keys": level_keys,
            "focus": list(new_keys or []),
            "bpm": bpm or w["bpm"] + (4 if boss else 0),
            "rhythm": rhythm, "boss": boss, "optional": bool(w.get("optional")),
            # Optional worlds chain among themselves but never block the
            # main path; the main path skips them.
            "requires": (world_last[world_id]
                         if w.get("optional") and idx > 1 else prev_required),
            "tip": tip,
        }
        lvl["bars"] = _bars(lvl["bpm"]) + (6 if boss else 0)
        if mode == "words":
            lvl.update({"wpm": wpm, "count": count or 16,
                        "pool": word_pool(level_keys)})
        if mode == "sentences":
            lvl.update({"wpm": wpm, "count": count or 5, "tier": tier or 1})
        lvl["caps"] = caps
        w["levels"].append(lvl)
        world_last[world_id] = lvl["id"]
        if not w.get("optional"):
            prev_required = lvl["id"]
        return lvl

    def unlock(chars):
        for c in chars:
            if c not in unlocked:
                unlocked.append(c)

    # World 1
    unlock(list("asdf"))
    add(1, "Left Hand Warm-up", "Meet A S D F with your left hand.", "notes",
        new_keys=list("asdf"), rhythm=1,
        tip="Rest your fingers on A S D F. Your thumbs float over the spacebar.")
    unlock(list("jkl;"))
    add(1, "Right Hand Warm-up", "Now J K L ; for the right hand.", "notes",
        new_keys=list("jkl;"), rhythm=1,
        tip="Feel the little bumps on F and J. They are your home markers.")
    add(1, "Two-Hand Jam", "Both hands, home row only.", "notes", rhythm=2)
    unlock([" "])
    add(1, "Meet the Spacebar", "Tap space with either thumb.", "notes",
        new_keys=[" "], rhythm=2, tip="Use whichever thumb is closest.")
    add(1, "Home Row Show", "Boss stage: play it all!", "notes", rhythm=3, boss=True)

    # World 2
    unlock(list("gh"))
    add(2, "Reach for G and H", "Index fingers stretch sideways.", "notes",
        new_keys=list("gh"), rhythm=2,
        tip="Reach, tap, and come straight back to the home row.")
    add(2, "Reach Mix", "Home row plus G and H.", "notes", rhythm=3)
    add(2, "First Words", "Real words! Type them as they fall.", "words",
        wpm=8, count=14, tip="Look at the screen, not at your hands.")
    add(2, "Reach Show", "Boss stage.", "notes", rhythm=3, boss=True)

    # World 3
    unlock(list("ei"))
    add(3, "Meet E and I", "Middle fingers climb up.", "notes",
        new_keys=list("ei"), rhythm=2,
        tip="Left middle finger takes E, right middle takes I.")
    add(3, "Climb Mix", "Everything so far.", "notes", rhythm=3)
    add(3, "Word Climb", "Words with E and I.", "words", wpm=10, count=16)
    add(3, "Heights Show", "Boss stage.", "notes", rhythm=4, boss=True)

    # World 4
    unlock(list("ru"))
    add(4, "Meet R and U", "Index fingers hop up.", "notes",
        new_keys=list("ru"), rhythm=2)
    unlock(list("ty"))
    add(4, "Meet T and Y", "Index fingers reach further.", "notes",
        new_keys=list("ty"), rhythm=2)
    add(4, "Riff Mix", "Everything so far.", "notes", rhythm=3)
    add(4, "Riff Words", "Words with R U T Y.", "words", wpm=12, count=18)
    add(4, "Riff Show", "Boss stage.", "notes", rhythm=4, boss=True)

    # World 5
    unlock(list("op"))
    add(5, "Meet O and P", "Ring and pinky reach up.", "notes",
        new_keys=list("op"), rhythm=2,
        tip="Pinkies are small but mighty. Keep the wrist relaxed.")
    unlock(list("wq"))
    add(5, "Meet W and Q", "The top row is complete.", "notes",
        new_keys=list("wq"), rhythm=2)
    add(5, "Finale Mix", "Everything so far.", "notes", rhythm=3)
    add(5, "Finale Words", "More real words.", "words", wpm=14, count=18)
    add(5, "Finale Show", "Boss stage.", "notes", rhythm=4, boss=True)

    # World 6
    unlock(list("vm"))
    add(6, "Meet V and M", "Fingers curl down.", "notes", new_keys=list("vm"),
        rhythm=2, tip="Curl, tap, and return home.")
    unlock(list("c,"))
    add(6, "Meet C and Comma", "Middle fingers drop down.", "notes",
        new_keys=list("c,"), rhythm=2)
    unlock(list("bn"))
    add(6, "Meet B and N", "Index fingers go down and across.", "notes",
        new_keys=list("bn"), rhythm=2)
    unlock(list("x."))
    add(6, "Meet X and Period", "Ring fingers dip down.", "notes",
        new_keys=list("x."), rhythm=2)
    unlock(list("z'"))
    add(6, "Meet Z and Apostrophe", "Pinkies finish the keyboard.", "notes",
        new_keys=list("z'"), rhythm=2)
    add(6, "Basement Mix", "Every letter!", "notes", rhythm=3)
    add(6, "Basement Words", "Words from the whole alphabet.", "words",
        wpm=16, count=20)
    add(6, "Basement Show", "Boss stage.", "notes", rhythm=4, boss=True)

    # World 7: capitals and punctuation
    caps = [c.upper() for c in "asdfjkl"]
    unlock(caps)
    add(7, "Capitals: Home Row", "Hold Shift with the OPPOSITE pinky.", "notes",
        new_keys=caps, rhythm=2, caps=True,
        tip="Left letter? Right Shift. Right letter? Left Shift.")
    more_caps = [c.upper() for c in "ghewiortupyqvmcbnxz"]
    unlock(more_caps)
    add(7, "Capitals: Everywhere", "Capital letters from every row.", "notes",
        new_keys=more_caps, rhythm=3, caps=True)
    unlock(list("!?"))
    add(7, "Meet ! and ?", "Shift plus 1, and shift plus /.", "notes",
        new_keys=list("!?"), rhythm=2, caps=True,
        keys=list("asdfjkl;") + caps + list("!?"))
    add(7, "Capital Words", "Words that start with capitals.", "words",
        wpm=18, count=18, caps=True)
    add(7, "Capital Show", "Boss stage.", "notes", rhythm=4, boss=True, caps=True)

    # World 8 (optional): numbers
    nums_a = list("12345")
    unlock(nums_a)
    add(8, "Numbers 1 to 5", "Left hand reaches up.", "notes",
        new_keys=nums_a, rhythm=2, keys=list("asdfgqwert") + nums_a)
    nums_b = list("67890")
    unlock(nums_b)
    add(8, "Numbers 6 to 0", "Right hand reaches up.", "notes",
        new_keys=nums_b, rhythm=2, keys=list("hjklyuiop;") + nums_b)
    add(8, "Number Mix", "All the numbers.", "notes", rhythm=3,
        keys=list("1234567890"))
    add(8, "Number Show", "Boss stage.", "notes", rhythm=4, boss=True,
        keys=list("1234567890") + list("asdfjkl;"))

    # World 9: word rock
    for n, (name, wpm, cnt) in enumerate([
        ("Word Rock: Opener", 18, 20), ("Word Rock: Verse", 22, 22),
        ("Word Rock: Chorus", 26, 24), ("Word Rock: Bridge", 30, 26),
    ], 1):
        add(9, name, "Keep your eyes on the words.", "words", wpm=wpm,
            count=cnt, caps=True)
    add(9, "Word Rock: Encore", "Boss stage: fast words!", "words", wpm=34,
        count=30, caps=True, boss=True)

    # World 10: sentences
    for name, wpm, tier, cnt in [
        ("Short Lines", 10, 1, 5), ("Common Phrases", 15, 1, 6),
        ("Story Sentences", 18, 2, 5), ("Quick Fingers", 24, 2, 6),
        ("Grand Finale", 28, 3, 5),
    ]:
        add(10, name, "Type each line, karaoke style.", "sentences", wpm=wpm,
            tier=tier, count=cnt, caps=True)

    out: list[dict] = []
    for w in _WORLDS:
        out.extend(worlds[w["id"]]["levels"])
    return out


def worlds_meta() -> list[dict]:
    return [
        {k: v for k, v in w.items() if k not in ("step",)} for w in _WORLDS
    ]
