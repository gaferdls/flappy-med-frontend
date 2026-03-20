(function () {
  'use strict';

  const FREE_LIVES_MAX = 10;

  function todayString() {
    // Local date string "YYYY-MM-DD" so daily reset happens at local midnight
    const d = new Date();
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  // In-memory state — safe defaults until Python responds asynchronously.
  let _state = {
    freeLives: FREE_LIVES_MAX,
    bonusLives: 0,
    coins: 0,
    lastDailyReset: '',
  };
  let _isLoaded = false;

  // Checks for a new day and resets free lives in-place, then persists.
  // Bonus lives are never touched by the daily reset.
  function _applyDailyReset() {
    if (!_isLoaded) return;
    const today = todayString();
    if (_state.lastDailyReset !== today) {
      _state.freeLives = FREE_LIVES_MAX;
      _state.lastDailyReset = today;
      _save(_state);
    }
  }

  function _save(state) {
    if (!_isLoaded) return;
    if (window.FlappyMedBridge) {
      window.FlappyMedBridge.saveEconomyState(JSON.stringify(state));
    }
  }

  // Receive persisted state from Python (async). Apply it and check for daily reset.
  window.addEventListener('flappy-med:economy-state', (event) => {
    const raw = event.detail || {};
    _state = {
      freeLives: typeof raw.freeLives === 'number' ? raw.freeLives : FREE_LIVES_MAX,
      bonusLives: typeof raw.bonusLives === 'number' ? raw.bonusLives : 0,
      coins: typeof raw.coins === 'number' ? raw.coins : 0,
      lastDailyReset: raw.lastDailyReset || '',
    };
    _isLoaded = true;
    _applyDailyReset();
  });

  // Poll until pycmd and the bridge are both available, then request persisted state.
  // Anki injects pycmd asynchronously, so DOMContentLoaded alone is not sufficient.
  window.addEventListener('DOMContentLoaded', () => {
    const fetchLoop = setInterval(() => {
      if (_isLoaded) {
        clearInterval(fetchLoop);
        return;
      }
      if (typeof pycmd === 'function' && window.FlappyMedBridge) {
        window.FlappyMedBridge.requestEconomyState();
      }
    }, 50);
  });

  // Returns the current in-memory state, applying daily reset if the date has changed.
  function getState() {
    _applyDailyReset();
    return _state;
  }

  // Consumes one life (free first, then bonus). Returns true if a life was
  // available, false if the player is out of lives entirely.
  function consumeLife() {
    const state = getState();
    if (state.freeLives > 0) {
      state.freeLives -= 1;
    } else if (state.bonusLives > 0) {
      state.bonusLives -= 1;
    } else {
      return false;
    }
    _save(state);
    return true;
  }

  function grantCoins(amount) {
    const state = getState();
    state.coins += amount;
    _save(state);
    return state;
  }

  function buyBonusLives(amount, cost) {
    if (!_isLoaded) return false;
    if (_state.coins < cost) return false;
    _state.coins -= cost;
    _state.bonusLives += amount;
    _save(_state);
    return true;
  }

  window.FlappyMedEconomy = { getState, consumeLife, grantCoins, buyBonusLives };
})();
