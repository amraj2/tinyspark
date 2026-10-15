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
| `OPENAI_IMAGE_MODEL` | `dall-e-3` | Image model. |
| `OPENAI_IMAGE_SIZE` | `1024x1024` | Image size. |
| `OPENAI_IMAGE_TIMEOUT_SEC` | 45 | Max wait for an image. Keep below the gunicorn timeout. |
| `GA_MEASUREMENT_ID` | existing ID | Google Analytics, loaded only after the visitor accepts. Empty disables it. |
| `LOG_LEVEL` | `INFO` | Logging level. |

When a limit is hit, the app serves an existing image instead of failing.

## API

- `GET /api/existing-images?limit=24` → `{ images: [{url, prompt}], total }` (random sample, max 100)
- `POST /api/random-image` with `{ "generate_new": true }` → `{ prompt, image_url, generated }`
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

The homepage (`/`) is a grid of apps defined in `APPS` in `app/routes.py`.

| App | URL | Code |
| --- | --- | --- |
| Story Starter | `/story-starter` | `app/routes.py`, `app/templates/story.html` |
| 11+ Examinator + Spark Stumble | `/11plus/` | `app/apps/elevenplus/` (blueprint, own static/templates/tests) |

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
      home.html           # app hub grid (add apps in routes.APPS)
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
