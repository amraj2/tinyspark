"""English: vocabulary, spelling, grammar, punctuation, figurative language, comprehension."""

from .common import mk, rng

SYNONYMS = [
    ("reluctant", "unwilling", ["eager", "careless", "certain"]), ("abundant", "plentiful", ["scarce", "tiny", "hidden"]),
    ("genuine", "real", ["false", "fancy", "empty"]), ("ancient", "very old", ["broken", "brand new", "valuable"]),
    ("brief", "short", ["clear", "heavy", "loud"]), ("conceal", "hide", ["reveal", "remove", "protect"]),
    ("furious", "very angry", ["very tired", "very happy", "very nervous"]), ("hesitate", "pause", ["hurry", "shout", "refuse"]),
    ("miserable", "unhappy", ["wealthy", "generous", "humble"]), ("obvious", "clear", ["hidden", "unlikely", "rare"]),
    ("peculiar", "strange", ["ordinary", "polite", "pleasant"]), ("rapid", "quick", ["gradual", "steady", "silent"]),
    ("tranquil", "calm", ["stormy", "crowded", "bright"]), ("vacant", "empty", ["crowded", "locked", "dirty"]),
    ("weary", "tired", ["cheerful", "curious", "brave"]), ("humble", "modest", ["proud", "wealthy", "clever"]),
    ("fragile", "easily broken", ["very heavy", "very old", "very small"]), ("inquire", "ask", ["answer", "decide", "forget"]),
    ("diligent", "hard-working", ["lazy", "quiet", "clumsy"]), ("bewildered", "confused", ["delighted", "exhausted", "annoyed"]),
    ("dwelling", "home", ["shop", "garden", "journey"]), ("feeble", "weak", ["fierce", "loud", "grand"]),
    ("jubilant", "joyful", ["gloomy", "anxious", "bored"]), ("astonished", "amazed", ["puzzled", "pleased", "worried"]),
    ("commence", "begin", ["finish", "continue", "delay"]), ("frigid", "freezing", ["damp", "windy", "cloudy"]),
    ("lament", "mourn", ["celebrate", "argue", "whisper"]), ("meagre", "small in amount", ["generous", "tasty", "fresh"]),
    ("prosper", "thrive", ["struggle", "wander", "escape"]), ("sceptical", "doubtful", ["trusting", "curious", "hopeful"]),
    ("tedious", "boring", ["thrilling", "difficult", "tiring"]), ("vital", "essential", ["optional", "harmful", "ordinary"]),
    ("zealous", "enthusiastic", ["reluctant", "gentle", "nervous"]), ("ample", "more than enough", ["barely enough", "far too little", "exactly right"]),
]
ANTONYMS = [
    ("scarce", "plentiful", ["rare", "hidden", "small"]), ("generous", "mean", ["kind", "rich", "gentle"]),
    ("expand", "shrink", ["grow", "stretch", "spread"]), ("victory", "defeat", ["battle", "prize", "success"]),
    ("ancient", "modern", ["old", "broken", "fragile"]), ("cautious", "reckless", ["careful", "quiet", "timid"]),
    ("transparent", "opaque", ["clear", "thin", "bright"]), ("accept", "refuse", ["allow", "offer", "believe"]),
    ("arrive", "depart", ["enter", "return", "remain"]), ("permanent", "temporary", ["lasting", "useful", "certain"]),
    ("optimist", "pessimist", ["dreamer", "realist", "leader"]), ("include", "exclude", ["invite", "contain", "gather"]),
    ("maximum", "minimum", ["greatest", "average", "total"]), ("voluntary", "compulsory", ["willing", "free", "brief"]),
    ("courage", "cowardice", ["bravery", "strength", "danger"]), ("simple", "complex", ["easy", "plain", "short"]),
    ("innocent", "guilty", ["honest", "young", "silent"]), ("increase", "decrease", ["grow", "double", "repeat"]),
    ("humble", "arrogant", ["modest", "gentle", "shy"]), ("fragile", "sturdy", ["delicate", "thin", "light"]),
    ("hostile", "friendly", ["angry", "distant", "nervous"]), ("triumph", "failure", ["victory", "effort", "reward"]),
]
HOMOPHONES = [
    ("The team did ___ best to win.", "their", ["there", "they're", "thier"], "Their shows that the best belongs to them."),
    ("___ going to be late if we don't hurry.", "We're", ["Were", "Where", "Wear"], "We're is short for 'we are'."),
    ("I hope ___ is enough food for everyone.", "there", ["their", "they're", "the're"], "There refers to a place or is used to introduce something."),
    ("She is taller ___ her brother.", "than", ["then", "that", "thane"], "Than is used to compare; then refers to time."),
    ("Please ___ the door when you leave.", "close", ["clothes", "cloes", "closs"], "Close (verb) means to shut."),
    ("The ___ was cold and rainy all week.", "weather", ["whether", "wether", "wheather"], "Weather is what it is like outside."),
    ("I don't know ___ to go left or right.", "whether", ["weather", "wether", "whither"], "Whether introduces a choice between two options."),
    ("The dog wagged ___ tail.", "its", ["it's", "its'", "it is"], "Its (no apostrophe) shows possession; it's means 'it is'."),
    ("___ that your coat on the floor?", "Is", ["Are", "Were", "Be"], "The subject 'that' is singular, so we use 'is'."),
    ("You must ___ your seatbelt in the car.", "wear", ["where", "were", "ware"], "Wear means to have on, e.g. clothes or a seatbelt."),
    ("The ___ of the school welcomed us.", "principal", ["principle", "princepal", "princeple"], "A principal is the head of a school; a principle is a rule or belief."),
    ("Rain will ___ the picnic.", "spoil", ["spoyl", "spoile", "spole"], "Spoil is spelled s-p-o-i-l."),
    ("The new rules will ___ everyone in the school.", "affect", ["effect", "afect", "efect"], "Affect is the verb (to influence); effect is usually the noun (the result)."),
    ("The medicine had a good ___ on her.", "effect", ["affect", "afect", "efect"], "Effect is the noun meaning result."),
    ("I need some new ___ for my letters.", "stationery", ["stationary", "stationerry", "stationry"], "Stationery is paper and pens; stationary means not moving."),
    ("The car was ___ at the red light.", "stationary", ["stationery", "stationairy", "stationnary"], "Stationary means not moving."),
    ("___ coat is this?", "Whose", ["Who's", "Whos", "Whoes"], "Whose asks about ownership; who's means 'who is'."),
    ("I think ___ going to win.", "you're", ["your", "youre", "yore"], "You're is short for 'you are'."),
    ("He tried to ___ the fire with water.", "extinguish", ["extinguich", "extingwish", "extinguise"], "Extinguish means to put out."),
    ("Let's ___ a picture of the sunset.", "take", ["tack", "taik", "teak"], "Take is the correct verb here."),
]
SPELLING = [
    ("necessary", ["neccessary", "necesary", "neccesary"]), ("separate", ["seperate", "separete", "sepparate"]),
    ("definitely", ["definately", "definitly", "defanitely"]), ("occasion", ["ocasion", "occassion", "occaision"]),
    ("believe", ["beleive", "belive", "beleave"]), ("receive", ["recieve", "receeve", "receve"]),
    ("embarrass", ["embarass", "embarras", "embarrase"]), ("accommodate", ["accomodate", "acommodate", "accomodete"]),
    ("environment", ["enviroment", "enviornment", "environmant"]), ("government", ["goverment", "governmant", "goverenment"]),
    ("library", ["libary", "libry", "liberry"]), ("February", ["Febuary", "Feburary", "Febuery"]),
    ("rhythm", ["rythm", "rhythem", "rhythym"]), ("conscience", ["consience", "concience", "conshence"]),
    ("privilege", ["priviledge", "privelege", "privilage"]), ("parliament", ["parlament", "parliment", "parliamant"]),
    ("especially", ["especialy", "expecially", "especaily"]), ("immediately", ["immediatly", "imediately", "immediatelly"]),
    ("restaurant", ["restarant", "resturant", "restaraunt"]), ("twelfth", ["twelth", "twelvth", "twelfh"]),
    ("Wednesday", ["Wenesday", "Wensday", "Wednsday"]), ("beautiful", ["beautifull", "beutiful", "beatiful"]),
    ("disappear", ["dissapear", "disapear", "disappere"]), ("guarantee", ["garantee", "guarentee", "guarante"]),
    ("neighbour", ["nieghbour", "neighbor", "neigbour"]), ("achieve", ["acheive", "achive", "acheave"]),
    ("temperature", ["temprature", "tempreture", "temperture"]), ("particular", ["particuler", "perticular", "particlar"]),
    ("independent", ["independant", "indepandent", "independint"]), ("unnecessary", ["unecessary", "unnecesary", "unneccessary"]),
]
PLURALS = [("child", "children", ["childs", "childrens", "childern"]), ("mouse", "mice", ["mouses", "mices", "meese"]),
           ("knife", "knives", ["knifes", "knifs", "knive"]), ("city", "cities", ["citys", "cities'", "citis"]),
           ("goose", "geese", ["gooses", "geeses", "goosen"]), ("leaf", "leaves", ["leafs", "leafes", "leavs"]),
           ("tooth", "teeth", ["tooths", "teeths", "toothes"]), ("wolf", "wolves", ["wolfs", "wolfes", "wolve"]),
           ("person", "people", ["persons'", "peoples", "persones"]), ("box", "boxes", ["boxs", "boxen", "boxies"]),
           ("hero", "heroes", ["heros", "heroes'", "heroies"]), ("sheep", "sheep", ["sheeps", "sheepes", "sheepen"]),
           ("baby", "babies", ["babys", "babyes", "babies'"]), ("foot", "feet", ["foots", "feets", "feet's"])]
