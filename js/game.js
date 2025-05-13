// Configuración del juego
const CONFIG = {
    APP_ID: "2XAQV6ZrvJdREfkF4fRlSZddijYT4jByys5KynhV",
    JS_KEY: "csfmCpmGKB2idAuTnSCBigbXNeoUA2DXQjuzTvEr",
    API_URL: "https://parseapi.back4app.com/classes/GameScore",
    GRAVITY: 0.5,
    JUMP_FORCE: -12,
    PLAYER_SPEED: 5,
    POWERUP_DURATION: {
        INVINCIBLE: 10,
        SPEED: 8
    }
};

// Estados del juego
const gameState = {
    player: null,
    enemies: [],
    collectibles: [],
    powerups: [],
    platforms: [],
    score: 0,
    lives: 3,
    level: 1,
    isRunning: false,
    playerName: "",
    animationFrame: 0,
    activePowerup: null,
    powerupEndTime: 0,
    keys: {
        left: false,
        right: false,
        up: false
    },
    isMobile: false
};

// Elementos del DOM
const elements = {
    gameScreen: document.getElementById("game-screen"),
    score: document.getElementById("score"),
    level: document.getElementById("level"),
    lives: document.getElementById("lives"),
    powerupTimer: document.getElementById("powerup-timer"),
    powerupTime: document.getElementById("powerup-time"),
    startScreen: document.getElementById("start-screen"),
    gameOverScreen: document.getElementById("game-over-screen"),
    finalScore: document.getElementById("final-score"),
    startBtn: document.getElementById("start-btn"),
    restartBtn: document.getElementById("restart-btn"),
    playerName: document.getElementById("player-name"),
    leaderboard: document.getElementById("leaderboard-list"),
    controls: document.getElementById("controls"),
    leftBtn: document.getElementById("left-btn"),
    rightBtn: document.getElementById("right-btn"),
    jumpBtn: document.getElementById("jump-btn"),
    upBtn: document.getElementById("up-btn"),
    sounds: {
        jump: document.getElementById("jump-sound"),
        collect: document.getElementById("collect-sound"),
        powerup: document.getElementById("powerup-sound"),
        gameover: document.getElementById("gameover-sound"),
        music: document.getElementById("background-music")
    }
};

// Sprites
const SPRITES = {
    player: {
        idle: "url('assets/sprites/brocoli/idle.png')",
        run1: "url('assets/sprites/brocoli/run1.png')",
        run2: "url('assets/sprites/brocoli/run2.png')",
        jump: "url('assets/sprites/brocoli/jump.png')"
    },
    enemies: {
        hamburguesa: "url('assets/sprites/enemies/hamburguesa.png')",
        pizza: "url('assets/sprites/enemies/pizza.png')",
        soda: "url('assets/sprites/enemies/soda.png')"
    },
    collectibles: {
        zanahoria: "url('assets/sprites/collectibles/zanahoria.png')",
        lechuga: "url('assets/sprites/collectibles/lechuga.png')",
        tomate: "url('assets/sprites/collectibles/tomate.png')"
    },
    powerups: {
        invencible: "url('assets/sprites/powerups/invencible.png')",
        velocidad: "url('assets/sprites/powerups/velocidad.png')"
    },
    backgrounds: [
        "url('assets/backgrounds/nivel1.png')",
        "url('assets/backgrounds/nivel2.png')"
    ]
};

// Detectar si es móvil
function detectMobile() {
    gameState.isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
    if (gameState.isMobile) {
        elements.controls.classList.remove("hidden");
        // Configurar volumen más bajo para móviles
        Object.values(elements.sounds).forEach(sound => {
            if (sound) sound.volume = 0.5;
        });
    } else {
        elements.sounds.music.volume = 0.3;
    }
}

// Inicializar el juego
function initGame() {
    resetGameState();
    createPlayer();
    generateLevel();
    gameState.isRunning = true;
    loadLeaderboard();
    elements.sounds.music.currentTime = 0;
    elements.sounds.music.play();
    requestAnimationFrame(gameLoop);
}

function resetGameState() {
    gameState.player = null;
    gameState.enemies = [];
    gameState.collectibles = [];
    gameState.powerups = [];
    gameState.platforms = [];
    gameState.score = 0;
    gameState.lives = 3;
    gameState.level = 1;
    gameState.animationFrame = 0;
    gameState.activePowerup = null;
    gameState.powerupEndTime = 0;
    
    elements.gameScreen.innerHTML = "";
    elements.gameScreen.style.backgroundImage = SPRITES.backgrounds[0];
    updateUI();
}

