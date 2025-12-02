from flask import Blueprint, jsonify, render_template, request
from .services.prompts import get_unused_prompt
from .services.image_service import (
    generate_image_url,
    get_all_existing_images,
    GENERATED_IMAGES_DIR,
)


bp = Blueprint("main", __name__)


@bp.get("/")
def index():
    return render_template("index.html", title="TinySpark")


@bp.get("/healthz")
def healthz():
    return jsonify({"status": "ok"})


@bp.get("/api/existing-images")
def api_existing_images():
    """Get list of all existing images."""
    all_images = get_all_existing_images()
    return jsonify({
        "images": [
            {"url": url, "prompt": prompt} for url, prompt in all_images
        ]
    })


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
        # Get a specific image by index if provided
        image_index = (
            request.json.get("image_index", None)
            if request.is_json
            else None
        )

        all_images = get_all_existing_images()

        if all_images:
            if image_index is not None and 0 <= image_index < len(all_images):
                # Return specific image by index
                image_url, prompt = all_images[image_index]
                return jsonify({"prompt": prompt, "image_url": image_url})
            else:
                # Return first image if no index specified
                image_url, prompt = all_images[0]
                return jsonify({"prompt": prompt, "image_url": image_url})
        else:
            # No existing images, generate a new one
            prompt = get_unused_prompt(GENERATED_IMAGES_DIR)
            image_url = generate_image_url(prompt)
            return jsonify({"prompt": prompt, "image_url": image_url})
