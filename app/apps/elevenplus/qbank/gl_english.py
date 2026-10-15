"""GL-style English: original passages and questions modelled on the question *types* in GL Assessment
11+ papers (comprehension, words and phrases in context, choosing the right word, spelling, punctuation
and grammar). All passages and sentences are newly written; nothing is copied from a published paper.

Data format: every item ends up as ``[prompt, four options, correct index, explanation]``.
"""

import re

from .common import mk, rng

# ---------------------------------------------------------------- comprehension passages
# (passage html, [(question, correct, [3 wrong], explanation)])
PASSAGES = [
    ("Every evening, as the sun sank into the grey sea, Old Mr Penrose climbed the two hundred steps of the lighthouse with his ginger cat, Marmalade, trotting behind him. "
     "The wind howled around the tower and the waves crashed on the rocks below, but inside the lamp room it was warm and still. Mr Penrose polished the great glass lens until it gleamed like a diamond. "
     "Marmalade curled up on the windowsill, her eyes fixed on the horizon. She never slept until the first ship had passed safely by.",
     [("How many steps did Mr Penrose climb each evening?", "two hundred", ["twenty", "one hundred", "two thousand"], "The passage says he climbed “the two hundred steps”."),
      ("Which technique is used in “gleamed like a diamond”?", "simile", ["metaphor", "alliteration", "personification"], "It compares the lens to a diamond using the word “like”, which is a simile."),
      ("How is the lamp room different from the outside?", "It is calm and cosy while the weather is wild.", ["It is cold and dark while the weather is calm.", "It is noisy while the outside is quiet.", "It is empty while the outside is crowded."], "Outside the wind howls and waves crash, but inside it is “warm and still”."),
      ("What can we tell about Marmalade from the last sentence?", "She is watchful and takes her job seriously.", ["She is frightened of the sea.", "She dislikes the lighthouse.", "She is too old to climb stairs."], "She stays awake until the first ship has safely passed, so she is watchful and loyal.")]),
    ("Honey bees live in large family groups called colonies. In a single hive there may be as many as fifty thousand bees, but there is only one queen. Her job is to lay eggs, sometimes over a thousand in a day. "
     "The worker bees, all of them female, do everything else: they clean the hive, feed the young, guard the entrance and fly out to collect nectar from flowers. "
     "When a worker finds a good patch of flowers, she returns and performs a special “waggle dance” to tell the others exactly where to go.",
     [("What is the queen bee’s main job?", "to lay eggs", ["to collect nectar", "to guard the entrance", "to clean the hive"], "The passage says her job is to lay eggs."),
      ("Which of these is NOT a job of the worker bees?", "laying eggs", ["guarding the entrance", "cleaning the hive", "collecting nectar"], "Only the queen lays eggs; the workers clean, feed, guard and collect nectar."),
      ("In the passage, what does the word “colonies” mean?", "groups of bees living together", ["places where flowers grow", "rows of hives", "different kinds of honey"], "“Family groups called colonies” tells us a colony is a group of bees living together."),
      ("Why does a worker bee do the waggle dance?", "to show the others where the flowers are", ["to warn the queen of danger", "to keep the hive warm", "to choose a new queen"], "The dance tells the others “exactly where to go”.")]),
    ("The market square was alive with colour and noise. Traders shouted over one another, each praising their goods: glossy red apples, silvery fish still glistening from the sea, and rolls of fabric in every shade imaginable. "
     "The smell of roasting chestnuts drifted between the stalls, making Anil’s stomach rumble. He clutched his coins tightly in his fist. He had only enough for one treat and, after a long walk through the crowd, he still could not decide.",
     [("What made Anil’s stomach rumble?", "the smell of roasting chestnuts", ["the shouting of the traders", "the sight of the red apples", "the fish from the sea"], "The chestnut smell drifted between the stalls, “making Anil’s stomach rumble”."),
      ("Which word could replace “glistening” in the passage?", "shining", ["freezing", "rotting", "escaping"], "Fish that are glistening are shining and wet."),
      ("Why did Anil hold his coins so tightly?", "He had little money and did not want to lose it.", ["He wanted to give them to a trader.", "He was angry with the traders.", "He had stolen them."], "He only had enough for one treat, so he guarded his coins."),
      ("What is Anil’s problem at the end of the passage?", "He cannot decide what to buy.", ["He has lost his money.", "He cannot find the market.", "He is too tired to walk."], "The last line says he “still could not decide”.")]),
    ("High on the crags of Mount Cinder, Ember the dragon paced back and forth, groaning miserably. Her jaw was swollen and every breath sent a wisp of smoke shuddering out of her nostrils. "
     "“It is no use,” she muttered. “I shall have to visit the village dentist.” The villagers, however, had heard her groans echoing down the valley and were hiding in their cellars, quite certain that she was hungry and coming to find them.",
     [("Why was Ember unhappy?", "She had toothache.", ["She was lost.", "She was hungry.", "She was locked in a cellar."], "Her jaw was swollen and she planned to visit the dentist."),
      ("Why were the villagers hiding?", "They thought the dragon was hungry and coming for them.", ["They wanted to surprise the dragon.", "They were afraid of the dentist.", "They were hiding from the smoke."], "They believed she was “hungry and coming to find them”."),
      ("What does “groaning miserably” suggest about Ember?", "She was in pain and unhappy.", ["She was angry with the villagers.", "She was very sleepy.", "She was practising a song."], "Groaning shows pain, and “miserably” shows unhappiness."),
      ("Which word best describes the tone of the passage?", "humorous", ["frightening", "factual", "sorrowful"], "A dragon with toothache and villagers who misunderstand her makes the passage funny.")]),
    ("Saturday. I could hardly breathe as I stepped up to the starting line. My legs felt like jelly, and the track seemed to stretch on forever. Mia, the fastest girl in Year 6, was standing in the lane beside mine and gave me a small smile. "
     "“Good luck,” she whispered. The whistle shrilled. I threw myself forward and, to my astonishment, I was neck and neck with her at the halfway mark. I didn’t win, but I crossed the line in second place and I have never felt so proud.",
     [("How did the writer feel before the race?", "nervous", ["bored", "confident", "angry"], "They could hardly breathe and their legs felt like jelly, which shows nerves."),
      ("What does “my legs felt like jelly” mean?", "They felt weak and wobbly.", ["They felt cold and sticky.", "They felt very strong.", "They were covered in food."], "Jelly wobbles, so the phrase means the legs felt shaky."),
      ("What does “neck and neck” mean in this passage?", "very close together", ["far apart", "wearing the same clothes", "holding hands"], "Being neck and neck means running level with someone."),
      ("Why does the writer feel proud at the end?", "They finished second against a very fast runner.", ["They won the race.", "Mia let them win.", "The whistle was loud."], "They did not win but came second, close behind the fastest girl in Year 6.")]),
    ("A volcano is an opening in the Earth’s crust through which hot melted rock, called magma, can escape. Deep underground, magma collects in a huge chamber. "
     "When the pressure becomes too great, it forces its way upwards through cracks and bursts out as lava, ash and gas. Some volcanoes erupt with a mighty explosion, while others release lava slowly and steadily. "
     "Although eruptions can be dangerous, the ash they produce eventually breaks down to form very fertile soil, which is why many farmers live close to volcanoes.",
     [("What is magma?", "hot melted rock underground", ["ash in the air", "a type of soil", "gas from a chamber"], "The passage says magma is the hot melted rock that can escape."),
      ("Why do many farmers live near volcanoes?", "The ash makes the soil good for growing crops.", ["Volcanoes keep the land warm.", "Volcanoes never erupt.", "Lava is used to water the fields."], "Ash breaks down to form fertile soil."),
      ("Which word is closest in meaning to “fertile”?", "productive", ["dusty", "ancient", "dangerous"], "Fertile soil is rich and productive: crops grow well in it."),
      ("What makes a volcano erupt?", "Pressure builds up until the magma forces its way out.", ["Farmers dig too deep.", "The ash becomes too heavy.", "The Earth’s crust becomes cold."], "“When the pressure becomes too great, it forces its way upwards.”")]),
    ("<i>The wind is a thief in the night,<br>It tugs at the trees with cold fingers,<br>Snatches the hats from our heads<br>And whistles as it slips away.</i>",
     [("Which technique is used in “The wind is a thief in the night”?", "metaphor", ["simile", "alliteration", "onomatopoeia"], "It says the wind IS a thief, without using “like” or “as”, so it is a metaphor."),
      ("What does “snatches” suggest about how the wind takes the hats?", "suddenly and roughly", ["slowly and gently", "politely", "by accident only"], "Snatching is quick and rough, like a thief."),
      ("What does “cold fingers” give the wind?", "human qualities", ["a loud voice", "a warm feeling", "a bright colour"], "Giving the wind fingers is personification: it makes it seem human."),
      ("What does “slips away” suggest?", "The wind leaves quietly and quickly.", ["The wind falls over.", "The wind grows stronger.", "The wind stays for the whole night."], "Slipping away means leaving smoothly and without being noticed.")]),
    ("Our beautiful river is in danger! Every year, hundreds of plastic bottles and bags are dropped along its banks, harming the ducks, fish and otters that live there. This Saturday, we are asking everyone in the village to lend a hand. "
     "Meet at the old stone bridge at ten o’clock. Gloves and bags will be provided, and there will be free hot chocolate for all our volunteers. Together, we can make a real difference!",
     [("What is the main purpose of this text?", "to persuade people to help clean the river", ["to describe how otters live", "to explain how plastic is made", "to tell a story about a bridge"], "It asks everyone to “lend a hand”, so it is trying to persuade readers."),
      ("Which of these will NOT be provided?", "boots", ["gloves", "bags", "hot chocolate"], "The text lists gloves, bags and hot chocolate only."),
      ("Which word is closest in meaning to “volunteers”?", "helpers", ["visitors", "workers who are paid", "strangers"], "Volunteers offer to help without being paid."),
      ("Why does the writer end with “Together, we can make a real difference!”?", "to make readers feel that their help matters", ["to warn readers about danger", "to give directions to the bridge", "to explain what plastic does"], "It is an encouraging closing line that persuades.")]),
]