function createPlayer() {
    gameState.player = {
        element: document.createElement("div"),
        x: 50,
        y: 100,
        width: 50,
        height: 50,
        velX: 0,
        velY: 0,
        isJumping: false,
        isInvincible: false,
        hasSpeedBoost: false,
        direction: "right"
    };
    
    const player = gameState.player;
    player.element.className = "player";
    player.element.style.left = player.x + "px";
    player.element.style.top = player.y + "px";
    player.element.style.backgroundImage = SPRITES.player.idle;
    
    elements.gameScreen.appendChild(player.element);
}

function generateLevel() {
    const platformsCount = 5 + gameState.level;
    const enemiesCount = 3 + gameState.level;
    const collectiblesCount = 5 + gameState.level * 2;
    
    const bgIndex = Math.min(gameState.level - 1, SPRITES.backgrounds.length - 1);
    elements.gameScreen.style.backgroundImage = SPRITES.backgrounds[bgIndex];
    
    for (let i = 0; i < platformsCount; i++) {
        createPlatform(i, platformsCount);
    }
    
    for (let i = 0; i < enemiesCount; i++) {
        createEnemy(i, enemiesCount);
    }
    
    for (let i = 0; i < collectiblesCount; i++) {
        createCollectible(i, collectiblesCount);
    }
    
    if (Math.random() > 0.5) {
        createPowerup();
    }
}

function createPlatform(index, total) {
    const platform = {
        element: document.createElement("div"),
        x: index * (600 / total),
        y: 400 - (index % 3) * 50,
        width: 150,
        height: 20
    };
    
    platform.element.className = "platform";
    platform.element.style.left = platform.x + "px";
    platform.element.style.top = platform.y + "px";
    platform.element.style.width = platform.width + "px";
    platform.element.style.height = platform.height + "px";
    
    elements.gameScreen.appendChild(platform.element);
    gameState.platforms.push(platform);
}

function createEnemy(index, total) {
    const enemyTypes = Object.keys(SPRITES.enemies);
    const type = enemyTypes[Math.floor(Math.random() * enemyTypes.length)];
    
    const enemy = {
        element: document.createElement("div"),
        x: 200 + index * (400 / total),
        y: 350 - (index % 2) * 50,
        width: 40,
        height: 40,
        speed: (2 + gameState.level * 0.5) * (type === "pizza" ? 1.2 : 1),
        type: type
    };
    
    enemy.element.className = "enemy";
    enemy.element.style.backgroundImage = SPRITES.enemies[type];
    enemy.element.style.left = enemy.x + "px";
    enemy.element.style.top = enemy.y + "px";
    
    elements.gameScreen.appendChild(enemy.element);
    gameState.enemies.push(enemy);
}

function createCollectible(index, total) {
    const collectibleTypes = Object.keys(SPRITES.collectibles);
    const type = collectibleTypes[Math.floor(Math.random() * collectibleTypes.length)];
    const points = {
        zanahoria: 10,
        lechuga: 15,
        tomate: 20
    };
    
    const collectible = {
        element: document.createElement("div"),
        x: 50 + index * (700 / total),
        y: 200 + (index % 4) * 50,
        width: 30,
        height: 30,
        type: type,
        points: points[type],
        collected: false
    };
    
    collectible.element.className = "collectible";
    collectible.element.style.backgroundImage = SPRITES.collectibles[type];
    collectible.element.style.left = collectible.x + "px";
    collectible.element.style.top = collectible.y + "px";
    
    elements.gameScreen.appendChild(collectible.element);
    gameState.collectibles.push(collectible);
}

function createPowerup() {
    const powerupTypes = Object.keys(SPRITES.powerups);
    const type = powerupTypes[Math.floor(Math.random() * powerupTypes.length)];
    const duration = type === "invencible" ? CONFIG.POWERUP_DURATION.INVINCIBLE : CONFIG.POWERUP_DURATION.SPEED;
    
    const powerup = {
        element: document.createElement("div"),
        x: 200 + Math.random() * 400,
        y: 150 + Math.random() * 100,
        width: 30,
        height: 30,
        type: type,
        duration: duration,
        collected: false
    };
    
    powerup.element.className = "powerup";
    powerup.element.style.backgroundImage = SPRITES.powerups[type];
    powerup.element.style.left = powerup.x + "px";
    powerup.element.style.top = powerup.y + "px";
    
    elements.gameScreen.appendChild(powerup.element);
    gameState.powerups.push(powerup);
}

