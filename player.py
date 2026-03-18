"""Local player identity management for Flappy Med."""

from __future__ import annotations

from .config import get_display_name, get_player_id, set_display_name


def get_player_profile() -> dict[str, str]:
    return {
        "player_id": get_player_id(),
        "display_name": get_display_name(),
    }


def update_player_display_name(name: str) -> dict[str, str]:
    cleaned = name.strip()[:20] or "Player"
    set_display_name(cleaned)
    return get_player_profile()