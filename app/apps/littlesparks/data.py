"""Little Sparks: content for the pre-reader games (ages 3-5).

Design rules: no reading needed (icons + a friendly voice), no fail states,
no timers that punish, big targets. Learning comes from the mechanics.
"""

# Sticker book: collected as rewards (a classic collect-a-thon hook).
STICKERS = [
    {"id": "roly-ant", "emoji": "\U0001F41C", "game": "roly", "name": "Tiny collector"},
    {"id": "roly-cow", "emoji": "\U0001F404", "game": "roly", "name": "Big roller"},
    {"id": "roly-house", "emoji": "\U0001F3E0", "game": "roly", "name": "House roller"},
    {"id": "roly-lots", "emoji": "\U0001F31F", "game": "roly", "name": "Roll master"},
    {"id": "bugs-one", "emoji": "\U0001F41E", "game": "bugs", "name": "First catch"},
    {"id": "bugs-three", "emoji": "\U0001F98B", "game": "bugs", "name": "Net hero"},
    {"id": "bugs-five", "emoji": "\U0001F41D", "game": "bugs", "name": "Bug buddy"},
    {"id": "bugs-ten", "emoji": "\U0001F3C6", "game": "bugs", "name": "Bug champion"},
    {"id": "sort-red", "emoji": "\U0001F34E", "game": "sorter", "name": "Red sorter"},
    {"id": "sort-round", "emoji": "\U0001F308", "game": "sorter", "name": "Rainbow sorter"},
    {"id": "sort-shapes", "emoji": "\U0001F537", "game": "sorter", "name": "Shape sorter"},
    {"id": "sort-three", "emoji": "\U0001F451", "game": "sorter", "name": "Sorting star"},
    {"id": "diner-first", "emoji": "\U0001F36A", "game": "diner", "name": "First order"},
    {"id": "diner-five", "emoji": "\U0001F9C1", "game": "diner", "name": "Little chef"},
    {"id": "diner-ten", "emoji": "\U0001F382", "game": "diner", "name": "Head chef"},
    {"id": "diner-all", "emoji": "\U0001F37D️", "game": "diner", "name": "Feast"},
    {"id": "choo-first", "emoji": "\U0001F682", "game": "choo", "name": "Toot toot"},
    {"id": "choo-three", "emoji": "\U0001F6A5", "game": "choo", "name": "Signal pro"},
    {"id": "choo-friends", "emoji": "\U0001F46B", "game": "choo", "name": "Full train"},
    {"id": "choo-all", "emoji": "\U0001F3AB", "game": "choo", "name": "Driver"},
    {"id": "beat-three", "emoji": "\U0001F941", "game": "beats", "name": "Drummer"},
    {"id": "beat-five", "emoji": "\U0001F3B8", "game": "beats", "name": "Rock star"},
    {"id": "beat-six", "emoji": "\U0001F3B6", "game": "beats", "name": "Super band"},
    {"id": "beat-jam", "emoji": "\U0001F3A4", "game": "beats", "name": "Jammer"},
    {"id": "garden-first", "emoji": "\U0001F331", "game": "garden", "name": "Green thumb"},
    {"id": "garden-four", "emoji": "\U0001F33B", "game": "garden", "name": "Sunny garden"},
    {"id": "garden-all", "emoji": "\U0001F955", "game": "garden", "name": "Veg patch"},
    {"id": "garden-ten", "emoji": "\U0001F9FA", "game": "garden", "name": "Full basket"},
]

