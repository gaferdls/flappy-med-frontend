(function () {
  'use strict';

  const SPEED_BASE = 180;
  const SPEED_PER_POINT = 2.5;
  const SPEED_MAX = 260;

  const GAP_BASE = 170;
  const GAP_PER_POINT = 1.5;
  const GAP_MIN = 120;

  class Bird {
    constructor(x, y) {
      this.x = x;
      this.y = y;
      this.radius = 18;
      this.velocityY = 0;
      this.rotation = 0;
      this.bounds = { left: 0, right: 0, top: 0, bottom: 0 };
    }

    flap(jumpVelocity) {
      this.velocityY = jumpVelocity;
    }

    update(gravity, dt) {
      this.velocityY += gravity * dt;
      this.y += this.velocityY * dt;
      this.rotation = Math.max(-0.6, Math.min(1.2, this.velocityY / 420));
    }

    getBounds() {
      this.bounds.left = this.x - this.radius;
      this.bounds.right = this.x + this.radius;
      this.bounds.top = this.y - this.radius;
      this.bounds.bottom = this.y + this.radius;
      return this.bounds;
    }

    draw(ctx) {
      ctx.save();
      ctx.translate(this.x, this.y);
      ctx.rotate(this.rotation);

      ctx.fillStyle = '#f59e0b';
      ctx.beginPath();
      ctx.arc(0, 0, this.radius, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = '#111827';
      ctx.beginPath();
      ctx.arc(6, -5, 3, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = '#f97316';
      ctx.beginPath();
      ctx.moveTo(this.radius - 4, -2);
      ctx.lineTo(this.radius + 14, 3);
      ctx.lineTo(this.radius - 4, 8);
      ctx.closePath();
      ctx.fill();

      ctx.restore();
    }
  }

  class PipePair {
    constructor(x, gapTop, gapHeight, width, speed, canvasHeight) {
      this.x = x;
      this.gapTop = gapTop;
      this.gapHeight = gapHeight;
      this.width = width;
      this.speed = speed;
      this.canvasHeight = canvasHeight;
      this.passed = false;
    }

    update(dt) {
      this.x -= this.speed * dt;
    }

    isOffscreen() {
      return this.x + this.width < 0;
    }

    collidesWith(bounds) {
      const overlapsX = bounds.right > this.x && bounds.left < this.x + this.width;
      if (!overlapsX) {
        return false;
      }

      const topPipeBottom = this.gapTop;
      const bottomPipeTop = this.gapTop + this.gapHeight;
      return bounds.top < topPipeBottom || bounds.bottom > bottomPipeTop;
    }

    draw(ctx) {
      ctx.fillStyle = '#16a34a';
      ctx.strokeStyle = '#166534';
      ctx.lineWidth = 3;

      ctx.fillRect(this.x, 0, this.width, this.gapTop);
      ctx.strokeRect(this.x, 0, this.width, this.gapTop);

      const bottomY = this.gapTop + this.gapHeight;
      const bottomHeight = this.canvasHeight - bottomY;
      ctx.fillRect(this.x, bottomY, this.width, bottomHeight);
      ctx.strokeRect(this.x, bottomY, this.width, bottomHeight);

      ctx.fillStyle = '#22c55e';
      ctx.fillRect(this.x - 6, this.gapTop - 18, this.width + 12, 18);
      ctx.fillRect(this.x - 6, bottomY, this.width + 12, 18);
    }
  }

  class Coin {
    constructor(x, y, speed) {
      this.x = x;
      this.y = y;
      this.radius = 12;
      this.speed = speed;
    }

    update(dt) {
      this.x -= this.speed * dt;
    }

    isOffscreen() {
      return this.x + this.radius < 0;
    }

    collidesWith(bounds) {
      return (
        bounds.right > this.x - this.radius &&
        bounds.left < this.x + this.radius &&
        bounds.bottom > this.y - this.radius &&
        bounds.top < this.y + this.radius
      );
    }

    draw(ctx) {
      ctx.fillStyle = '#facc15';
      ctx.beginPath();
      ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  class Game {
    constructor() {
      this.canvas = document.getElementById('game-canvas');
      this.ctx = this.canvas.getContext('2d');
      this.scoreElement = document.getElementById('score');
      this.bestScoreElement = document.getElementById('best-score');
      this.overlayElement = document.getElementById('overlay');

      this.width = this.canvas.width;
      this.height = this.canvas.height;

      this.gravity = 1200;
      this.jumpVelocity = -360;
      this.pipeSpeed = 180;
      this.pipeWidth = 72;
      this.pipeGap = 170;
      this.pipeSpawnEvery = 1.45;
      this.groundHeight = 84;

      this.bestScore = 0;
      this.score = 0;
      this.lastTime = 0;
      this.spawnTimer = 0;
      this.state = 'idle';
      this.pipes = [];
      this.coins = [];
      this.bird = new Bird(120, this.height / 2);

      this.playerInitialized = false;
      this.currentPlayerId = null;
      this.currentDisplayName = 'Player';

      this.sessionRunCount = 0;
      this.sessionBestRun = 0;
      this.sessionLastScore = 0;

      this._bindEvents();
      this._syncBestScoreFromPython();
      this._reset(false);
      this._updateSessionPanel();
      this._updateEconomyUI();
      requestAnimationFrame(this._loop.bind(this));
    }

    _updateSessionPanel() {
      const playerName = document.getElementById('session-player-name');
      const bestRun = document.getElementById('session-best-run');
      const runCount = document.getElementById('session-run-count');
      const lastScore = document.getElementById('session-last-score');

      if (playerName) {
        playerName.textContent = this.currentDisplayName || 'Player';
      }

      if (bestRun) {
        bestRun.textContent = String(this.sessionBestRun);
      }

      if (runCount) {
        runCount.textContent = String(this.sessionRunCount);
      }

      if (lastScore) {
        lastScore.textContent = String(this.sessionLastScore);
      }
    }

    _updateEconomyUI() {
      if (!window.FlappyMedEconomy) return;
      const s = window.FlappyMedEconomy.getState();
      const livesEl = document.getElementById('hud-free-lives');
      const coinsEl = document.getElementById('hud-coins');
      const bonusLivesEl = document.getElementById('economy-bonus-lives');

      if (livesEl) livesEl.textContent = String(s.freeLives + s.bonusLives);
      if (coinsEl) coinsEl.textContent = String(s.coins);
      if (bonusLivesEl) bonusLivesEl.textContent = String(s.bonusLives);

      const buy1Btn = document.getElementById('buy-1-life-btn');
      const buy3Btn = document.getElementById('buy-3-lives-btn');
      if (buy1Btn) buy1Btn.disabled = s.coins < 15;
      if (buy3Btn) buy3Btn.disabled = s.coins < 40;
    }

    _bindEvents() {
      const nameInput = document.getElementById('display-name-input');
      const saveNameButton = document.getElementById('save-name-button');
      const nameFeedback = document.getElementById('name-feedback');

      const setNameFeedback = (message, type = '') => {
        if (!nameFeedback) {
          return;
        }
        nameFeedback.textContent = message;
        nameFeedback.className = `name-feedback ${type}`.trim();
      };

      window.addEventListener('flappy-med:leaderboard', (event) => {
        const data = event.detail || {};
        const list = document.getElementById('leaderboard-list');

        if (!list) {
          return;
        }

        list.innerHTML = '';

        if (data.offline) {
          list.innerHTML = '<li class="leaderboard-empty">Offline. Leaderboard unavailable.</li>';
          return;
        }

        const scores = data.items || [];

        if (scores.length === 0) {
          list.innerHTML = '<li class="leaderboard-empty">No scores yet</li>';
          return;
        }

        scores.forEach((entry, index) => {
          const li = document.createElement('li');
          li.className = 'leaderboard-item';

          const isCurrentPlayer =
            this.currentPlayerId && entry.player_id === this.currentPlayerId;

          if (isCurrentPlayer) {
            li.classList.add('current-player');
          }

          li.innerHTML = `
            <span class="rank">#${index + 1}</span>
            <span class="name">
              <span class="name-text" title="${entry.display_name || 'Player'}">
                ${entry.display_name || 'Player'}
              </span>
              ${isCurrentPlayer ? '<span class="you-badge">You</span>' : ''}
            </span>
            <span class="score">${entry.score}</span>
          `;

          list.appendChild(li);
        });
      });

      window.addEventListener('flappy-med:player-profile', (event) => {
        const profile = event.detail || {};
        this.currentPlayerId = profile.player_id || null;
        this.currentDisplayName = profile.display_name || 'Player';

        if (nameInput) {
          nameInput.value = this.currentDisplayName;
        }

        if (saveNameButton) {
          saveNameButton.disabled = false;
        }

        setNameFeedback('Saved.', 'success');
        this._updateSessionPanel();

        if (window.FlappyMedBridge) {
          window.FlappyMedBridge.requestLeaderboard();
        }
      });

      window.addEventListener('flappy-med:submit-result', (event) => {
        const result = event.detail || {};
        const personalBest = Number(result.personal_best || 0);

        this.sessionRunCount += 1;
        this.sessionLastScore = this.score;
        this.sessionBestRun = Math.max(this.sessionBestRun, personalBest, this.score);

        this._updateSessionPanel();

        if (window.FlappyMedBridge) {
          window.FlappyMedBridge.requestLeaderboard();
        }
      });

      if (saveNameButton && nameInput) {
        const handleSave = () => {
          const rawName = nameInput.value.trim().slice(0, 12);

          if (!rawName) {
            setNameFeedback('Name cannot be empty.', 'error');
            return;
          }

          if (rawName.length > 12) {
            setNameFeedback('Name must be 12 characters or less.', 'error');
            return;
          }

          if (window.FlappyMedBridge) {
            saveNameButton.disabled = true;
            setNameFeedback('Saving...', '');
            window.FlappyMedBridge.setDisplayName(rawName);
          }
        };

        saveNameButton.addEventListener('click', handleSave);

        nameInput.addEventListener('keydown', (e) => {
          if (e.key === 'Enter') {
            e.preventDefault();
            handleSave();
          }
        });

        nameInput.addEventListener('input', () => {
          const rawName = nameInput.value.trim();

          if (!rawName) {
            setNameFeedback('');
            return;
          }

          if (rawName.length > 12) {
            setNameFeedback('Name must be 12 characters or less.', 'error');
          } else {
            setNameFeedback(`${rawName.length}/12`, '');
          }
        });
      }

      window.addEventListener('keydown', (event) => {
        if (event.code === 'Space') {
          event.preventDefault();
          this._handleInput();
        }
      });

      this.canvas.addEventListener('mousedown', () => this._handleInput());
      this.canvas.addEventListener(
        'touchstart',
        (event) => {
          event.preventDefault();
          this._handleInput();
        },
        { passive: false }
      );

      window.addEventListener('flappy-med:economy-state', () => {
        this._updateEconomyUI();
      });

      window.addEventListener('flappy-med:python-state', (event) => {
        const payload = event.detail || {};
        const highScore = Number(payload.highScore || 0);
        this.bestScore = Math.max(this.bestScore, highScore);
        this.bestScoreElement.textContent = String(this.bestScore);
      });

      const storeModal = document.getElementById('store-modal');
      const storeOpenBtn = document.getElementById('store-open-btn');
      const storeCloseBtn = document.getElementById('store-modal-close');
      if (storeOpenBtn && storeModal) {
        storeOpenBtn.addEventListener('click', () => {
          storeModal.classList.add('store-modal-visible');
          this._updateEconomyUI();
        });
      }
      if (storeCloseBtn && storeModal) storeCloseBtn.addEventListener('click', () => storeModal.classList.remove('store-modal-visible'));
      if (storeModal) {
        storeModal.addEventListener('click', (e) => {
          if (e.target === storeModal) storeModal.classList.remove('store-modal-visible');
        });
      }
      window.addEventListener('keydown', (e) => { if (e.key === 'Escape' && storeModal) storeModal.classList.remove('store-modal-visible'); });

      const buy1LifeBtn = document.getElementById('buy-1-life-btn');
      const buy3LivesBtn = document.getElementById('buy-3-lives-btn');
      if (buy1LifeBtn) {
        buy1LifeBtn.addEventListener('click', () => {
          if (window.FlappyMedEconomy && window.FlappyMedEconomy.buyBonusLives(1, 15)) {
            this._updateEconomyUI();
          }
        });
      }
      if (buy3LivesBtn) {
        buy3LivesBtn.addEventListener('click', () => {
          if (window.FlappyMedEconomy && window.FlappyMedEconomy.buyBonusLives(3, 40)) {
            this._updateEconomyUI();
          }
        });
      }
    }

    _syncBestScoreFromPython() {
      if (window.FlappyMedBridge) {
        window.FlappyMedBridge.notifyReady();
      }
    }

    _ensurePlayerInitialized() {
      if (this.playerInitialized) {
        return;
      }

      if (window.FlappyMedBridge) {
        window.FlappyMedBridge.initPlayer();
        window.FlappyMedBridge.requestLeaderboard();
        this.playerInitialized = true;
      }
    }

    _handleInput() {
      this._ensurePlayerInitialized();

      if (this.state === 'idle' || this.state === 'dead') {
        if (window.FlappyMedEconomy) {
          const s = window.FlappyMedEconomy.getState();
          if (s.freeLives + s.bonusLives === 0) {
            this.state = 'dead';
            this._showOverlay('No lives left. Daily lives refill tomorrow!');
            return;
          }
        }
        this._reset(true);
        this.state = 'running';
        this._hideOverlay();
      }

      if (this.state === 'running') {
        this.bird.flap(this.jumpVelocity);
      }
    }

    _reset(preserveBestScore) {
      this.score = 0;
      this.spawnTimer = 0;
      this.pipes = [];
      this.coins = [];
      this.bird = new Bird(120, this.height / 2);

      if (!preserveBestScore) {
        this.bestScoreElement.textContent = String(this.bestScore);
      }

      this.scoreElement.textContent = '0';
      this.state = this.state === 'dead' ? 'dead' : 'idle';
      this._showOverlay(
        this.state === 'dead'
          ? 'Game over. Press Space or click to instantly restart.'
          : null
      );
    }

    _showOverlay(message) {
      const paragraph = this.overlayElement.querySelector('.overlay-subtle');
      if (paragraph && message) {
        paragraph.textContent = message;
      }
      this.overlayElement.classList.add('overlay-visible');
    }

    _hideOverlay() {
      const paragraph = this.overlayElement.querySelector('.overlay-subtle');
      if (paragraph) {
        paragraph.textContent =
          'Press Space / Click to start. Press again after death to instantly restart.';
      }
      this.overlayElement.classList.remove('overlay-visible');
    }

    _getDifficulty(score) {
      const speed = Math.min(SPEED_MAX, SPEED_BASE + score * SPEED_PER_POINT);
      const gap = Math.max(GAP_MIN, GAP_BASE - score * GAP_PER_POINT);
      return { speed, gap };
    }

    _spawnPipe() {
      const { speed, gap } = this._getDifficulty(this.score);
      const safeTop = 60;
      const safeBottom = this.height - this.groundHeight - 60 - gap;
      const gapTop = safeTop + Math.random() * Math.max(20, safeBottom - safeTop);

      this.pipes.push(
        new PipePair(
          this.width + 24,
          gapTop,
          gap,
          this.pipeWidth,
          speed,
          this.height - this.groundHeight
        )
      );

      if (Math.random() < 0.3) {
        if (Math.random() < 0.5) {
          // Safe: centered in the gap
          this.coins.push(new Coin(
            this.width + 24 + this.pipeWidth / 2,
            gapTop + gap / 2,
            speed
          ));
        } else {
          // Dangerous: between previous and new pipe, random vertical position
          this.coins.push(new Coin(
            (this.width + 24) - (speed * this.pipeSpawnEvery / 2) + (this.pipeWidth / 2),
            40 + Math.random() * ((this.height - this.groundHeight) - 80),
            speed
          ));
        }
      }
    }

    _kill() {
      this.state = 'dead';
      this._showOverlay('Game over. Press Space or click to instantly restart.');
      if (window.FlappyMedEconomy) {
        window.FlappyMedEconomy.consumeLife();
        this._updateEconomyUI();
      }

      if (this.score > this.bestScore) {
        this.bestScore = this.score;
        this.bestScoreElement.textContent = String(this.bestScore);

        if (window.FlappyMedBridge) {
          window.FlappyMedBridge.saveHighScore(this.bestScore);
        }
      }

      if (window.FlappyMedBridge) {
        window.FlappyMedBridge.submitScore(this.score);
      }
    }

    _update(dt) {
      if (this.state !== 'running') {
        return;
      }

      this.spawnTimer += dt;
      if (this.spawnTimer >= this.pipeSpawnEvery) {
        this.spawnTimer = 0;
        this._spawnPipe();
      }

      this.bird.update(this.gravity, dt);
      const birdBounds = this.bird.getBounds();

      if (birdBounds.top <= 0 || birdBounds.bottom >= this.height - this.groundHeight) {
        this._kill();
        return;
      }

      for (let i = this.pipes.length - 1; i >= 0; i--) {
        const pipe = this.pipes[i];
        pipe.update(dt);

        if (!pipe.passed && pipe.x + pipe.width < this.bird.x) {
          pipe.passed = true;
          this.score += 1;
          this.scoreElement.textContent = String(this.score);
        }

        if (pipe.collidesWith(birdBounds)) {
          this._kill();
          return;
        }

        if (pipe.isOffscreen()) {
          this.pipes.splice(i, 1);
        }
      }

      for (let i = this.coins.length - 1; i >= 0; i--) {
        const coin = this.coins[i];
        coin.update(dt);
        if (coin.collidesWith(birdBounds)) {
          if (window.FlappyMedEconomy) {
            window.FlappyMedEconomy.grantCoins(1);
            this._updateEconomyUI();
          }
          this.coins.splice(i, 1);
        } else if (coin.isOffscreen()) {
          this.coins.splice(i, 1);
        }
      }
    }

    _drawBackground() {
      const ctx = this.ctx;
      ctx.clearRect(0, 0, this.width, this.height);

      if (!this.bgGradient) {
        this.bgGradient = ctx.createLinearGradient(0, 0, 0, this.height);
        this.bgGradient.addColorStop(0, '#67e8f9');
        this.bgGradient.addColorStop(1, '#d9f99d');
      }
      ctx.fillStyle = this.bgGradient;
      ctx.fillRect(0, 0, this.width, this.height);

      ctx.fillStyle = 'rgba(255,255,255,0.4)';
      ctx.beginPath();
      ctx.arc(90, 90, 26, 0, Math.PI * 2);
      ctx.arc(120, 82, 22, 0, Math.PI * 2);
      ctx.arc(145, 92, 18, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = '#86efac';
      ctx.fillRect(0, this.height - this.groundHeight, this.width, this.groundHeight);
      ctx.fillStyle = '#65a30d';
      ctx.fillRect(0, this.height - this.groundHeight, this.width, 12);
    }

    _draw() {
      this._drawBackground();

      for (const pipe of this.pipes) {
        pipe.draw(this.ctx);
      }

      for (const coin of this.coins) {
        coin.draw(this.ctx);
      }

      this.bird.draw(this.ctx);
    }

    _loop(timestamp) {
      if (!this.lastTime) {
        this.lastTime = timestamp;
      }

      // Capping at 0.100s prevents the physics engine from going into literal slow-motion 
      // when Chromium throttles the frame rate on overloaded machines!
      const dt = Math.min((timestamp - this.lastTime) / 1000, 0.1);
      this.lastTime = timestamp;

      this._update(dt);
      this._draw();
      requestAnimationFrame(this._loop.bind(this));
    }
  }

  window.addEventListener('DOMContentLoaded', () => {
    new Game();
  });
})();