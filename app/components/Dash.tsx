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
  mode: 'normal' | 'rocket' | 'speed' | 'gravity' | 'mini';
  rocketFuel: number;
  doubleJumpAvailable: boolean;
}

interface Obstacle {
  x: number;
  y: number;
  width: number;
  height: number;
  type: 'spike' | 'block' | 'saw' | 'platform' | 'stairs' | 'ceiling_barrier' | 'floor_barrier';
  passed: boolean;
}

interface PowerUp {
  x: number;
  y: number;
  width: number;
  height: number;
  type: 'double_jump' | 'speed_mode' | 'gravity_mode' | 'mini_mode';
  collected: boolean;
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

interface GameState {
  player: Player;
  obstacles: Obstacle[];
  powerUps: PowerUp[];
  particles: Particle[];
  camera: { x: number };
  keys: { space: boolean; up: boolean; w: boolean };
  isRunning: boolean;
  gameSpeed: number;
  backgroundOffset: number;
  distance: number;
  rocketModeActive: boolean;
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
      rotation: 0,
      mode: 'normal' as 'normal' | 'rocket',
      rocketFuel: 100,
      doubleJumpAvailable: false
    } as Player,
    obstacles: [] as Obstacle[],
    powerUps: [] as PowerUp[],
    particles: [] as Particle[],
    camera: { x: 0 },
    keys: { space: false, up: false, w: false },
    isRunning: false,
    gameSpeed: GAME_SPEED,
    backgroundOffset: 0,
    distance: 0,
    rocketModeActive: false
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

    // Update distance and check for mode changes
    gameState.distance += gameState.gameSpeed * 0.1;
    setDistance(Math.floor(gameState.distance));
    
    // Player physics
    const player = gameState.player;
    
    // Activate rocket mode after 500m
    if (gameState.distance > 500 && !gameState.rocketModeActive) {
      gameState.rocketModeActive = true;
      player.mode = 'rocket';
      player.rocketFuel = 100;
    }
    
