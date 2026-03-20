"""Application bootstrap for Flappy Med.

Responsibilities:
- register exported web assets
- register the Tools menu action
- create/show a single dialog instance

No game logic belongs here. If you put gameplay in Python for this add-on,
you're doing architecture cosplay instead of engineering.
"""

from __future__ import annotations

from aqt import gui_hooks, mw
from aqt.qt import QAction

from .config import get_config
from .game_window import FlappyMedDialog, ensure_js_bridge_hook

_window: FlappyMedDialog | None = None
_action: QAction | None = None
_initialized = False

cards_reviewed_this_session = 0


def on_card_answered(reviewer, card, ease):
    global cards_reviewed_this_session
    cards_reviewed_this_session += 1


def grant_deck_completion_lives(amount: int):
    config = get_config()
    economy = config.get("economy", {"freeLives": 10, "bonusLives": 0, "coins": 0, "lastDailyReset": ""})

    economy.setdefault("bonusLives", 0)
    economy["bonusLives"] += amount
    config["economy"] = economy

    mw.addonManager.writeConfig(__name__, config)

    from aqt.utils import tooltip
    tooltip(f"🎉 Deck Finished! +{amount} lives added to Flappy Med!")


def on_state_changed(new_state: str, old_state: str):
    global cards_reviewed_this_session
    if old_state == "review" and new_state in ["overview", "deckBrowser"]:
        if cards_reviewed_this_session > 0:
            counts = mw.col.sched.counts()
            if sum(counts) == 0:
                grant_deck_completion_lives(5)

            cards_reviewed_this_session = 0


def init_addon() -> None:
    global _initialized
    if _initialized:
        return

    _register_web_exports()
    ensure_js_bridge_hook()
    _add_menu_action()
    gui_hooks.reviewer_did_answer_card.append(on_card_answered)
    gui_hooks.state_did_change.append(on_state_changed)
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
