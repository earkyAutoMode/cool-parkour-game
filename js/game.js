/**
 * Cool Parkour Game - 炫酷跑酷小游戏
 * 核心逻辑：HTML5 Canvas 驱动，赛博朋克风格
 */

const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

// UI 元素
const startScreen = document.getElementById('start-screen');
const endScreen = document.getElementById('end-screen');
const gameUI = document.getElementById('game-ui');
const currentScoreElement = document.getElementById('current-score');
const finalScoreElement = document.getElementById('final-score');
const highScoreElement = document.getElementById('high-score');
const startBtn = document.getElementById('start-btn');
const restartBtn = document.getElementById('restart-btn');

// 常量配置
const CANVAS_WIDTH = 800;
const CANVAS_HEIGHT = 450;
const GROUND_Y = 380;
const INITIAL_SPEED = 5;
const GRAVITY = 0.65;
const JUMP_FORCE = -13;

canvas.width = CANVAS_WIDTH;
canvas.height = CANVAS_HEIGHT;

// 游戏状态
let gameState = 'START'; // START, PLAYING, GAMEOVER
let score = 0;
let highScore = localStorage.getItem('parkour_high_score') || 0;
let gameSpeed = INITIAL_SPEED;
let frameCount = 0;

// 游戏对象
let player;
let obstacles = [];
let particles = [];
let backgrounds = [];

// --- 辅助函数 ---
function randomInt(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
}

// --- 背景类 (Parallax) ---
class ParallaxLayer {
    constructor(color, speedModifier, height, yOffset = 0) {
        this.color = color;
        this.speedModifier = speedModifier;
        this.height = height;
        this.yOffset = yOffset;
        this.x = 0;
    }

    update() {
        this.x -= gameSpeed * this.speedModifier;
        if (this.x <= -CANVAS_WIDTH) {
            this.x = 0;
        }
    }

    draw() {
        ctx.fillStyle = this.color;
        // 绘制两遍以实现无缝滚动
        ctx.fillRect(this.x, CANVAS_HEIGHT - this.height - this.yOffset, CANVAS_WIDTH, this.height);
        ctx.fillRect(this.x + CANVAS_WIDTH, CANVAS_HEIGHT - this.height - this.yOffset, CANVAS_WIDTH, this.height);
        
        // 如果是装饰层，加点细节
        if (this.speedModifier > 0.1) {
            ctx.strokeStyle = 'rgba(255, 255, 255, 0.05)';
            ctx.lineWidth = 1;
            for (let i = 0; i < CANVAS_WIDTH; i += 50) {
                ctx.beginPath();
                ctx.moveTo(this.x + i, CANVAS_HEIGHT - this.height - this.yOffset);
                ctx.lineTo(this.x + i, CANVAS_HEIGHT - this.yOffset);
                ctx.stroke();
            }
        }
    }
}

// --- 玩家类 ---
class Player {
    constructor() {
        this.width = 30;
        this.height = 50;
        this.x = 80;
        this.y = GROUND_Y - this.height;
        this.dy = 0;
        this.jumpCount = 0;
        this.color = '#0ff'; // Neon Cyan
        this.glowColor = 'rgba(0, 255, 255, 0.8)';
        this.isGrounded = true;
    }

    jump() {
        if (this.jumpCount < 2) {
            this.dy = JUMP_FORCE;
            this.jumpCount++;
            this.isGrounded = false;
            createParticles(this.x + this.width / 2, this.y + this.height, this.color, 8);
        }
    }

    update() {
        // 重力
        this.dy += GRAVITY;
        this.y += this.dy;

        // 碰撞地面
        if (this.y + this.height > GROUND_Y) {
            this.y = GROUND_Y - this.height;
            this.dy = 0;
            this.isGrounded = true;
            this.jumpCount = 0;
        }

        // 限制
        if (this.y < 0) {
            this.y = 0;
            this.dy = 0;
        }
    }