POS = [("The tired dog slept peacefully.", "tired", "adjective", "It describes the noun 'dog'."),
       ("The tired dog slept peacefully.", "peacefully", "adverb", "It tells us how the dog slept."),
       ("She ran quickly to the gate.", "quickly", "adverb", "It describes the verb 'ran'."),
       ("The enormous elephant walked slowly.", "enormous", "adjective", "It describes the noun 'elephant'."),
       ("Freedom is precious.", "Freedom", "noun", "It names an idea, so it is an abstract noun."),
       ("They laughed loudly at the joke.", "laughed", "verb", "It is the action word."),
       ("He hid behind the tall wall.", "behind", "preposition", "It shows where he hid."),
       ("I like tea, but my sister prefers juice.", "but", "conjunction", "It joins two clauses."),
       ("Wow! That was amazing!", "Wow", "interjection", "It expresses sudden feeling."),
       ("The children built a castle.", "castle", "noun", "It names a thing."),
       ("She sang beautifully.", "sang", "verb", "It is the action word."),
       ("We waited under the old bridge.", "under", "preposition", "It shows the position of 'we'.")]
GRAMMAR = [
    ("Which sentence uses the correct verb form?", "Neither of the boys was late.", ["Neither of the boys were late.", "Neither of the boys are late.", "Neither of the boys be late."], "'Neither' is singular, so it takes 'was'."),
    ("Choose the correct sentence.", "She and I went to the park.", ["Her and me went to the park.", "Her and I went to the park.", "Me and her went to the park."], "'She and I' are the subjects of the sentence."),
    ("Choose the correct sentence.", "There are too many people here.", ["There is too many people here.", "There are to many people here.", "Their are too many people here."], "'People' is plural, so use 'are'; 'too' means 'excessively'."),
    ("Which sentence is in the past tense?", "The bell rang at noon.", ["The bell rings at noon.", "The bell will ring at noon.", "The bell is ringing at noon."], "'Rang' is the past tense of 'ring'."),
    ("Which sentence is in the future tense?", "We will visit Rome next year.", ["We visited Rome last year.", "We are visiting Rome now.", "We visit Rome every year."], "'Will visit' talks about something that has not happened yet."),
    ("Choose the correct word: 'I have ___ my homework.'", "done", ["did", "do", "doed"], "After 'have' we use the past participle 'done'."),
    ("Choose the correct sentence.", "He should have gone earlier.", ["He should of gone earlier.", "He should have went earlier.", "He should had gone earlier."], "'Should have' is followed by the past participle 'gone'."),
    ("Which sentence is correct?", "Fewer children came than expected.", ["Less children came than expected.", "Fewest children came than expected.", "Lesser children came than expected."], "Use 'fewer' with things you can count."),
    ("Which sentence is correct?", "The team is celebrating its win.", ["The team are celebrating it's win.", "The team is celebrating it's win.", "The team are celebrating their's win."], "'Team' is treated as singular here; 'its' shows possession."),
    ("Which sentence contains a conjunction?", "I stayed in because it was raining.", ["The rain fell heavily.", "What a wet day!", "Please close the window."], "'Because' joins two clauses."),
    ("Which sentence is a command?", "Put your books away.", ["Where are your books?", "Your books are on the desk.", "What lovely books!"], "A command tells someone what to do."),
    ("Which sentence is written in the passive voice?", "The window was broken by the ball.", ["The ball broke the window.", "Ravi broke the window.", "The window shattered loudly."], "In the passive, the thing acted upon comes first."),
    ("Which is a complete sentence?", "The old man walked home.", ["Walking home slowly.", "Because it was late.", "The old man in the hat."], "It has a subject and a verb and makes complete sense."),
    ("Which pronoun completes the sentence? 'The book is ___.' (belonging to me)", "mine", ["my", "me", "I"], "'Mine' is a possessive pronoun that stands alone."),
    ("Choose the best word: 'She speaks ___ than her brother.'", "more clearly", ["more clear", "most clearly", "clearlier"], "'Clearly' is an adverb, so the comparative is 'more clearly'."),
    ("Choose the correct sentence.", "Between you and me, it was hard.", ["Between you and I, it was hard.", "Between me and you I, it was hard.", "Among you and me, it was hard."], "After a preposition we use 'me'."),
]
PUNCT = [
    ("Which sentence is punctuated correctly?", "“Where are you going?” asked Mum.", ["“Where are you going,” asked Mum.", "“Where are you going?” Asked Mum.", "“Where are you going” asked Mum?"], "The question mark stays inside the speech marks and 'asked' stays lower case."),
    ("Which sentence is punctuated correctly?", "After the game, we went home.", ["After the game we, went home.", "After, the game we went home.", "After the game we went, home."], "A comma follows the introductory phrase."),
    ("Which sentence is punctuated correctly?", "It’s the dog’s bone.", ["Its the dogs bone.", "It’s the dogs’ bone.", "Its’ the dog’s bone."], "It’s = it is; dog’s shows the bone belongs to one dog."),
    ("Which sentence uses a colon correctly?", "You will need three things: a pen, a ruler and paper.", ["You will need: three things a pen, a ruler and paper.", "You: will need three things, a pen, a ruler and paper.", "You will need three: things a pen, a ruler and paper."], "A colon introduces a list after a complete clause."),
    ("Which sentence uses a semicolon correctly?", "The sun set; the stars came out.", ["The sun; set the stars came out.", "The sun set the; stars came out.", "The sun set the stars; came out."], "A semicolon joins two closely related complete clauses."),
    ("Which sentence uses commas correctly in a list?", "We bought apples, pears, plums and grapes.", ["We bought, apples pears, plums and grapes.", "We bought apples pears plums, and grapes.", "We, bought apples, pears plums and grapes."], "Separate items in a list with commas."),
    ("Which sentence is punctuated correctly?", "My brother, who is ten, loves chess.", ["My brother who is ten, loves chess.", "My brother, who is ten loves chess.", "My, brother who is ten, loves chess."], "Commas surround the extra information."),
    ("Which sentence has the correct apostrophe?", "The children’s coats hung by the door.", ["The childrens’ coats hung by the door.", "The childrens coats hung by the door.", "The children coat’s hung by the door."], "'Children' is already plural, so add ’s."),
    ("Which sentence has the correct apostrophe?", "The girls’ changing room is upstairs.", ["The girl’s changing room is upstairs.", "The girls changing room’s is upstairs.", "The girls’s changing room is upstairs."], "'Girls' is plural, so the apostrophe goes after the s."),
    ("Which sentence needs a question mark?", "Can you help me with this", ["Please help me with this", "I can help you with this", "You can help me with this"], "It asks a question."),
    ("Which sentence uses a hyphen correctly?", "She was a well-known author.", ["She was a well known-author.", "She was a-well known author.", "She was a well-known-author."], "A hyphen joins 'well' and 'known' as one describing word."),
    ("Which is punctuated correctly?", "“I’m tired,” said Ali, “so I’m going to bed.”", ["“I’m tired” said Ali “so I’m going to bed.”", "“I’m tired,” said Ali, so “I’m going to bed.”", "“I’m tired, said Ali, so I’m going to bed.”"], "Speech marks surround only the spoken words."),
]
IDIOMS = [("It’s raining cats and dogs.", "It is raining very heavily.", ["Animals are falling from the sky.", "It is raining lightly.", "It has just stopped raining."]),
          ("She let the cat out of the bag.", "She revealed a secret.", ["She freed a pet.", "She made a mistake.", "She lost something."]),
          ("He’s under the weather.", "He feels unwell.", ["He is outside in the rain.", "He is very happy.", "He is late."]),
          ("They were over the moon.", "They were delighted.", ["They went to space.", "They were angry.", "They were confused."]),
          ("Break a leg!", "Good luck!", ["Be careful!", "Run fast!", "Get well soon!"]),
          ("It was a piece of cake.", "It was very easy.", ["It was delicious.", "It was a small task.", "It was very hard."]),
          ("He bit off more than he could chew.", "He took on too much.", ["He ate too fast.", "He was very hungry.", "He chewed loudly."]),
          ("She was as cool as a cucumber.", "She stayed calm.", ["She felt cold.", "She was shy.", "She was healthy."]),
          ("Don’t judge a book by its cover.", "Don’t judge by appearances.", ["Read every book.", "Look after your books.", "Choose a good cover."]),
          ("We’re in the same boat.", "We share the same situation.", ["We are sailing.", "We are lost.", "We are related."]),
          ("He spilled the beans.", "He gave away a secret.", ["He made a mess.", "He cooked dinner.", "He told a lie."]),
          ("The ball is in your court.", "It is your turn to act.", ["You are playing tennis.", "You have lost.", "You must wait."]),
          ("She’s burning the midnight oil.", "She is working late.", ["She is lighting a lamp.", "She is cooking.", "She cannot sleep."]),
          ("Once in a blue moon.", "Very rarely.", ["Every month.", "At night.", "Very often."])]
