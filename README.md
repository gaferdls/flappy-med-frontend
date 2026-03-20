# Flappy Med

A full-featured, highly optimized Flappy Bird-style mini-game built entirely inside Anki's `QDialog` webview. Give your brain a break between flashcard reviews with a seamless, offline-first casual game.

## Features

- **Persistent Offline Economy:** Earn coins and consume lives locally. All transactions are securely saved to Anki's config system and sync seamlessly across your devices via AnkiWeb.
- **Risk & Reward Mechanics:** Coins spawn dynamically inside and around pipes. Do you play it safe, or risk your run for extra cash?
- **Interactive Store:** Spend your hard-earned coins on extra lives to keep your run alive.
- **Global Leaderboard:** Compete against other medical students for the top score. (Gracefully degrades when played completely offline).
- **Hyper-Optimized Physics:** Engineered from the ground up to prevent Javascript garbage collection stutters. Runs flawlessly at 60fps on low-end laptops and overloaded Anki instances.

## Installation

1. Close Anki completely.
2. Open your Anki `addons21` directory.
3. Copy the `flappy_med` folder into that directory.
4. Start Anki.
5. Open **Tools → Flappy Med** to play!

## Technical Architecture

- **Frontend:** Vanilla HTML/JS/CSS rendered via Qt WebEngine. Zero external dependencies.
- **Backend Bridge:** Bi-directional asynchronous communication between Javascript and Python via Anki's `pycmd` and `QWebChannel`.
- **State Management:** Dual-locked async config injection ensures that local economy states (lives, coins, high-scores) are perfectly synced without race conditions.
