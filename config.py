"""Configuration access for Flappy Med."""

from __future__ import annotations

import uuid

from aqt import mw


# ----------------------------
# Internal helpers
# ----------------------------

def _get_config_dict() -> dict:
    config = mw.addonManager.getConfig(__name__)
    return config or {}


def _write_config(config: dict) -> None:
    mw.addonManager.writeConfig(__name__, config)


# ----------------------------
# Backward-compatible exports
# ----------------------------

def get_config() -> dict:
    return _get_config_dict()


class ScoreRepository:
    def get_high_score(self) -> int:
        return get_high_score()

    def save_high_score(self, value: int) -> int:
        current = get_high_score()
        best = max(current, int(value))
        set_high_score(best)
        return best


# ----------------------------
# Backend
# ----------------------------

def get_backend_base_url() -> str:
    return _get_config_dict().get("backend_base_url", "")


# ----------------------------
# Player identity
# ----------------------------

def get_player_id() -> str:
    config = _get_config_dict()
    player_id = config.get("player_id", "")

    if not player_id:
        player_id = uuid.uuid4().hex
        config["player_id"] = player_id
        _write_config(config)

    # Normalise any legacy IDs that were stored with hyphens
    player_id = player_id.replace("-", "")
    return player_id


def get_display_name() -> str:
    return _get_config_dict().get("display_name", "Player")


def set_display_name(name: str) -> None:
    config = _get_config_dict()
    config["display_name"] = name
    _write_config(config)


# ----------------------------
# Local high score
# ----------------------------

def get_high_score() -> int:
    return int(_get_config_dict().get("high_score", 0))


def set_high_score(value: int) -> None:
    config = _get_config_dict()
    config["high_score"] = int(value)
    _write_config(config)


# ----------------------------
# Window config
# ----------------------------

def get_window_size() -> tuple[int, int]:
    config = _get_config_dict()
    return int(config.get("window_width", 480)), int(config.get("window_height", 720))


def is_debug() -> bool:
    return bool(_get_config_dict().get("debug", False))

def set_player_id(value: str) -> None:
    config = _get_config_dict()
    config["player_id"] = value
    _write_config(config)