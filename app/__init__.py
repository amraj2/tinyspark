import logging
import os
from pathlib import Path

import click
from dotenv import load_dotenv
from flask import Flask

# Load environment variables from .env file if it exists
env_path = Path(__file__).parent.parent / ".env"
load_dotenv(env_path)


def create_app() -> Flask:
    """Application factory for the TinySpark Flask app.

    Returns a configured Flask application instance.
    """
    logging.basicConfig(
        level=os.environ.get("LOG_LEVEL", "INFO"),
        format="%(asctime)s %(levelname)s %(name)s: %(message)s",
    )

    app = Flask(__name__, instance_relative_config=True)

    secret = os.environ.get("SECRET_KEY")
    if not secret:
        # The app keeps no sessions today, but never ship a guessable key.
        import secrets

        secret = secrets.token_hex(32)
        app.logger.warning("SECRET_KEY not set; using a random key")

    app.config.from_mapping(
        SECRET_KEY=secret,
        # Analytics is loaded only after consent. Set empty to disable.
        GA_MEASUREMENT_ID=os.environ.get(
            "GA_MEASUREMENT_ID", "G-WZYRDCTXQS"
        ),
    )

    # Behind a reverse proxy, set PROXY_HOPS so rate limiting sees the
    # real client address.
    hops = int(os.environ.get("PROXY_HOPS", "0"))
    if hops > 0:
        from werkzeug.middleware.proxy_fix import ProxyFix

        app.wsgi_app = ProxyFix(app.wsgi_app, x_for=hops)

    from flask_compress import Compress

    app.config["COMPRESS_MIMETYPES"] = [
        "text/html", "text/css", "text/javascript",
        "application/javascript", "application/json",
        "application/manifest+json", "image/svg+xml",
    ]
    Compress(app)

    @app.context_processor
    def _inject_analytics():
        return {"ga_id": app.config.get("GA_MEASUREMENT_ID", "")}

    from .routes import bp as main_bp
    app.register_blueprint(main_bp)

    from .apps.doodlequest import bp as doodlequest_bp
    from .apps.elevenplus import bp as elevenplus_bp
    from .apps.rhymetime import bp as rhymetime_bp
    from .apps.wordwizard import bp as wordwizard_bp

    for blueprint in (
        elevenplus_bp, wordwizard_bp, doodlequest_bp, rhymetime_bp
    ):
        app.register_blueprint(blueprint)

    @app.cli.command("seed")
    @click.option("--count", default=20, show_default=True, type=int)
    def seed_command(count: int) -> None:
        """Generate COUNT new story images."""
        from .services.seeding import seed_images

        result = seed_images(max(1, count))
        click.echo(
            f"Generated {result['generated']}/{result['target']}"
        )
        for err in result["errors"]:
            click.echo(f"  - {err}")

    return app
