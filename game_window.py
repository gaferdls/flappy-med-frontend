from __future__ import annotations

import json
from pathlib import Path
from typing import Any

from aqt import gui_hooks, mw
from aqt.qt import QCloseEvent, QDialog, QVBoxLayout, QUrl, QGuiApplication
from aqt.utils import showWarning
from aqt.webview import AnkiWebView

from .api_client import get_leaderboard, register_player, submit_score
from .config import ScoreRepository, get_config
from .player import get_player_profile, update_player_display_name

BRIDGE_PREFIX = "flappy_med:"

_hook_installed = False
_active_dialog: FlappyMedDialog | None = None


def ensure_js_bridge_hook() -> None:
    global _hook_installed

    if _hook_installed:
        return

    def _on_global_js_message(
        handled: tuple[bool, Any],
        message: str,
        context: Any,
    ) -> tuple[bool, Any]:

        if not isinstance(message, str):
            return handled

        if not message.startswith(BRIDGE_PREFIX):
            return handled

        if _active_dialog is None:
            return handled

        local_handled, result = _active_dialog.on_js_message(message)
        if local_handled:
            return True, result

        return handled

    gui_hooks.webview_did_receive_js_message.append(_on_global_js_message)
    _hook_installed = True


class FlappyMedDialog(QDialog):
    def __init__(self, parent: Any = None) -> None:
        super().__init__(parent or mw)

        global _active_dialog
        _active_dialog = self


        self._config = get_config()
        self._scores = ScoreRepository()

        self.setWindowTitle("Flappy Med")

        screen = QGuiApplication.primaryScreen()
        available = screen.availableGeometry() if screen else None

        default_width = int(self._config.get("window_width", 820))
        default_height = int(self._config.get("window_height", 820))

        if available:
            max_width = max(760, int(available.width() * 0.9))
            max_height = max(760, int(available.height() * 0.9))

            width = min(default_width, max_width)
            height = min(default_height, max_height)
        else:
            width = default_width
            height = default_height

        self.resize(width, height)
        self.setMinimumSize(760, 760)

        self.web = AnkiWebView(parent=self)
        self.web.set_bridge_command(self._bridge_command, self)

        layout = QVBoxLayout()
        layout.setContentsMargins(0, 0, 0, 0)
        layout.addWidget(self.web)
        self.setLayout(layout)

        self._load_game()
        self.web.setFocus()
    

    def show_and_focus(self) -> None:
        self.show()
        self.raise_()
        self.activateWindow()
        self.web.setFocus()

    def _bridge_command(self, message: str) -> Any:

        handled, result = gui_hooks.webview_did_receive_js_message(
            (False, None),
            message,
            self,
        )

        if handled:
            return result

        return None

    def _load_game(self) -> None:
        html_path = Path(__file__).parent / "web" / "index.html"
        html = html_path.read_text(encoding="utf-8")

        self.web.stdHtml(
            html,
            css=[],
            js=[],
            context=self,
        )

    def _send_high_score(self, value: int | None = None) -> None:
        high_score = self._scores.get_high_score() if value is None else int(value)
        payload = json.dumps({"highScore": high_score})
        self.web.eval(f"window.FlappyMedBridge.receivePythonState({payload});")

    def on_js_message(self, message: str) -> tuple[bool, Any]:

        if not isinstance(message, str):
            return False, None

        if not message.startswith(BRIDGE_PREFIX):
            return False, None

        payload = message[len(BRIDGE_PREFIX):]

        if payload == "ready":
            self._send_high_score()
            return True, None

        if payload == "init_player":
            profile = get_player_profile()
            try:
                register_player(
                    player_id=profile["player_id"],
                    display_name=profile["display_name"],
                )
            except Exception as exc:
                showWarning(f"Flappy Med failed to register player:\n{exc}")
                return True, None

            js_payload = json.dumps(profile)
            self.web.eval(
                f"window.FlappyMedBridge.receivePlayerProfile({js_payload});"
            )
            return True, None

        if payload.startswith("save_high_score:"):
            raw_score = payload.split(":", 1)[1]
            try:
                score = int(raw_score)
            except ValueError:
                showWarning(
                    f"Flappy Med received invalid score payload: {raw_score!r}"
                )
                return True, None

            best = self._scores.save_high_score(score)
            self._send_high_score(best)
            return True, None

        if payload.startswith("submit_score:"):
            raw_score = payload.split(":", 1)[1]
            try:
                score = int(raw_score)
            except ValueError:
                showWarning(
                    f"Flappy Med received invalid submit payload: {raw_score!r}"
                )
                return True, None

            profile = get_player_profile()

            try:
                print("Flappy Med submit_score:", profile["player_id"], score, type(score))
                result = submit_score(profile["player_id"], score)
            except Exception as exc:
                showWarning(f"Flappy Med failed to submit score:\n{exc}")
                return True, None

            js_payload = json.dumps(result)
            self.web.eval(
                f"window.FlappyMedBridge.receiveSubmitScoreResult({js_payload});"
            )
            return True, None

        if payload == "get_leaderboard":
            try:
                result = get_leaderboard(limit=10)
            except Exception as exc:
                showWarning(f"Flappy Med failed to fetch leaderboard:\n{exc}")
                return True, None

            js_payload = json.dumps(result)
            self.web.eval(
                f"window.FlappyMedBridge.receiveLeaderboard({js_payload});"
            )
            return True, None
        if payload.startswith("set_display_name:"):
            raw_name = payload.split(":", 1)[1]
            profile = update_player_display_name(raw_name)

            try:
                register_player(
                    player_id=profile["player_id"],
                    display_name=profile["display_name"],
                )
            except Exception as exc:
                showWarning(f"Flappy Med failed to update display name:\n{exc}")
                return True, None

            js_payload = json.dumps(profile)
            self.web.eval(
                f"window.FlappyMedBridge.receivePlayerProfile({js_payload});"
            )
            return True, None
        return False, None

    def closeEvent(self, event: QCloseEvent) -> None:
        global _active_dialog
        _active_dialog = None

        config = get_config()
        config["window_width"] = self.width()
        config["window_height"] = self.height()
        mw.addonManager.writeConfig(__name__, config)

        self.web.cleanup()
        super().closeEvent(event)