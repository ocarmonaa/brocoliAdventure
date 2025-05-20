// Constantes del juego
const GAME_WIDTH = 800;
const GAME_HEIGHT = 600;
const PLAYER_WIDTH = 50; // Reducido de 60 a 50
const PLAYER_HEIGHT = 50; // Reducido de 60 a 50
const ENEMY_WIDTH = 50;
const ENEMY_HEIGHT = 50;
const BULLET_WIDTH = 10;
const BULLET_HEIGHT = 25;
const POWERUP_WIDTH = 35;
const POWERUP_HEIGHT = 35;

// Variables globales
let canvas, ctx;
let gameActive = false;
let gamePaused = false;
let score = 0;
let lives = 3;
let level = 1;
let difficulty = 'medium';
let enemies = [];
let bullets = [];
let powerUps = [];
let enemySpawnRate = 1000;
let lastEnemySpawn = 0;
let player;
let keys = {};
let animationId;
let levelComplete = false;
let levelEnemiesToDefeat = 10;
let enemiesDefeated = 0;
let assets = {};
let assetsLoaded = false;
let touchControls = {
    left: false,
    right: false,
    shoot: false
};

// Configuraciones por dificultad
const difficultySettings = {
    easy: {
        playerSpeed: 8,
        enemySpeed: 2,
        enemyHealth: 1,
        enemySpawnRate: 1500,
        levelEnemies: [10, 15, 20]
    },
    medium: {
        playerSpeed: 7,
        enemySpeed: 3,
        enemyHealth: 1,
        enemySpawnRate: 1000,
        levelEnemies: [15, 20, 25]
    },
    hard: {
        playerSpeed: 6,
        enemySpeed: 4,
        enemyHealth: 2,
        enemySpawnRate: 800,
        levelEnemies: [20, 25, 30]
    }
};

// Cargar assets
function loadAssets(callback) {
    const assetPaths = {
        player: 'assets/player.png',
        enemies: [
            'assets/enemy1.png',
            'assets/enemy2.png',
            'assets/enemy3.png',
            'assets/enemy4.png',
            'assets/enemy5.png'
        ],
        powerups: [
            'assets/powerup1.png',
            'assets/powerup2.png',
            'assets/powerup3.png'
        ],
        bullet: 'assets/bullet.png'
    };

    let loaded = 0;
    const totalAssets = 1 + assetPaths.enemies.length + assetPaths.powerups.length + 1;
    
    // Cargar jugador
    assets.player = new Image();
    assets.player.src = assetPaths.player;
    assets.player.onload = () => {
        loaded++;
        if (loaded === totalAssets) callback();
    };
    assets.player.onerror = () => {
        console.error("Error loading player image");
        loaded++;
        if (loaded === totalAssets) callback();
    };

    // Cargar enemigos
    assets.enemies = [];
    assetPaths.enemies.forEach((path, index) => {
        assets.enemies[index] = new Image();
        assets.enemies[index].src = path;
        assets.enemies[index].onload = () => {
            loaded++;
            if (loaded === totalAssets) callback();
        };
        assets.enemies[index].onerror = (e) => {
            console.error(`Error loading enemy image ${index}`, e);
            loaded++;
            if (loaded === totalAssets) callback();
        };
    });

    // Cargar powerups
    assets.powerups = [];
    assetPaths.powerups.forEach((path, index) => {
        assets.powerups[index] = new Image();
        assets.powerups[index].src = path;
        assets.powerups[index].onload = () => {
            loaded++;
            if (loaded === totalAssets) callback();
        };
        assets.powerups[index].onerror = () => {
            console.error(`Error loading powerup image ${index}`);
            loaded++;
            if (loaded === totalAssets) callback();
        };
    });

    // Cargar bala
    assets.bullet = new Image();
    assets.bullet.src = assetPaths.bullet;
    assets.bullet.onload = () => {
        loaded++;
        if (loaded === totalAssets) callback();
    };
    assets.bullet.onerror = () => {
        console.error("Error loading bullet image");
        loaded++;
        if (loaded === totalAssets) callback();
    };
}

