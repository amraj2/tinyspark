import logging
import os
import random
from typing import Optional, Set


logger = logging.getLogger(__name__)

KID_SAFE_THEMES = [
    "a friendly dragon reading a book in a sunny meadow",
    "a small robot discovering a glowing flower in an old garden",
    "two children building a raft to sail across a sparkling pond",
    "a shy fox finding a tiny door at the bottom of a tree",
    "a baby whale floating through the clouds above a sleepy town",
    "a brave mouse steering a teacup boat through a puddle storm",
    "a young inventor and a talking teapot opening a mysterious map",
    "a kind giant planting a tiny star in a village garden",
    "an octopus librarian sorting glowing books under the sea",
    "a girl and her pet turtle riding a paper kite over the hills",
    "a lost penguin finding a lighthouse that hums a lullaby",
    "a boy and a cloud who has forgotten how to rain",
    "a family of owls hosting a moonlit picnic in the forest",
    "a snail racing a rocket-powered skateboard down a hill",
    "a dinosaur learning to bake a birthday cake for a friend",
]

SYSTEM_PROMPT = (
    "You are a creative writing helper for children aged 6-11. Write one "
    "imaginative, age-appropriate story starter as a single, simple "
    "sentence that describes a scene involving an original character. "
    "It should capture a key moment that could be the 'until one day' "
    "turning point of a story: something that sparks adventure, change, "
    "or discovery, in the spirit of classic animated family films. "
    "Do not use the names of real people, brands, or existing "
    "characters or franchises. No violence, fear, or romance. "
    "Output ONLY the story starter text, nothing else."
)

MAX_PROMPT_LEN = 200


def _api_key() -> Optional[str]:
    key = (os.environ.get("OPENAI_API_KEY") or "").strip()
    return key if key.startswith("sk-") else None


def is_prompt_safe(client, text: str) -> bool:
    """Run text through OpenAI moderation. Fails closed on any error."""
    try:
        result = client.moderations.create(
            model="omni-moderation-latest", input=text
        )
        return not result.results[0].flagged
    except Exception as e:
        logger.warning("Moderation check failed; rejecting prompt: %s", e)
        return False


def generate_new_prompt(
    existing_prompts: Optional[Set[str]] = None,
) -> Optional[str]:
    """Generate a new moderated kid-safe story prompt using OpenAI.

    Returns None if OpenAI is unavailable or the result is rejected.
    """
    api_key = _api_key()
    if not api_key:
        return None

    try:
        from openai import OpenAI

        client = OpenAI(api_key=api_key, timeout=20.0, max_retries=0)

        user_content = (
            "Generate a new, unique story starter for kids. Make it "
            "creative and different from any existing ideas."
        )
        if existing_prompts:
            sample = random.sample(
                sorted(existing_prompts), min(len(existing_prompts), 40)
            )
            listing = "\n".join(f"- {p}" for p in sample)
            user_content = (
                "Generate a new, unique story starter. It must be "
                "COMPLETELY DIFFERENT in character, setting and "
                "situation from all of these existing ideas:\n\n"
                f"{listing}"
            )

        response = client.chat.completions.create(
            model="gpt-4o-mini",
            messages=[
                {"role": "system", "content": SYSTEM_PROMPT},
                {"role": "user", "content": user_content},
            ],
            max_tokens=60,
            temperature=0.9,
        )

        prompt = " ".join(
            (response.choices[0].message.content or "").split()
        ).strip("\"'")
        if not prompt or len(prompt) > MAX_PROMPT_LEN:
            return None
        if not is_prompt_safe(client, prompt):
            logger.warning("Generated prompt rejected by moderation")
            return None
        return prompt
    except Exception as e:
        logger.warning("Failed to generate new prompt with OpenAI: %s", e)
        return None


def get_unused_prompt(
    used_prompts: Set[str], theme: Optional[str] = None
) -> str:
    """Return a prompt that is not in used_prompts (lowercased).

    Prefers the built-in themes, then asks OpenAI, and finally repeats a
    theme if nothing else is available.
    """
    available = [
        p for p in KID_SAFE_THEMES if p.lower() not in used_prompts
    ]
    if theme:
        from .themes import themes_for

        themed = [p for p in available if theme in themes_for(p)]
        available = themed or available
    if available:
        return random.choice(available)

    logger.info("All themes used; generating a new prompt with OpenAI")
    new_prompt = generate_new_prompt(existing_prompts=used_prompts)
    if new_prompt and new_prompt.lower() not in used_prompts:
        return new_prompt

    logger.warning("Prompt generation unavailable; repeating a theme")
    return random.choice(KID_SAFE_THEMES)
