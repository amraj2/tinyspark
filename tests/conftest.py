import sys
from pathlib import Path

import pytest

sys.path.insert(0, str(Path(__file__).parent.parent))

from app import create_app  # noqa: E402
from app.services import image_service  # noqa: E402


@pytest.fixture
def gen_dir(tmp_path, monkeypatch):
    monkeypatch.setattr(image_service, "GENERATED_IMAGES_DIR", tmp_path)
    monkeypatch.delenv("OPENAI_API_KEY", raising=False)
    return tmp_path


@pytest.fixture
def client(gen_dir):
    app = create_app()
    app.config["TESTING"] = True
    return app.test_client()