GAMES = [
    {"id": "roly", "title": "Roly Poly", "emoji": "⚽", "color": "#8ce99a",
     "style": "Katamari-style roller",
     "learns": "Big and small, counting, cause and effect.",
     "talk": "Which things are small enough to pick up? What happens when the ball is bigger?"},
    {"id": "bugs", "title": "Bug Net", "emoji": "\U0001F98B", "color": "#ffd43b",
     "style": "Catch-the-critters hunt",
     "learns": "Counting aloud to 5, matching, noticing details.",
     "talk": "Count each bug together. Can you find a different one?"},
    {"id": "sorter", "title": "Rainbow Sorter", "emoji": "\U0001F308", "color": "#74c0fc",
     "style": "Party mini-game",
     "learns": "Colours and shapes, sorting, hand-eye skills.",
     "talk": "What colour is this? Which bin does it belong in?"},
    {"id": "diner", "title": "Little Diner", "emoji": "\U0001F36A", "color": "#ffa8a8",
     "style": "Busy restaurant game",
     "learns": "Counting objects, matching quantities, taking turns.",
     "talk": "How many apples does Bunny want? Let's count the plate."},
    {"id": "choo", "title": "Choo-Choo Express", "emoji": "\U0001F682", "color": "#d0bfff",
     "style": "Track-switching puzzler",
     "learns": "Cause and effect, planning ahead, left and right.",
     "talk": "Which way should the track go? What will happen if we change it?"},
    {"id": "beats", "title": "Beat Pals", "emoji": "\U0001F941", "color": "#ffc9c9",
     "style": "Copy-the-beat rhythm game",
     "learns": "Listening, memory, patterns and order.",
     "talk": "Listen first, then copy. Can you remember what comes next?"},
    {"id": "garden", "title": "Sprout Garden", "emoji": "\U0001F331", "color": "#b2f2bb",
     "style": "Farm life game",
     "learns": "How plants grow, patience, caring routines.",
     "talk": "What does the seed need? What happens first, then next?"},
]

# ----- Roly Poly: item tiers, smallest to largest (r = radius in world px) --
ROLY_ITEMS = [
    {"e": "\U0001F41C", "r": 7, "n": 40},
    {"e": "\U0001F41E", "r": 9, "n": 30},
    {"e": "\U0001F343", "r": 11, "n": 30},
    {"e": "\U0001F33C", "r": 14, "n": 30},
    {"e": "\U0001F344", "r": 16, "n": 20},
    {"e": "\U0001F34E", "r": 19, "n": 16},
    {"e": "\U0001F425", "r": 22, "n": 12},
    {"e": "\U0001F431", "r": 30, "n": 8},
    {"e": "\U0001F383", "r": 40, "n": 6},
    {"e": "\U0001F411", "r": 52, "n": 4},
    {"e": "\U0001F404", "r": 70, "n": 3},
    {"e": "\U0001F333", "r": 100, "n": 3},
    {"e": "\U0001F3E0", "r": 140, "n": 1, "goal": True},
]

# ----- Bug Net -------------------------------------------------------------
BUG_TYPES = [
    {"e": "\U0001F41E", "one": "ladybird", "many": "ladybirds"},
    {"e": "\U0001F41D", "one": "bee", "many": "bees"},
    {"e": "\U0001F98B", "one": "butterfly", "many": "butterflies"},
    {"e": "\U0001F41B", "one": "caterpillar", "many": "caterpillars"},
    {"e": "\U0001F40C", "one": "snail", "many": "snails"},
]

# ----- Rainbow Sorter -----------------------------------------------------
SORT_COLOURS = [
    {"id": "red", "hex": "#e03131", "items": ["\U0001F34E", "\U0001F353", "\U0001F352", "\U0001F345"]},
    {"id": "yellow", "hex": "#f59f00", "items": ["\U0001F34C", "\U0001F34B", "\U0001F33B", "⭐"]},
    {"id": "blue", "hex": "#1c7ed6", "items": ["\U0001F433", "\U0001F9E2", "\U0001F4A7", "\U0001F535"]},
    {"id": "green", "hex": "#2f9e44", "items": ["\U0001F34F", "\U0001F952", "\U0001F438", "\U0001F966"]},
]
SORT_SHAPES = ["circle", "square", "triangle", "star"]