FIGURES = [("The wind whispered through the trees.", "personification", ["simile", "alliteration", "onomatopoeia"], "The wind is given the human action of whispering."),
           ("Her smile was as bright as the sun.", "simile", ["metaphor", "personification", "hyperbole"], "It compares two things using 'as … as'."),
           ("The classroom was a zoo.", "metaphor", ["simile", "alliteration", "onomatopoeia"], "It says one thing IS another without using 'like' or 'as'."),
           ("Peter Piper picked a peck of pickled peppers.", "alliteration", ["simile", "metaphor", "hyperbole"], "The 'p' sound is repeated at the start of words."),
           ("The bees buzzed and the door slammed.", "onomatopoeia", ["simile", "metaphor", "irony"], "'Buzzed' and 'slammed' imitate sounds."),
           ("I’ve told you a million times!", "hyperbole", ["simile", "metaphor", "alliteration"], "It is an exaggeration for effect."),
           ("He ran like the wind.", "simile", ["metaphor", "personification", "onomatopoeia"], "It uses 'like' to compare."),
           ("The stars danced in the night sky.", "personification", ["simile", "hyperbole", "alliteration"], "Stars cannot dance; the action is human."),
           ("Time is a thief.", "metaphor", ["simile", "alliteration", "hyperbole"], "Time is described as being a thief."),
           ("Sally sold seashells by the seashore.", "alliteration", ["onomatopoeia", "simile", "hyperbole"], "The 's' sound repeats."),
           ("I’m so hungry I could eat a horse.", "hyperbole", ["simile", "metaphor", "personification"], "It is an obvious exaggeration."),
           ("The fire crackled and hissed.", "onomatopoeia", ["personification", "simile", "metaphor"], "The words sound like what they describe.")]