function gameLoop() {
    if (!gameState.isRunning) return;
    
    updatePlayer();
    updateEnemies();
    updateCollectibles();
    updatePowerups();
    checkCollisions();
    checkPlatformCollisions();
    checkLevelCompletion();
    updatePowerupTimer();
    
    gameState.animationFrame++;
    requestAnimationFrame(gameLoop);
}

function updatePlayer() {
    const player = gameState.player;
    
    player.velY += CONFIG.GRAVITY;
    player.y += player.velY;
    
    if (gameState.keys.left) {
        player.velX = -CONFIG.PLAYER_SPEED * (player.hasSpeedBoost ? 1.5 : 1);
        player.direction = "left";
    } else if (gameState.keys.right) {
        player.velX = CONFIG.PLAYER_SPEED * (player.hasSpeedBoost ? 1.5 : 1);
        player.direction = "right";
    } else {
        player.velX = 0;
    }
    
    player.x += player.velX;
    
    if (player.y > 450) {
        player.y = 450;
        player.velY = 0;
        player.isJumping = false;
    }
    
    if (player.x < 0) player.x = 0;
    if (player.x > 750) player.x = 750;
    
    updatePlayerSprite();
    
    player.element.style.left = player.x + "px";
    player.element.style.top = player.y + "px";
}

function updatePlayerSprite() {
    const player = gameState.player;
    
    player.element.style.transform = player.direction === "right" ? "scaleX(1)" : "scaleX(-1)";
    
    if (player.isJumping) {
        player.element.style.backgroundImage = SPRITES.player.jump;
    } else if (player.velX !== 0) {
        if (gameState.animationFrame % 10 === 0) {
            player.element.style.backgroundImage = 
                player.element.style.backgroundImage === SPRITES.player.run1 ? 
                SPRITES.player.run2 : SPRITES.player.run1;
        }
    } else {
        player.element.style.backgroundImage = SPRITES.player.idle;
    }
    
    player.element.style.opacity = player.isInvincible ? "0.7" : "1";
}

function updateEnemies() {
    gameState.enemies.forEach(enemy => {
        enemy.x += enemy.speed;
        
        if (enemy.x > 760 || enemy.x < 0) {
            enemy.speed *= -1;
            enemy.element.style.transform = enemy.speed > 0 ? "scaleX(1)" : "scaleX(-1)";
        }
        
        enemy.element.style.left = enemy.x + "px";
    });
}

function updateCollectibles() {
    gameState.collectibles.forEach(collectible => {
        if (!collectible.collected) {
            collectible.element.style.left = collectible.x + "px";
            collectible.element.style.top = collectible.y + "px";
        }
    });
}

function updatePowerups() {
    gameState.powerups.forEach(powerup => {
        if (!powerup.collected) {
            powerup.element.style.left = powerup.x + "px";
            powerup.element.style.top = powerup.y + "px";
        }
    });
}

function updatePowerupTimer() {
    if (gameState.activePowerup && Date.now() < gameState.powerupEndTime) {
        const remainingTime = Math.ceil((gameState.powerupEndTime - Date.now()) / 1000);
        elements.powerupTime.textContent = remainingTime;
        elements.powerupTimer.classList.remove("hidden");
    } else if (gameState.activePowerup) {
        deactivatePowerup();
    }
}

function deactivatePowerup() {
    const player = gameState.player;
    
    switch (gameState.activePowerup) {
        case "invencible":
            player.isInvincible = false;
            break;
        case "velocidad":
            player.hasSpeedBoost = false;
            break;
    }
    
    gameState.activePowerup = null;
    elements.powerupTimer.classList.add("hidden");
    player.element.style.opacity = "1";
}

function activatePowerup(type) {
    const player = gameState.player;
    gameState.activePowerup = type;
    gameState.powerupEndTime = Date.now() + CONFIG.POWERUP_DURATION[type.toUpperCase()] * 1000;
    
    switch (type) {
        case "invencible":
            player.isInvincible = true;
            break;
        case "velocidad":
            player.hasSpeedBoost = true;
            break;
    }
    
    elements.sounds.powerup.play();
}

