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

Health check: `GET /healthz` returns `{ "status": "ok" }`.

## Environment Variables

Create a `.env` file in the project root to configure the app:

```bash
cp .env.example .env
# Then edit .env and add your OpenAI API key
```

**Available variables:**
- `OPENAI_API_KEY` (optional) - Enables AI image generation with OpenAI. If not set, the app uses fallback kid-friendly stock images.
- `SECRET_KEY` (optional) - Flask session secret. Defaults to "dev" in development.
 - `OPENAI_IMAGE_TIMEOUT_SEC` (optional) - Max seconds to wait for an AI image before falling back (default: 2.5).

**Alternative:** You can also set environment variables directly:
```bash
export OPENAI_API_KEY=YOUR_KEY
python app.py
```

The endpoint `POST /api/random-image` returns `{ prompt, image_url }`.

## Production (Gunicorn)

```bash
gunicorn -w 2 -b 0.0.0.0:8000 wsgi:app
```

## Project Structure

```
tinyspark/
  app/
    __init__.py
    routes.py
    services/
      prompts.py          # kid‑safe prompt list
      image_service.py    # OpenAI image gen + fallback URLs
    templates/
      index.html
    static/
      style.css
  app.py
  wsgi.py
  requirements.txt
```