AFFIX = [("Which prefix makes the opposite of “possible”?", "im-", ["un-", "dis-", "non-"], "impossible"), ("Which prefix makes the opposite of “appear”?", "dis-", ["un-", "im-", "mis-"], "disappear"),
         ("Which prefix makes the opposite of “legal”?", "il-", ["un-", "im-", "in-"], "illegal"), ("Which prefix makes the opposite of “regular”?", "ir-", ["un-", "il-", "im-"], "irregular"),
         ("Which prefix means “again”, as in ___write?", "re-", ["pre-", "un-", "mis-"], "rewrite"), ("Which prefix means “before”, as in ___view?", "pre-", ["re-", "sub-", "dis-"], "preview"),
         ("Which suffix turns “care” into a word meaning “without care”?", "-less", ["-ful", "-ness", "-ly"], "careless"), ("Which suffix turns “hope” into a word meaning “full of hope”?", "-ful", ["-less", "-ly", "-ment"], "hopeful"),
         ("Which prefix means “under”, as in ___marine?", "sub-", ["super-", "inter-", "trans-"], "submarine"), ("Which prefix means “across”, as in ___port?", "trans-", ["sub-", "anti-", "semi-"], "transport"),
         ("Which prefix means “against”, as in ___clockwise?", "anti-", ["semi-", "sub-", "pre-"], "anticlockwise"), ("Which prefix means “half”, as in ___circle?", "semi-", ["anti-", "auto-", "inter-"], "semicircle")]
