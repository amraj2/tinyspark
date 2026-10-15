"""Rhyme families: words that rhyme by sound, curated for ages 6-11."""

_FAMILIES = """
cat hat bat mat rat sat flat chat fat pat that splat
can fan man pan ran plan tan van clan began
day play say way may stay gray tray spray clay hooray away
night light bright kite bite fight right white tight sight flight might height
cake bake lake make take shake snake wake flake brake awake
sing ring king wing bring swing spring string thing sting
go no show snow slow grow flow glow blow know toe row low throw
blue true glue new zoo shoe too two you who grew flew knew clue crew chew
tree bee see free three knee key sea tea me we he she be flea
near ear hear dear cheer deer fear year clear steer here
air bear care chair fair hair pair share square there where wear rare dare stare
more door floor roar store shore four snore core wore
sound round ground found hound pound bound
house mouse blouse
ball call fall hall tall wall small mall stall
hill will still fill bill chill spill thrill mill skill drill pill
bell tell well shell smell spell yell sell fell
hop stop top drop shop pop mop crop chop flop plop
bug hug rug mug jug dug snug shrug slug plug
sun fun run bun won done one none spun begun
red bed head said bread fed led shed sled thread spread
cow now how brow wow plow allow vow
boat coat goat float note vote throat wrote moat quote
rain train brain chain plane main pain gain drain plain lane cane crane
park dark bark shark spark mark lark
back black pack snack track quack stack crack sack shack
kick pick quick sick stick trick brick click lick thick chick
clock rock sock block lock knock dock stock flock shock
eat beat feet treat meat heat seat sweet neat street meet greet wheat sheet
shine line mine nine fine pine wine vine dine sign
time rhyme climb lime slime dime chime
ride side wide hide slide glide pride tide guide bride
old gold cold bold hold fold told sold
dream team cream steam beam stream gleam seem scream theme
love dove glove above shove
home dome foam gnome roam
nose rose toes goes pose those close hose chose froze
tale whale sale pale mail snail trail nail sail fail hail pail scale
jump bump lump pump stump dump hump plump thump clump
hand band land sand stand grand brand
pink drink sink think wink blink link ink stink
sang bang hang gang rang fang clang
sung lung hung swung rung stung
junk bunk skunk trunk sunk chunk
cash dash splash crash flash trash smash mash bash slash
fish wish dish swish
map cap tap clap nap snap trap lap gap zap wrap
big dig pig wig twig jig fig
hot pot dot lot not spot shot knot plot got cot
cut nut hut shut but strut gut rut
bit sit hit kit fit knit pit quit spit split grit
win pin tin thin grin spin skin chin bin fin twin
best nest rest test west chest vest quest guest pest zest
end bend friend send mend lend spend blend trend
tent went bent dent sent rent spent lent scent
bone cone phone stone throne alone zone tone
cool pool school fool tool stool drool
bike hike like strike spike
bird word heard third
snow glow
""".strip().splitlines()

FAMILIES: list[list[str]] = [
    line.split() for line in _FAMILIES if len(line.split()) >= 3
]

_INDEX: dict[str, list[int]] = {}
for _i, _fam in enumerate(FAMILIES):
    for _w in _fam:
        _INDEX.setdefault(_w, []).append(_i)


def _suffix_len(a: str, b: str) -> int:
    n = 0
    while n < min(len(a), len(b)) and a[-1 - n] == b[-1 - n]:
        n += 1
    return n


def normalise(word: str) -> str:
    return "".join(c for c in word.lower().strip() if c.isalpha())


def find_rhymes(word: str, limit: int = 24) -> tuple[list[str], bool]:
    """Words that rhyme with `word`; the bool says if the word is known."""
    w = normalise(word)
    if not w:
        return [], False
    if w in _INDEX:
        out: list[str] = []
        for i in _INDEX[w]:
            out += [x for x in FAMILIES[i] if x != w and x not in out]
        return out[:limit], True

    # Unknown word: borrow the family whose members share the longest ending.
    best, best_len = [], 0
    for i, fam in enumerate(FAMILIES):
        n = max((_suffix_len(w, x) for x in fam), default=0)
        if n > best_len:
            best, best_len = [i], n
        elif n == best_len and n > 0:
            best.append(i)
    if best_len < 2:
        return [], False
    out = []
    for i in best:
        out += [x for x in FAMILIES[i] if x != w and x not in out]
    return out[:limit], False


def do_rhyme(a: str, b: str) -> bool:
    x, y = normalise(a), normalise(b)
    if not x or not y or x == y:
        return False
    if set(_INDEX.get(x, [])) & set(_INDEX.get(y, [])):
        return True
    return _suffix_len(x, y) >= 3


def make_quiz(rng) -> dict:
    """A 'which word rhymes?' question: one rhyme and two non-rhymes."""
    fam = rng.choice([f for f in FAMILIES if len(f) >= 5])
    target, answer = rng.sample(fam, 2)
    pool = [w for f in FAMILIES if f is not fam for w in f
            if not do_rhyme(target, w)]
    options = [answer] + rng.sample(pool, 2)
    rng.shuffle(options)
    return {"target": target, "options": options, "answer": answer}
