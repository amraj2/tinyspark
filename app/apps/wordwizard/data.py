"""Word Wizard vocabulary: (word, meaning, example sentence) per level."""

LEVEL_NAMES = {1: "Apprentice", 2: "Wizard", 3: "Archmage"}

_RAW = {
    1: [
        ("curious", "wanting to find out about things", "The curious kitten peeked inside the box."),
        ("gentle", "soft and kind, not rough", "Be gentle when you stroke the baby rabbit."),
        ("enormous", "extremely big", "An enormous elephant walked slowly past the school."),
        ("whisper", "to speak very quietly", "We had to whisper in the library."),
        ("brave", "ready to face danger or fear", "The brave knight climbed the dark tower."),
        ("sparkle", "to shine with tiny flashes of light", "The frosty grass seemed to sparkle in the sun."),
        ("giggle", "to laugh in a silly, quiet way", "The jokes made the whole class giggle."),
        ("tumble", "to fall over and roll", "The puppy took a tumble down the hill."),
        ("cozy", "warm, comfortable and safe", "We curled up in the cozy armchair."),
        ("grumpy", "in a bad mood", "My brother is grumpy before breakfast."),
        ("explore", "to travel around a place to find out about it", "Let's explore the old castle."),
        ("treasure", "a collection of valuable things", "The pirates buried their treasure on the island."),
        ("wobble", "to shake or move unsteadily", "The jelly began to wobble on the plate."),
        ("marvellous", "wonderful and amazing", "We had a marvellous day at the seaside."),
        ("scurry", "to run quickly with small steps", "The mice scurry across the floor at night."),
        ("glimpse", "a quick look at something", "I caught a glimpse of a fox in the garden."),
        ("delighted", "very happy and pleased", "She was delighted with her birthday present."),
        ("shiver", "to shake a little because of cold or fear", "I began to shiver in the cold wind."),
    ],
    2: [
        ("peculiar", "strange or unusual", "There was a peculiar smell coming from the cupboard."),
        ("reluctant", "not wanting to do something", "He was reluctant to jump into the cold pool."),
        ("ancient", "very, very old", "The ancient temple was thousands of years old."),
        ("fragile", "easily broken or damaged", "Be careful, the glass is fragile."),
        ("bewildered", "confused and puzzled", "The bewildered tourist looked at the map."),
        ("dazzling", "so bright it is hard to look at", "The dazzling sunlight made us squint."),
        ("generous", "happy to give and share", "My generous aunt shared her sweets with everyone."),
        ("cautious", "careful to avoid danger", "Be cautious when you cross the busy road."),
        ("ferocious", "fierce and very angry or wild", "The ferocious lion roared at the crowd."),
        ("enthusiastic", "full of excited interest", "The enthusiastic fans cheered loudly."),
        ("mischievous", "playfully naughty", "The mischievous monkey stole my hat."),
        ("exhausted", "very, very tired", "We were exhausted after the long hike."),
        ("magnificent", "very grand and beautiful", "The magnificent palace had golden gates."),
        ("bustling", "full of busy activity", "The bustling market was full of shoppers."),
        ("abandoned", "left alone and not looked after", "They found an abandoned house in the woods."),
        ("hesitate", "to pause because you are not sure", "Don't hesitate to ask if you need help."),
        ("miserable", "very unhappy", "The rainy holiday made everyone miserable."),
        ("triumphant", "feeling proud after winning or succeeding", "The triumphant team lifted the trophy."),
    ],
    3: [
        ("melancholy", "a deep, quiet sadness", "A feeling of melancholy came over her as the summer ended."),
        ("meticulous", "very careful about every small detail", "The artist was meticulous about every brushstroke."),
        ("resilient", "able to recover quickly from difficulty", "Resilient children try again after they fail."),
        ("benevolent", "kind and wanting to help others", "The benevolent king gave food to the poor."),
        ("ominous", "suggesting that something bad will happen", "Ominous black clouds gathered over the hills."),
        ("ambiguous", "having more than one possible meaning", "The ambiguous sign confused the drivers."),
        ("eloquent", "able to speak clearly and beautifully", "The eloquent speaker moved the audience."),
        ("tenacious", "not giving up, even when it is hard", "The tenacious climber kept going to the summit."),
        ("serene", "calm, peaceful and quiet", "The lake was serene in the early morning."),
        ("ostentatious", "showy in order to impress people", "He wore an ostentatious gold jacket to the party."),
        ("nostalgic", "feeling a warm longing for the past", "Old photographs made her feel nostalgic."),
        ("cunning", "clever at getting what you want, often by tricks", "The cunning fox tricked the farmer."),
        ("perplexed", "completely puzzled and confused", "The perplexed detective scratched his head."),
        ("nonchalant", "calm and not worried or excited", "She gave a nonchalant shrug and walked away."),
        ("ephemeral", "lasting for only a very short time", "Rainbows are beautiful but ephemeral."),
        ("formidable", "causing fear or respect because of great strength", "The champion was a formidable opponent."),
        ("jubilant", "feeling or showing great joy", "The jubilant crowd waved flags in the street."),
        ("luminous", "giving out or reflecting light", "The luminous moon lit up the garden."),
    ],
}


def word_bank() -> list[dict]:
    return [
        {"word": w, "meaning": m, "example": e, "level": level}
        for level, rows in _RAW.items()
        for (w, m, e) in rows
    ]