# ---------------------------------------------------------------- short "in context" items (question, correct, wrong x3, explanation)
CONTEXT = [
    ("“Priya slammed the door and stomped up the stairs without a word.” How is Priya most likely feeling?", "angry", ["delighted", "sleepy", "curious"], "Slamming and stomping show anger."),
    ("“The old bridge groaned under the weight of the lorry.” Which technique is used?", "personification", ["simile", "alliteration", "exaggeration"], "A bridge cannot really groan, so it is given a human action."),
    ("“Tom’s cheeks burned as everyone turned to look at him.” How does Tom feel?", "embarrassed", ["proud", "bored", "hungry"], "Burning cheeks and being stared at show embarrassment."),
    ("“The teacher’s voice was as sharp as a knife.” What does this tell us about the teacher’s voice?", "It was harsh and stern.", ["It was quiet and shy.", "It was warm and kind.", "It was very slow."], "A sharp voice is a harsh, stern one; this is a simile."),
    ("“Despite the drizzle, the crowd stayed to cheer the runners.” What does “despite” show?", "The rain did not stop the crowd from staying.", ["The rain caused the crowd to leave.", "The crowd did not like the runners.", "The rain began after the race."], "“Despite” shows something happened even though there was a difficulty."),
    ("“The little boy clung to his mother’s hand and peered nervously at the huge dog.” How does the boy feel?", "frightened", ["sleepy", "greedy", "cheerful"], "Clinging and peering nervously show he is scared."),
    ("“Ella’s eyes sparkled as she unwrapped the parcel.” What does this suggest?", "She was excited.", ["She was cross.", "She was sleepy.", "She was confused."], "Sparkling eyes show excitement."),
    ("“It was so cold that the puddles had turned to glass.” What does “turned to glass” mean?", "The puddles had frozen.", ["The puddles were made of windows.", "The puddles had disappeared.", "The puddles had been cleaned."], "It is a metaphor: frozen puddles look like glass."),
    ("“‘I’m not sure that’s wise,’ said Gran, raising one eyebrow.” What does Gran think?", "She doubts the idea is a good one.", ["She loves the idea.", "She did not hear the idea.", "She wants to leave."], "Raised eyebrows and “not sure that’s wise” show doubt."),
    ("“The hikers were exhausted after the arduous climb.” What does “arduous” mean?", "difficult and tiring", ["short and pleasant", "quiet and calm", "cold and wet"], "Exhausted hikers had a difficult, tiring climb."),
    ("“The detective examined the room meticulously, checking every drawer.” What does “meticulously” mean?", "very carefully", ["very quickly", "very noisily", "very sadly"], "Checking every drawer shows great care."),
    ("“The queen’s speech was brief, lasting just two minutes.” What does “brief” mean?", "short", ["boring", "loud", "important"], "Two minutes is short."),
    ("“The shop was deserted; not a single customer was inside.” What does “deserted” mean?", "empty", ["untidy", "closed", "expensive"], "No customers means the shop was empty."),
    ("“He was reluctant to jump into the freezing lake.” What does “reluctant” mean?", "unwilling", ["eager", "able", "forced"], "Someone reluctant does not want to do something."),
    ("“The path was treacherous after the ice storm.” What does “treacherous” mean?", "dangerous", ["pleasant", "narrow", "unusual"], "Ice makes a path dangerous."),
    ("“Her generous gift surprised everyone.” What does “generous” mean?", "giving freely", ["very small", "expensive-looking", "carefully wrapped"], "A generous person gives a lot without holding back."),
    ("“The audience was captivated by the magician.” What does “captivated” mean?", "completely fascinated", ["frightened", "annoyed", "sleepy"], "Captivated means their attention was held."),
    ("“The soldier’s courage was unwavering.” What does “unwavering” mean?", "steady and never changing", ["weak and fading", "loud and boastful", "new and untested"], "Unwavering means it did not shake or change."),
    ("“The chef prepared a lavish feast.” What does “lavish” mean?", "very generous and luxurious", ["small and plain", "cold and old", "quick and simple"], "A lavish feast is rich and plentiful."),
    ("“The children were oblivious to the storm brewing outside.” What does “oblivious” mean?", "unaware", ["afraid", "excited", "careful"], "They did not notice the storm."),
    ("“The stew simmered gently on the stove.” Which word tells us how the stew cooked?", "gently", ["stew", "stove", "simmered"], "“Gently” is an adverb that says how the stew simmered."),
    ("“The rain hammered on the tin roof.” Which word makes the sound of the rain clear?", "hammered", ["rain", "tin", "roof"], "“Hammered” suggests a loud, repeated banging sound."),
]