// Clase del jugador (Brócoli)
class Player {
    constructor() {
        this.width = PLAYER_WIDTH;
        this.height = PLAYER_HEIGHT;
        this.x = GAME_WIDTH / 2 - this.width / 2;
        this.y = GAME_HEIGHT - this.height - 80; // Ajustado para subir más al jugador
        this.speed = difficultySettings[difficulty].playerSpeed;
        this.shootCooldown = 500;
        this.lastShot = 0;
        this.isShooting = false;
        this.image = assets.player;
        this.isHit = false;
        this.hitTimer = 0;
    }

    draw() {
        if (!this.image) {
            // Fallback si no hay imagen
            ctx.fillStyle = this.isHit ? '#ff4e4e' : '#4eff4e';
            ctx.fillRect(this.x, this.y, this.width, this.height);
            return;
        }

        // Dibujar sprite con fondo transparente
        ctx.drawImage(this.image, this.x, this.y, this.width, this.height);
        
        // Efecto de daño
        if (this.isHit) {
            ctx.fillStyle = 'rgba(255, 78, 78, 0.3)';
            ctx.fillRect(this.x, this.y, this.width, this.height);
        }
        
        // Efecto de brillo
        ctx.fillStyle = 'rgba(78, 255, 78, 0.2)';
        ctx.beginPath();
        ctx.arc(this.x + this.width / 2, this.y + this.height / 2, this.width / 2 + 5, 0, Math.PI * 2);
        ctx.fill();
    }

    update() {
        if ((keys['ArrowLeft'] || touchControls.left) && this.x > 0) {
            this.x -= this.speed;
        }
        if ((keys['ArrowRight'] || touchControls.right) && this.x < GAME_WIDTH - this.width) {
            this.x += this.speed;
        }
        
        if ((keys[' '] || keys['ArrowUp'] || touchControls.shoot) && !this.isShooting) {
            this.isShooting = true;
            this.shoot();
        } else if (!keys[' '] && !keys['ArrowUp'] && !touchControls.shoot) {
            this.isShooting = false;
        }
        
        if (this.isShooting && Date.now() - this.lastShot > this.shootCooldown) {
            this.shoot();
        }
        
        if (this.isHit && Date.now() - this.hitTimer > 200) {
            this.isHit = false;
        }
    }

    shoot() {
        if (Date.now() - this.lastShot >= this.shootCooldown) {
            const bulletX = this.x + this.width / 2 - BULLET_WIDTH / 2;
            const bulletY = this.y - BULLET_HEIGHT;
            bullets.push(new Bullet(bulletX, bulletY));
            this.lastShot = Date.now();
        }
    }

    hit() {
        this.isHit = true;
        this.hitTimer = Date.now();
    }
}

// Clase de enemigos (Comida chatarra)
class Enemy {
    constructor(x, y, type = 0) {
        this.width = ENEMY_WIDTH;
        this.height = ENEMY_HEIGHT;
        this.x = x;
        this.y = y;
        this.speed = difficultySettings[difficulty].enemySpeed;
        this.type = type;
        this.health = difficultySettings[difficulty].enemyHealth;
        this.image = assets.enemies[type % assets.enemies.length];
    }

    draw() {
        if (!this.image) {
            // Fallback si no hay imagen
            ctx.fillStyle = '#ff4e4e';
            ctx.fillRect(this.x, this.y, this.width, this.height);
            return;
        }
        
        ctx.drawImage(this.image, this.x, this.y, this.width, this.height);
    }

    update() {
        this.y += this.speed;
    }

    hit() {
        this.health--;
        return this.health <= 0;
    }
}

// Clase de balas
class Bullet {
    constructor(x, y) {
        this.width = BULLET_WIDTH;
        this.height = BULLET_HEIGHT;
        this.x = x;
        this.y = y;
        this.speed = 10;
        this.image = assets.bullet;
    }

    draw() {
        if (!this.image) {
            // Fallback si no hay imagen
            ctx.fillStyle = '#ffff4e';
            ctx.fillRect(this.x, this.y, this.width, this.height);
            return;
        }
        
        ctx.drawImage(this.image, this.x, this.y, this.width, this.height);
    }

    update() {
        this.y -= this.speed;
    }
}