# ----- Little Diner ---------------------------------------------------------
DINER_FOODS = [
    {"e": "\U0001F34E", "one": "apple", "many": "apples"},
    {"e": "\U0001F34C", "one": "banana", "many": "bananas"},
    {"e": "\U0001F353", "one": "strawberry", "many": "strawberries"},
    {"e": "\U0001F36A", "one": "cookie", "many": "cookies"},
    {"e": "\U0001F955", "one": "carrot", "many": "carrots"},
    {"e": "\U0001F35E", "one": "bread", "many": "breads"},
]
DINER_CUSTOMERS = [
    {"e": "\U0001F437", "name": "Piggy"}, {"e": "\U0001F430", "name": "Bunny"},
    {"e": "\U0001F43B", "name": "Bear"}, {"e": "\U0001F436", "name": "Puppy"},
    {"e": "\U0001F431", "name": "Kitty"}, {"e": "\U0001F43C", "name": "Panda"},
]

# ----- Choo-Choo Express: track graphs (canvas is 1000 x 640) -------------
# nodes: id -> (x, y); edges are directed; a node with 2+ outgoing edges is
# a junction (first listed edge is the default). `stations` end the ride;
# `friends` are passengers waiting on nodes.
CHOO_LEVELS = [
    {
        "name": "First fork",
        "nodes": {"A": (80, 320), "J": (380, 320), "B": (700, 170), "C": (700, 470)},
        "edges": [("A", "J"), ("J", "B"), ("J", "C")],
        "start": "A", "stations": ["C"], "friends": {},
    },
    {
        "name": "Two forks",
        "nodes": {"A": (80, 320), "J1": (300, 320), "B": (540, 170),
                  "J2": (540, 470), "D": (800, 340), "S": (800, 570)},
        "edges": [("A", "J1"), ("J1", "B"), ("J1", "J2"), ("J2", "D"), ("J2", "S")],
        "start": "A", "stations": ["S"], "friends": {},
    },
    {
        "name": "Pick up friends",
        "nodes": {"A": (70, 320), "J": (270, 320), "M": (560, 320),
                  "P1": (400, 130), "P2": (700, 130), "S": (910, 320)},
        "edges": [("A", "J"), ("J", "M"), ("M", "S"), ("J", "P1"), ("P1", "P2"), ("P2", "S")],
        "start": "A", "stations": ["S"],
        "friends": {"P1": "\U0001F436", "P2": "\U0001F430"},
    },
    {
        "name": "Dead ends",
        "nodes": {"A": (70, 120), "J1": (260, 120), "X1": (520, 60),
                  "J2": (420, 300), "X2": (700, 230), "J3": (620, 470),
                  "X3": (880, 400), "S": (900, 580)},
        "edges": [("A", "J1"), ("J1", "X1"), ("J1", "J2"), ("J2", "X2"),
                  ("J2", "J3"), ("J3", "X3"), ("J3", "S")],
        "start": "A", "stations": ["S"], "friends": {},
    },
    {
        "name": "The big loop-de-loop",
        "nodes": {"A": (60, 330), "J1": (220, 330), "U1": (330, 130),
                  "U2": (520, 130), "U3": (710, 130), "L1": (400, 540),
                  "L2": (640, 540), "J2": (800, 330), "DEAD": (930, 150),
                  "S": (940, 480)},
        "edges": [("A", "J1"), ("J1", "U1"), ("J1", "L1"), ("U1", "U2"),
                  ("U2", "U3"), ("U3", "J2"), ("L1", "L2"), ("L2", "J2"),
                  ("J2", "DEAD"), ("J2", "S")],
        "start": "A", "stations": ["S"],
        "friends": {"U1": "\U0001F431", "U2": "\U0001F437", "U3": "\U0001F43B"},
    },
]

