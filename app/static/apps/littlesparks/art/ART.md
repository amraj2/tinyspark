# Little Sparks: art guide

Every picture is an **art slot**. The games run with plain emoji today; drop
a PNG/WebP (transparent background unless noted) into **this folder** with
the exact file name and it replaces the emoji everywhere, no code changes.

## Style brief (paste first into ChatGPT)

> Warm, chunky, friendly picture-book style for 3 to 5 year olds. Thick soft
> outlines, bright saturated colours, big simple shapes, rounded corners,
> happy faces, nothing scary or detailed. Consistent style and lighting for
> every piece. Each object centred with a little padding, transparent
> background, 512x512 px unless noted.

## Object sprites (512x512, transparent)

| File | Looks like | File | Looks like |
| --- | --- | --- | --- |
| `ant.png` | cute ant | `strawberry.png` | strawberry |
| `ladybird.png` | ladybird | `cherries.png` | cherries |
| `bee.png` | bumble bee | `tomato.png` | tomato |
| `butterfly.png` | butterfly | `banana.png` | banana |
| `caterpillar.png` | green caterpillar | `lemon.png` | lemon |
| `snail.png` | snail | `sunflower.png` | sunflower |
| `leaf.png` | green leaf | `star.png` | yellow star |
| `flower.png` | daisy-like flower | `whale.png` | blue whale |
| `mushroom.png` | red toadstool | `cap.png` | blue baseball cap |
| `apple.png` | red apple | `drop.png` | blue water drop |
| `chick.png` | yellow chick | `blue-ball.png` | shiny blue ball |
| `cat.png` | cat | `green-apple.png` | green apple |
| `pumpkin.png` | pumpkin | `cucumber.png` | cucumber |
| `sheep.png` | woolly sheep | `frog.png` | frog |
| `cow.png` | cow | `broccoli.png` | broccoli |
| `tree.png` | round tree | `cookie.png` | chocolate-chip cookie |
| `house.png` | cosy house | `carrot.png` | carrot |
| `bread.png` | loaf of bread | `pig.png` | pig (face) |
| `rabbit.png` | rabbit (face) | `bear.png` | bear (face) |
| `dog.png` | dog (face) | `panda.png` | panda (face) |
| `train.png` | friendly steam engine, facing right | `station.png` | little station building |
| `barrier.png` | red-and-white dead-end barrier | `seed.png` | seed |
| `sprout.png` | tiny sprout | `leafy-plant.png` | leafy plant |

## Special sprites

| File | Size | Used for |
| --- | --- | --- |
| `roly-ball.png` | 512x512 | the rolling ball in Roly Poly (no face; the game draws one) |
| `net.png` | 256x256 | the butterfly net / catch ring in Bug Net |
| `plate.png` | 920x240 | plate in Little Diner |
| `food-<name>.png` | 256x256 | shelf food buttons: `food-apple`, `food-banana`, `food-strawberry`, `food-cookie`, `food-carrot`, `food-bread` |
| `bin-red.png` `bin-yellow.png` `bin-blue.png` `bin-green.png` | 380x340 | colour bins |
| `bin-circle.png` `bin-square.png` `bin-triangle.png` `bin-star.png` | 380x340 | shape bins (shape drawn on the bin) |
| `shape-circle.png` `shape-square.png` `shape-triangle.png` `shape-star.png` | 256x256 | falling shapes (any colour; the game does not tint them) |
| `pad-0.png` `pad-1.png` `pad-2.png` `pad-3.png` | 720x230 | Beat Pals pads (dog red, cat yellow, frog green, whale blue) |

## Backgrounds (opaque, 2000x1280, 25:16 landscape)

`bg-roly.png` (sunny meadow), `bg-bugs.png` (flower meadow, keep the top
130 px calm), `bg-sorter.png` (party room with a floor line at 70% height),
`bg-diner.png` (cheerful diner; counter around 50% height), `bg-choo.png`
(green countryside, soft, no tracks), `bg-beats.png` (stage with lights),
`bg-garden.png` (sky, sun, grass; pots sit at about 67% height).

## Menu art and stickers

| File | Size | What |
| --- | --- | --- |
| `game-roly.png` `game-bugs.png` `game-sorter.png` `game-diner.png` `game-choo.png` `game-beats.png` `game-garden.png` | 512x512 (square) | cover art: the game's **tile on the TinySpark main menu**, the picker tile and the "well done" card. Leave room for the title along the bottom; the menu shows no extra text on top of a cover image. |
| `sticker-<id>.png` | 512x512 | 28 stickers, ids below |

Sticker ids: `roly-ant roly-cow roly-house roly-lots bugs-one bugs-three
bugs-five bugs-ten sort-red sort-round sort-shapes sort-three diner-first
diner-five diner-ten diner-all choo-first choo-three choo-friends choo-all
beat-three beat-five beat-six beat-jam garden-first garden-four garden-all
garden-ten`. Make them look like shiny round stickers with a white border.

Tip: generate each group (animals, foods, backgrounds, stickers) in one
session so the style matches, then reload `/little-sparks/`.