    draw() {
        ctx.save();
        ctx.shadowBlur = 15;
        ctx.shadowColor = this.glowColor;
        ctx.fillStyle = this.color;
        
        // 绘制角色主体 (赛博小方块)
        ctx.fillRect(this.x, this.y, this.width, this.height);
        
        // 绘制眼睛/发光条
        ctx.fillStyle = '#fff';
        ctx.fillRect(this.x + 18, this.y + 10, 8, 4);
        
        // 动态残影效果 (如果正在空降)
        if (!this.isGrounded) {
            ctx.globalAlpha = 0.3;
            ctx.fillRect(this.x - 5, this.y + 5, this.width, this.height);
        }
        
        ctx.restore();
    }
}

// --- 障碍物类 ---
class Obstacle {
    constructor() {
        this.type = Math.random() > 0.4 ? 'BOX' : 'SPIKE';
        this.width = this.type === 'BOX' ? 40 : 50;
        this.height = this.type === 'BOX' ? randomInt(40, 70) : 30;
        this.x = CANVAS_WIDTH + 100;
        this.y = GROUND_Y - this.height;
        this.color = this.type === 'BOX' ? '#f0f' : '#ff3c3c'; // Magenta or Red
        this.passed = false;
    }

    update() {
        this.x -= gameSpeed;
    }

    draw() {
        ctx.save();
        ctx.shadowBlur = 10;
        ctx.shadowColor = this.color;
        ctx.fillStyle = this.color;

        if (this.type === 'BOX') {
            ctx.fillRect(this.x, this.y, this.width, this.height);
            // 盒子内部装饰
            ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
            ctx.strokeRect(this.x + 5, this.y + 5, this.width - 10, this.height - 10);
        } else {
            // 尖刺
            ctx.beginPath();
            ctx.moveTo(this.x, this.y + this.height);
            ctx.lineTo(this.x + this.width / 2, this.y);
            ctx.lineTo(this.x + this.width, this.y + this.height);
            ctx.fill();
        }
        ctx.restore();
    }
}

// --- 粒子类 ---
class Particle {
    constructor(x, y, color) {
        this.x = x;
        this.y = y;
        this.size = Math.random() * 4 + 1;
        this.speedX = Math.random() * 4 - 2;
        this.speedY = Math.random() * 4 - 2;
        this.color = color;
        this.life = 1.0;
        this.decay = Math.random() * 0.05 + 0.02;
    }

    update() {
        this.x += this.speedX;
        this.y += this.speedY;
        this.life -= this.decay;
    }

    draw() {
        ctx.save();
        ctx.globalAlpha = this.life;
        ctx.fillStyle = this.color;
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
    }
}

// --- 游戏逻辑核心 ---

function init() {
    player = new Player();
    obstacles = [];
    particles = [];
    score = 0;
    gameSpeed = INITIAL_SPEED;
    frameCount = 0;
    
    // 初始化背景层
    backgrounds = [
        new ParallaxLayer('#0a0a0f', 0.02, 300, 0),    // 最远层
        new ParallaxLayer('#121220', 0.05, 200, 0),   // 远山
        new ParallaxLayer('#1a1a30', 0.1, 120, 0),    // 远方建筑
        new ParallaxLayer('#252545', 0.2, 50, 0)      // 近处矮墙
    ];
}

function createParticles(x, y, color, count) {
    for (let i = 0; i < count; i++) {
        particles.push(new Particle(x, y, color));
    }
}

function handleInput() {
    if (gameState === 'PLAYING') {
        player.jump();
    } else if (gameState === 'START' || gameState === 'GAMEOVER') {
        startGame();
    }
}

// 绑定事件
window.addEventListener('keydown', (e) => {
    if (e.code === 'Space' || e.code === 'ArrowUp') {
        e.preventDefault();
        handleInput();
    }
});

