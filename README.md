# TinySpark

Flask app that helps kids (ages 6–11) click a button to generate a random, kid‑safe AI image to inspire a short story.

## Quickstart

1) Create a virtual environment

```bash
python3 -m venv .venv
source .venv/bin/activate
```

2) Install dependencies

```bash
pip install -r requirements.txt
```

3) Run the dev server

```bash
python app.py
# or
FLASK_APP=app:create_app flask run --debug
```

Open `http://127.0.0.1:5001/` in your browser.

Health check: `GET /` (app hub), `GET /story-starter` (Story Starter app), `GET /healthz` returns `{ "status": "ok" }`.

## Environment Variables

```bash
cp .env.example .env   # then edit
```

| Variable | Default | Purpose |
| --- | --- | --- |
| `OPENAI_API_KEY` | – | Enables AI prompt + image generation. Without it the app serves saved/stock images. |
| `SECRET_KEY` | random per process | Flask secret key. |
| `ADMIN_TOKEN` | – | Required (header `X-Admin-Token`) for `POST /genseed`. Endpoint is disabled when unset. |
| `GENERATE_LIMIT_PER_HOUR` | 5 | Max new images per client IP per hour. |
| `DAILY_GENERATION_CAP` | 100 | Max new images per UTC day (per worker process). |
| `PROXY_HOPS` | 0 | Trusted reverse-proxy hops, so rate limiting sees the real client IP. |
| `OPENAI_IMAGE_MODEL` | `gpt-image-1-mini` | Image model (`dall-e-3` was retired). |
| `OPENAI_IMAGE_QUALITY` | model default | `low`/`medium`/`high` for gpt-image, `standard`/`hd` for dall-e. |
| `OPENAI_IMAGE_SIZE` | `1024x1024` | Image size. |
| `OPENAI_IMAGE_TIMEOUT_SEC` | 45 | Max wait for an image. Keep below the gunicorn timeout. |
| `GA_MEASUREMENT_ID` | existing ID | Google Analytics, loaded only after the visitor accepts. Empty disables it. |
| `LOG_LEVEL` | `INFO` | Logging level. |

When a limit is hit, the app serves an existing image instead of failing.

## Story Starter features

Pick a picture (spark a random one, choose from 3, or open Today's Spark),
then write guided by the story spine at one of three levels. Includes
per-picture questions and power words, a writer's checklist, read-aloud,
plot-twist cards, print, classroom timer mode, "My stories", favourite
pictures and light badges. Everything a child writes stays in their
browser (`localStorage`, key `tinyspark-story-v1`); there are no accounts.

Per-picture questions/words are generated with OpenAI when a picture is
made (moderated, stored in `enrichment.json`); otherwise a built-in set is
used. Pictures are tagged by theme from keywords in their prompt
(`app/services/themes.py`).

## Mini-apps (Word Wizard, Doodle Quest, Rhyme Time)

All three are free of third-party services and keep progress in the
child's browser only (`localStorage`). They share `templates/app_base.html`
and `static/shared.js`.

- **Word Wizard:** 54 vocabulary words in three levels, a definition quiz
  and a letter-scramble game, a spellbook with mastery pips and badges.
  Words live in `app/apps/wordwizard/data.py`.
- **Doodle Quest:** a daily drawing challenge (prompt + twist, chosen by
  date), canvas with colours, sizes, eraser and undo, timer, and a
  12-item on-device gallery. Prompts in `app/apps/doodlequest/data.py`.
- **Rhyme Time:** curated rhyme families (`app/apps/rhymetime/data.py`),
  a rhyme finder, a "which word rhymes?" game and a poem maker with live
  rhyme checks. APIs: `/rhyme-time/api/rhymes`, `/api/check`, `/api/quiz`.

## Typing Hero

A Guitar-Hero-style rhythm game that teaches touch typing (`/typing-hero/`).

- **Play model:** letters fall down nine finger lanes (colour = finger) onto
  pads; press the matching key as it lands. Streak multipliers, a crowd meter
  and a Spark power (Enter) borrow from rhythm games. Wrong keys break the
  streak, so accuracy comes first.
- **Curriculum** (`app/apps/typinghero/data.py`): home row, index reach,
  top row, bottom row, capitals/punctuation, numbers (optional), then falling
  words and karaoke sentences. 50 levels, unlocked at 2 stars (75% accuracy).
- **Teaching aids:** a soundcheck screen with new-key warm-up, a lane legend,
  an on-screen keyboard that fades as you progress, per-key stats, a
  "trouble spots" practice song and a grown-ups page.
- **Charts** are generated deterministically from level data in
  `static/apps/typinghero/core.js`; audio is a built-in WebAudio synth.
- **Art:** every visual has a fallback; drop images in
  `static/apps/typinghero/art/` (see `ART.md` there for sizes and prompts).
- **Self-test:** open `/typing-hero/?selftest=1` to run the in-browser checks.

## API

- `GET /api/existing-images?limit=24&theme=animals` → `{ images: [{url, prompt, themes, questions, words}], total }` (random sample, max 100)
- `GET /api/daily` → the same picture for everyone each UTC day
- `POST /api/random-image` with `{ "generate_new": true, "theme": "space" }` → image object plus `generated`
- `POST /genseed` (admin) with `{ "count": 20 }` → generation summary
- `GET /` (app hub), `GET /story-starter` (Story Starter app), `GET /healthz`

Generated prompts are checked with OpenAI moderation before an image is made
(fails closed). Prompts are stored in `app/static/generated/index.json`
next to the PNGs. Generated images need a persistent volume in production.

## Seeding images

```bash
flask --app app:create_app seed --count 20
```

## Tests

```bash
pip install -r requirements-dev.txt
pytest
```

## Apps

The homepage (`/`) is a grid of apps defined in `SECTIONS` in `app/routes.py`.

| App | URL | Code |
| --- | --- | --- |
| Story Starter | `/story-starter` | `app/routes.py`, `app/templates/story.html` |
| 11+ Examinator, Spark Stumble Race | `/11plus/`, `/11plus/stumble` | `app/apps/elevenplus/` (blueprint, own static/templates/tests) |

To add an app: create a blueprint under `app/apps/<name>/`, register it in
`create_app`, and add a card to `APPS`.

## Project Structure

```
tinyspark/
  app/
    __init__.py
    routes.py
    services/
      prompts.py          # themes, prompt generation, moderation
      image_service.py    # image gen, atomic saves, prompt index
      limits.py           # rate limiter + daily cap
      seeding.py          # batch generation (CLI + /genseed)
    templates/
      home.html           # app hub grid (add apps in routes.SECTIONS)
      story.html          # Story Starter
      _analytics.html     # shared consent + analytics
    static/
      style.css
  app.py
  wsgi.py
  requirements.txt
  requirements-dev.txt
  tests/
```
