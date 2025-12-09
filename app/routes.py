from flask import Blueprint, jsonify, render_template, request
from .services.prompts import get_unused_prompt
from .services import prompts
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


@bp.post("/genseed")
def generate_seed():
    """Generate a seed of 100 story images."""
    import logging

    logger = logging.getLogger(__name__)
    target_count = 20
    generated_count = 0
    errors = []

    try:
        # Get existing images to avoid duplicates
        existing_images = get_all_existing_images()
        existing_prompts = {
            prompt.lower() for _, prompt in existing_images
        }

        logger.info(
            f"Starting seed generation. "
            f"Existing images: {len(existing_images)}"
        )

        for i in range(target_count):
            try:
                # Generate a new unique prompt using OpenAI
                # Pass existing prompts to ensure uniqueness
                prompt = prompts._generate_new_prompt_with_openai(
                    existing_prompts=existing_prompts
                )

                # If OpenAI fails, fall back to unused prompt
                if not prompt:
                    prompt = get_unused_prompt(GENERATED_IMAGES_DIR)

                # Skip if we've already generated this prompt
                if prompt.lower() in existing_prompts:
                    logger.warning(f"Skipping duplicate prompt: {prompt}")
                    continue

                # Generate and save the image
                generate_image_url(prompt)
                existing_prompts.add(prompt.lower())
                generated_count += 1

                logger.info(
                    f"Generated {generated_count}/{target_count}: {prompt}"
                )

            except Exception as e:
                error_msg = f"Error generating image {i+1}: {str(e)}"
                logger.error(error_msg)
                errors.append(error_msg)
                continue

        return jsonify({
            "status": "complete",
            "generated": generated_count,
            "target": target_count,
            "errors": errors[:10],  # Limit error messages
        })

    except Exception as e:
        logger.error(f"Seed generation failed: {str(e)}")
        return jsonify({
            "status": "error",
            "message": str(e),
            "generated": generated_count,
        }), 500
