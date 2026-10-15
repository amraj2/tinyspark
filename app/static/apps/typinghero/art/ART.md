# Typing Hero: art guide

Drop image files into **this folder** with the exact names below and the game
picks them up on the next page load. Anything missing falls back to the
built-in drawing, so you can add art piece by piece. Use **PNG or WebP with a
transparent background** unless noted.

The game draws the **letters itself** on top of note art, so note and pad
images must be **blank** (no letters, no text).

## Style brief (paste this first into ChatGPT)

> Bright, bold, kid-friendly rock-concert style for a typing game for ages
> 7-11. Chunky outlines, saturated neon colours on a deep purple night-stage,
> playful not scary, no real brands or people. Flat/cartoon shading, soft glow.
> Everything must be readable at small sizes. Keep the lighting consistent
> across all pieces.

## Finger colours (must stay consistent; kids learn finger = colour)

| Finger        | Colour  | Hex       |
| ------------- | ------- | --------- |
| Pinky (both)  | Purple  | `#b197fc` |
| Ring (both)   | Blue    | `#4dabf7` |
| Middle (both) | Green   | `#69db7c` |
| Index (both)  | Yellow  | `#ffd43b` |
| Thumbs        | Pink    | `#ff8787` |

## Files

| File name | Size (px) | What it is | Prompt idea |
| --- | --- | --- | --- |
| `stage.png` | 1920x1080 (16:9), opaque | Whole-canvas backdrop behind the highway | "Rock concert stage at night seen from the audience, empty, purple and magenta spotlights, haze, subtle crowd silhouettes at the bottom, centre kept dark and uncluttered" |
| `highway.png` | 1920x880, opaque or semi-transparent | Texture clipped into the trapezoid note highway (9 vertical lanes) | "Top-down guitar-hero style note highway texture, dark glass road with 9 faint vertical lanes, subtle neon edge lines, no objects, seamless" |
| `logo.png` | 1200x240, transparent | Game logo shown in the header | "Logo text TYPING HERO, chunky retro rock lettering, hot pink and yellow, small lightning bolt, transparent background" |
| `hero.png` | 600x1200, transparent | Mascot shown beside the stage | "Friendly cartoon rock-star kid mascot with a keyboard-shaped guitar, full body, confident pose, bright colours" |
| `note-lp.png` | 256x256, transparent | Note tile: left pinky (purple) | "Rounded square game note tile, glossy purple #b197fc, thick dark outline, subtle highlight, completely blank" |
| `note-lr.png` | 256x256 | Note tile: left ring (blue) | same, blue `#4dabf7` |
| `note-lm.png` | 256x256 | Note tile: left middle (green) | same, green `#69db7c` |
| `note-li.png` | 256x256 | Note tile: left index (yellow) | same, yellow `#ffd43b` |
| `note-th.png` | 256x256 | Note tile: thumbs / space (pink) | same, pink `#ff8787`, slightly wider feel |
| `note-ri.png` | 256x256 | Note tile: right index (yellow) | same as `note-li` |
| `note-rm.png` | 256x256 | Note tile: right middle (green) | same as `note-lm` |
| `note-rr.png` | 256x256 | Note tile: right ring (blue) | same as `note-lr` |
| `note-rp.png` | 256x256 | Note tile: right pinky (purple) | same as `note-lp` |
| `pad-lp.png` ... `pad-rp.png` (9 files: lp lr lm li th ri rm rr rp) | 256x144, transparent | The pad each note lands on (the "finger button") | "Glowing flat game pad button, rounded rectangle, same colour as the matching note, subtle inner glow, blank" |
| `word-capsule.png` | 1200x240, transparent | Capsule behind falling words (stretched to fit) | "Wide rounded pill, dark indigo glass with a soft violet neon outline, blank, transparent background" |

Tips:
- Generate the 9 notes (and 9 pads) in **one session** so the shape matches.
- Export notes with **some padding** (about 8%) so the outline is not clipped.
- Keep the file names lowercase exactly as shown.
- To test: put the files here and reload `/typing-hero/`.
