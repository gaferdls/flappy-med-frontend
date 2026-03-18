# Flappy Med

A minimal Anki add-on that launches a Flappy Bird-style game in a `QDialog` webview.

## Install in Anki

1. Close Anki.
2. Open your Anki add-ons folder.
3. Copy the `flappy_med` folder into that directory.
4. Start Anki.
5. Open **Tools → Flappy Med**.

## Notes

- High score is stored in Anki add-on config.
- Static assets are exposed through `setWebExports()`.
- JS communicates with Python through `pycmd()` and `webview_did_receive_js_message`.
