"""Application bootstrap for Flappy Med.

Responsibilities:
- register exported web assets
- register the Tools menu action
- create/show a single dialog instance

No game logic belongs here. If you put gameplay in Python for this add-on,
you're doing architecture cosplay instead of engineering.
"""

from __future__ import annotations

from aqt import mw
from aqt.qt import QAction

from .game_window import FlappyMedDialog, ensure_js_bridge_hook

_window: FlappyMedDialog | None = None
_action: QAction | None = None
_initialized = False


def init_addon() -> None:
    global _initialized
    if _initialized:
        return

    _register_web_exports()
    ensure_js_bridge_hook()
    _add_menu_action()
    _initialized = True



def _register_web_exports() -> None:
    # Export all static assets required by the standalone game page.
    mw.addonManager.setWebExports(__name__, r"web/.*\.(html|css|js|png|svg)")



def _add_menu_action() -> None:
    global _action
    if _action is not None:
        return

    action = QAction("Flappy Med", mw)
    action.triggered.connect(open_game_window)
    mw.form.menuTools.addAction(action)
    _action = action



def _on_window_destroyed(*_args) -> None:
    global _window
    _window = None


def open_game_window() -> None:
    global _window
    if _window is None:
        _window = FlappyMedDialog(mw)
        _window.destroyed.connect(_on_window_destroyed)

    _window.show_and_focus()
