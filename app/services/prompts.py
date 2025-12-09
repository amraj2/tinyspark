import os
import random
import logging
from pathlib import Path
from typing import Optional, Set


KID_SAFE_THEMES = [
    "a friendly dragon reading a book in a sunny meadow"
]


def _get_used_prompts(generated_dir: Path) -> Set[str]:
    """Get set of prompts that have already been generated."""
    used = set()
    try:
        if not generated_dir.exists():
            return used

        for file in generated_dir.glob("*.png"):
            # Convert filename back to prompt
            # Format: "a-friendly-dragon-reading-a-book-in-a-sunny-meadow.png"
            prompt = file.stem.replace('-', ' ')
            used.add(prompt.lower())
    except Exception:
        pass
    return used


def _generate_new_prompt_with_openai(
    existing_prompts: Optional[Set[str]] = None,
) -> Optional[str]:
    """Generate a new kid-safe story prompt using OpenAI.

    Args:
        existing_prompts: Set of existing prompts to avoid duplicates.
    """
    api_key = os.environ.get("OPENAI_API_KEY")
    if not api_key or not api_key.startswith("sk-"):
        return None

    try:
        from openai import OpenAI

        client = OpenAI(api_key=api_key)

        # Build user message with existing prompts
        user_content = (
            "Generate a new, unique kid-safe story prompt for "
            "image generation. Make it creative and completely different "
            "from any existing ideas."
        )

        if existing_prompts and len(existing_prompts) > 0:
            # Format existing prompts for the AI
            prompts_list = list(existing_prompts)[:50]  # Limit to 50
            prompts_text = "\n".join(
                f"- {prompt}" for prompt in prompts_list
            )
            user_content = (
                "Generate a new, unique kid-safe story prompt for "
                "image generation. The prompt must be COMPLETELY "
                "DIFFERENT from all of these existing story ideas:\n\n"
                f"{prompts_text}\n\n"
                "Create something fresh, original, and imaginative that "
                "does NOT repeat any themes, characters, or settings from "
                "the list above. Think of a completely new scenario, "
                "character, or adventure that kids aged 6-11 would find "
                "exciting and inspiring."
            )

        response = client.chat.completions.create(
            model="gpt-4o-mini",
            messages=[
                {
                    "role": "system",
                    "content": (
                        "You are a creative writing helper for children "
                        "aged 6–11. Create one imaginative, "
                        "age-appropriate story starter written as a single, "
                        "simple sentence that describes a scene or situation "
                        "involving a character. The image prompt should "
                        "inspire a story following the Pixar story formula:\n"
                        "1. Once upon a time, there was...\n"
                        "2. Every day, ______.\n"
                        "3. Until one day, ______.\n"
                        "4. Because of that, ______.\n"
                        "5. Because of that, ______.\n"
                        "6. Until finally, ______.\n\n"
                        "Your prompt should capture a key moment that could "
                        "be the 'until one day' turning point or a "
                        "'because of that' consequence moment - something "
                        "that sparks adventure, change, or discovery. Take "
                        "inspiration from Disney, Marvel, Pixar, Dreamworks "
                        "Animation, Illumination, Sony Pictures Animation, "
                        "Universal Pictures, Warner Bros, Studio Ghibli, "
                        "Steven Spielberg, Chris Meledandri or Glen Keane. "
                        "Output ONLY the story starter text, nothing else."
                    ),
                },
                {
                    "role": "user",
                    "content": user_content,
                },
            ],
            max_tokens=50,
            temperature=0.9,
        )

        prompt = response.choices[0].message.content.strip()
        # Remove quotes if present
        prompt = prompt.strip('"').strip("'")
        return prompt
    except Exception as e:
        logger = logging.getLogger(__name__)
        logger.warning("Failed to generate new prompt with OpenAI: %s", e)
        return None


def get_unused_prompt(generated_dir: Path) -> str:
    """Get a random prompt that hasn't been used yet.

    If all prompts have been used, generates a new one with OpenAI.
    """
    used_prompts = _get_used_prompts(generated_dir)

    # Get prompts that haven't been used
    available = [
        prompt for prompt in KID_SAFE_THEMES
        if prompt.lower() not in used_prompts
    ]

    if available:
        return random.choice(available)

    # All prompts have been used, generate a new one with OpenAI
    logger = logging.getLogger(__name__)
    logger.info("All prompts exhausted, generating new prompt with OpenAI")
    new_prompt = _generate_new_prompt_with_openai(
        existing_prompts=used_prompts
    )

    if new_prompt:
        return new_prompt

    # Fallback if OpenAI fails
    logger.warning("OpenAI prompt generation failed, using random existing")
    return random.choice(KID_SAFE_THEMES)


def random_kid_safe_prompt() -> str:
    """Legacy function for backward compatibility."""
    return random.choice(KID_SAFE_THEMES)