# ---------------------------------------------------------------- choosing the right word (sentence, correct, wrong x3, explanation)
CLOZE = [
    ("The match went ahead ____ the heavy rain.", "despite", ["because", "unless", "whereas"], "“Despite” means “even though there was”."),
    ("Tara wanted to go to the party, ____ she had too much homework.", "but", ["so", "because", "or"], "“But” joins two ideas that go against each other."),
    ("We must leave now ____ we will miss the train.", "or", ["and", "so", "although"], "“Or” shows what will happen if we do not leave."),
    ("He spoke so ____ that nobody could hear him.", "quietly", ["quiet", "quieter", "quietness"], "An adverb (quietly) describes how he spoke."),
    ("Neither of the boys ____ ready.", "was", ["were", "are", "been"], "“Neither” is singular, so it takes “was”."),
    ("The team celebrated ____ victory.", "their", ["there", "they’re", "thier"], "“Their” shows that the victory belongs to the team."),
    ("____ going to be late if you don’t hurry.", "You’re", ["Your", "Youre", "Yore"], "“You’re” is short for “you are”."),
    ("The cat licked ____ paws.", "its", ["it’s", "its’", "their"], "“Its” (no apostrophe) shows belonging."),
    ("She has lived here ____ 2019.", "since", ["for", "during", "while"], "“Since” is used with a starting point in time."),
    ("There are ____ cars on the road today than yesterday.", "fewer", ["less", "least", "little"], "Cars can be counted, so we use “fewer”."),
    ("He ran ____ than his brother.", "faster", ["fastest", "more fast", "fast"], "We compare two people with “faster”."),
    ("The dog ____ the bone in the garden yesterday.", "buried", ["bury", "burying", "buries"], "“Yesterday” needs the past tense: buried."),
    ("By the time we arrived, the film ____.", "had already started", ["has already started", "already starts", "already starting"], "The film started before we arrived, so we need the past perfect."),
    ("The explorers set off at dawn, ____ to reach the summit before nightfall.", "determined", ["reluctant", "careless", "unable"], "Setting off early shows they were determined."),
    ("The shy child spoke in a ____ voice.", "timid", ["booming", "furious", "cheerful"], "A shy child would speak in a timid voice."),
    ("The garden was ____ with colourful flowers.", "bursting", ["hiding", "melting", "reading"], "“Bursting with” means completely full of."),
]