function checkPlatformCollisions() {
    const player = gameState.player;
    let onPlatform = false;
    
    gameState.platforms.forEach(platform => {
        if (
            player.x < platform.x + platform.width &&
            player.x + player.width > platform.x &&
            player.y + player.height >= platform.y &&
            player.y + player.height <= platform.y + 10 &&
            player.velY >= 0
        ) {
            player.y = platform.y - player.height;
            player.velY = 0;
            player.isJumping = false;
            onPlatform = true;
        }
    });
    
    if (!onPlatform && player.y < 450) {
        player.isJumping = true;
    }
}

function checkCollisions() {
    const player = gameState.player;
    
    gameState.enemies.forEach(enemy => {
        if (
            !player.isInvincible &&
            player.x < enemy.x + enemy.width &&
            player.x + player.width > enemy.x &&
            player.y < enemy.y + enemy.height &&
            player.y + player.height > enemy.y
        ) {
            handleEnemyCollision();
        }
    });
    
    gameState.collectibles.forEach((collectible, index) => {
        if (
            !collectible.collected &&
            player.x < collectible.x + collectible.width &&
            player.x + player.width > collectible.x &&
            player.y < collectible.y + collectible.height &&
            player.y + player.height > collectible.y
        ) {
            handleCollectibleCollision(index);
        }
    });
    
    gameState.powerups.forEach((powerup, index) => {
        if (
            !powerup.collected &&
            player.x < powerup.x + powerup.width &&
            player.x + player.width > powerup.x &&
            player.y < powerup.y + powerup.height &&
            player.y + player.height > powerup.y
        ) {
            handlePowerupCollision(index);
        }
    });
}

function handleEnemyCollision() {
    gameState.lives--;
    updateUI();
    
    if (gameState.lives <= 0) {
        gameOver();
    } else {
        const player = gameState.player;
        player.x = 50;
        player.y = 100;
        player.velY = 0;
        player.isInvincible = true;
        
        setTimeout(() => {
            player.isInvincible = false;
        }, 2000);
    }
}

function createParticles(x, y, count, color) {
    for (let i = 0; i < count; i++) {
        const particle = document.createElement("div");
        particle.className = "particle";
        particle.style.backgroundColor = color || getRandomColor();
        particle.style.left = x + "px";
        particle.style.top = y + "px";
        
        // Dirección aleatoria para las partículas
        const angle = Math.random() * Math.PI * 2;
        const distance = 20 + Math.random() * 30;
        const tx = Math.cos(angle) * distance;
        const ty = Math.sin(angle) * distance;
        
        particle.style.setProperty("--tx", tx + "px");
        particle.style.setProperty("--ty", ty + "px");
        
        elements.gameScreen.appendChild(particle);
        
        // Eliminar la partícula después de la animación
        setTimeout(() => {
            particle.remove();
        }, 1000);
    }
}

function getRandomColor() {
    const colors = ["#FFD700", "#FF9800", "#FF5722", "#4CAF50", "#2196F3"];
    return colors[Math.floor(Math.random() * colors.length)];
}

function handleCollectibleCollision(index) {
    const collectible = gameState.collectibles[index];
    collectible.collected = true;
    gameState.score += collectible.points * gameState.level;
    
    // Crear efecto de partículas
    createParticles(
        collectible.x + collectible.width / 2,
        collectible.y + collectible.height / 2,
        10,
        "#FFD700"
    );
    
    elements.sounds.collect.play();
    collectible.element.remove();
    updateUI();
}

function handlePowerupCollision(index) {
    const powerup = gameState.powerups[index];
    powerup.collected = true;
    activatePowerup(powerup.type);
    
    // Crear efecto de partículas
    createParticles(
        powerup.x + powerup.width / 2,
        powerup.y + powerup.height / 2,
        15,
        powerup.type === "invencible" ? "#2196F3" : "#4CAF50"
    );
    
    powerup.element.remove();
}

function checkLevelCompletion() {
    const allCollected = gameState.collectibles.every(c => c.collected);
    if (allCollected && gameState.collectibles.length > 0) {
        // Efecto de partículas para completar nivel
        createParticles(
            gameState.player.x + gameState.player.width / 2,
            gameState.player.y + gameState.player.height / 2,
            30,
            "#FF5722"
        );
        
        gameState.level++;
        updateUI();
        generateLevel();
    }
}

function updateUI() {
    elements.score.textContent = gameState.score;
    elements.level.textContent = gameState.level;
    elements.lives.textContent = gameState.lives;
}

