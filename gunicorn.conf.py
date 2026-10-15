"""Gunicorn settings (picked up automatically from the working directory).

Image generation can take ~45s, so the default 30s worker timeout is too short.
"""

timeout = 90