# ---------------------------------------------------------------- spelling (sentence with one misspelt word, wrong, right)
SPELLING = [
    ("She felt embarassed when she tripped in front of the class.", "embarassed", "embarrassed"),
    ("It was a beautifull sunny morning.", "beautifull", "beautiful"),
    ("The librery is closed on Sundays.", "librery", "library"),
    ("We had a wonderful time at the seeside.", "seeside", "seaside"),
    ("The scientist made an important discovary.", "discovary", "discovery"),
    ("Please write your adress at the top of the page.", "adress", "address"),
    ("It was very sensable to wear a helmet.", "sensable", "sensible"),
    ("The pupils listened carefuly to the instructions.", "carefuly", "carefully"),
    ("There was an enormus crowd outside the stadium.", "enormus", "enormous"),
    ("The Romans built a strong fortres on the hill.", "fortres", "fortress"),
    ("The audience gave a thunderous aplause.", "aplause", "applause"),
    ("It is necesary to wear a coat today.", "necesary", "necessary"),
    ("He recieved a letter from his cousin.", "recieved", "received"),
    ("The temperture dropped sharply overnight.", "temperture", "temperature"),
    ("A dangerous sitution developed at the harbour.", "sitution", "situation"),
    ("The bakery sells delicous cakes.", "delicous", "delicious"),
    ("He is definately coming to the party.", "definately", "definitely"),
    ("The explorer crossed the desert with a camal.", "camal", "camel"),
    ("The museum has an interesting colection of coins.", "colection", "collection"),
    ("Everybody was suprised by the news.", "suprised", "surprised"),
]