COLLECTIVE = [("wolves", "pack", ["herd", "flock", "swarm"]), ("bees", "swarm", ["pack", "herd", "pride"]), ("lions", "pride", ["pack", "gaggle", "flock"]),
              ("geese", "gaggle", ["pride", "herd", "school"]), ("fish", "shoal", ["flock", "herd", "gaggle"]), ("cattle", "herd", ["pack", "swarm", "pride"]),
              ("sheep", "flock", ["pack", "shoal", "swarm"]), ("crows", "murder", ["pride", "herd", "shoal"]), ("stars", "constellation", ["herd", "pack", "swarm"]),
              ("puppies", "litter", ["pack", "pride", "school"])]
CLOZE = [("The explorers were ___ after walking for twelve hours without rest.", "exhausted", ["energetic", "jubilant", "reckless"]),
         ("The teacher’s ___ instructions meant nobody was confused.", "precise", ["vague", "careless", "noisy"]),
         ("The knight showed great ___ when he faced the dragon.", "courage", ["fear", "anger", "shame"]),
         ("It was ___ that the storm would pass, as the sky was clearing.", "likely", ["impossible", "doubtful", "unwise"]),
         ("The old bridge was too ___ to carry heavy lorries.", "fragile", ["strong", "modern", "wide"]),
         ("She spoke in a ___ voice so as not to wake the baby.", "hushed", ["booming", "shrill", "harsh"]),
         ("The scientist made a ___ discovery that changed medicine forever.", "remarkable", ["ordinary", "dull", "minor"]),
         ("He was ___ to admit he had made a mistake, so he stayed silent.", "reluctant", ["eager", "delighted", "keen"]),
         ("The cheetah is the ___ land animal on Earth.", "fastest", ["faster", "more fast", "most fastest"]),
         ("The audience was ___ by the magician’s amazing trick.", "astonished", ["bored", "annoyed", "sleepy"])]

