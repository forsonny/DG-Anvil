"""Application entrypoint that wires the rate limiter."""

from .rate_limit import check_quota


def handle(request):
    if not check_quota():
        return {"status": 429}
    return {"status": 200, "body": request.get("body", "")}