# ---------------------------------------------------------------- punctuation: (prompt, correct, [wrong x3], explanation)
PUNCTUATION = [
    ("Which sentence is punctuated correctly?", "The children’s coats were hanging on the pegs.", ["The childrens’ coats were hanging on the pegs.", "The childrens coats were hanging on the pegs.", "The children coats’ were hanging on the pegs."], "“Children” is already plural, so the apostrophe goes before the s: children’s."),
    ("Which sentence is punctuated correctly?", "It’s a shame that the dog lost its collar.", ["Its a shame that the dog lost it’s collar.", "It’s a shame that the dog lost it’s collar.", "Its’ a shame that the dog lost its collar."], "“It’s” means “it is”; “its” shows belonging."),
    ("Which sentence is punctuated correctly?", "All of the girls’ bags were left in the hall.", ["All of the girl’s bags were left in the hall.", "All of the girls bag’s were left in the hall.", "All of the girls bags’ were left in the hall."], "The bags belong to several girls, so the apostrophe follows the s: girls’."),
    ("Which sentence is punctuated correctly?", "We bought apples, pears, plums and grapes.", ["We bought apples pears, plums and grapes.", "We bought, apples, pears plums and grapes.", "We bought apples, pears, plums, and, grapes."], "Items in a list are separated by commas, with “and” before the last item."),
    ("Which sentence is punctuated correctly?", "“Please close the window,” said Mum.", ["“Please close the window” said Mum.", "“Please close the window,” Said Mum.", "“Please close the window”, said Mum."], "The comma goes inside the speech marks, and “said” has no capital letter."),
    ("Which sentence is punctuated correctly?", "“Where are you going?” asked Dad.", ["“Where are you going,” asked Dad.", "“Where are you going?” Asked Dad.", "“Where are you going.” asked Dad."], "A question mark goes inside the speech marks, and “asked” stays lower case."),
    ("Which sentence is punctuated correctly?", "It was raining heavily; we decided to stay indoors.", ["It was raining heavily, we decided to stay indoors.", "It was raining heavily we decided to stay indoors.", "It was raining, heavily; we decided to stay indoors."], "Two full sentences joined together need a semicolon (or a full stop), not just a comma."),
    ("Which sentence is punctuated correctly?", "You will need three things: a pencil, a ruler and an eraser.", ["You will need three things; a pencil, a ruler and an eraser.", "You will need: three things a pencil, a ruler and an eraser.", "You will need three things, a pencil a ruler, and an eraser."], "A colon introduces a list after a complete clause."),
    ("Which sentence is punctuated correctly?", "My aunt, who lives in Leeds, is visiting us.", ["My aunt who lives in Leeds, is visiting us.", "My aunt, who lives in Leeds is visiting us.", "My, aunt who lives in Leeds, is visiting us."], "Extra information in the middle of a sentence is closed off by a pair of commas."),
    ("Which sentence is punctuated correctly?", "On Tuesday, Amir visited Cardiff with his cousin.", ["On tuesday, Amir visited cardiff with his cousin.", "On Tuesday Amir, visited Cardiff, with his cousin.", "on Tuesday, Amir visited Cardiff with his cousin."], "Days and places need capital letters, and the sentence starts with one."),
    ("Which sentence is punctuated correctly?", "Can you tell me where the station is?", ["Can you tell me where the station is.", "can you tell me where the station is?", "Can you tell me where the station is!"], "It asks a question, so it ends with a question mark and starts with a capital."),
    ("Which sentence is punctuated correctly?", "They’re going to the cinema, but we aren’t.", ["Their going to the cinema, but we aren’t.", "They’re going to the cinema, but we arent’.", "Theyre going to the cinema but we aren’t."], "“They’re” is “they are” and “aren’t” is “are not”; each needs an apostrophe."),
]

