// Constantes del juego
const GAME_WIDTH = 800;
const GAME_HEIGHT = 600;
const PLAYER_WIDTH = 50;
const PLAYER_HEIGHT = 50;
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
    shoot: false,
    touchStartX: 0,
    touchStartY: 0,
    touchMoveX: 0,
    touchMoveY: 0,
    isDragging: false
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
        this.y = GAME_HEIGHT - this.height - 80;
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
            ctx.fillStyle = this.isHit ? '#ff4e4e' : '#4eff4e';
            ctx.fillRect(this.x, this.y, this.width, this.height);
            return;
        }

        ctx.drawImage(this.image, this.x, this.y, this.width, this.height);
        
        if (this.isHit) {
            ctx.fillStyle = 'rgba(255, 78, 78, 0.3)';
            ctx.fillRect(this.x, this.y, this.width, this.height);
        }
        
        ctx.fillStyle = 'rgba(78, 255, 78, 0.2)';
        ctx.beginPath();
        ctx.arc(this.x + this.width / 2, this.y + this.height / 2, this.width / 2 + 5, 0, Math.PI * 2);
        ctx.fill();
    }

    update() {
        // Movimiento con teclado o controles táctiles
        if ((keys['ArrowLeft'] || touchControls.left) && this.x > 0) {
            this.x -= this.speed;
        }
        if ((keys['ArrowRight'] || touchControls.right) && this.x < GAME_WIDTH - this.width) {
            this.x += this.speed;
        }
        
        // Movimiento por arrastre táctil
        if (touchControls.isDragging) {
            const moveX = touchControls.touchMoveX - touchControls.touchStartX;
            const newX = this.x + moveX * 1.5; // Ajustar sensibilidad del arrastre
            
            // Limitar movimiento dentro de los bordes
            if (newX > 0 && newX < GAME_WIDTH - this.width) {
                this.x = newX;
            }
            
            // Actualizar posición inicial para el próximo movimiento
            touchControls.touchStartX = touchControls.touchMoveX;
        }
        
        // Disparo con teclado o toque táctil
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
            ctx.fillStyle = '#4e4eff';
            ctx.fillRect(this.x, this.y, this.width, this.height);
            return;
        }
        
        ctx.drawImage(this.image, this.x, this.y, this.width, this.height);
        
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
    
    canvas.width = GAME_WIDTH;
    canvas.height = GAME_HEIGHT;
    
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
        
        if (e.key === 'Escape' && gameActive) {
            togglePause();
        }
    });
    
    document.addEventListener('keyup', (e) => {
        keys[e.key] = false;
    });
    
    // Eventos táctiles para el canvas
    canvas.addEventListener('touchstart', handleTouchStart, { passive: false });
    canvas.addEventListener('touchmove', handleTouchMove, { passive: false });
    canvas.addEventListener('touchend', handleTouchEnd, { passive: false });
    
    // Eventos de ratón para el canvas (para probar en desktop)
    canvas.addEventListener('mousedown', handleMouseDown);
    canvas.addEventListener('mousemove', handleMouseMove);
    canvas.addEventListener('mouseup', handleMouseUp);
    canvas.addEventListener('click', handleClick);
    
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
    
    // Controles táctiles (opcionales, ahora tenemos controles directos en el canvas)
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

// Manejar toque inicial
function handleTouchStart(e) {
    e.preventDefault();
    const touch = e.touches[0];
    const rect = canvas.getBoundingClientRect();
    
    touchControls.touchStartX = touch.clientX - rect.left;
    touchControls.touchStartY = touch.clientY - rect.top;
    touchControls.isDragging = true;
    
    // Disparar al tocar
    touchControls.shoot = true;
}

// Manejar movimiento del toque
function handleTouchMove(e) {
    e.preventDefault();
    if (!touchControls.isDragging) return;
    
    const touch = e.touches[0];
    const rect = canvas.getBoundingClientRect();
    
    touchControls.touchMoveX = touch.clientX - rect.left;
    touchControls.touchMoveY = touch.clientY - rect.top;
}

// Manejar fin del toque
function handleTouchEnd(e) {
    e.preventDefault();
    touchControls.isDragging = false;
    touchControls.shoot = false;
}

// Manejar clic del ratón (para pruebas en desktop)
function handleMouseDown(e) {
    const rect = canvas.getBoundingClientRect();
    touchControls.touchStartX = e.clientX - rect.left;
    touchControls.touchStartY = e.clientY - rect.top;
    touchControls.isDragging = true;
    touchControls.shoot = true;
}

