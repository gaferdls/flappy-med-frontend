"""HTTP client for Flappy Med backend."""

from __future__ import annotations

import json
from urllib import error, request

from .config import get_backend_base_url


def _build_url(path: str) -> str:
    base = get_backend_base_url().rstrip("/")
    url = f"{base}/{path.lstrip('/')}"
    return url


def _post_json(path: str, payload: dict, timeout: float = 5.0) -> dict:
    url = _build_url(path)
    body = json.dumps(payload).encode("utf-8")

    req = request.Request(
        url=url,
        data=body,
        headers={"Content-Type": "application/json"},
        method="POST",
    )

    try:
        with request.urlopen(req, timeout=timeout) as response:
            raw = response.read().decode("utf-8")
            return json.loads(raw) if raw else {}
    except error.HTTPError as exc:
        body = exc.read().decode("utf-8", errors="replace")
        raise RuntimeError(f"POST {path} failed: {exc.code} - {body}") from exc


def _get_json(path: str) -> dict:
    url = _build_url(path)

    req = request.Request(
        url=url,
        headers={"Content-Type": "application/json"},
        method="GET",
    )

    with request.urlopen(req, timeout=5) as response:
        body = response.read().decode("utf-8")
        return json.loads(body) if body else {}


def register_player(player_id: str, display_name: str) -> dict:
    return _post_json("/players/register", {
        "player_id": player_id,
        "display_name": display_name,
    })


def submit_score(player_id: str, score: int) -> dict:
    return _post_json("/scores/", {
        "player_id": str(player_id),
        "score": int(score),
    })


def get_leaderboard(limit: int = 10) -> dict:
    return _get_json(f"/scores/leaderboard?limit={int(limit)}")