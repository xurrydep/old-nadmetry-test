"use client";
import { useEffect, useRef, useState } from 'react';

interface GameObject {
  x: number;
  y: number;
  width: number;
  height: number;
  speed: number;
}

interface Player extends GameObject {
  velocityY: number; // Yön kontrolü için zıplama mekaniği
  jumping: boolean;
}

interface Obstacle extends GameObject {
  passed: boolean; // Engelin geçilip geçilmediğini kontrol etmek için
  type: 'square' | 'circle' | 'triangle'; // Engel tipi
}

const GAME_WIDTH = 800;
const GAME_HEIGHT = 600;
const PLAYER_SPEED = 5;
const JUMP_STRENGTH = 10;
const GRAVITY = 0.5;
const OBSTACLE_SPEED = 5;
const OBSTACLE_SPAWN_RATE = 0.02;

export default function GeometryDashGame() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const gameLoopRef = useRef<number>(0);
  const [score, setScore] = useState(0);
  const [gameOver, setGameOver] = useState(false);
  const [gameStarted, setGameStarted] = useState(false);

  const gameStateRef = useRef({
    player: { x: 50, y: GAME_HEIGHT - 100, width: 30, height: 30, speed: PLAYER_SPEED, velocityY: 0, jumping: false } as Player,
    obstacles: [] as Obstacle[],
    keys: { space: false },
    isRunning: false
  });

  const startGame = () => {
    setGameStarted(true);
    setGameOver(false);
    setScore(0);

    gameStateRef.current = {
      player: { x: 50, y: GAME_HEIGHT - 100, width: 30, height: 30, speed: PLAYER_SPEED, velocityY: 0, jumping: false },
      obstacles: [],
      keys: { space: false },
      isRunning: true
    };

    if (gameLoopRef.current) {
      cancelAnimationFrame(gameLoopRef.current);
    }
    gameLoop();
  };

  const drawBackground = (ctx: CanvasRenderingContext2D) => {
    const gradient = ctx.createLinearGradient(0, 0, 0, GAME_HEIGHT);
    gradient.addColorStop(0, "#ff6600"); // Upper gradient color
    gradient.addColorStop(1, "#ff0033"); // Lower gradient color

    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT);

    // Alternatif: Dinamik bir desenle arka plan eklemek
    ctx.fillStyle = 'rgba(255, 255, 255, 0.1)';
    for (let i = 0; i < GAME_WIDTH; i += 50) {
      ctx.beginPath();
      ctx.arc(i, Math.sin(i / 100) * 50 + GAME_HEIGHT / 2, 20, 0, Math.PI * 2);
      ctx.fill();
    }
  };

  const drawObstacle = (ctx: CanvasRenderingContext2D, obstacle: Obstacle) => {
    ctx.fillStyle = '#ff0000';
    
    // Engeller farklı şekillerde
    if (obstacle.type === 'square') {
      ctx.fillRect(obstacle.x, obstacle.y, obstacle.width, obstacle.height);
    } else if (obstacle.type === 'circle') {
      ctx.beginPath();
      ctx.arc(obstacle.x + obstacle.width / 2, obstacle.y + obstacle.height / 2, obstacle.width / 2, 0, Math.PI * 2);
      ctx.fill();
    } else if (obstacle.type === 'triangle') {
      ctx.beginPath();
      ctx.moveTo(obstacle.x, obstacle.y + obstacle.height);
      ctx.lineTo(obstacle.x + obstacle.width / 2, obstacle.y);
      ctx.lineTo(obstacle.x + obstacle.width, obstacle.y + obstacle.height);
      ctx.closePath();
      ctx.fill();
    }
  };

  const jumpAnimation = () => {
    if (gameStateRef.current.player.jumping) {
      const player = gameStateRef.current.player;
      player.y += player.velocityY;
      player.velocityY += GRAVITY;

      // Zıplama animasyonu sırasında bir eğilme efekti ekleyelim
      player.width = 30 + Math.sin(player.y / 10) * 5; // Zıplama sırasında genişleme
      player.height = 30 + Math.cos(player.y / 10) * 5;
    }
  };

  const createParticle = (x: number, y: number) => {
    particles.push({
      x,
      y,
      radius: Math.random() * 3 + 2,
      color: 'rgba(255, 255, 255, 0.8)',
      speedX: Math.random() * 2 - 1,
      speedY: Math.random() * 2 - 1
    });
  };

  const drawParticles = (ctx: CanvasRenderingContext2D) => {
    ctx.globalCompositeOperation = 'lighter';
    particles.forEach((particle, index) => {
      ctx.beginPath();
      ctx.arc(particle.x, particle.y, particle.radius, 0, Math.PI * 2);
      ctx.fillStyle = particle.color;
      ctx.fill();
      particle.x += particle.speedX;
      particle.y += particle.speedY;
      particle.radius *= 0.98; // Partiküllerin küçülmesi

      if (particle.radius < 0.5) {
        particles.splice(index, 1);
      }
    });
  };

  const gameLoop = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const currentTime = Date.now();
    const gameState = gameStateRef.current;

    // Arka planı çiz
    drawBackground(ctx);

    // Move player
    if (gameState.keys.space && !gameState.player.jumping) {
      gameState.player.velocityY = -JUMP_STRENGTH; // Jump
      gameState.player.jumping = true;
    }

    gameState.player.y += gameState.player.velocityY;
    gameState.player.velocityY += GRAVITY; // Apply gravity

    // Prevent player from falling through the ground
    if (gameState.player.y >= GAME_HEIGHT - gameState.player.height) {
      gameState.player.y = GAME_HEIGHT - gameState.player.height;
      gameState.player.velocityY = 0;
      gameState.player.jumping = false;
    }

    // Spawn obstacles
    if (Math.random() < OBSTACLE_SPAWN_RATE) {
      gameState.obstacles.push({
        x: GAME_WIDTH,
        y: GAME_HEIGHT - 50,
        width: 30,
        height: 30,
        speed: OBSTACLE_SPEED,
        passed: false,
        type: Math.random() < 0.33 ? 'square' : Math.random() < 0.66 ? 'circle' : 'triangle', // Random obstacle type
      });
    }

    // Move obstacles
    gameState.obstacles.forEach((obstacle, obstacleIndex) => {
      obstacle.x -= obstacle.speed;

      // If obstacle goes off screen, remove it
      if (obstacle.x + obstacle.width < 0) {
        gameState.obstacles.splice(obstacleIndex, 1);
      }

      // Check if player collides with obstacle
      if (
        gameState.player.x < obstacle.x + obstacle.width &&
        gameState.player.x + gameState.player.width > obstacle.x &&
        gameState.player.y < obstacle.y + obstacle.height &&
        gameState.player.y + gameState.player.height > obstacle.y
      ) {
        gameState.isRunning = false;
        setGameOver(true);
        setGameStarted(false);
        return;
      }

      // Increase score if player passes an obstacle
      if (!obstacle.passed && obstacle.x + obstacle.width < gameState.player.x) {
        obstacle.passed = true;
        setScore((prev) => prev + 1);
      }
    });

    // Draw player (square)
    ctx.fillStyle = '#00ff00';
    ctx.fillRect(gameState.player.x, gameState.player.y, gameState.player.width, gameState.player.height);

    // Draw obstacles (random shapes)
    ctx.fillStyle = '#ff0000';
    gameState.obstacles.forEach(obstacle => {
      drawObstacle(ctx, obstacle);
    });

    // Particle effects
    drawParticles(ctx);

    if (gameState.isRunning) {
      gameLoopRef.current = requestAnimationFrame(gameLoop);
    }
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const key = e.key.toLowerCase();
      if (key === ' ' || key === 'r') {
        e.preventDefault();
        if (key === 'r') {
          startGame();
        } else if (key === ' ') {
          gameStateRef.current.keys.space = true;
        }
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      const key = e.key.toLowerCase();
      if (key === ' ') {
        e.preventDefault();
        gameStateRef.current.keys.space = false;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, []);

  return (
    <div className="flex flex-col items-center gap-4 p-4">
      <div className="flex items-center gap-4">
        <div className="text-white text-2xl font-bold">Score: {score}</div>
      </div>
      
      <div className="relative">
        <canvas
          ref={canvasRef}
          width={GAME_WIDTH}
          height={GAME_HEIGHT}
          className="border border-gray-500"
          style={{ background: '#000' }}
        />
        
        {!gameStarted && (
          <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-75">
            <div className="text-center text-white">
              <button
                onClick={startGame}
                className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-6 rounded mb-4 text-lg"
              >
                {gameOver ? 'Play Again' : 'Start Game'}
              </button>
              {gameOver && (
                <div className="text-red-500 text-xl font-bold mb-4">
                  Game Over! Final Score: {score}
                </div>
              )}
              <div className="text-white text-sm space-y-1">
                {gameOver ? (
                  <p>Press R to play again</p>
                ) : (
                  <p>Press SPACE to jump, avoid obstacles!</p>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