function gameOver() {
    gameState.isRunning = false;
    elements.finalScore.textContent = gameState.score;
    elements.gameOverScreen.classList.remove("hidden");
    elements.sounds.music.pause();
    elements.sounds.gameover.play();
    saveScore();
}

async function saveScore() {
    gameState.playerName = elements.playerName.value || "Jugador";
    
    const data = {
        playerName: gameState.playerName,
        score: gameState.score,
        level: gameState.level
    };
    
    try {
        const response = await fetch(CONFIG.API_URL, {
            method: "POST",
            headers: {
                "X-Parse-Application-Id": CONFIG.APP_ID,
                "X-Parse-JavaScript-Key": CONFIG.JS_KEY,
                "Content-Type": "application/json"
            },
            body: JSON.stringify(data)
        });
        const result = await response.json();
        console.log("Puntaje guardado:", result);
        loadLeaderboard();
    } catch (error) {
        console.error("Error al guardar el puntaje:", error);
    }
}

async function loadLeaderboard() {
    try {
        const response = await fetch(`${CONFIG.API_URL}?order=-score&limit=10`, {
            headers: {
                "X-Parse-Application-Id": CONFIG.APP_ID,
                "X-Parse-JavaScript-Key": CONFIG.JS_KEY
            }
        });
        const data = await response.json();
        displayLeaderboard(data.results);
    } catch (error) {
        console.error("Error al cargar la tabla de líderes:", error);
    }
}

function displayLeaderboard(scores) {
    elements.leaderboard.innerHTML = "";
    scores.forEach((score, index) => {
        const li = document.createElement("li");
        li.textContent = `${index + 1}. ${score.playerName}: ${score.score} (Nivel ${score.level})`;
        elements.leaderboard.appendChild(li);
    });
}

// Event Listeners
elements.startBtn.addEventListener("click", () => {
    if (elements.playerName.value.trim() === "") {
        alert("¡Ingresa tu nombre!");
        return;
    }
    elements.startScreen.classList.add("hidden");
    initGame();
});

elements.restartBtn.addEventListener("click", () => {
    elements.gameOverScreen.classList.add("hidden");
    initGame();
});

// Controles de teclado
document.addEventListener("keydown", (e) => {
    if (!gameState.isRunning) return;
    
    switch (e.key) {
        case "ArrowUp":
        case " ":
            if (!gameState.player.isJumping) {
                gameState.player.velY = CONFIG.JUMP_FORCE;
                gameState.player.isJumping = true;
                elements.sounds.jump.play();
            }
            gameState.keys.up = true;
            break;
        case "ArrowRight":
            gameState.keys.right = true;
            break;
        case "ArrowLeft":
            gameState.keys.left = true;
            break;
    }
});

document.addEventListener("keyup", (e) => {
    switch (e.key) {
        case "ArrowRight":
            gameState.keys.right = false;
            break;
        case "ArrowLeft":
            gameState.keys.left = false;
            break;
    }
});

// Controles táctiles
function setupTouchControls() {
    // Botón izquierdo
    elements.leftBtn.addEventListener("touchstart", (e) => {
        e.preventDefault();
        gameState.keys.left = true;
    });
    
    elements.leftBtn.addEventListener("touchend", (e) => {
        e.preventDefault();
        gameState.keys.left = false;
    });
    
    // Botón derecho
    elements.rightBtn.addEventListener("touchstart", (e) => {
        e.preventDefault();
        gameState.keys.right = true;
    });
    
    elements.rightBtn.addEventListener("touchend", (e) => {
        e.preventDefault();
        gameState.keys.right = false;
    });
    
    // Botón de salto
    elements.jumpBtn.addEventListener("touchstart", (e) => {
        e.preventDefault();
        if (!gameState.player.isJumping) {
            gameState.player.velY = CONFIG.JUMP_FORCE;
            gameState.player.isJumping = true;
            elements.sounds.jump.play();
        }
    });
    
    // Botón arriba (alternativo)
    elements.upBtn.addEventListener("touchstart", (e) => {
        e.preventDefault();
        if (!gameState.player.isJumping) {
            gameState.player.velY = CONFIG.JUMP_FORCE;
            gameState.player.isJumping = true;
            elements.sounds.jump.play();
        }
    });
}

// Inicialización
function init() {
    detectMobile();
    if (gameState.isMobile) {
        setupTouchControls();
    }
    loadLeaderboard();
}

// Iniciar el juego cuando se cargue la página
window.addEventListener("load", init);