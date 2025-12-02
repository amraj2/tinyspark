from flask import Blueprint, jsonify, render_template, request
from .services.prompts import get_unused_prompt
from .services.image_service import (
    generate_image_url,
    get_random_existing_image,
    GENERATED_IMAGES_DIR,
)


bp = Blueprint("main", __name__)


@bp.get("/")
def index():
    return render_template("index.html", title="TinySpark")


@bp.get("/healthz")
def healthz():
    return jsonify({"status": "ok"})


@bp.post("/api/random-image")
def api_random_image():
    # Check if we should generate a new image or use existing
    should_generate_new = (
        request.json.get("generate_new", False)
        if request.is_json
        else False
    )

    if should_generate_new:
        # Generate a completely new image with OpenAI
        # Use unused prompt to avoid duplicates
        prompt = get_unused_prompt(GENERATED_IMAGES_DIR)
        image_url = generate_image_url(prompt)
        return jsonify({"prompt": prompt, "image_url": image_url})
    else:
        # Get a random existing image from the generated folder
        result = get_random_existing_image()
        if result:
            image_url, prompt = result
            return jsonify({"prompt": prompt, "image_url": image_url})
        else:
            # No existing images, generate a new one
            prompt = get_unused_prompt(GENERATED_IMAGES_DIR)
            image_url = generate_image_url(prompt)
            return jsonify({"prompt": prompt, "image_url": image_url})