// Clase de power-ups
class PowerUp {
    constructor(x, y, type = 0) {
        this.width = POWERUP_WIDTH;
        this.height = POWERUP_HEIGHT;
        this.x = x;
        this.y = y;
        this.speed = 2;
        this.type = type;
        this.image = assets.powerups[type % assets.powerups.length];
    }

    draw() {
        if (!this.image) {
            // Fallback si no hay imagen
            ctx.fillStyle = '#4e4eff';
            ctx.fillRect(this.x, this.y, this.width, this.height);
            return;
        }
        
        ctx.drawImage(this.image, this.x, this.y, this.width, this.height);
        
        // Efecto de brillo
        ctx.fillStyle = 'rgba(78, 78, 255, 0.2)';
        ctx.beginPath();
        ctx.arc(this.x + this.width / 2, this.y + this.height / 2, this.width / 2 + 5, 0, Math.PI * 2);
        ctx.fill();
    }

    update() {
        this.y += this.speed;
    }
}

// Inicializar el juego
function initGame() {
    canvas = document.getElementById('game-canvas');
    ctx = canvas.getContext('2d');
    
    // Configurar tamaño del canvas
    canvas.width = GAME_WIDTH;
    canvas.height = GAME_HEIGHT;
    
    // Cargar assets y comenzar el juego
    loadAssets(() => {
        assetsLoaded = true;
        setupEventListeners();
        showScreen('start-screen');
    });
}

// Configurar event listeners
function setupEventListeners() {
    // Eventos de teclado
    document.addEventListener('keydown', (e) => {
        keys[e.key] = true;
        
        // Pausar con la tecla ESC
        if (e.key === 'Escape' && gameActive) {
            togglePause();
        }
    });
    
    document.addEventListener('keyup', (e) => {
        keys[e.key] = false;
    });
    
    // Botones de dificultad
    document.getElementById('easy-btn').addEventListener('click', () => {
        difficulty = 'easy';
        updateDifficultyButtons();
    });
    
    document.getElementById('medium-btn').addEventListener('click', () => {
        difficulty = 'medium';
        updateDifficultyButtons();
    });
    
    document.getElementById('hard-btn').addEventListener('click', () => {
        difficulty = 'hard';
        updateDifficultyButtons();
    });
    
    // Botón de inicio
    document.getElementById('start-btn').addEventListener('click', startGame);
    
    // Botón de pausa
    document.getElementById('pause-btn').addEventListener('click', togglePause);
    
    // Botón de continuar
    document.getElementById('resume-btn').addEventListener('click', togglePause);
    
    // Botón de reiniciar
    document.getElementById('restart-btn').addEventListener('click', () => {
        resetGame();
        startGame();
    });
    
    // Botón de jugar de nuevo
    document.getElementById('playagain-btn').addEventListener('click', () => {
        resetGame();
        startGame();
    });
    
    // Botón de siguiente nivel
    document.getElementById('next-level-btn').addEventListener('click', nextLevel);
    
    // Controles táctiles
    document.getElementById('left-btn').addEventListener('touchstart', (e) => {
        e.preventDefault();
        touchControls.left = true;
    });
    document.getElementById('left-btn').addEventListener('touchend', (e) => {
        e.preventDefault();
        touchControls.left = false;
    });
    document.getElementById('left-btn').addEventListener('mousedown', () => {
        touchControls.left = true;
    });
    document.getElementById('left-btn').addEventListener('mouseup', () => {
        touchControls.left = false;
    });
    document.getElementById('left-btn').addEventListener('mouseleave', () => {
        touchControls.left = false;
    });
    
    document.getElementById('right-btn').addEventListener('touchstart', (e) => {
        e.preventDefault();
        touchControls.right = true;
    });
    document.getElementById('right-btn').addEventListener('touchend', (e) => {
        e.preventDefault();
        touchControls.right = false;
    });
    document.getElementById('right-btn').addEventListener('mousedown', () => {
        touchControls.right = true;
    });
    document.getElementById('right-btn').addEventListener('mouseup', () => {
        touchControls.right = false;
    });
    document.getElementById('right-btn').addEventListener('mouseleave', () => {
        touchControls.right = false;
    });
    
    document.getElementById('shoot-btn').addEventListener('touchstart', (e) => {
        e.preventDefault();
        touchControls.shoot = true;
    });
    document.getElementById('shoot-btn').addEventListener('touchend', (e) => {
        e.preventDefault();
        touchControls.shoot = false;
    });
    document.getElementById('shoot-btn').addEventListener('mousedown', () => {
        touchControls.shoot = true;
    });
    document.getElementById('shoot-btn').addEventListener('mouseup', () => {
        touchControls.shoot = false;
    });
    document.getElementById('shoot-btn').addEventListener('mouseleave', () => {
        touchControls.shoot = false;
    });
}