canvas.addEventListener('touchstart', (e) => {
    e.preventDefault();
    handleInput();
});

canvas.addEventListener('mousedown', (e) => {
    // 只有在点击 canvas 区域且不是按钮点击时触发
    if (e.target === canvas) {
        handleInput();
    }
});

startBtn.addEventListener('click', startGame);
restartBtn.addEventListener('click', startGame);

function startGame() {
    init();
    gameState = 'PLAYING';
    startScreen.classList.add('hidden');
    endScreen.classList.add('hidden');
    gameUI.classList.remove('hidden');
}

function gameOver() {
    gameState = 'GAMEOVER';
    if (score > highScore) {
        highScore = score;
        localStorage.setItem('parkour_high_score', highScore);
    }
    
    finalScoreElement.innerText = Math.floor(score);
    highScoreElement.innerText = Math.floor(highScore);
    
    gameUI.classList.add('hidden');
    endScreen.classList.remove('hidden');
    
    // 碰撞特效
    createParticles(player.x + player.width/2, player.y + player.height/2, '#ff3c3c', 20);
}

function update() {
    if (gameState !== 'PLAYING') return;

    frameCount++;
    score += 0.1;
    currentScoreElement.innerText = Math.floor(score);

    // 逐渐加速
    if (frameCount % 500 === 0) {
        gameSpeed += 0.2;
    }

    // 背景更新
    backgrounds.forEach(bg => bg.update());

    // 玩家更新
    player.update();

    // 障碍物生成
    if (frameCount % Math.max(70, randomInt(60, 120) - Math.floor(gameSpeed * 2)) === 0) {
        obstacles.push(new Obstacle());
    }

    // 障碍物更新与碰撞检测
    for (let i = obstacles.length - 1; i >= 0; i--) {
        obstacles[i].update();

        // 碰撞检测 (AABB)
        if (
            player.x < obstacles[i].x + obstacles[i].width &&
            player.x + player.width > obstacles[i].x &&
            player.y < obstacles[i].y + obstacles[i].height &&
            player.y + player.height > obstacles[i].y
        ) {
            gameOver();
        }

        // 移除屏幕外的障碍物
        if (obstacles[i].x + obstacles[i].width < 0) {
            obstacles.splice(i, 1);
        }
    }

    // 粒子更新
    for (let i = particles.length - 1; i >= 0; i--) {
        particles[i].update();
        if (particles[i].life <= 0) {
            particles.splice(i, 1);
        }
    }
}

function draw() {
    // 清屏
    ctx.fillStyle = '#050505';
    ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

    // 绘制背景
    backgrounds.forEach(bg => bg.draw());

    // 绘制地面
    ctx.fillStyle = '#111';
    ctx.fillRect(0, GROUND_Y, CANVAS_WIDTH, CANVAS_HEIGHT - GROUND_Y);
    ctx.strokeStyle = '#0ff';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(0, GROUND_Y);
    ctx.lineTo(CANVAS_WIDTH, GROUND_Y);
    ctx.stroke();
    
    // 地面线条感
    ctx.strokeStyle = 'rgba(0, 255, 255, 0.2)';
    for (let i = 0; i < CANVAS_WIDTH; i += 40) {
        let xPos = (i - (frameCount * gameSpeed) % 40);
        ctx.beginPath();
        ctx.moveTo(xPos, GROUND_Y);
        ctx.lineTo(xPos - 50, CANVAS_HEIGHT);
        ctx.stroke();
    }

    // 绘制障碍物
    obstacles.forEach(obs => obs.draw());

    // 绘制粒子
    particles.forEach(p => p.draw());

    // 绘制玩家
    player.draw();

    // 如果未开始，绘制一些环境细节
    if (gameState === 'START') {
        // 可以在这里画点装饰
    }
}

function gameLoop() {
    update();
    draw();
    requestAnimationFrame(gameLoop);
}

// 启动循环
gameLoop();
init();