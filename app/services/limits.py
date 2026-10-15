import threading
import time
from collections import defaultdict, deque
from datetime import datetime, timezone


class RateLimiter:
    """In-process sliding-window limiter keyed by client id (e.g. IP).

    State is per worker process, so with N gunicorn workers the effective
    limit is up to N times higher. That is still enough to stop a runaway
    client; use a shared store if you need exact limits.
    """

    def __init__(self, max_events: int, window_sec: float) -> None:
        self.max_events = max_events
        self.window_sec = window_sec
        self._events: dict[str, deque] = defaultdict(deque)
        self._lock = threading.Lock()

    def allow(self, key: str) -> bool:
        now = time.monotonic()
        with self._lock:
            events = self._events[key]
            while events and now - events[0] > self.window_sec:
                events.popleft()
            if len(events) >= self.max_events:
                return False
            events.append(now)
            return True


class DailyCap:
    """Caps total events per UTC day (per worker process)."""

    def __init__(self, max_per_day: int) -> None:
        self.max_per_day = max_per_day
        self._day = None
        self._count = 0
        self._lock = threading.Lock()

    def acquire(self) -> bool:
        today = datetime.now(timezone.utc).date()
        with self._lock:
            if self._day != today:
                self._day = today
                self._count = 0
            if self._count >= self.max_per_day:
                return False
            self._count += 1
            return True
