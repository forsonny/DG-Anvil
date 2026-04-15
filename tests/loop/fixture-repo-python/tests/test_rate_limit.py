"""Tests for the rate limiter."""

from src.rate_limit import check_quota, _state


def test_under_quota():
    _state.update({"window_start": 0.0, "count": 0})
    assert check_quota(now=1.0) is True


def test_window_reset():
    _state.update({"window_start": 0.0, "count": 100})
    assert check_quota(now=1000.0) is True
    assert _state["count"] == 1
