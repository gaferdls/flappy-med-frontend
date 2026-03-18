"""Flappy Med add-on entrypoint.

This file stays intentionally small: it only initializes the add-on package.
Putting the startup side effects in main.py keeps import responsibility clear.
"""

from .main import init_addon

init_addon()
