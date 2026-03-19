(function () {
  'use strict';

  function safePycmd(message) {
    if (typeof pycmd === 'function') {
      pycmd(message);
      return;
    }
  }

  window.FlappyMedBridge = {
    notifyReady() {
      safePycmd('flappy_med:ready');
    },

    saveHighScore(score) {
      safePycmd(`flappy_med:save_high_score:${score}`);
    },

    initPlayer() {
      safePycmd('flappy_med:init_player');
    },

    submitScore(score) {
      safePycmd(`flappy_med:submit_score:${score}`);
    },

    requestLeaderboard() {
      safePycmd('flappy_med:get_leaderboard');
    },

    receivePythonState(payload) {
      window.dispatchEvent(
        new CustomEvent('flappy-med:python-state', { detail: payload })
      );
    },

    receivePlayerProfile(payload) {
      window.dispatchEvent(
        new CustomEvent('flappy-med:player-profile', { detail: payload })
      );
    },

    receiveSubmitScoreResult(payload) {
      window.dispatchEvent(
        new CustomEvent('flappy-med:submit-result', { detail: payload })
      );
    },

    receiveLeaderboard(payload) {
      window.dispatchEvent(
        new CustomEvent('flappy-med:leaderboard', { detail: payload })
      );
    },
    setDisplayName(name) {
      safePycmd(`flappy_med:set_display_name:${name}`);
    },

    openUrl(url) {
      const a = document.createElement('a');
      a.href = url;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    },
  };
})();