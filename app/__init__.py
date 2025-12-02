import os
from pathlib import Path
from flask import Flask
from dotenv import load_dotenv

# Load environment variables from .env file if it exists
env_path = Path(__file__).parent.parent / ".env"
load_dotenv(env_path)


def create_app() -> Flask:
    """Application factory for the TinySpark Flask app.

    Returns a configured Flask application instance.
    """
    app = Flask(__name__, instance_relative_config=True)

    # Basic configuration with sensible defaults for local dev
    app.config.from_mapping(
        SECRET_KEY=os.environ.get("SECRET_KEY", "dev"),
    )

    # Register blueprints
    from .routes import bp as main_bp
    app.register_blueprint(main_bp)

    return app