# ---------------------------------------------------------------- grammar: (prompt, correct, [wrong x3], explanation)
GRAMMAR = [
    ("Which sentence is grammatically correct?", "Neither of the answers is correct.", ["Neither of the answers are correct.", "Neither of the answers were correct.", "Neither of the answers be correct."], "“Neither” is singular, so it takes “is”."),
    ("Which sentence uses the past tense correctly?", "She ran to the shop and bought some milk.", ["She runned to the shop and bought some milk.", "She run to the shop and buyed some milk.", "She ran to the shop and buy some milk."], "The past tense of “run” is “ran” and of “buy” is “bought”."),
    ("Choose the correct word: The flock of birds ____ south every winter.", "flies", ["fly", "flying", "have flown"], "“Flock” is a single group, so the verb is singular: flies."),
    ("Which sentence is in the future tense?", "We will visit the museum tomorrow.", ["We visited the museum yesterday.", "We visit the museum every week.", "We have visited the museum twice."], "“Will visit” talks about something that has not happened yet."),
    ("Which sentence is in the passive voice?", "The window was broken by the ball.", ["The ball broke the window.", "Sam kicked the ball hard.", "The ball rolled into the road."], "In the passive voice the thing being acted on (the window) comes first."),
    ("Which word is the adverb in this sentence? “The snail moved slowly across the leaf.”", "slowly", ["snail", "moved", "leaf"], "“Slowly” tells us how the snail moved."),
    ("Which sentence contains a preposition of place?", "The book is under the bed.", ["The book is very old.", "She read the book quickly.", "The book fell and broke."], "“Under” shows where the book is."),
    ("Which sentence uses the correct pronoun?", "Zara and I went to the park.", ["Zara and me went to the park.", "Me and Zara went to the park.", "Zara and myself went the park."], "“I” is the subject: “Zara and I went…”."),
    ("Which sentence uses “were” correctly?", "If I were you, I would apologise.", ["If I was you, I would apologise.", "If I are you, I would apologise.", "If I be you, I would apologise."], "In a wish or imagined situation, we use “were”."),
    ("Which sentence has the correct verb ending?", "Everyone in the class enjoys reading.", ["Everyone in the class enjoy reading.", "Everyone in the class enjoying reading.", "Everyone in the class are enjoy reading."], "“Everyone” is singular, so the verb ends in s."),
]


def _spelling_items(r):
    out = []
    for sentence, wrong, right in SPELLING:
        words = re.findall(r"[A-Za-z]+", sentence)
        pool = [w for w in words if w != wrong and len(w) > 3]
        if len(pool) < 3:
            continue
        options = [wrong] + r.sample(pool, 3)
        r.shuffle(options)
        out.append([f"Which word in this sentence is spelt wrongly?<br><b>{sentence}</b>", options, options.index(wrong), f"“{wrong}” should be spelt “{right}”."])
    return out


def build(seen):
    r = rng("gl-english")
    out = []
    for text, qs in PASSAGES:
        for q, c, ds, e in qs:
            out.append(mk(r, f"<em class=\"passage\">{text}</em><br><br>{q}", c, ds, e))
    for q, c, ds, e in CONTEXT:
        out.append(mk(r, q, c, ds, e))
    for s, c, ds, e in CLOZE:
        out.append(mk(r, f"Choose the best word or phrase to fill the gap.<br><b>{s}</b>", c, ds, e))
    out += _spelling_items(r)
    for q, c, ds, e in PUNCTUATION + GRAMMAR:
        out.append(mk(r, q, c, ds, e))
    fresh = []
    for q in out:
        key = (q[0], tuple(sorted(q[1])))
        if q and key not in seen:
            seen.add(key)
            fresh.append(q)
    return fresh