// Actualizar botones de dificultad
function updateDifficultyButtons() {
    document.getElementById('easy-btn').classList.toggle('active', difficulty === 'easy');
    document.getElementById('medium-btn').classList.toggle('active', difficulty === 'medium');
    document.getElementById('hard-btn').classList.toggle('active', difficulty === 'hard');
}

// Mostrar una pantalla específica
function showScreen(screenId) {
    document.querySelectorAll('.screen').forEach(screen => {
        screen.classList.add('hidden');
    });
    document.getElementById(screenId).classList.remove('hidden');
}

// Comenzar el juego
function startGame() {
    if (!assetsLoaded) return;
    
    // Reiniciar estado del juego
    resetGameState();
    
    // Configurar nivel
    levelEnemiesToDefeat = difficultySettings[difficulty].levelEnemies[level - 1] || 10;
    enemySpawnRate = difficultySettings[difficulty].enemySpawnRate;
    
    // Crear jugador
    player = new Player();
    
    // Mostrar pantalla de juego
    showScreen('game-screen');
    gameActive = true;
    gamePaused = false;
    
    // Iniciar bucle del juego
    gameLoop();
}

// Reiniciar estado del juego
function resetGameState() {
    enemies = [];
    bullets = [];
    powerUps = [];
    score = 0;
    lives = 3;
    level = 1;
    enemiesDefeated = 0;
    levelComplete = false;
    lastEnemySpawn = 0;
    
    updateUI();
}

// Reiniciar juego completamente
function resetGame() {
    gameActive = false;
    gamePaused = false;
    cancelAnimationFrame(animationId);
    resetGameState();
}

// Bucle principal del juego
function gameLoop() {
    if (!gameActive || gamePaused) return;
    
    // Limpiar canvas
    ctx.clearRect(0, 0, GAME_WIDTH, GAME_HEIGHT);
    
    // Actualizar y dibujar elementos del juego
    updateGame();
    drawGame();
    
    // Continuar el bucle
    animationId = requestAnimationFrame(gameLoop);
}

// Actualizar estado del juego
function updateGame() {
    // Actualizar jugador
    player.update();
    
    // Generar enemigos
    if (Date.now() - lastEnemySpawn > enemySpawnRate && enemiesDefeated < levelEnemiesToDefeat) {
        spawnEnemy();
        lastEnemySpawn = Date.now();
    }
    
    // Actualizar enemigos
    for (let i = enemies.length - 1; i >= 0; i--) {
        enemies[i].update();
        
        // Eliminar enemigos que salen de la pantalla
        if (enemies[i].y > GAME_HEIGHT) {
            enemies.splice(i, 1);
        }
    }
    
    // Actualizar balas
    for (let i = bullets.length - 1; i >= 0; i--) {
        bullets[i].update();
        
        // Eliminar balas que salen de la pantalla
        if (bullets[i].y + bullets[i].height < 0) {
            bullets.splice(i, 1);
        }
    }
    
    // Detectar colisiones
    checkCollisions();
    
    // Verificar si se completó el nivel
    if (enemiesDefeated >= levelEnemiesToDefeat && enemies.length === 0 && !levelComplete) {
        levelComplete = true;
        completeLevel();
    }
    
    // Actualizar UI
    updateUI();
}

// Dibujar elementos del juego
function drawGame() {
    // Dibujar jugador
    player.draw();
    
    // Dibujar enemigos
    enemies.forEach(enemy => enemy.draw());
    
    // Dibujar balas
    bullets.forEach(bullet => bullet.draw());
    
    // Dibujar power-ups
    powerUps.forEach(powerUp => powerUp.draw());
}

// Generar un enemigo
function spawnEnemy() {
    const x = Math.random() * (GAME_WIDTH - ENEMY_WIDTH);
    const y = -ENEMY_HEIGHT;
    const type = Math.floor(Math.random() * 5); // 5 tipos de enemigos
    enemies.push(new Enemy(x, y, type));
}

