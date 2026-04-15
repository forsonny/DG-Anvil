"""Rate limiter with a rolling-window reset."""

import time

_state = {"window_start": 0.0, "count": 0}


def check_quota(now: float = None) -> bool:
    """Return True if the request is under the per-minute quota."""
    if now is None:
        now = time.time()
    if now - _state["window_start"] >= 60.0:
        _state["window_start"] = now
        _state["count"] = 0
    _state["count"] += 1
    return _state["count"] <= 100