PASSAGES = [
    ("Maya had wanted to climb the lighthouse steps ever since she arrived on the island. On the morning of her tenth birthday, her grandfather handed her a heavy iron key. “It’s time,” he said, smiling. There were 112 steps, and by the fiftieth her legs ached, but the thought of the view kept her going. At the top, the whole bay glittered beneath her.",
     [("How old was Maya on the day she climbed the lighthouse?", "Ten", ["Twelve", "Eleven", "Nine"], "The passage says it was her tenth birthday."),
      ("Which word best describes how Maya felt as she climbed?", "determined", ["bored", "frightened", "angry"], "Her legs ached but she kept going."),
      ("Who gave Maya the key?", "Her grandfather", ["Her father", "A stranger", "The lighthouse keeper"], "Her grandfather handed her the key."),
      ("What does “glittered” suggest about the bay?", "It sparkled in the light", ["It was dark", "It was noisy", "It was empty"], "Glittered means to shine with tiny flashes of light.")]),
    ("The Amazon rainforest is home to around ten per cent of all known species on Earth. Its trees release huge amounts of water vapour into the air, which helps to create rainfall far beyond the forest itself. Sadly, large areas are cleared every year for farming and timber, threatening both wildlife and the climate.",
     [("According to the passage, roughly what fraction of known species live in the Amazon?", "One tenth", ["One half", "One quarter", "One hundredth"], "Ten per cent is one tenth."),
      ("What do the forest’s trees release into the air?", "Water vapour", ["Smoke", "Dust", "Seeds"], "The passage says they release water vapour."),
      ("Why is clearing the forest described as a threat?", "It endangers wildlife and the climate", ["It creates too much rain", "It helps farming", "It makes the trees taller"], "The last sentence says it threatens wildlife and the climate.")]),
    ("Tom’s football boots had been passed down from his cousin, and the left sole flapped whenever he ran. He never complained. At the trial match, though, the coach frowned at the boots and then at Tom. “Can you play in those?” Tom nodded. Twenty minutes later he scored the winning goal, and the coach was smiling.",
     [("What was wrong with Tom’s boots?", "The left sole flapped", ["They were too small", "They were muddy", "They were brand new"], "The passage says the left sole flapped."),
      ("How did the coach feel at first?", "Doubtful", ["Delighted", "Bored", "Angry"], "He frowned at the boots and asked if Tom could play."),
      ("What can we infer about Tom?", "He was skilful and uncomplaining", ["He was lazy", "He disliked football", "He was rude"], "He never complained and scored the winning goal.")]),
    ("The Victorian era saw enormous changes in Britain. Factories sprang up in cities, railways linked towns that had once taken days to reach, and the population grew rapidly. Many families moved from the countryside to find work, but living conditions in crowded cities were often poor and unhealthy.",
     [("What linked towns together during this period?", "Railways", ["Canals only", "Airships", "Tunnels"], "The passage says railways linked towns."),
      ("Why did many families move to the cities?", "To find work", ["To escape factories", "To live in the countryside", "To travel"], "It says they moved to find work."),
      ("What does “rapidly” mean in this passage?", "Quickly", ["Slowly", "Badly", "Secretly"], "Rapidly means very fast.")]),
    ("The little robot rolled across the workshop floor, its single blue eye scanning for oil spills. It had been built to clean, but it dreamed of painting. One night, while Dr. Okafor slept, it dipped a brush in a pot of yellow paint and drew a sun on the wall. The next morning, the scientist stared at the picture and, instead of scolding, began to laugh.",
     [("What was the robot built to do?", "Clean", ["Paint", "Cook", "Teach"], "It was built to clean."),
      ("What did the robot paint?", "A sun", ["A moon", "A tree", "A face"], "It drew a sun on the wall."),
      ("How did Dr. Okafor react?", "He laughed", ["He shouted", "He cried", "He ignored it"], "Instead of scolding, he began to laugh.")]),
]