function handleMouseMove(e) {
    if (!touchControls.isDragging) return;
    
    const rect = canvas.getBoundingClientRect();
    touchControls.touchMoveX = e.clientX - rect.left;
    touchControls.touchMoveY = e.clientY - rect.top;
}

function handleMouseUp() {
    touchControls.isDragging = false;
    touchControls.shoot = false;
}

function handleClick(e) {
    // Disparar al hacer clic
    touchControls.shoot = true;
    setTimeout(() => {
        touchControls.shoot = false;
    }, 100);
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
    
    resetGameState();
    levelEnemiesToDefeat = difficultySettings[difficulty].levelEnemies[level - 1] || 10;
    enemySpawnRate = difficultySettings[difficulty].enemySpawnRate;
    player = new Player();
    
    showScreen('game-screen');
    gameActive = true;
    gamePaused = false;
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
    
    ctx.clearRect(0, 0, GAME_WIDTH, GAME_HEIGHT);
    updateGame();
    drawGame();
    animationId = requestAnimationFrame(gameLoop);
}

// Actualizar estado del juego
function updateGame() {
    player.update();
    
    if (Date.now() - lastEnemySpawn > enemySpawnRate && enemiesDefeated < levelEnemiesToDefeat) {
        spawnEnemy();
        lastEnemySpawn = Date.now();
    }
    
    for (let i = enemies.length - 1; i >= 0; i--) {
        enemies[i].update();
        if (enemies[i].y > GAME_HEIGHT) {
            enemies.splice(i, 1);
        }
    }
    
    for (let i = bullets.length - 1; i >= 0; i--) {
        bullets[i].update();
        if (bullets[i].y + bullets[i].height < 0) {
            bullets.splice(i, 1);
        }
    }
    
    checkCollisions();
    
    if (enemiesDefeated >= levelEnemiesToDefeat && enemies.length === 0 && !levelComplete) {
        levelComplete = true;
        completeLevel();
    }
    
    updateUI();
}

// Dibujar elementos del juego
function drawGame() {
    player.draw();
    enemies.forEach(enemy => enemy.draw());
    bullets.forEach(bullet => bullet.draw());
    powerUps.forEach(powerUp => powerUp.draw());
}

// Generar un enemigo
function spawnEnemy() {
    const x = Math.random() * (GAME_WIDTH - ENEMY_WIDTH);
    const y = -ENEMY_HEIGHT;
    const type = Math.floor(Math.random() * 5);
    enemies.push(new Enemy(x, y, type));
}

// Verificar colisiones
function checkCollisions() {
    for (let i = bullets.length - 1; i >= 0; i--) {
        for (let j = enemies.length - 1; j >= 0; j--) {
            if (checkCollision(bullets[i], enemies[j])) {
                const enemyDestroyed = enemies[j].hit();
                if (enemyDestroyed) {
                    enemies.splice(j, 1);
                    enemiesDefeated++;
                    score += 100;
                    
                    if (Math.random() < 0.1) {
                        spawnPowerUp(enemies[j].x + enemies[j].width / 2, enemies[j].y + enemies[j].height / 2);
                    }
                }
                bullets.splice(i, 1);
                break;
            }
        }
    }
    
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
    const type = Math.floor(Math.random() * 3);
    powerUps.push(new PowerUp(x, y, type));
}

// Aplicar efecto de power-up
function applyPowerUp(type) {
    switch (type) {
        case 0:
            lives++;
            break;
        case 1:
            score += 500;
            break;
        case 2:
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
    document.getElementById('level-score').textContent = `Puntaje: ${score}`;
    showScreen('level-complete-screen');
}

// Pasar al siguiente nivel
function nextLevel() {
    level++;
    enemiesDefeated = 0;
    levelComplete = false;
    levelEnemiesToDefeat = difficultySettings[difficulty].levelEnemies[level - 1] || levelEnemiesToDefeat + 5;
    showScreen('game-screen');
    gameActive = true;
    gamePaused = false;
    gameLoop();
}

// Game over
function gameOver() {
    gameActive = false;
    cancelAnimationFrame(animationId);
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
    
    let hearts = '';
    for (let i = 0; i < Math.max(0, lives); i++) {
        hearts += '❤️';
    }
    document.getElementById('lives').textContent = hearts;
}

// Iniciar el juego cuando se carga la página
window.addEventListener('load', initGame);