    if (player.mode === 'normal' || player.mode === 'speed' || player.mode === 'mini') {
      // Normal/Speed/Mini mode physics
      const jumpForce = player.mode === 'speed' ? JUMP_FORCE * 1.3 : JUMP_FORCE;
      const gravity = player.mode === 'speed' ? GRAVITY * 1.2 : GRAVITY;
      
      if ((gameState.keys.space || gameState.keys.up)) {
        if (player.onGround) {
          // First jump
          player.velocityY = -jumpForce;
          player.onGround = false;
          createJumpParticles(gameState, player.x, player.y + player.height);
        } else if (player.doubleJumpAvailable && !player.onGround) {
          // Double jump
          player.velocityY = -jumpForce * 0.8;
          player.doubleJumpAvailable = false;
          createJumpParticles(gameState, player.x, player.y + player.height);
        }
      }

      // Apply gravity
      player.velocityY += gravity;
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
        const rotationSpeed = player.mode === 'speed' ? 12 : 8;
        player.rotation += rotationSpeed;
      }
    } else if (player.mode === 'gravity') {
      // Gravity mode physics (inverted)
      if ((gameState.keys.space || gameState.keys.up)) {
        if (player.onGround) {
          // Jump down in gravity mode
          player.velocityY = JUMP_FORCE;
          player.onGround = false;
          createJumpParticles(gameState, player.x, player.y);
        }
      }

      // Apply inverted gravity
      player.velocityY -= GRAVITY;
      player.y += player.velocityY;

      // Ceiling collision in gravity mode
      if (player.y <= 50) {
        player.y = 50;
        player.velocityY = 0;
        player.onGround = true;
        player.rotation = 180;
      } else {
        // Rotate player while in air (inverted)
        player.rotation -= 8;
      }
      
      // Ground collision in gravity mode (should not land on ground)
      const groundY = GAME_HEIGHT - GROUND_HEIGHT - player.height;
      if (player.y >= groundY) {
        player.y = groundY;
        player.velocityY = 0;
      }
    } else {
      // Rocket mode physics
      if (gameState.keys.space || gameState.keys.up || gameState.keys.w) {
        if (player.rocketFuel > 0) {
          player.velocityY = -6; // Hover force
          player.rocketFuel -= 5; // Increased fuel consumption
          createRocketParticles(gameState, player.x, player.y + player.height);
        }
      } else {
        player.velocityY += GRAVITY * 0.5; // Reduced gravity in rocket mode
      }
      
      player.y += player.velocityY;
      
      // Rocket fuel regeneration when not using (slower)
      if (!(gameState.keys.space || gameState.keys.up || gameState.keys.w) && player.rocketFuel < 100) {
        player.rocketFuel += 0.2; // Slower regeneration
      }
      
      // Check if rocket fuel is depleted
      if (player.rocketFuel <= 0) {
        player.mode = 'normal';
        gameState.rocketModeActive = false;
        player.rocketFuel = 0;
      }
      
      // Ceiling collision
      if (player.y <= 50) {
        player.y = 50;
        player.velocityY = 0;
      }
      
      // Ground collision in rocket mode
      const groundY = GAME_HEIGHT - GROUND_HEIGHT - player.height;
      if (player.y >= groundY) {
        player.y = groundY;
        player.velocityY = 0;
      }
      
      player.rotation += 2; // Slow rotation in rocket mode
    }

    // Move camera with player
    gameState.camera.x += gameState.gameSpeed;

    // Spawn obstacles with mode-specific rates
    let spawnRate = OBSTACLE_SPAWN_RATE;
    if (gameState.player.mode === 'speed') {
      spawnRate = OBSTACLE_SPAWN_RATE * 1.5; // More frequent obstacles in speed mode
    } else if (gameState.player.mode === 'gravity') {
      spawnRate = OBSTACLE_SPAWN_RATE * 1.3; // More frequent obstacles in gravity mode
    } else if (gameState.player.mode === 'mini') {
      spawnRate = OBSTACLE_SPAWN_RATE * 1.8; // Much more frequent obstacles in mini mode
    }
    
    if (Math.random() < spawnRate) {
      spawnObstacle(gameState);
    }
    
    // Spawn power-ups (rare)
    if (Math.random() < 0.003) { // Much rarer than obstacles
      spawnPowerUp(gameState);
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
        if (obstacle.type === 'stairs') {
          // Platform behavior for stairs - player lands on top
          player.y = obstacle.y - player.height;
          player.velocityY = 0;
          player.onGround = true;
          player.rotation = 0;
        } else {
          // Normal collision - game over
          gameState.isRunning = false;
          setGameOver(true);
          setGameStarted(false);
          createExplosionParticles(gameState, player.x + player.width/2, player.y + player.height/2);
          return;
        }
      }

      // Score for passing obstacles
      if (!obstacle.passed && obstacle.x + obstacle.width < player.x) {
        obstacle.passed = true;
        setScore(prev => prev + 10);
      }
    });
    
    // Update power-ups
    gameState.powerUps.forEach((powerUp, index) => {
      powerUp.x -= gameState.gameSpeed;
      
      // Remove off-screen power-ups
      if (powerUp.x + powerUp.width < -100) {
        gameState.powerUps.splice(index, 1);
      }
      
      // Check power-up collection
      if (checkPowerUpCollision(player, powerUp) && !powerUp.collected) {
        powerUp.collected = true;
        if (powerUp.type === 'double_jump') {
          player.doubleJumpAvailable = true;
        } else if (powerUp.type === 'speed_mode') {
          player.mode = 'speed';
          gameState.rocketModeActive = false;
        } else if (powerUp.type === 'gravity_mode') {
          player.mode = 'gravity';
          gameState.rocketModeActive = false;
          player.onGround = false; // Start in air for gravity mode
        } else if (powerUp.type === 'mini_mode') {
          player.mode = 'mini';
          gameState.rocketModeActive = false;
          // Adjust player size for mini mode
          player.width = PLAYER_SIZE * 0.6;
          player.height = PLAYER_SIZE * 0.6;
        }
        gameState.powerUps.splice(index, 1);
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
    
    // Draw power-ups
    gameState.powerUps.forEach(powerUp => {
      drawPowerUp(ctx, powerUp);
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
    
    // Adjust size for mini mode
    const drawWidth = player.mode === 'mini' ? player.width * 0.6 : player.width;
    const drawHeight = player.mode === 'mini' ? player.height * 0.6 : player.height;
    
    // Move to player center for rotation
    ctx.translate(player.x + player.width/2, player.y + player.height/2);
    ctx.rotate((player.rotation * Math.PI) / 180);
    
    if (player.mode === 'normal') {
      // Normal mode - yellow square
      ctx.shadowColor = '#ffff00';
      ctx.shadowBlur = 15;
      ctx.fillStyle = '#ffff00';
      ctx.fillRect(-drawWidth/2, -drawHeight/2, drawWidth, drawHeight);
      
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 2;
      ctx.strokeRect(-drawWidth/2, -drawHeight/2, drawWidth, drawHeight);
    } else if (player.mode === 'speed') {
      // Speed mode - red square with speed lines
      ctx.shadowColor = '#ff0044';
      ctx.shadowBlur = 20;
      ctx.fillStyle = '#ff0044';
      ctx.fillRect(-drawWidth/2, -drawHeight/2, drawWidth, drawHeight);
      
      // Speed lines
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(-drawWidth/2 - 10, -drawHeight/4);
      ctx.lineTo(-drawWidth/2 - 5, -drawHeight/4);
      ctx.moveTo(-drawWidth/2 - 10, 0);
      ctx.lineTo(-drawWidth/2 - 5, 0);
      ctx.moveTo(-drawWidth/2 - 10, drawHeight/4);
      ctx.lineTo(-drawWidth/2 - 5, drawHeight/4);
      ctx.stroke();
      
      ctx.strokeRect(-drawWidth/2, -drawHeight/2, drawWidth, drawHeight);
    } else if (player.mode === 'gravity') {
      // Gravity mode - purple square with gravity symbol
      ctx.shadowColor = '#aa00ff';
      ctx.shadowBlur = 15;
      ctx.fillStyle = '#aa00ff';
      ctx.fillRect(-drawWidth/2, -drawHeight/2, drawWidth, drawHeight);
      
      // Gravity symbol (upside down triangle)
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.moveTo(0, -drawHeight/4);
      ctx.lineTo(-drawWidth/4, drawHeight/4);
      ctx.lineTo(drawWidth/4, drawHeight/4);
      ctx.closePath();
      ctx.fill();
      
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 2;
      ctx.strokeRect(-drawWidth/2, -drawHeight/2, drawWidth, drawHeight);
    } else if (player.mode === 'mini') {
      // Mini mode - green small square
      ctx.shadowColor = '#00ff44';
      ctx.shadowBlur = 10;
      ctx.fillStyle = '#00ff44';
      ctx.fillRect(-drawWidth/2, -drawHeight/2, drawWidth, drawHeight);
      
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 1;
      ctx.strokeRect(-drawWidth/2, -drawHeight/2, drawWidth, drawHeight);
    } else {
      // Rocket mode - blue rocket shape
      ctx.shadowColor = '#00aaff';
      ctx.shadowBlur = 20;
      ctx.fillStyle = '#00aaff';
      
      // Rocket body
      ctx.beginPath();
      ctx.moveTo(-drawWidth/2, drawHeight/2);
      ctx.lineTo(drawWidth/2, drawHeight/2);
      ctx.lineTo(drawWidth/3, -drawHeight/2);
      ctx.lineTo(-drawWidth/3, -drawHeight/2);
      ctx.closePath();
      ctx.fill();
      
      // Rocket fins
      ctx.fillStyle = '#0088cc';
      ctx.fillRect(-drawWidth/2 - 5, drawHeight/4, 5, drawHeight/4);
      ctx.fillRect(drawWidth/2, drawHeight/4, 5, drawHeight/4);
      
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(-drawWidth/2, drawHeight/2);
      ctx.lineTo(drawWidth/2, drawHeight/2);
      ctx.lineTo(drawWidth/3, -drawHeight/2);
      ctx.lineTo(-drawWidth/3, -drawHeight/2);
      ctx.closePath();
      ctx.stroke();
    }
    
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
        
      case 'stairs':
        ctx.fillStyle = '#00ff88';
        ctx.shadowColor = '#00ff88';
        ctx.shadowBlur = 10;
        
        // Draw stairs as steps
        const stepWidth = obstacle.width / 3;
        const stepHeight = obstacle.height / 3;
        
        for (let i = 0; i < 3; i++) {
          const stepX = obstacle.x + i * stepWidth;
          const stepY = obstacle.y + obstacle.height - (i + 1) * stepHeight;
          ctx.fillRect(stepX, stepY, stepWidth, (i + 1) * stepHeight);
        }
        
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 2;
        for (let i = 0; i < 3; i++) {
          const stepX = obstacle.x + i * stepWidth;
          const stepY = obstacle.y + obstacle.height - (i + 1) * stepHeight;
          ctx.strokeRect(stepX, stepY, stepWidth, (i + 1) * stepHeight);
        }
        break;
        
      case 'ceiling_barrier':
        ctx.fillStyle = '#ff6600';
        ctx.shadowColor = '#ff6600';
        ctx.shadowBlur = 15;
        ctx.fillRect(obstacle.x, obstacle.y, obstacle.width, obstacle.height);
        
        // Add warning stripes
        ctx.fillStyle = '#ffff00';
        for (let i = 0; i < obstacle.height; i += 20) {
          ctx.fillRect(obstacle.x, obstacle.y + i, obstacle.width, 10);
        }
        
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 2;
        ctx.strokeRect(obstacle.x, obstacle.y, obstacle.width, obstacle.height);
        break;
        
      case 'floor_barrier':
        ctx.fillStyle = '#ff6600';
        ctx.shadowColor = '#ff6600';
        ctx.shadowBlur = 15;
        ctx.fillRect(obstacle.x, obstacle.y, obstacle.width, obstacle.height);
        
        // Add warning stripes
        ctx.fillStyle = '#ffff00';
        for (let i = 0; i < obstacle.height; i += 20) {
          ctx.fillRect(obstacle.x, obstacle.y + i, obstacle.width, 10);
        }
        
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 2;
        ctx.strokeRect(obstacle.x, obstacle.y, obstacle.width, obstacle.height);
        break;
    }
    
    ctx.shadowBlur = 0;
    ctx.restore();
  };

  const spawnObstacle = (gameState: GameState) => {
    let types: ('spike' | 'block' | 'saw' | 'stairs' | 'ceiling_barrier' | 'floor_barrier')[];
    const player = gameState.player;
    
    if (gameState.rocketModeActive) {
      // In rocket mode, spawn ceiling and floor barriers
      types = ['ceiling_barrier', 'floor_barrier', 'spike', 'block'];
    } else if (player.mode === 'speed') {
      // Speed mode: More frequent and taller obstacles
      types = ['spike', 'block', 'saw', 'stairs'];
    } else if (player.mode === 'gravity') {
      // Gravity mode: Ceiling obstacles and inverted challenges
      types = ['ceiling_barrier', 'spike', 'block'];
    } else if (player.mode === 'mini') {
      // Mini mode: Lower obstacles and tight spaces
      types = ['spike', 'block', 'saw'];
    } else if (gameState.distance > 200) {
      // After 200m, add stairs
      types = ['spike', 'block', 'saw', 'stairs'];
    } else {
      // Normal obstacles
      types = ['spike', 'block', 'saw'];
    }
    
    const type = types[Math.floor(Math.random() * types.length)];
    let obstacle: Obstacle;
    
    switch (type) {
      case 'spike':
        let spikeHeight = 40;
        let spikeY = GAME_HEIGHT - GROUND_HEIGHT - spikeHeight;
        
        // Adjust for different modes
        if (player.mode === 'speed') {
          spikeHeight = 60; // Taller spikes for speed mode
          spikeY = GAME_HEIGHT - GROUND_HEIGHT - spikeHeight;
        } else if (player.mode === 'mini') {
          spikeHeight = 25; // Shorter spikes for mini mode
          spikeY = GAME_HEIGHT - GROUND_HEIGHT - spikeHeight;
        } else if (player.mode === 'gravity') {
          spikeY = 50; // Ceiling spikes for gravity mode
        }
        
        obstacle = {
          x: GAME_WIDTH + 50,
          y: spikeY,
          width: 30,
          height: spikeHeight,
          type: 'spike',
          passed: false
        };
        break;
        
      case 'block':
        let blockHeight = 50;
        let blockY = GAME_HEIGHT - GROUND_HEIGHT - blockHeight;
        
        // Adjust for different modes
        if (player.mode === 'speed') {
          blockHeight = 70; // Taller blocks for speed mode
          blockY = GAME_HEIGHT - GROUND_HEIGHT - blockHeight;
        } else if (player.mode === 'mini') {
          blockHeight = 35; // Shorter blocks for mini mode
          blockY = GAME_HEIGHT - GROUND_HEIGHT - blockHeight;
        } else if (player.mode === 'gravity') {
          blockY = 50; // Ceiling blocks for gravity mode
        }
        
        obstacle = {
          x: GAME_WIDTH + 50,
          y: blockY,
          width: 40,
          height: blockHeight,
          type: 'block',
          passed: false
        };
        break;
        
      case 'saw':
        let sawSize = 50;
        let sawY = GAME_HEIGHT - GROUND_HEIGHT - sawSize;
        
        // Adjust for different modes
        if (player.mode === 'speed') {
          sawSize = 65; // Bigger saws for speed mode
          sawY = GAME_HEIGHT - GROUND_HEIGHT - sawSize;
        } else if (player.mode === 'mini') {
          sawSize = 35; // Smaller saws for mini mode
          sawY = GAME_HEIGHT - GROUND_HEIGHT - sawSize;
        }
        
        obstacle = {
          x: GAME_WIDTH + 50,
          y: sawY,
          width: sawSize,
          height: sawSize,
          type: 'saw',
          passed: false
        };
        break;
        
      case 'stairs':
        obstacle = {
          x: GAME_WIDTH + 50,
          y: GAME_HEIGHT - GROUND_HEIGHT - 80,
          width: 60,
          height: 80,
          type: 'stairs',
          passed: false
        };
        break;
        
      case 'ceiling_barrier':
        obstacle = {
          x: GAME_WIDTH + 50,
          y: 0,
          width: 40,
          height: 150,
          type: 'ceiling_barrier',
          passed: false
        };
        break;
        
      case 'floor_barrier':
        obstacle = {
          x: GAME_WIDTH + 50,
          y: GAME_HEIGHT - 150,
          width: 40,
          height: 150,
          type: 'floor_barrier',
          passed: false
        };
        break;
    }
    
    gameState.obstacles.push(obstacle);
  };

  const checkCollision = (player: Player, obstacle: Obstacle): boolean => {
    // For stairs, only check collision from above (platform behavior)
    if (obstacle.type === 'stairs') {
      return (
        player.x < obstacle.x + obstacle.width &&
        player.x + player.width > obstacle.x &&
        player.y + player.height > obstacle.y &&
        player.y + player.height < obstacle.y + 20 && // Only top surface collision
        player.velocityY >= 0 // Only when falling down
      );
    }
    
    // Normal collision for other obstacles
    return (
      player.x < obstacle.x + obstacle.width &&
      player.x + player.width > obstacle.x &&
      player.y < obstacle.y + obstacle.height &&
      player.y + player.height > obstacle.y
    );
  };
  
  const spawnPowerUp = (gameState: GameState) => {
    const types: ('double_jump' | 'speed_mode' | 'gravity_mode' | 'mini_mode')[] = [
      'double_jump', 'speed_mode', 'gravity_mode', 'mini_mode'
    ];
    
    const type = types[Math.floor(Math.random() * types.length)];
    
    const powerUp: PowerUp = {
      x: GAME_WIDTH + 50,
      y: GAME_HEIGHT - GROUND_HEIGHT - 100,
      width: 25,
      height: 25,
      type: type,
      collected: false
    };
    
    gameState.powerUps.push(powerUp);
  };
  
  const checkPowerUpCollision = (player: Player, powerUp: PowerUp): boolean => {
    return (
      player.x < powerUp.x + powerUp.width &&
      player.x + player.width > powerUp.x &&
      player.y < powerUp.y + powerUp.height &&
      player.y + player.height > powerUp.y
    );
  };
  
  const drawPowerUp = (ctx: CanvasRenderingContext2D, powerUp: PowerUp) => {
    ctx.save();
    
    if (powerUp.type === 'double_jump') {
      // Draw glowing double jump icon
      ctx.shadowColor = '#00ff88';
      ctx.shadowBlur = 15;
      
      // Outer glow
      ctx.fillStyle = '#00ff88';
      ctx.fillRect(powerUp.x - 2, powerUp.y - 2, powerUp.width + 4, powerUp.height + 4);
      
      // Inner core
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(powerUp.x + 5, powerUp.y + 5, powerUp.width - 10, powerUp.height - 10);
      
      // Double arrow symbol
      ctx.fillStyle = '#00ff88';
      ctx.font = '16px Arial';
      ctx.textAlign = 'center';
      ctx.fillText('↑↑', powerUp.x + powerUp.width/2, powerUp.y + powerUp.height/2 + 5);
    } else if (powerUp.type === 'speed_mode') {
      // Draw speed mode power-up
      ctx.shadowColor = '#ff0044';
      ctx.shadowBlur = 15;
      
      // Outer glow
      ctx.fillStyle = '#ff0044';
      ctx.fillRect(powerUp.x - 2, powerUp.y - 2, powerUp.width + 4, powerUp.height + 4);
      
      // Inner core
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(powerUp.x + 5, powerUp.y + 5, powerUp.width - 10, powerUp.height - 10);
      
      // Speed symbol
      ctx.fillStyle = '#ff0044';
      ctx.font = '14px Arial';
      ctx.textAlign = 'center';
      ctx.fillText('>>>', powerUp.x + powerUp.width/2, powerUp.y + powerUp.height/2 + 4);
    } else if (powerUp.type === 'gravity_mode') {
      // Draw gravity mode power-up
      ctx.shadowColor = '#aa00ff';
      ctx.shadowBlur = 15;
      
      // Outer glow
      ctx.fillStyle = '#aa00ff';
      ctx.fillRect(powerUp.x - 2, powerUp.y - 2, powerUp.width + 4, powerUp.height + 4);
      
      // Inner core
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(powerUp.x + 5, powerUp.y + 5, powerUp.width - 10, powerUp.height - 10);
      
      // Gravity symbol (upside down triangle)
      ctx.fillStyle = '#aa00ff';
      ctx.beginPath();
      ctx.moveTo(powerUp.x + powerUp.width/2, powerUp.y + 8);
      ctx.lineTo(powerUp.x + 8, powerUp.y + powerUp.height - 8);
      ctx.lineTo(powerUp.x + powerUp.width - 8, powerUp.y + powerUp.height - 8);
      ctx.closePath();
      ctx.fill();
    } else if (powerUp.type === 'mini_mode') {
      // Draw mini mode power-up
      ctx.shadowColor = '#00ff44';
      ctx.shadowBlur = 15;
      
      // Outer glow
      ctx.fillStyle = '#00ff44';
      ctx.fillRect(powerUp.x - 2, powerUp.y - 2, powerUp.width + 4, powerUp.height + 4);
      
      // Inner core
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(powerUp.x + 5, powerUp.y + 5, powerUp.width - 10, powerUp.height - 10);
      
      // Mini symbol (small square)
      ctx.fillStyle = '#00ff44';
      ctx.fillRect(powerUp.x + 10, powerUp.y + 10, 5, 5);
    }
    
    ctx.restore();
  };

  const createJumpParticles = (gameState: GameState, x: number, y: number) => {
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

  const createExplosionParticles = (gameState: GameState, x: number, y: number) => {
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

  const createRocketParticles = (gameState: GameState, x: number, y: number) => {
    for (let i = 0; i < 3; i++) {
      gameState.particles.push({
        x: x - 10 + Math.random() * 20,
        y: y + 5,
        velocityX: (Math.random() - 0.5) * 2,
        velocityY: Math.random() * 2 + 1,
        size: Math.random() * 4 + 2,
        color: Math.random() > 0.5 ? '#00aaff' : '#ffffff',
        life: 1
      });
    }
  };

  const updateParticles = (gameState: GameState) => {
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
        rotation: 0,
        mode: 'normal',
        rocketFuel: 100,
        doubleJumpAvailable: false
      },
      obstacles: [],
      powerUps: [],
      particles: [],
      camera: { x: 0 },
      keys: { space: false, up: false, w: false },
      isRunning: true,
      gameSpeed: GAME_SPEED,
      backgroundOffset: 0,
      distance: 0,
      rocketModeActive: false
    };

    if (gameLoopRef.current) {
      cancelAnimationFrame(gameLoopRef.current);
    }
    gameLoop();
  }, [gameLoop]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const key = e.key.toLowerCase();
      if (key === ' ' || key === 'arrowup') {
        e.preventDefault();
        gameStateRef.current.keys.space = true;
        gameStateRef.current.keys.up = true;
      }
      if (key === 'w') {
        e.preventDefault();
        gameStateRef.current.keys.w = true;
      }
      if (key === 'r' && gameOver) {
        startGame();
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      const key = e.key.toLowerCase();
      if (key === ' ' || key === 'arrowup') {
        e.preventDefault();
        gameStateRef.current.keys.space = false;
        gameStateRef.current.keys.up = false;
      }
      if (key === 'w') {
        e.preventDefault();
        gameStateRef.current.keys.w = false;
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
        {gameStateRef.current.rocketModeActive && (
          <div className="flex items-center gap-4">
            <div className="text-lg font-bold neon-text text-blue-400">
              🚀 ROCKET MODE
            </div>
            <div className="flex flex-col items-center">
              <div className="text-sm text-blue-300">Fuel</div>
              <div className="w-20 h-3 bg-gray-700 border border-blue-400 rounded">
                <div 
                  className="h-full bg-gradient-to-r from-blue-500 to-cyan-400 rounded transition-all duration-100"
                  style={{ width: `${gameStateRef.current.player.rocketFuel}%` }}
                ></div>
              </div>
            </div>
          </div>
        )}
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
                <p>🎮 SPACE / ↑ to jump (Normal mode)</p>
                <p>🚀 W to hover (Rocket mode - after 500m)</p>
                <p>🎯 Avoid obstacles & barriers!</p>
                <p>🪜 Jump on stairs after 200m</p>
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