def _simple(r, prompt, correct, distractors, expl):
    return mk(r, prompt, correct, distractors, expl)


def build(seen):
    r = rng("english")
    out = []
    for w, c, ds in SYNONYMS:
        out.append(mk(r, f"Which word is closest in meaning to “{w}”?", c.capitalize() if False else c, ds, f"{w.capitalize()} means {c}."))
    for w, c, ds in ANTONYMS:
        out.append(mk(r, f"Which word is opposite in meaning to “{w}”?", c, ds, f"The opposite of {w} is {c}."))
    for s, c, ds, e in HOMOPHONES:
        out.append(mk(r, f"Choose the word that fills the gap: “{s}”", c, ds, e))
    for w, ds in SPELLING:
        out.append(mk(r, "Which is the correct spelling?", w, ds, f"The correct spelling is “{w}”."))
    for s, p, ds in PLURALS:
        out.append(mk(r, f"What is the plural of “{s}”?", p, ds, f"The plural of {s} is {p}."))
    kinds = ["noun", "verb", "adjective", "adverb", "preposition", "conjunction", "interjection"]
    for sent, word, kind, e in POS:
        out.append(mk(r, f"What type of word is “{word}” in: “{sent}”", kind, [k for k in kinds if k != kind][:6][:3] if False else r.sample([k for k in kinds if k != kind], 3), e))
    for q, c, ds, e in GRAMMAR + PUNCT:
        out.append(mk(r, q, c, ds, e))
    for idiom, c, ds in IDIOMS:
        out.append(mk(r, f"What does the phrase “{idiom.rstrip('.!')}” mean?", c, ds, f"It is an idiom meaning: {c.lower()}"))
    for sent, c, ds, e in FIGURES:
        out.append(mk(r, f"Which technique is used in: “{sent}”", c, ds, e))
    for q, c, ds, word in AFFIX:
        out.append(mk(r, q, c, ds, f"{c} makes the word “{word}”."))
    for animals, c, ds in COLLECTIVE:
        out.append(mk(r, f"What is the collective noun for {animals}? A ___ of {animals}.", c, ds, f"A group of {animals} is called a {c}."))
    for s, c, ds in CLOZE:
        out.append(mk(r, f"Choose the best word to fill the gap: “{s}”", c, ds, f"“{c}” fits the meaning of the sentence best."))
    for text, qs in PASSAGES:
        for q, c, ds, e in qs:
            out.append(mk(r, f"<em class=\"passage\">{text}</em><br><br>{q}", c, ds, e))
    out = [q for q in out if q]
    for q in out:
        seen.add(q[0])
    return out