# ----- Beat Pals -----------------------------------------------------------
BEAT_PADS = [
    {"e": "\U0001F436", "hex": "#ff6b6b", "note": 523.25},
    {"e": "\U0001F431", "hex": "#ffd43b", "note": 659.25},
    {"e": "\U0001F438", "hex": "#69db7c", "note": 783.99},
    {"e": "\U0001F433", "hex": "#4dabf7", "note": 1046.5},
]

# ----- Sprout Garden ---------------------------------------------------------
GARDEN_PLANTS = [
    {"id": "sunflower", "seed": "\U0001F33B", "stages": ["\U0001F330", "\U0001F331", "\U0001F33F", "\U0001F33B"]},
    {"id": "tomato", "seed": "\U0001F345", "stages": ["\U0001F330", "\U0001F331", "\U0001F33F", "\U0001F345"]},
    {"id": "carrot", "seed": "\U0001F955", "stages": ["\U0001F330", "\U0001F331", "\U0001F33F", "\U0001F955"]},
    {"id": "strawberry", "seed": "\U0001F353", "stages": ["\U0001F330", "\U0001F331", "\U0001F33F", "\U0001F353"]},
]


# Art slot names. Every emoji used by a game maps to a file name stem:
# drop `<name>.png` into static/apps/littlesparks/art/ and it replaces the
# emoji everywhere (see ART.md there). Missing files fall back to the emoji.
ART_NAMES = {
    "\U0001F41C": "ant", "\U0001F41E": "ladybird", "\U0001F343": "leaf",
    "\U0001F33C": "flower", "\U0001F344": "mushroom", "\U0001F34E": "apple",
    "\U0001F425": "chick", "\U0001F431": "cat", "\U0001F383": "pumpkin",
    "\U0001F411": "sheep", "\U0001F404": "cow", "\U0001F333": "tree",
    "\U0001F3E0": "house", "\U0001F41D": "bee", "\U0001F98B": "butterfly",
    "\U0001F41B": "caterpillar", "\U0001F40C": "snail",
    "\U0001F353": "strawberry", "\U0001F352": "cherries", "\U0001F345": "tomato",
    "\U0001F34C": "banana", "\U0001F34B": "lemon", "\U0001F33B": "sunflower",
    "\u2B50": "star", "\U0001F433": "whale", "\U0001F9E2": "cap",
    "\U0001F4A7": "drop", "\U0001F535": "blue-ball", "\U0001F34F": "green-apple",
    "\U0001F952": "cucumber", "\U0001F438": "frog", "\U0001F966": "broccoli",
    "\U0001F36A": "cookie", "\U0001F955": "carrot", "\U0001F35E": "bread",
    "\U0001F437": "pig", "\U0001F430": "rabbit", "\U0001F43B": "bear",
    "\U0001F436": "dog", "\U0001F43C": "panda", "\U0001F682": "train",
    "\U0001F689": "station", "\U0001F330": "seed", "\U0001F331": "sprout",
    "\U0001F33F": "leafy-plant", "\U0001F6A7": "barrier",
}


def choo_graph(level: dict):
    """(out_edges, junctions) for a track level; used by tests and the UI."""
    out: dict[str, list[str]] = {n: [] for n in level["nodes"]}
    for a, b in level["edges"]:
        out[a].append(b)
    junctions = {n for n, o in out.items() if len(o) >= 2}
    return out, junctions


def config() -> dict:
    return {
        "games": GAMES,
        "stickers": STICKERS,
        "roly": ROLY_ITEMS,
        "bugs": BUG_TYPES,
        "sorter": {"colours": SORT_COLOURS, "shapes": SORT_SHAPES},
        "diner": {"foods": DINER_FOODS, "customers": DINER_CUSTOMERS},
        "choo": [
            {**lvl, "nodes": {k: list(v) for k, v in lvl["nodes"].items()},
             "edges": [list(e) for e in lvl["edges"]]}
            for lvl in CHOO_LEVELS
        ],
        "beats": BEAT_PADS,
        "garden": GARDEN_PLANTS,
        "artNames": ART_NAMES,
    }
