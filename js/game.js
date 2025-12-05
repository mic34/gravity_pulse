// Global Error Handler
window.onerror = function (message, source, lineno, colno, error) {
    console.error("Game Error:", message, "at", source, ":", lineno, ":", colno);
    console.error("Stack:", error ? error.stack : "No stack trace");
    // Optional: Display error to user if critical
    return false; // Let default handler run too
};

// Game constants
// Game constants
// CANVAS_WIDTH and CANVAS_HEIGHT are now dynamic
let CANVAS_WIDTH = window.innerWidth;
let CANVAS_HEIGHT = window.innerHeight;
const PLAYER_RADIUS = 15;
const ENEMY_RADIUS = 10;
const REWARD_RADIUS = 8;
const ARENA_PADDING = 50;
const CENTER_ATTRACTION = 0.05;
const DASH_SPEED = 15;
const DASH_DURATION = 300; // ms
const DASH_COOLDOWN = 1000; // ms
const TARGET_FPS = 60;
const TARGET_FRAME_TIME = 1000 / TARGET_FPS;

// Sound Manager using Web Audio API
const SoundManager = {
    ctx: null,
    init: function () {
        try {
            window.AudioContext = window.AudioContext || window.webkitAudioContext;
            this.ctx = new AudioContext();
        } catch (e) {
            console.warn('Web Audio API not supported');
        }
    },
    playTone: function (freq, type, duration, vol = 0.1) {
        if (!this.ctx) return;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = type;
        osc.frequency.setValueAtTime(freq, this.ctx.currentTime);
        gain.gain.setValueAtTime(vol, this.ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + duration);
        osc.connect(gain);
        gain.connect(this.ctx.destination);
        osc.start();
        osc.stop(this.ctx.currentTime + duration);
    },
    playDash: function () {
        if (!this.ctx) return;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(150, this.ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(50, this.ctx.currentTime + 0.3);
        gain.gain.setValueAtTime(0.1, this.ctx.currentTime);
        gain.gain.linearRampToValueAtTime(0, this.ctx.currentTime + 0.3);
        osc.connect(gain);
        gain.connect(this.ctx.destination);
        osc.start();
        osc.stop(this.ctx.currentTime + 0.3);
    },
    playCollect: function () {
        this.playTone(880, 'sine', 0.1, 0.1);
        setTimeout(() => this.playTone(1760, 'sine', 0.2, 0.1), 50);
    },
    playHit: function () {
        if (!this.ctx) return;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'square';
        osc.frequency.setValueAtTime(100, this.ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(20, this.ctx.currentTime + 0.2);
        gain.gain.setValueAtTime(0.2, this.ctx.currentTime);
        gain.gain.linearRampToValueAtTime(0, this.ctx.currentTime + 0.2);
        osc.connect(gain);
        gain.connect(this.ctx.destination);
        osc.start();
        osc.stop(this.ctx.currentTime + 0.2);
    },
    playGameOver: function () {
        if (!this.ctx) return;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(200, this.ctx.currentTime);
        osc.frequency.linearRampToValueAtTime(50, this.ctx.currentTime + 1.5);
        gain.gain.setValueAtTime(0.2, this.ctx.currentTime);
        gain.gain.linearRampToValueAtTime(0, this.ctx.currentTime + 1.5);
        osc.connect(gain);
        gain.connect(this.ctx.destination);
        osc.start();
        osc.stop(this.ctx.currentTime + 1.5);
    }
};

// Game state
let canvas, ctx;
let player = { x: 0, y: 0, radius: 0, isDashing: false }; // Default safe player
let enemies = [];
let rewards = [];
let particles = [];
let score = 0, multiplier = 1, health = 100, lastTime, gameTime = 0, lastEnemySpawn = 0, dashEndTime = 0, lastDashTime = 0, gameLoopId;
let keys = {};
let centerX, centerY;
let arenaRadius;

// Game Flow State
let gameState = 'start'; // start, playing, paused, gameover
let currentWave = 1;
let waveTimer = 0;
let enemiesToSpawn = 0;
let waveInProgress = false;

// Initialize game
function init() {
    canvas = document.getElementById('game-canvas');
    ctx = canvas.getContext('2d');

    // Handle initial size and resize events
    handleResize();
    window.addEventListener('resize', handleResize);

    // Event listeners
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', e => keys[e.key] = false);

    document.getElementById('start-btn').addEventListener('click', startGame);
    document.getElementById('resume-btn').addEventListener('click', togglePause);
    document.getElementById('restart-btn').addEventListener('click', resetGame);

    // Initial render
    renderBackground();
}

function handleResize() {
    CANVAS_WIDTH = window.innerWidth;
    CANVAS_HEIGHT = window.innerHeight;

    canvas.width = CANVAS_WIDTH;
    canvas.height = CANVAS_HEIGHT;

    centerX = CANVAS_WIDTH / 2;
    centerY = CANVAS_HEIGHT / 2;
    arenaRadius = Math.min(centerX, centerY) - ARENA_PADDING;

    // Force a re-render if not playing loop
    if (gameState !== 'playing') {
        render();
    }
}

function handleKeyDown(e) {
    keys[e.key] = true;

    // Pause toggle
    if (e.key === 'Escape') {
        if (gameState === 'playing' || gameState === 'paused') {
            togglePause();
        }
    }
}

function startGame() {
    SoundManager.init();
    gameState = 'playing';
    document.getElementById('start-screen').classList.remove('active');
    document.getElementById('start-screen').style.display = 'none'; // Force hide
    resetGame();
}

function togglePause() {
    if (gameState === 'playing') {
        gameState = 'paused';
        document.getElementById('pause-screen').classList.add('active');
        cancelAnimationFrame(gameLoopId);
    } else if (gameState === 'paused') {
        gameState = 'playing';
        document.getElementById('pause-screen').classList.remove('active');
        lastTime = performance.now();
        gameLoopId = requestAnimationFrame(gameLoop);
    }
}

// Reset game state
function resetGame() {
    // Stop any existing game loop
    if (gameLoopId) {
        cancelAnimationFrame(gameLoopId);
    }

    gameState = 'playing';
    document.getElementById('game-over').classList.remove('active');
    document.getElementById('game-over').style.display = 'none'; // Force hide

    // Reset player
    player = {
        x: centerX,
        y: centerY,
        dx: 0,
        dy: 0,
        speed: 3,
        radius: PLAYER_RADIUS,
        isDashing: false
    };

    // Reset game state
    enemies = [];
    rewards = [];
    particles = [];
    score = 0;
    multiplier = 1;
    health = 100;
    gameTime = 0;
    lastTime = performance.now();
    lastEnemySpawn = 0;
    dashEndTime = 0;
    lastDashTime = 0;

    // Reset Wave System
    currentWave = 1;
    waveTimer = 0;
    enemiesToSpawn = 0;
    waveInProgress = false;
    startNextWave(); // Start first wave immediately

    // Clear any existing keys
    keys = {};

    // Reset UI
    updateUI();

    // Start a new game loop
    gameLoopId = requestAnimationFrame(gameLoop);
}

// Main game loop
function gameLoop(timestamp) {
    if (gameState !== 'playing') return;

    if (!lastTime) lastTime = timestamp;

    const deltaTime = timestamp - lastTime;
    lastTime = timestamp;
    gameTime = gameTime || 0;
    gameTime += deltaTime;

    update(deltaTime);
    render();

    gameLoopId = requestAnimationFrame(gameLoop);
}

// Update game state
function update(deltaTime) {
    // Calculate time scale (1.0 at 60fps)
    const timeScale = deltaTime / TARGET_FRAME_TIME;

    // Update player
    updatePlayer(timeScale);

    // Update enemies
    updateEnemies(timeScale);

    // Update rewards
    updateRewards(deltaTime); // Rewards use raw time for TTL

    // Spawn enemies (Wave System)
    manageWaves(deltaTime);

    // Update particles
    updateParticles(timeScale);

    // Check collisions
    checkCollisions();

    // Update UI
    updateUI();

    // Check game over
    if (health <= 0) {
        endGame();
    }
}

// Update player position and state
function updatePlayer(timeScale) {
    // Handle movement (WASD + ZQSD + Arrows)
    const left = keys['ArrowLeft'] || keys['a'] || keys['q'];
    const right = keys['ArrowRight'] || keys['d'];
    const up = keys['ArrowUp'] || keys['w'] || keys['z'];
    const down = keys['ArrowDown'] || keys['s'];

    const moveX = (right ? 1 : 0) - (left ? 1 : 0);
    const moveY = (down ? 1 : 0) - (up ? 1 : 0);

    // Normalize diagonal movement
    const len = Math.sqrt(moveX * moveX + moveY * moveY);
    const dirX = len > 0 ? moveX / len : 0;
    const dirY = len > 0 ? moveY / len : 0;

    // Apply movement
    player.dx = dirX * player.speed;
    player.dy = dirY * player.speed;

    // Apply center attraction
    const toCenterX = centerX - player.x;
    const toCenterY = centerY - player.y;
    const distToCenter = Math.sqrt(toCenterX * toCenterX + toCenterY * toCenterY);

    if (distToCenter > 0) {
        const centerDirX = toCenterX / distToCenter;
        const centerDirY = toCenterY / distToCenter;
        const attraction = CENTER_ATTRACTION * (1 + distToCenter / arenaRadius);

        player.dx += centerDirX * attraction;
        player.dy += centerDirY * attraction;
    }

    // Handle dash
    const now = Date.now();
    const isDashing = now < dashEndTime;
    const canDash = now - lastDashTime > DASH_COOLDOWN;

    if (keys[' '] && canDash && !isDashing) {
        dashEndTime = now + DASH_DURATION;
        lastDashTime = now;
        player.isDashing = true;
        SoundManager.playDash();

        // Dash toward center
        if (distToCenter > 0) {
            player.dx += (toCenterX / distToCenter) * DASH_SPEED;
            player.dy += (toCenterY / distToCenter) * DASH_SPEED;
        }
    } else if (now >= dashEndTime) {
        player.isDashing = false;
    }

    // Update position with timeScale
    player.x += player.dx * timeScale;
    player.y += player.dy * timeScale;

    // Keep player in bounds
    const distFromCenter = Math.sqrt((player.x - centerX) ** 2 + (player.y - centerY) ** 2);
    if (distFromCenter > arenaRadius - player.radius) {
        const angle = Math.atan2(player.y - centerY, player.x - centerX);
        player.x = centerX + Math.cos(angle) * (arenaRadius - player.radius);
        player.y = centerY + Math.sin(angle) * (arenaRadius - player.radius);
    }
}

// Spawn a new enemy
function spawnEnemy() {
    // Random position at edge of arena
    const angle = Math.random() * Math.PI * 2;
    const spawnDist = arenaRadius + 50;
    const x = centerX + Math.cos(angle) * spawnDist;
    const y = centerY + Math.sin(angle) * spawnDist;

    // Dynamic difficulty: Speed increases with game time
    // Base speed 1.5, increases by 0.5 every minute, cap at 5
    const speed = 1.5 + Math.min(gameTime / 60000 * 0.5, 3.5);

    enemies.push({
        x,
        y,
        speed,
        radius: ENEMY_RADIUS,
        color: '#ff003c' // Neon Red
    });
}

// Manage enemy waves
function manageWaves(deltaTime) {
    if (enemiesToSpawn > 0) {
        // Spawn enemies in bursts
        if (Math.random() < 0.1) { // 10% chance per frame to spawn if pending
            spawnEnemy();
            enemiesToSpawn--;
        }
    } else if (enemies.length === 0 && !waveInProgress) {
        // Start next wave after a short delay
        waveTimer += deltaTime;
        if (waveTimer > 2000) { // 2 seconds between waves
            startNextWave();
        }
    }
}

function startNextWave() {
    waveInProgress = true;
    waveTimer = 0;

    // Wave formula: Base 3 + 2 per wave
    enemiesToSpawn = 3 + (currentWave * 2);

    // Show wave notification (optional, could be added to HUD)
    console.log(`Starting Wave ${currentWave}`);

    currentWave++;
    waveInProgress = false;
}

// Update all enemies
function updateEnemies(timeScale) {
    for (let i = enemies.length - 1; i >= 0; i--) {
        const enemy = enemies[i];

        // Move toward player
        const dx = player.x - enemy.x;
        const dy = player.y - enemy.y;
        const dist = Math.sqrt(dx * dx + dy * dy);

        if (dist > 0) {
            enemy.x += (dx / dist) * enemy.speed * timeScale;
            enemy.y += (dy / dist) * enemy.speed * timeScale;
        }

        // Remove if too far outside arena
        const distFromCenter = Math.sqrt((enemy.x - centerX) ** 2 + (enemy.y - centerY) ** 2);
        if (distFromCenter > arenaRadius * 2) {
            enemies.splice(i, 1);
        }
    }
}

// Update all rewards
function updateRewards(deltaTime) {
    // Randomly spawn rewards near enemies
    if (Math.random() < 0.02 && enemies.length > 0) {
        const enemy = enemies[Math.floor(Math.random() * enemies.length)];
        const angle = Math.random() * Math.PI * 2;
        const dist = 30 + Math.random() * 50; // Spawn near but not on top of enemy

        rewards.push({
            x: enemy.x + Math.cos(angle) * dist,
            y: enemy.y + Math.sin(angle) * dist,
            radius: REWARD_RADIUS,
            value: 10 * multiplier
        });
    }

    // Update existing rewards
    for (let i = rewards.length - 1; i >= 0; i--) {
        const reward = rewards[i];

        // Fade out over time
        reward.ttl = (reward.ttl || 3000) - deltaTime; // Use deltaTime for consistent fading

        if (reward.ttl <= 0) {
            rewards.splice(i, 1);
        }
    }
}

// Update particles
function updateParticles(timeScale) {
    for (let i = particles.length - 1; i >= 0; i--) {
        const p = particles[i];
        p.x += p.dx * timeScale;
        p.y += p.dy * timeScale;
        p.alpha -= 0.02 * timeScale;

        if (p.alpha <= 0) {
            particles.splice(i, 1);
        }
    }
}

// Check for collisions
function checkCollisions() {
    // Player with enemies
    for (let i = 0; i < enemies.length; i++) {
        const enemy = enemies[i];
        const dx = player.x - enemy.x;
        const dy = player.y - enemy.y;
        const dist = Math.sqrt(dx * dx + dy * dy);

        if (dist < player.radius + enemy.radius) {
            if (player.isDashing) {
                // Destroy enemy if dashing
                createParticles(enemy.x, enemy.y, 'red');
                enemies.splice(i, 1);
                score += 50 * multiplier;
                SoundManager.playHit(); // Using hit sound for enemy death too for now
                i--;
            } else {
                // Take damage
                health -= 5;
                createParticles(player.x, player.y, 'white');
                SoundManager.playHit();

                // Knockback
                const knockback = 10;
                player.x += (dx / dist) * knockback;
                player.y += (dy / dist) * knockback;

                // Reset multiplier on hit
                multiplier = 1;
            }
        }
    }

    // Player with rewards
    for (let i = rewards.length - 1; i >= 0; i--) {
        const reward = rewards[i];
        const dx = player.x - reward.x;
        const dy = player.y - reward.y;
        const dist = Math.sqrt(dx * dx + dy * dy);

        if (dist < player.radius + reward.radius) {
            // Collect reward
            score += reward.value;
            multiplier += 0.1;
            createParticles(reward.x, reward.y, 'gold');
            SoundManager.playCollect();
            rewards.splice(i, 1);
        }
    }

    // Gradually heal when not taking damage
    if (health < 100 && Math.random() < 0.01) {
        health = Math.min(100, health + 0.5);
    }
}

// Create particle effect
function createParticles(x, y, color) {
    const count = 10;
    for (let i = 0; i < count; i++) {
        const angle = Math.random() * Math.PI * 2;
        const speed = 1 + Math.random() * 2;
        particles.push({
            x,
            y,
            dx: Math.cos(angle) * speed,
            dy: Math.sin(angle) * speed,
            radius: 2 + Math.random() * 3,
            color,
            alpha: 1
        });
    }
}

// Update UI elements
function updateUI() {
    document.getElementById('score').textContent = Math.floor(score);
    document.getElementById('multiplier').textContent = multiplier.toFixed(1) + 'x';
    document.getElementById('health').textContent = Math.ceil(health) + '%';
}

// End the game
function endGame() {
    gameState = 'gameover';
    SoundManager.playGameOver();
    document.getElementById('final-score').textContent = Math.floor(score);
    const gameOverScreen = document.getElementById('game-over');
    gameOverScreen.style.display = ''; // Clear inline display: none
    gameOverScreen.classList.add('active');
}

// Render the game
function render() {
    // Clear canvas
    ctx.clearRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

    // Draw background elements
    renderBackground();

    // Draw arena boundary with glow
    ctx.beginPath();
    ctx.arc(centerX, centerY, arenaRadius, 0, Math.PI * 2);
    ctx.strokeStyle = 'rgba(0, 243, 255, 0.5)';
    ctx.lineWidth = 3;
    ctx.shadowBlur = 20;
    ctx.shadowColor = 'rgba(0, 243, 255, 0.8)';
    ctx.stroke();
    ctx.shadowBlur = 0; // Reset shadow

    // Draw center attractor
    ctx.beginPath();
    ctx.arc(centerX, centerY, 50, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(188, 19, 254, 0.1)';
    ctx.fill();
    ctx.strokeStyle = 'rgba(188, 19, 254, 0.3)';
    ctx.lineWidth = 1;
    ctx.stroke();

    // Draw particles
    for (const p of particles) {
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
        ctx.fillStyle = p.color.replace(')', `, ${p.alpha})`).replace('rgb', 'rgba');
        ctx.shadowBlur = 10;
        ctx.shadowColor = p.color;
        ctx.fill();
        ctx.shadowBlur = 0;
    }

    // Draw rewards
    for (const reward of rewards) {
        const alpha = Math.min(1, (reward.ttl || 0) / 500); // Fade out last 500ms

        // Glow
        ctx.shadowBlur = 15;
        ctx.shadowColor = 'rgba(255, 215, 0, 0.8)';

        ctx.beginPath();
        ctx.arc(reward.x, reward.y, reward.radius, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(255, 215, 0, ${alpha})`; // Gold color
        ctx.fill();

        ctx.shadowBlur = 0;

        // Pulsing ring
        ctx.beginPath();
        ctx.arc(reward.x, reward.y, reward.radius * 1.5 + Math.sin(gameTime / 200) * 2, 0, Math.PI * 2);
        ctx.strokeStyle = `rgba(255, 215, 0, ${alpha * 0.5})`;
        ctx.lineWidth = 2;
        ctx.stroke();
    }

    // Draw enemies
    for (const enemy of enemies) {
        // Enemy glow
        ctx.shadowBlur = 15;
        ctx.shadowColor = '#ff003c';

        // Enemy body
        ctx.beginPath();
        ctx.arc(enemy.x, enemy.y, enemy.radius, 0, Math.PI * 2);
        ctx.fillStyle = '#ff003c';
        ctx.fill();

        ctx.shadowBlur = 0;

        // Enemy eye (facing player)
        const angle = Math.atan2(player.y - enemy.y, player.x - enemy.x);
        const eyeX = enemy.x + Math.cos(angle) * (enemy.radius * 0.6);
        const eyeY = enemy.y + Math.sin(angle) * (enemy.radius * 0.6);

        ctx.beginPath();
        ctx.arc(eyeX, eyeY, enemy.radius * 0.4, 0, Math.PI * 2);
        ctx.fillStyle = 'white';
        ctx.fill();

        // Enemy pupil
        ctx.beginPath();
        ctx.arc(eyeX, eyeY, enemy.radius * 0.2, 0, Math.PI * 2);
        ctx.fillStyle = 'black';
        ctx.fill();
    }

    // Draw player
    ctx.shadowBlur = 20;
    ctx.shadowColor = player.isDashing ? '#00f3ff' : '#00f3ff';

    ctx.beginPath();
    ctx.arc(player.x, player.y, player.radius, 0, Math.PI * 2);
    ctx.fillStyle = player.isDashing ? '#fff' : '#00f3ff';
    ctx.fill();

    ctx.shadowBlur = 0;

    // Player glow when dashing
    if (player.isDashing) {
        ctx.beginPath();
        ctx.arc(player.x, player.y, player.radius * 1.5, 0, Math.PI * 2);
        const gradient = ctx.createRadialGradient(
            player.x, player.y, player.radius,
            player.x, player.y, player.radius * 1.5
        );
        gradient.addColorStop(0, 'rgba(0, 243, 255, 0.8)');
        gradient.addColorStop(1, 'rgba(0, 243, 255, 0)');
        ctx.fillStyle = gradient;
        ctx.fill();
    }

    // Draw player direction indicator
    ctx.beginPath();
    ctx.moveTo(player.x, player.y);

    // Calculate direction based on keys
    const left = keys['ArrowLeft'] || keys['a'] || keys['q'];
    const right = keys['ArrowRight'] || keys['d'];
    const up = keys['ArrowUp'] || keys['w'] || keys['z'];
    const down = keys['ArrowDown'] || keys['s'];

    const angle = Math.atan2(
        (down ? 1 : 0) - (up ? 1 : 0),
        (right ? 1 : 0) - (left ? 1 : 0)
    );

    ctx.lineTo(
        player.x + Math.cos(angle) * player.radius * 1.5,
        player.y + Math.sin(angle) * player.radius * 1.5
    );
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.8)';
    ctx.lineWidth = 2;
    ctx.stroke();
}

function renderBackground() {
    // Draw background grid (Retro/Neon style)
    ctx.strokeStyle = 'rgba(0, 243, 255, 0.05)';
    ctx.lineWidth = 1;
    const gridSize = 50;
    const offset = (gameTime / 50) % gridSize;

    // Vertical lines
    for (let x = offset; x < CANVAS_WIDTH; x += gridSize) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, CANVAS_HEIGHT);
        ctx.stroke();
    }

    // Horizontal lines
    for (let y = offset; y < CANVAS_HEIGHT; y += gridSize) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(CANVAS_WIDTH, y);
        ctx.stroke();
    }
}

// Start the game when the page loads
window.onload = init;