// Verificar colisiones
function checkCollisions() {
    // Colisiones entre balas y enemigos
    for (let i = bullets.length - 1; i >= 0; i--) {
        for (let j = enemies.length - 1; j >= 0; j--) {
            if (checkCollision(bullets[i], enemies[j])) {
                const enemyDestroyed = enemies[j].hit();
                if (enemyDestroyed) {
                    enemies.splice(j, 1);
                    enemiesDefeated++;
                    score += 100;
                    
                    // Posibilidad de generar un power-up
                    if (Math.random() < 0.1) {
                        spawnPowerUp(enemies[j].x + enemies[j].width / 2, enemies[j].y + enemies[j].height / 2);
                    }
                }
                bullets.splice(i, 1);
                break;
            }
        }
    }
    
    // Colisiones entre jugador y enemigos
    for (let i = enemies.length - 1; i >= 0; i--) {
        if (checkCollision(player, enemies[i])) {
            player.hit();
            enemies.splice(i, 1);
            lives--;
            
            if (lives <= 0) {
                gameOver();
            }
        }
    }
    
    // Colisiones entre jugador y power-ups
    for (let i = powerUps.length - 1; i >= 0; i--) {
        if (checkCollision(player, powerUps[i])) {
            applyPowerUp(powerUps[i].type);
            powerUps.splice(i, 1);
        }
    }
}

// Verificar colisión entre dos objetos
function checkCollision(obj1, obj2) {
    return obj1.x < obj2.x + obj2.width &&
           obj1.x + obj1.width > obj2.x &&
           obj1.y < obj2.y + obj2.height &&
           obj1.y + obj1.height > obj2.y;
}

// Generar un power-up
function spawnPowerUp(x, y) {
    const type = Math.floor(Math.random() * 3); // 3 tipos de power-ups
    powerUps.push(new PowerUp(x, y, type));
}

// Aplicar efecto de power-up
function applyPowerUp(type) {
    switch (type) {
        case 0: // Vida extra
            lives++;
            break;
        case 1: // Puntos extra
            score += 500;
            break;
        case 2: // Disparo rápido temporal
            player.shootCooldown = 200;
            setTimeout(() => {
                player.shootCooldown = 500;
            }, 5000);
            break;
    }
}

// Completar nivel
function completeLevel() {
    gameActive = false;
    cancelAnimationFrame(animationId);
    
    // Mostrar pantalla de nivel completado
    document.getElementById('level-score').textContent = `Puntaje: ${score}`;
    showScreen('level-complete-screen');
}

// Pasar al siguiente nivel
function nextLevel() {
    level++;
    enemiesDefeated = 0;
    levelComplete = false;
    
    // Actualizar número de enemigos para el nuevo nivel
    levelEnemiesToDefeat = difficultySettings[difficulty].levelEnemies[level - 1] || levelEnemiesToDefeat + 5;
    
    // Mostrar pantalla de juego
    showScreen('game-screen');
    gameActive = true;
    gamePaused = false;
    
    // Iniciar bucle del juego
    gameLoop();
}

// Game over
function gameOver() {
    gameActive = false;
    cancelAnimationFrame(animationId);
    
    // Mostrar pantalla de game over
    document.getElementById('final-score').textContent = `Puntaje: ${score}`;
    showScreen('gameover-screen');
}

// Pausar/continuar juego
function togglePause() {
    if (!gameActive) return;
    
    gamePaused = !gamePaused;
    
    if (gamePaused) {
        cancelAnimationFrame(animationId);
        showScreen('pause-screen');
    } else {
        showScreen('game-screen');
        gameLoop();
    }
}

// Actualizar UI
function updateUI() {
    document.getElementById('score').textContent = score;
    document.getElementById('level').textContent = `Nivel ${level}`;
    
    // Actualizar vidas (mostrar corazones)
    let hearts = '';
    for (let i = 0; i < Math.max(0, lives); i++) {
        hearts += '❤️';
    }
    document.getElementById('lives').textContent = hearts;
}

// Iniciar el juego cuando se carga la página
window.addEventListener('load', initGame);