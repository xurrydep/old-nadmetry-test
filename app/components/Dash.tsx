"use client";
import { useEffect, useRef, useState, useCallback } from 'react';

interface Player {
  x: number;
  y: number;
  width: number;
  height: number;
  velocityY: number;
  onGround: boolean;
  rotation: number;
}

interface Obstacle {
  x: number;
  y: number;
  width: number;
  height: number;
  type: 'spike' | 'block' | 'saw' | 'platform';
  passed: boolean;
}

interface Particle {
  x: number;
  y: number;
  velocityX: number;
  velocityY: number;
  size: number;
  color: string;
  life: number;
}

const GAME_WIDTH = 800;
const GAME_HEIGHT = 600;
const GROUND_HEIGHT = 100;
const PLAYER_SIZE = 30;
const JUMP_FORCE = 15;
const GRAVITY = 0.8;
const GAME_SPEED = 8;
const OBSTACLE_SPAWN_RATE = 0.015;

interface GeometryDashGameProps {
  playerAddress: string;
}

export default function GeometryDashGame({}: GeometryDashGameProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const gameLoopRef = useRef<number>(0);
  const [score, setScore] = useState(0);
  const [gameOver, setGameOver] = useState(false);
  const [gameStarted, setGameStarted] = useState(false);
  const [distance, setDistance] = useState(0);

  const gameStateRef = useRef({
    player: {
      x: 100,
      y: GAME_HEIGHT - GROUND_HEIGHT - PLAYER_SIZE,
      width: PLAYER_SIZE,
      height: PLAYER_SIZE,
      velocityY: 0,
      onGround: true,
      rotation: 0
    } as Player,
    obstacles: [] as Obstacle[],
    particles: [] as Particle[],
    camera: { x: 0 },
    keys: { space: false, up: false },
    isRunning: false,
    gameSpeed: GAME_SPEED,
    backgroundOffset: 0
  });

  const gameLoop = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const gameState = gameStateRef.current;

    // Clear canvas
    ctx.clearRect(0, 0, GAME_WIDTH, GAME_HEIGHT);

    // Draw animated background
    drawBackground(ctx, gameState.backgroundOffset);
    gameState.backgroundOffset += gameState.gameSpeed * 0.5;

    // Player physics
    const player = gameState.player;
    
    // Jump input
    if ((gameState.keys.space || gameState.keys.up) && player.onGround) {
      player.velocityY = -JUMP_FORCE;
      player.onGround = false;
      createJumpParticles(gameState, player.x, player.y + player.height);
    }

    // Apply gravity
    player.velocityY += GRAVITY;
    player.y += player.velocityY;

    // Ground collision
    const groundY = GAME_HEIGHT - GROUND_HEIGHT - player.height;
    if (player.y >= groundY) {
      player.y = groundY;
      player.velocityY = 0;
      player.onGround = true;
      player.rotation = 0;
    } else {
      // Rotate player while in air
      player.rotation += 8;
    }

    // Move camera with player
    gameState.camera.x += gameState.gameSpeed;

    // Spawn obstacles
    if (Math.random() < OBSTACLE_SPAWN_RATE) {
      spawnObstacle(gameState);
    }

    // Update obstacles
    gameState.obstacles.forEach((obstacle, index) => {
      obstacle.x -= gameState.gameSpeed;

      // Remove off-screen obstacles
      if (obstacle.x + obstacle.width < -100) {
        gameState.obstacles.splice(index, 1);
      }

      // Check collision
      if (checkCollision(player, obstacle)) {
        gameState.isRunning = false;
        setGameOver(true);
        setGameStarted(false);
        createExplosionParticles(gameState, player.x + player.width/2, player.y + player.height/2);
        return;
      }

      // Score for passing obstacles
      if (!obstacle.passed && obstacle.x + obstacle.width < player.x) {
        obstacle.passed = true;
        setScore(prev => prev + 10);
      }
    });

    // Update particles
    updateParticles(gameState);

    // Draw ground
    drawGround(ctx);

    // Draw obstacles
    gameState.obstacles.forEach(obstacle => {
      drawObstacle(ctx, obstacle);
    });

    // Draw player
    drawPlayer(ctx, player);

    // Draw particles
    drawParticles(ctx, gameState.particles);

    // Update distance
    setDistance(Math.floor(gameState.camera.x / 10));

    // Increase game speed gradually
    gameState.gameSpeed = Math.min(GAME_SPEED + Math.floor(gameState.camera.x / 1000) * 0.5, GAME_SPEED * 2);

    // Continue game loop
    if (gameState.isRunning) {
      gameLoopRef.current = requestAnimationFrame(gameLoop);
    }
  }, []);

  const drawBackground = (ctx: CanvasRenderingContext2D, offset: number) => {
    // Gradient background
    const gradient = ctx.createLinearGradient(0, 0, 0, GAME_HEIGHT);
    gradient.addColorStop(0, '#0a0a0a');
    gradient.addColorStop(0.5, '#1a1a2e');
    gradient.addColorStop(1, '#16213e');
    
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT);

    // Grid pattern
    ctx.strokeStyle = 'rgba(0, 255, 255, 0.1)';
    ctx.lineWidth = 1;
    
    const gridSize = 50;
    const offsetX = offset % gridSize;
    
    for (let x = -offsetX; x < GAME_WIDTH + gridSize; x += gridSize) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, GAME_HEIGHT);
      ctx.stroke();
    }
    
    for (let y = 0; y < GAME_HEIGHT; y += gridSize) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(GAME_WIDTH, y);
      ctx.stroke();
    }

    // Neon lines
    ctx.strokeStyle = '#00ffff';
    ctx.lineWidth = 2;
    ctx.shadowColor = '#00ffff';
    ctx.shadowBlur = 10;
    
    const waveOffset = offset * 0.02;
    ctx.beginPath();
    for (let x = 0; x < GAME_WIDTH; x += 5) {
      const y = GAME_HEIGHT * 0.3 + Math.sin((x + waveOffset) * 0.01) * 30;
      if (x === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.stroke();
    
    ctx.shadowBlur = 0;
  };

  const drawGround = (ctx: CanvasRenderingContext2D) => {
    // Ground
    ctx.fillStyle = '#333';
    ctx.fillRect(0, GAME_HEIGHT - GROUND_HEIGHT, GAME_WIDTH, GROUND_HEIGHT);
    
    // Ground glow
    ctx.fillStyle = '#00ffff';
    ctx.shadowColor = '#00ffff';
    ctx.shadowBlur = 20;
    ctx.fillRect(0, GAME_HEIGHT - GROUND_HEIGHT, GAME_WIDTH, 3);
    ctx.shadowBlur = 0;
  };

  const drawPlayer = (ctx: CanvasRenderingContext2D, player: Player) => {
    ctx.save();
    
    // Move to player center for rotation
    ctx.translate(player.x + player.width/2, player.y + player.height/2);
    ctx.rotate((player.rotation * Math.PI) / 180);
    
    // Player glow
    ctx.shadowColor = '#ffff00';
    ctx.shadowBlur = 15;
    
    // Player body
    ctx.fillStyle = '#ffff00';
    ctx.fillRect(-player.width/2, -player.height/2, player.width, player.height);
    
    // Player border
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 2;
    ctx.strokeRect(-player.width/2, -player.height/2, player.width, player.height);
    
    ctx.shadowBlur = 0;
    ctx.restore();
  };

  const drawObstacle = (ctx: CanvasRenderingContext2D, obstacle: Obstacle) => {
    ctx.save();
    
    switch (obstacle.type) {
      case 'spike':
        ctx.fillStyle = '#ff0066';
        ctx.shadowColor = '#ff0066';
        ctx.shadowBlur = 10;
        
        ctx.beginPath();
        ctx.moveTo(obstacle.x, obstacle.y + obstacle.height);
        ctx.lineTo(obstacle.x + obstacle.width/2, obstacle.y);
        ctx.lineTo(obstacle.x + obstacle.width, obstacle.y + obstacle.height);
        ctx.closePath();
        ctx.fill();
        break;
        
      case 'block':
        ctx.fillStyle = '#ff3300';
        ctx.shadowColor = '#ff3300';
        ctx.shadowBlur = 10;
        ctx.fillRect(obstacle.x, obstacle.y, obstacle.width, obstacle.height);
        
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 2;
        ctx.strokeRect(obstacle.x, obstacle.y, obstacle.width, obstacle.height);
        break;
        
      case 'saw':
        ctx.fillStyle = '#ff0000';
        ctx.shadowColor = '#ff0000';
        ctx.shadowBlur = 15;
        
        const centerX = obstacle.x + obstacle.width/2;
        const centerY = obstacle.y + obstacle.height/2;
        const radius = obstacle.width/2;
        
        // Saw blade
        ctx.beginPath();
        for (let i = 0; i < 8; i++) {
          const angle = (i * Math.PI * 2) / 8;
          const x = centerX + Math.cos(angle) * radius;
          const y = centerY + Math.sin(angle) * radius;
          
          if (i === 0) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
          
          // Teeth
          const toothAngle = angle + Math.PI / 8;
          const toothX = centerX + Math.cos(toothAngle) * (radius * 1.3);
          const toothY = centerY + Math.sin(toothAngle) * (radius * 1.3);
          ctx.lineTo(toothX, toothY);
        }
        ctx.closePath();
        ctx.fill();
        break;
    }
    
    ctx.shadowBlur = 0;
    ctx.restore();
  };

  const spawnObstacle = (gameState: any) => {
    const types: ('spike' | 'block' | 'saw')[] = ['spike', 'block', 'saw'];
    const type = types[Math.floor(Math.random() * types.length)];
    
    let obstacle: Obstacle;
    
    switch (type) {
      case 'spike':
        obstacle = {
          x: GAME_WIDTH + 50,
          y: GAME_HEIGHT - GROUND_HEIGHT - 40,
          width: 30,
          height: 40,
          type: 'spike',
          passed: false
        };
        break;
        
      case 'block':
        obstacle = {
          x: GAME_WIDTH + 50,
          y: GAME_HEIGHT - GROUND_HEIGHT - 50,
          width: 40,
          height: 50,
          type: 'block',
          passed: false
        };
        break;
        
      case 'saw':
        obstacle = {
          x: GAME_WIDTH + 50,
          y: GAME_HEIGHT - GROUND_HEIGHT - 60,
          width: 50,
          height: 50,
          type: 'saw',
          passed: false
        };
        break;
    }
    
    gameState.obstacles.push(obstacle);
  };

  const checkCollision = (player: Player, obstacle: Obstacle): boolean => {
    return (
      player.x < obstacle.x + obstacle.width &&
      player.x + player.width > obstacle.x &&
      player.y < obstacle.y + obstacle.height &&
      player.y + player.height > obstacle.y
    );
  };

  const createJumpParticles = (gameState: any, x: number, y: number) => {
    for (let i = 0; i < 5; i++) {
      gameState.particles.push({
        x: x + Math.random() * 20,
        y: y,
        velocityX: (Math.random() - 0.5) * 4,
        velocityY: Math.random() * -3,
        size: Math.random() * 3 + 1,
        color: '#ffff00',
        life: 1
      });
    }
  };

  const createExplosionParticles = (gameState: any, x: number, y: number) => {
    for (let i = 0; i < 15; i++) {
      gameState.particles.push({
        x: x,
        y: y,
        velocityX: (Math.random() - 0.5) * 10,
        velocityY: (Math.random() - 0.5) * 10,
        size: Math.random() * 5 + 2,
        color: Math.random() > 0.5 ? '#ff0066' : '#ffff00',
        life: 1
      });
    }
  };

  const updateParticles = (gameState: any) => {
    gameState.particles.forEach((particle: Particle, index: number) => {
      particle.x += particle.velocityX;
      particle.y += particle.velocityY;
      particle.velocityY += 0.2; // Gravity
      particle.life -= 0.02;
      particle.size *= 0.98;
      
      if (particle.life <= 0 || particle.size < 0.5) {
        gameState.particles.splice(index, 1);
      }
    });
  };

  const drawParticles = (ctx: CanvasRenderingContext2D, particles: Particle[]) => {
    particles.forEach(particle => {
      ctx.save();
      ctx.globalAlpha = particle.life;
      ctx.fillStyle = particle.color;
      ctx.shadowColor = particle.color;
      ctx.shadowBlur = 5;
      
      ctx.beginPath();
      ctx.arc(particle.x, particle.y, particle.size, 0, Math.PI * 2);
      ctx.fill();
      
      ctx.restore();
    });
  };

  const startGame = useCallback(() => {
    setGameStarted(true);
    setGameOver(false);
    setScore(0);
    setDistance(0);

    gameStateRef.current = {
      player: {
        x: 100,
        y: GAME_HEIGHT - GROUND_HEIGHT - PLAYER_SIZE,
        width: PLAYER_SIZE,
        height: PLAYER_SIZE,
        velocityY: 0,
        onGround: true,
        rotation: 0
      },
      obstacles: [],
      particles: [],
      camera: { x: 0 },
      keys: { space: false, up: false },
      isRunning: true,
      gameSpeed: GAME_SPEED,
      backgroundOffset: 0
    };

    if (gameLoopRef.current) {
      cancelAnimationFrame(gameLoopRef.current);
    }
    gameLoop();
  }, [gameLoop]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const key = e.key.toLowerCase();
      if (key === ' ' || key === 'arrowup' || key === 'w') {
        e.preventDefault();
        if (key === ' ' || key === 'arrowup' || key === 'w') {
          gameStateRef.current.keys.space = true;
          gameStateRef.current.keys.up = true;
        }
      }
      if (key === 'r' && gameOver) {
        startGame();
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      const key = e.key.toLowerCase();
      if (key === ' ' || key === 'arrowup' || key === 'w') {
        e.preventDefault();
        gameStateRef.current.keys.space = false;
        gameStateRef.current.keys.up = false;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [startGame, gameOver]);

  return (
    <div className="flex flex-col items-center gap-4 p-4 bg-black min-h-screen">
      <div className="flex items-center gap-8 text-white">
        <div className="text-2xl font-bold neon-text">
          Score: <span className="text-yellow-400">{score}</span>
        </div>
        <div className="text-xl font-bold neon-text">
          Distance: <span className="text-cyan-400">{distance}m</span>
        </div>
      </div>
      
      <div className="relative">
        <canvas
          ref={canvasRef}
          width={GAME_WIDTH}
          height={GAME_HEIGHT}
          className="border-2 border-cyan-400 shadow-lg shadow-cyan-400/50"
          style={{ background: '#000' }}
        />
        
        {!gameStarted && (
          <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-90">
            <div className="text-center text-white">
              <h1 className="text-4xl font-bold mb-4 neon-text text-yellow-400">
                GEOMETRY DASH
              </h1>
              <button
                onClick={startGame}
                className="bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-600 hover:to-blue-700 text-white font-bold py-4 px-8 rounded-lg mb-6 text-xl shadow-lg shadow-cyan-400/50 transition-all duration-300 transform hover:scale-105"
              >
                {gameOver ? 'PLAY AGAIN' : 'START GAME'}
              </button>
              {gameOver && (
                <div className="text-red-400 text-2xl font-bold mb-4 neon-text">
                  GAME OVER!
                </div>
              )}
              <div className="text-cyan-300 text-sm space-y-2">
                <p>🎮 SPACE / ↑ / W to jump</p>
                <p>🎯 Avoid the obstacles!</p>
                <p>⚡ Survive as long as possible!</p>
                {gameOver && <p>🔄 Press R to restart</p>}
              </div>
            </div>
          </div>
        )}
      </div>
      
      <style jsx>{`
        .neon-text {
          text-shadow: 0 0 5px currentColor, 0 0 10px currentColor, 0 0 15px currentColor;
        }
      `}</style>
    </div>
  );
}
