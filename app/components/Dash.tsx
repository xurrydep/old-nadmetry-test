"use client";
import { useEffect, useRef, useState, useCallback } from 'react';
import { submitPlayerScore, getPlayerTotalData } from '../lib/score-api';
import { GAME_CONFIG } from '../lib/game-config';

interface Player {
  x: number;
  y: number;
  width: number;
  height: number;
  velocityY: number;
  onGround: boolean;
  rotation: number;
  mode: 'normal' | 'rocket' | 'gravity' | 'mini' | 'wave' | 'ball' | 'ufo';
  rocketFuel: number;
  doubleJumpAvailable: boolean;
}

interface Obstacle {
  x: number;
  y: number;
  width: number;
  height: number;
  type: 'spike' | 'block' | 'saw' | 'platform' | 'ceiling_barrier' | 'floor_barrier' | 'rotating_platform' | 'sliding_floor' | 'direction_changer';
  passed: boolean;
  rotation?: number;
  rotationSpeed?: number;
  slideDirection?: 'left' | 'right';
  slideSpeed?: number;
  originalX?: number;
  slideRange?: number;
  changeDirection?: 'up' | 'down' | 'left' | 'right';
}

interface PowerUp {
  x: number;
  y: number;
  width: number;
  height: number;
  type: 'double_jump' | 'gravity_mode' | 'mini_mode';
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
  type?: 'jump' | 'rocket' | 'explosion' | 'theme_change';
}

interface Theme {
  name: string;
  backgroundColors: string[];
  gridColor: string;
  waveColor: string;
  obstacleColors: {
    spike: string;
    block: string;
    saw: string;
  };
  particleColors: {
    jump: string;
    rocket: string;
    explosion: string;
  };
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
  currentTheme: string;
  speedBoostActive: boolean;
  speedBoostEndTime: number;
  lastSpeedChangeScore: number;
  multiJumpCount: number;
  maxMultiJumps: number;
  dashAbilityActive: boolean;
  dashCooldown: number;
  shieldActive: boolean;
  shieldEndTime: number;
  lastAbilityUnlockScore: number;
  score: number;
  rocketCooldown: number;
}

const GAME_WIDTH = 800;
const GAME_HEIGHT = 600;
const GROUND_HEIGHT = 100;
const PLAYER_SIZE = 30;
const JUMP_FORCE = 15;
const GRAVITY = 0.8;
const GAME_SPEED = 8;
const OBSTACLE_SPAWN_RATE = 0.015;

// Theme tanımları
const THEMES: { [key: string]: Theme } = {
  classic: {
    name: 'Classic Neonad',
    backgroundColors: ['#0a0a0a', '#1a1a2e', '#16213e'],
    gridColor: 'rgba(0, 255, 255, 0.1)',
    waveColor: '#00ffff',
    obstacleColors: {
      spike: '#ff0066',
      block: '#ff3300',
      saw: '#ff0000'
    },
    particleColors: {
      jump: '#ffff00',
      rocket: '#00aaff',
      explosion: '#ff4444'
    }
  },
  forest: {
    name: 'Orman',
    backgroundColors: ['#0d2818', '#1a4d2e', '#2d5a3d'],
    gridColor: 'rgba(34, 139, 34, 0.2)',
    waveColor: '#32cd32',
    obstacleColors: {
      spike: '#8b4513',
      block: '#654321',
      saw: '#a0522d'
    },
    particleColors: {
      jump: '#90ee90',
      rocket: '#228b22',
      explosion: '#ff6347'
    }
  },
  ocean: {
    name: 'Okyanus',
    backgroundColors: ['#001122', '#003366', '#004488'],
    gridColor: 'rgba(0, 191, 255, 0.2)',
    waveColor: '#00bfff',
    obstacleColors: {
      spike: '#4682b4',
      block: '#1e90ff',
      saw: '#0066cc'
    },
    particleColors: {
      jump: '#87ceeb',
      rocket: '#4169e1',
      explosion: '#ff7f50'
    }
  },
  volcano: {
    name: 'Volkan',
    backgroundColors: ['#2d0a0a', '#4d1a1a', '#662222'],
    gridColor: 'rgba(255, 69, 0, 0.3)',
    waveColor: '#ff4500',
    obstacleColors: {
      spike: '#dc143c',
      block: '#b22222',
      saw: '#8b0000'
    },
    particleColors: {
      jump: '#ffa500',
      rocket: '#ff6347',
      explosion: '#ff0000'
    }
  },
  galaxy: {
    name: 'Galaksi',
    backgroundColors: ['#0a0a2e', '#1a1a4d', '#2e2e66'],
    gridColor: 'rgba(138, 43, 226, 0.2)',
    waveColor: '#9370db',
    obstacleColors: {
      spike: '#8a2be2',
      block: '#9932cc',
      saw: '#ba55d3'
    },
    particleColors: {
      jump: '#dda0dd',
      rocket: '#9370db',
      explosion: '#ff69b4'
    }
  }
}

// Particle creation functions
const createRocketParticles = (gameState: GameState, x: number, y: number) => {
  const theme = THEMES[gameState.currentTheme];
  for (let i = 0; i < 3; i++) {
    gameState.particles.push({
      x: x - 10 + Math.random() * 20,
      y: y + 5,
      velocityX: (Math.random() - 0.5) * 2,
      velocityY: Math.random() * 2 + 1,
      size: Math.random() * 4 + 2,
      color: Math.random() > 0.5 ? theme.particleColors.rocket : '#ffffff',
      life: 1
    });
  }
};

const createExplosionParticles = (gameState: GameState, x: number, y: number) => {
  const theme = THEMES[gameState.currentTheme];
  for (let i = 0; i < 15; i++) {
    gameState.particles.push({
      x: x,
      y: y,
      velocityX: (Math.random() - 0.5) * 10,
      velocityY: (Math.random() - 0.5) * 10,
      size: Math.random() * 5 + 2,
      color: Math.random() > 0.5 ? theme.particleColors.explosion : theme.particleColors.jump,
      life: 1
    });
  }
};

// Advanced evolutionary transition system
function checkEvolutionaryTransition(gameState: GameState, score: number) {
  const player = gameState.player;
  
  // Wave mode at 800 points
  if (score >= 800 && player.mode !== 'wave' && player.mode !== 'ball' && player.mode !== 'ufo') {
    player.mode = 'wave';
    player.velocityY = 0;
    createRocketParticles(gameState, player.x, player.y);
  }
  
  // Ball mode at 1200 points
  if (score >= 1200 && player.mode !== 'ball' && player.mode !== 'ufo') {
    player.mode = 'ball';
    player.velocityY = 0;
    player.rotation = 0;
    createExplosionParticles(gameState, player.x, player.y);
  }
  
  // UFO mode at 1600 points
  if (score >= 1600 && player.mode !== 'ufo') {
    player.mode = 'ufo';
    player.velocityY = 0;
    player.rocketFuel = 100;
    createRocketParticles(gameState, player.x, player.y);
  }
};

// Skor bazlı tema geçişleri
const THEME_THRESHOLDS = {
  classic: 0,
  forest: 500,
  ocean: 1500,
  volcano: 3000,
  galaxy: 5000
};

interface LeaderboardEntry {
  address: string;
  nickname: string;
  score: number;
  rank: number;
}

interface LeaderboardSidebarProps {
  playerAddress: string;
  currentScore: number;
}

function LeaderboardSidebar({ playerAddress, currentScore }: LeaderboardSidebarProps) {
  const [leaderboardData, setLeaderboardData] = useState<LeaderboardEntry[]>([]);
  const [playerData, setPlayerData] = useState<{ totalScore: string; rank: number } | null>(null);
  const [loading, setLoading] = useState(false);

  const fetchLeaderboardData = useCallback(async () => {
    setLoading(true);
    try {
      // Real leaderboard data from Monad Games
      const realLeaderboardData: LeaderboardEntry[] = [
        { address: '0xFeA3...6499', nickname: 'AnonAmosAdmn', score: 400, rank: 1 },
        { address: '0x7217...6b24', nickname: 'serhat9493', score: 330, rank: 2 },
        { address: '0x0d3e...D062', nickname: 'OldSix', score: 310, rank: 3 },
        { address: '0x3E82...2953', nickname: 'xurry', score: 290, rank: 4 },
        { address: '0x1b88...9b55', nickname: 'mld5', score: 290, rank: 5 },
        { address: '0xBc5d...4C54', nickname: 'Kankokn', score: 270, rank: 6 },
        { address: '0xedEC...dD08', nickname: 'James', score: 190, rank: 7 },
        { address: '0xf535...84D3', nickname: 'semih', score: 120, rank: 8 },
        { address: '0x5fA0...2193', nickname: 'consumeobeydie', score: 110, rank: 9 },
        { address: '0x797e...637b', nickname: 'shuegg', score: 80, rank: 10 }
      ];
      
      // Get player's actual data
      if (playerAddress) {
        const playerTotalData = await getPlayerTotalData(playerAddress);
        if (playerTotalData && playerTotalData.success) {
          const totalScore = parseInt(playerTotalData.totalScore);
          const playerRank = realLeaderboardData.findIndex(entry => totalScore >= entry.score) + 1 || realLeaderboardData.length + 1;
          setPlayerData({ totalScore: playerTotalData.totalScore, rank: playerRank });
        }
      }
      
      setLeaderboardData(realLeaderboardData);
    } catch (error) {
      console.error('Error fetching leaderboard:', error);
    } finally {
      setLoading(false);
    }
  }, [playerAddress]);

  useEffect(() => {
    fetchLeaderboardData();
    const interval = setInterval(fetchLeaderboardData, 30000); // Refresh every 30 seconds
    return () => clearInterval(interval);
  }, [fetchLeaderboardData]);

  const formatAddress = (address: string) => {
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  };

  const formatScore = (score: number) => {
    return score.toLocaleString();
  };

  return (
    <div className="w-80 bg-gradient-to-b from-purple-900/20 to-purple-950/30 backdrop-blur-sm border-r border-purple-500/30 p-6 overflow-y-auto">
      {/* Header */}
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-pink-400 mb-2">
          🏆 Leaderboard Nads
        </h2>
        <div className="h-1 bg-gradient-to-r from-purple-500 to-pink-500 rounded-full shadow-lg shadow-purple-500/50"></div>
      </div>

      {/* Player's Current Stats */}
      {playerAddress && (
        <div className="mb-6 p-4 bg-gradient-to-r from-purple-800/30 to-pink-800/30 rounded-xl border border-purple-500/30 shadow-lg shadow-purple-500/20">
          <h3 className="text-lg font-bold text-purple-300 mb-2">📊 Your stats</h3>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-300">Score:</span>
              <span className="text-yellow-400 font-bold">{formatScore(currentScore)}</span>
            </div>
            {playerData && (
              <>
                <div className="flex justify-between">
                  <span className="text-gray-300">Total Score:</span>
                  <span className="text-green-400 font-bold">{formatScore(parseInt(playerData.totalScore))}</span>
                </div>
                <div className="flex justify-between">
                  
                  </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* Leaderboard List */}
      <div className="space-y-3">
        <h3 className="text-lg font-bold text-purple-300 mb-4">🎯 TOP 10 RANKING </h3>
        
        {loading ? (
          <div className="text-center py-8">
            <div className="animate-spin w-8 h-8 border-2 border-purple-500 border-t-transparent rounded-full mx-auto mb-2"></div>
            <p className="text-purple-300">Yükleniyor...</p>
          </div>
        ) : (
          leaderboardData.map((entry, index) => {
            const isCurrentPlayer = playerAddress && entry.address.toLowerCase().includes(playerAddress.toLowerCase().slice(2, 8));
            const isTop3 = index < 3;
            
            return (
              <div
                key={entry.address}
                className={`p-3 rounded-lg border transition-all duration-300 hover:scale-105 ${
                  isCurrentPlayer
                    ? 'bg-gradient-to-r from-yellow-800/40 to-orange-800/40 border-yellow-500/50 shadow-lg shadow-yellow-500/20'
                    : isTop3
                    ? 'bg-gradient-to-r from-purple-800/40 to-pink-800/40 border-purple-500/50 shadow-lg shadow-purple-500/20'
                    : 'bg-gradient-to-r from-gray-800/30 to-gray-700/30 border-gray-600/30 hover:border-purple-500/50'
                }`}
                style={{
                  transform: isTop3 ? 'perspective(1000px) rotateX(5deg)' : 'none',
                  boxShadow: isTop3 ? '0 10px 20px rgba(147, 51, 234, 0.3), inset 0 1px 0 rgba(255, 255, 255, 0.1)' : 'none'
                }}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm ${
                      index === 0 ? 'bg-gradient-to-r from-yellow-400 to-yellow-600 text-yellow-900' :
                      index === 1 ? 'bg-gradient-to-r from-gray-300 to-gray-500 text-gray-900' :
                      index === 2 ? 'bg-gradient-to-r from-orange-400 to-orange-600 text-orange-900' :
                      'bg-gradient-to-r from-purple-500 to-purple-700 text-white'
                    }`}>
                      {index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : entry.rank}
                    </div>
                    <div>
                      <p className={`font-medium text-sm ${
                        isCurrentPlayer ? 'text-yellow-300' : 'text-white'
                      }`}>
                        {formatAddress(entry.address)}
                        {isCurrentPlayer && <span className="ml-2 text-xs bg-yellow-500 text-yellow-900 px-2 py-1 rounded-full">SEN</span>}
                      </p>
                      <p className={`text-xs mt-1 ${
                        isCurrentPlayer ? 'text-yellow-200' : 'text-gray-400'
                      }`}>
                        {entry.nickname}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className={`font-bold ${
                      isCurrentPlayer ? 'text-yellow-400' : 
                      isTop3 ? 'text-purple-300' : 'text-gray-300'
                    }`}>
                      {formatScore(entry.score)}
                    </p>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Refresh Button */}
      <div className="mt-6 pt-4 border-t border-purple-500/30">
        <button
          onClick={fetchLeaderboardData}
          disabled={loading}
          className="w-full bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 disabled:from-gray-600 disabled:to-gray-700 text-white font-bold py-2 px-4 rounded-lg transition-all duration-300 transform hover:scale-105 disabled:hover:scale-100 shadow-lg shadow-purple-500/30"
        >
          {loading ? '🔄 Wait...' : '🔄 Refresh'}
        </button>
      </div>
    </div>
  );
}

interface NadmetryDashGameProps {
  playerAddress: string;
}

export default function NadmetryDashGame({ playerAddress }: NadmetryDashGameProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const gameLoopRef = useRef<number>(0);
  const [gameStarted, setGameStarted] = useState(false);
  const [gameOver, setGameOver] = useState(false);
  const [score, setScore] = useState(0);
  const [distance, setDistance] = useState(0);
  const [isSavingScore, setIsSavingScore] = useState(false);
  const [saveMessage, setSaveMessage] = useState<string>('');

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
    rocketModeActive: false,
    currentTheme: 'classic',
    speedBoostActive: false,
    speedBoostEndTime: 0,
    lastSpeedChangeScore: 0,
    multiJumpCount: 0,
    maxMultiJumps: 1,
    dashAbilityActive: false,
    dashCooldown: 0,
    shieldActive: false,
    shieldEndTime: 0,
    lastAbilityUnlockScore: 0,
    score: 0,
    rocketCooldown: 0
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
    drawBackground(ctx, gameState.backgroundOffset, gameState);
    gameState.backgroundOffset += gameState.gameSpeed * 0.5;

    // Update distance and check for mode changes
    gameState.distance += gameState.gameSpeed * 0.1;
    setDistance(Math.floor(gameState.distance));
    
    // Sync gameState.score with score state
    gameState.score = score;
    
    // Check for theme changes based on score
    updateTheme(gameState, score);
    
    // Check for dynamic speed changes
    checkDynamicSpeedChange(gameState, score);
    
    // Check for evolutionary transitions
    checkEvolutionaryTransition(gameState, score);
    
    // Check for new movement abilities
    checkNewMovementAbilities(gameState, score);
    
    // Player physics
    const player = gameState.player;
    
    // Activate rocket mode after 500m (with cooldown check)
    if (gameState.distance > 500 && !gameState.rocketModeActive && gameState.rocketCooldown <= 0) {
      gameState.rocketModeActive = true;
      player.mode = 'rocket';
      player.rocketFuel = 100;
    }
    
    // Decrease rocket cooldown
    if (gameState.rocketCooldown > 0) {
      gameState.rocketCooldown--;
    }
    
    if (player.mode === 'normal' || player.mode === 'mini') {
      // Normal/Mini mode physics
      const jumpForce = JUMP_FORCE;
      const gravity = GRAVITY;
      
      if ((gameState.keys.space || gameState.keys.up)) {
        if (player.onGround) {
          // First jump
          player.velocityY = -jumpForce;
          player.onGround = false;
          gameState.multiJumpCount = 1;
          createJumpParticles(gameState, player.x, player.y + player.height);
        } else if (gameState.multiJumpCount < gameState.maxMultiJumps && !player.onGround) {
          // Multi jump
          player.velocityY = -jumpForce * 0.8;
          gameState.multiJumpCount++;
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
        gameState.multiJumpCount = 0; // Reset multi jump count on ground
      } else {
        // Rotate player while in air
        player.rotation += 8;
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
      
      // Check if rocket fuel is depleted - return to normal mode
      if (player.rocketFuel <= 0) {
        player.mode = 'normal';
        gameState.rocketModeActive = false;
        player.rocketFuel = 0;
        player.width = PLAYER_SIZE;
        player.height = PLAYER_SIZE;
        player.onGround = true;
        gameState.rocketCooldown = 300; // 5 second cooldown at 60fps
        createExplosionParticles(gameState, player.x, player.y);
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
    
    // New evolutionary modes physics
    if (player.mode === 'wave') {
      // Wave mode - smooth sine wave movement
      if (gameState.keys.space || gameState.keys.up) {
        player.velocityY = -3; // Smooth upward movement
      } else {
        player.velocityY = 3; // Smooth downward movement
      }
      
      player.y += player.velocityY;
      
      // Boundaries
      if (player.y <= 50) player.y = 50;
      const groundY = GAME_HEIGHT - GROUND_HEIGHT - player.height;
      if (player.y >= groundY) player.y = groundY;
      
      player.rotation += 2; // Gentle rotation
    } else if (player.mode === 'ball') {
      // Ball mode - bouncing physics
      if (gameState.keys.space || gameState.keys.up) {
        if (player.onGround) {
          player.velocityY = -JUMP_FORCE * 1.2; // Higher bounce
          player.onGround = false;
          createJumpParticles(gameState, player.x, player.y + player.height);
        }
      }
      
      // Apply gravity with bounce
      player.velocityY += GRAVITY;
      player.y += player.velocityY;
      
      // Ground collision with bounce
      const groundY = GAME_HEIGHT - GROUND_HEIGHT - player.height;
      if (player.y >= groundY) {
        player.y = groundY;
        player.velocityY = Math.abs(player.velocityY) * -0.7; // Bounce with energy loss
        player.onGround = true;
      }
      
      // Continuous rotation
      player.rotation += 12;
    } else if (player.mode === 'ufo') {
      // UFO mode - hover with fuel system
      if (gameState.keys.space || gameState.keys.up || gameState.keys.w) {
        if (player.rocketFuel > 0) {
          player.velocityY = -4; // Controlled hover
          player.rocketFuel -= 3;
          createRocketParticles(gameState, player.x, player.y + player.height);
        }
      } else {
        player.velocityY += GRAVITY * 0.3; // Very light gravity
      }
      
      player.y += player.velocityY;
      
      // Boundaries
      if (player.y <= 50) {
        player.y = 50;
        player.velocityY = 0;
      }
      const groundY = GAME_HEIGHT - GROUND_HEIGHT - player.height;
      if (player.y >= groundY) {
        player.y = groundY;
        player.velocityY = 0;
        player.onGround = true;
      }
      
      // Gentle oscillating rotation
      player.rotation = Math.sin(Date.now() * 0.005) * 10;
      
      // Check if UFO fuel is depleted - return to normal mode
       if (player.rocketFuel <= 0) {
         player.mode = 'normal';
         gameState.rocketModeActive = false;
         player.rocketFuel = 0;
         player.width = PLAYER_SIZE;
         player.height = PLAYER_SIZE;
         player.onGround = true;
         player.rotation = 0;
         gameState.rocketCooldown = 300; // 5 second cooldown at 60fps
         createExplosionParticles(gameState, player.x, player.y);
       }
    }

    // Move camera with player
    gameState.camera.x += gameState.gameSpeed;

    // Spawn obstacles with mode-specific rates
    let spawnRate = OBSTACLE_SPAWN_RATE;
    if (gameState.player.mode === 'gravity') {
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
      
      // Update rotating platform rotation
      if (obstacle.type === 'rotating_platform' && obstacle.rotation !== undefined && obstacle.rotationSpeed !== undefined) {
        obstacle.rotation += obstacle.rotationSpeed;
        if (obstacle.rotation >= 360) {
          obstacle.rotation -= 360;
        }
      }
      
      // Update sliding floor movement
      if (obstacle.type === 'sliding_floor' && obstacle.slideDirection && obstacle.slideSpeed && obstacle.originalX !== undefined && obstacle.slideRange !== undefined) {
        if (obstacle.slideDirection === 'left') {
          obstacle.x -= obstacle.slideSpeed;
          if (obstacle.x <= obstacle.originalX - obstacle.slideRange) {
            obstacle.slideDirection = 'right';
          }
        } else {
          obstacle.x += obstacle.slideSpeed;
          if (obstacle.x >= obstacle.originalX + obstacle.slideRange) {
            obstacle.slideDirection = 'left';
          }
        }
      }

      // Remove off-screen obstacles
      if (obstacle.x + obstacle.width < -100) {
        gameState.obstacles.splice(index, 1);
      }

      // Check direction changer effect
      if (obstacle.type === 'direction_changer' && !obstacle.passed) {
        const collision = (
          player.x < obstacle.x + obstacle.width &&
          player.x + player.width > obstacle.x &&
          player.y < obstacle.y + obstacle.height &&
          player.y + player.height > obstacle.y
        );
        
        if (collision) {
          obstacle.passed = true; // Prevent multiple triggers
          
          // Apply direction change effect
          if (obstacle.changeDirection === 'up') {
            player.velocityY = -12; // Strong upward boost
          } else if (obstacle.changeDirection === 'down') {
            player.velocityY = 8; // Downward push
          } else if (obstacle.changeDirection === 'left') {
            gameState.gameSpeed *= 0.7; // Slow down temporarily
            setTimeout(() => {
              gameState.gameSpeed = Math.min(GAME_SPEED + Math.floor(gameState.camera.x / 1000) * 0.5, GAME_SPEED * 2);
            }, 2000);
          } else if (obstacle.changeDirection === 'right') {
            gameState.gameSpeed *= 1.5; // Speed up temporarily
            setTimeout(() => {
              gameState.gameSpeed = Math.min(GAME_SPEED + Math.floor(gameState.camera.x / 1000) * 0.5, GAME_SPEED * 2);
            }, 2000);
          }
          
          // Create visual effect
          createRocketParticles(gameState, obstacle.x + obstacle.width/2, obstacle.y + obstacle.height/2);
        }
      }
      
      // Check collision
      if (checkCollision(player, obstacle)) {
        if (gameState.shieldActive) {
          // Shield protects from collision
          gameState.shieldActive = false;
          gameState.shieldEndTime = 0;
          createExplosionParticles(gameState, obstacle.x + obstacle.width/2, obstacle.y + obstacle.height/2);
          // Remove the obstacle that hit the shield
          gameState.obstacles.splice(index, 1);
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
      drawObstacle(ctx, obstacle, gameState);
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
  }, [score]); // eslint-disable-line react-hooks/exhaustive-deps

  // Tema güncelleme fonksiyonu
  const updateTheme = (gameState: GameState, currentScore: number) => {
    let newTheme = 'classic';
    
    if (currentScore >= THEME_THRESHOLDS.galaxy) {
      newTheme = 'galaxy';
    } else if (currentScore >= THEME_THRESHOLDS.volcano) {
      newTheme = 'volcano';
    } else if (currentScore >= THEME_THRESHOLDS.ocean) {
      newTheme = 'ocean';
    } else if (currentScore >= THEME_THRESHOLDS.forest) {
      newTheme = 'forest';
    }
    
    if (gameState.currentTheme !== newTheme) {
      gameState.currentTheme = newTheme;
      // Tema değişim efekti için parçacık oluştur
      createThemeChangeParticles(gameState);
    }
  };

  const drawBackground = (ctx: CanvasRenderingContext2D, offset: number, gameState: GameState) => {
    const theme = THEMES[gameState.currentTheme];
    
    // 3D atmosfer efektleri
    drawAtmosphericEffects(ctx, offset, gameState);
    
    // Enhanced gradient background with depth
    const gradient = ctx.createLinearGradient(0, 0, 0, GAME_HEIGHT);
    gradient.addColorStop(0, theme.backgroundColors[0]);
    gradient.addColorStop(0.3, theme.backgroundColors[1]);
    gradient.addColorStop(0.7, theme.backgroundColors[0]);
    gradient.addColorStop(1, theme.backgroundColors[2]);
    
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT);

    // 3D grid pattern with perspective
    ctx.strokeStyle = theme.gridColor;
    ctx.lineWidth = 1;
    
    const gridSize = 50;
    const offsetX = offset % gridSize;
    
    // Perspective vertical lines
    for (let x = -offsetX; x < GAME_WIDTH + gridSize; x += gridSize) {
      const perspective = 1 - (x / GAME_WIDTH) * 0.3;
      ctx.globalAlpha = 0.1 * perspective;
      ctx.lineWidth = 1 * perspective;
      
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x + (GAME_WIDTH - x) * 0.1, GAME_HEIGHT);
      ctx.stroke();
    }
    
    // Perspective horizontal lines
    for (let y = 0; y < GAME_HEIGHT; y += gridSize) {
      const perspective = 1 - (y / GAME_HEIGHT) * 0.2;
      ctx.globalAlpha = 0.1 * perspective;
      ctx.lineWidth = 1 * perspective;
      
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(GAME_WIDTH, y + (GAME_HEIGHT - y) * 0.05);
      ctx.stroke();
    }
    
    ctx.globalAlpha = 1;

    // Enhanced neon wave effect with 3D depth
    ctx.strokeStyle = theme.waveColor;
    ctx.lineWidth = 2;
    ctx.shadowColor = theme.waveColor;
    ctx.shadowBlur = 10;
    
    const waveOffset = offset * 0.02;
    
    // Main wave
    ctx.beginPath();
    for (let x = 0; x < GAME_WIDTH; x += 5) {
      const y = GAME_HEIGHT * 0.3 + Math.sin((x + waveOffset) * 0.01) * 30;
      if (x === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.stroke();
    
    // Secondary wave for depth
    ctx.globalAlpha = 0.5;
    ctx.lineWidth = 1.5;
    ctx.shadowBlur = 5;
    
    ctx.beginPath();
    for (let x = 0; x < GAME_WIDTH; x += 5) {
      const y = GAME_HEIGHT * 0.3 + 20 + Math.sin((x + waveOffset * 0.7) * 0.012) * 20;
      if (x === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.stroke();
    
    ctx.globalAlpha = 1;
    
    // Tema özel efektleri
    drawThemeSpecificEffects(ctx, offset, gameState);
    
    ctx.shadowBlur = 0;
  };
  
  // 3D atmosfer efektleri fonksiyonu
  const drawAtmosphericEffects = (ctx: CanvasRenderingContext2D, offset: number, gameState: GameState) => {
    const theme = THEMES[gameState.currentTheme];
    
    // Işık ışınları
    ctx.save();
    ctx.globalAlpha = 0.1;
    
    for (let i = 0; i < 5; i++) {
      const angle = (offset * 0.001 + i * Math.PI / 3) % (Math.PI * 2);
      const startX = GAME_WIDTH / 2 + Math.cos(angle) * 100;
      const startY = GAME_HEIGHT / 2 + Math.sin(angle) * 50;
      const endX = GAME_WIDTH / 2 + Math.cos(angle) * 400;
      const endY = GAME_HEIGHT / 2 + Math.sin(angle) * 200;
      
      const gradient = ctx.createLinearGradient(startX, startY, endX, endY);
      gradient.addColorStop(0, theme.waveColor);
      gradient.addColorStop(1, 'transparent');
      
      ctx.strokeStyle = gradient;
      ctx.lineWidth = 20;
      ctx.beginPath();
      ctx.moveTo(startX, startY);
      ctx.lineTo(endX, endY);
      ctx.stroke();
    }
    
    // Dinamik ışıklandırma
    ctx.globalAlpha = 0.05;
    const pulseIntensity = Math.sin(offset * 0.005) * 0.5 + 0.5;
    
    const lightGradient = ctx.createRadialGradient(
      GAME_WIDTH / 2, GAME_HEIGHT / 2, 0,
      GAME_WIDTH / 2, GAME_HEIGHT / 2, GAME_WIDTH
    );
    lightGradient.addColorStop(0, theme.waveColor);
    lightGradient.addColorStop(0.5, 'rgba(255,255,255,0.1)');
    lightGradient.addColorStop(1, 'transparent');
    
    ctx.fillStyle = lightGradient;
    ctx.globalAlpha = 0.03 * pulseIntensity;
    ctx.fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT);
    
    ctx.restore();
  };
  
  // Tema özel efektleri
  const drawThemeSpecificEffects = (ctx: CanvasRenderingContext2D, offset: number, gameState: GameState) => {
    
    switch (gameState.currentTheme) {
      case 'forest':
        // Ağaç siluetleri
        ctx.fillStyle = 'rgba(34, 139, 34, 0.3)';
        for (let i = 0; i < 5; i++) {
          const x = (i * 200 - offset * 0.3) % (GAME_WIDTH + 100);
          const height = 80 + Math.sin(i) * 20;
          ctx.fillRect(x, GAME_HEIGHT - GROUND_HEIGHT - height, 15, height);
        }
        break;
        
      case 'ocean':
        // Baloncuklar
        ctx.fillStyle = 'rgba(135, 206, 235, 0.4)';
        for (let i = 0; i < 8; i++) {
          const x = (i * 100 + offset * 0.5) % GAME_WIDTH;
          const y = GAME_HEIGHT * 0.6 + Math.sin(offset * 0.01 + i) * 50;
          const size = 5 + Math.sin(i) * 3;
          ctx.beginPath();
          ctx.arc(x, y, size, 0, Math.PI * 2);
          ctx.fill();
        }
        break;
        
      case 'volcano':
        // Lav parçacıkları
        ctx.fillStyle = 'rgba(255, 69, 0, 0.6)';
        for (let i = 0; i < 10; i++) {
          const x = Math.random() * GAME_WIDTH;
          const y = GAME_HEIGHT - GROUND_HEIGHT + Math.sin(offset * 0.02 + i) * 20;
          const size = 2 + Math.random() * 3;
          ctx.beginPath();
          ctx.arc(x, y, size, 0, Math.PI * 2);
          ctx.fill();
        }
        break;
        
      case 'galaxy':
        // Yıldızlar
        ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
        for (let i = 0; i < 15; i++) {
          const x = (i * 60 + offset * 0.1) % GAME_WIDTH;
          const y = (i * 40) % (GAME_HEIGHT - GROUND_HEIGHT);
          const size = 1 + Math.sin(offset * 0.05 + i) * 1;
          ctx.beginPath();
          ctx.arc(x, y, size, 0, Math.PI * 2);
          ctx.fill();
        }
        break;
    }
  };
  
  // Tema değişim parçacıkları
  const createThemeChangeParticles = (gameState: GameState) => {
    const theme = THEMES[gameState.currentTheme];
    for (let i = 0; i < 20; i++) {
      gameState.particles.push({
        x: Math.random() * GAME_WIDTH,
        y: Math.random() * GAME_HEIGHT,
        velocityX: (Math.random() - 0.5) * 8,
        velocityY: (Math.random() - 0.5) * 8,
        size: Math.random() * 5 + 2,
        color: theme.waveColor,
        life: 1
      });
    }
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
    
    // 3D gölge efekti
    const shadowOffset = 5;
    const shadowOpacity = 0.3;
    
    // Gölge çiz
    ctx.save();
    ctx.translate(player.x + player.width/2 + shadowOffset, player.y + player.height/2 + shadowOffset);
    ctx.rotate((player.rotation * Math.PI) / 180);
    ctx.globalAlpha = shadowOpacity;
    ctx.fillStyle = '#000000';
    
    if (player.mode === 'normal') {
      ctx.fillRect(-drawWidth/2, -drawHeight/2, drawWidth, drawHeight);
    } else if (player.mode === 'gravity') {
      ctx.fillRect(-drawWidth/2, -drawHeight/2, drawWidth, drawHeight);
    } else if (player.mode === 'mini') {
      ctx.fillRect(-drawWidth/2, -drawHeight/2, drawWidth, drawHeight);
    } else {
      // Rocket gölgesi
      ctx.beginPath();
      ctx.moveTo(-drawWidth/2, drawHeight/2);
      ctx.lineTo(drawWidth/2, drawHeight/2);
      ctx.lineTo(drawWidth/3, -drawHeight/2);
      ctx.lineTo(-drawWidth/3, -drawHeight/2);
      ctx.closePath();
      ctx.fill();
    }
    ctx.restore();
    
    // Move to player center for rotation
    ctx.translate(player.x + player.width/2, player.y + player.height/2);
    ctx.rotate((player.rotation * Math.PI) / 180);
    
    if (player.mode === 'normal') {
      // Normal mode - 3D efektli sarı kare
      ctx.shadowColor = '#946DF5';
      ctx.shadowBlur = 15;
      
      // 3D kenar efekti
      const depth = 4;
      ctx.fillStyle = '#946DF5'; // Koyu sarı kenar
      ctx.fillRect(-drawWidth/2 + depth, -drawHeight/2 + depth, drawWidth, drawHeight);
      
      // Ana renk
      const gradient = ctx.createLinearGradient(-drawWidth/2, -drawHeight/2, drawWidth/2, drawHeight/2);
      gradient.addColorStop(0, '#946DF5');
      gradient.addColorStop(1, '#946DF5');
      ctx.fillStyle = gradient;
      ctx.fillRect(-drawWidth/2, -drawHeight/2, drawWidth, drawHeight);
      
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 2;
      ctx.strokeRect(-drawWidth/2, -drawHeight/2, drawWidth, drawHeight);
    } else if (player.mode === 'gravity') {
      // Gravity mode - 3D efektli mor kare
      ctx.shadowColor = '#aa00ff';
      ctx.shadowBlur = 15;
      
      // 3D kenar efekti
      const depth = 4;
      ctx.fillStyle = '#6a1b9a'; // Koyu mor kenar
      ctx.fillRect(-drawWidth/2 + depth, -drawHeight/2 + depth, drawWidth, drawHeight);
      
      // Ana renk
      const gradient = ctx.createLinearGradient(-drawWidth/2, -drawHeight/2, drawWidth/2, drawHeight/2);
      gradient.addColorStop(0, '#bb86fc');
      gradient.addColorStop(1, '#6a1b9a');
      ctx.fillStyle = gradient;
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
      // Mini mode - 3D efektli yeşil kare
      ctx.shadowColor = '#00ff44';
      ctx.shadowBlur = 10;
      
      // 3D kenar efekti
      const depth = 3;
      ctx.fillStyle = '#00cc33'; // Koyu yeşil kenar
      ctx.fillRect(-drawWidth/2 + depth, -drawHeight/2 + depth, drawWidth, drawHeight);
      
      // Ana renk
      const gradient = ctx.createLinearGradient(-drawWidth/2, -drawHeight/2, drawWidth/2, drawHeight/2);
      gradient.addColorStop(0, '#66ff66');
      gradient.addColorStop(1, '#00cc33');
      ctx.fillStyle = gradient;
      ctx.fillRect(-drawWidth/2, -drawHeight/2, drawWidth, drawHeight);
      
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 2;
      ctx.strokeRect(-drawWidth/2, -drawHeight/2, drawWidth, drawHeight);
    } else if (player.mode === 'wave') {
      // Wave mode - 3D efektli dalga şekli
      ctx.shadowColor = '#00ffaa';
      ctx.shadowBlur = 15;
      
      // 3D kenar efekti
      const depth = 4;
      ctx.fillStyle = '#00cc88'; // Koyu turkuaz kenar
      ctx.beginPath();
      ctx.moveTo(-drawWidth/2 + depth, 0 + depth);
      for (let i = 0; i <= drawWidth; i += 5) {
        const waveY = Math.sin((i / drawWidth) * Math.PI * 4) * (drawHeight/4);
        ctx.lineTo(-drawWidth/2 + i + depth, waveY + depth);
      }
      ctx.lineTo(drawWidth/2 + depth, drawHeight/2 + depth);
      ctx.lineTo(-drawWidth/2 + depth, drawHeight/2 + depth);
      ctx.closePath();
      ctx.fill();
      
      // Ana dalga şekli
      const gradient = ctx.createLinearGradient(-drawWidth/2, -drawHeight/2, drawWidth/2, drawHeight/2);
      gradient.addColorStop(0, '#66ffaa');
      gradient.addColorStop(1, '#00cc88');
      ctx.fillStyle = gradient;
      ctx.beginPath();
      ctx.moveTo(-drawWidth/2, 0);
      for (let i = 0; i <= drawWidth; i += 5) {
        const waveY = Math.sin((i / drawWidth) * Math.PI * 4) * (drawHeight/4);
        ctx.lineTo(-drawWidth/2 + i, waveY);
      }
      ctx.lineTo(drawWidth/2, drawHeight/2);
      ctx.lineTo(-drawWidth/2, drawHeight/2);
      ctx.closePath();
      ctx.fill();
      
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 2;
      ctx.stroke();
    } else if (player.mode === 'ball') {
      // Ball mode - 3D efektli top
      ctx.shadowColor = '#ff6600';
      ctx.shadowBlur = 15;
      
      // 3D kenar efekti (daire)
      const depth = 4;
      ctx.fillStyle = '#cc4400'; // Koyu turuncu kenar
      ctx.beginPath();
      ctx.arc(depth, depth, drawWidth/2, 0, Math.PI * 2);
      ctx.fill();
      
      // Ana top
      const gradient = ctx.createRadialGradient(-drawWidth/4, -drawHeight/4, 0, 0, 0, drawWidth/2);
      gradient.addColorStop(0, '#ffaa66');
      gradient.addColorStop(0.7, '#ff6600');
      gradient.addColorStop(1, '#cc4400');
      ctx.fillStyle = gradient;
      ctx.beginPath();
      ctx.arc(0, 0, drawWidth/2, 0, Math.PI * 2);
      ctx.fill();
      
      // İç ışık efekti
      ctx.fillStyle = '#ffffff';
      ctx.globalAlpha = 0.6;
      ctx.beginPath();
      ctx.arc(-drawWidth/6, -drawHeight/6, drawWidth/6, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = 1;
      
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(0, 0, drawWidth/2, 0, Math.PI * 2);
      ctx.stroke();
    } else if (player.mode === 'ufo') {
      // UFO mode - 3D efektli UFO
      ctx.shadowColor = '#aa44ff';
      ctx.shadowBlur = 20;
      
      // 3D kenar efekti
      const depth = 4;
      ctx.fillStyle = '#6622aa'; // Koyu mor kenar
      ctx.beginPath();
      ctx.ellipse(depth, depth, drawWidth/2, drawHeight/3, 0, 0, Math.PI * 2);
      ctx.fill();
      
      // UFO gövdesi
      const gradient = ctx.createLinearGradient(-drawWidth/2, -drawHeight/2, drawWidth/2, drawHeight/2);
      gradient.addColorStop(0, '#cc88ff');
      gradient.addColorStop(0.5, '#aa44ff');
      gradient.addColorStop(1, '#6622aa');
      ctx.fillStyle = gradient;
      ctx.beginPath();
      ctx.ellipse(0, 0, drawWidth/2, drawHeight/3, 0, 0, Math.PI * 2);
      ctx.fill();
      
      // UFO kubesi
      ctx.fillStyle = '#ffffff';
      ctx.globalAlpha = 0.8;
      ctx.beginPath();
      ctx.ellipse(0, -drawHeight/6, drawWidth/4, drawHeight/6, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = 1;
      
      // Işık efektleri
      ctx.fillStyle = '#ffff00';
      ctx.globalAlpha = 0.6;
      for (let i = 0; i < 3; i++) {
        const angle = (i * Math.PI * 2) / 3;
        const x = Math.cos(angle) * drawWidth/3;
        const y = Math.sin(angle) * drawHeight/4 + drawHeight/6;
        ctx.beginPath();
        ctx.arc(x, y, 3, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.globalAlpha = 1;
      
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.ellipse(0, 0, drawWidth/2, drawHeight/3, 0, 0, Math.PI * 2);
      ctx.stroke();
    } else {
      // Rocket mode - 3D efektli mavi roket
      ctx.shadowColor = '#00aaff';
      ctx.shadowBlur = 20;
      
      // 3D kenar efekti
      const depth = 4;
      ctx.fillStyle = '#0066cc'; // Koyu mavi kenar
      ctx.beginPath();
      ctx.moveTo(-drawWidth/2 + depth, drawHeight/2 + depth);
      ctx.lineTo(drawWidth/2 + depth, drawHeight/2 + depth);
      ctx.lineTo(drawWidth/3 + depth, -drawHeight/2 + depth);
      ctx.lineTo(-drawWidth/3 + depth, -drawHeight/2 + depth);
      ctx.closePath();
      ctx.fill();
      
      // Ana roket gövdesi
      const gradient = ctx.createLinearGradient(-drawWidth/2, -drawHeight/2, drawWidth/2, drawHeight/2);
      gradient.addColorStop(0, '#66ccff');
      gradient.addColorStop(0.5, '#00aaff');
      gradient.addColorStop(1, '#0066cc');
      ctx.fillStyle = gradient;
      
      ctx.beginPath();
      ctx.moveTo(-drawWidth/2, drawHeight/2);
      ctx.lineTo(drawWidth/2, drawHeight/2);
      ctx.lineTo(drawWidth/3, -drawHeight/2);
      ctx.lineTo(-drawWidth/3, -drawHeight/2);
      ctx.closePath();
      ctx.fill();
      
      // Roket kanatları
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

  const drawObstacle = (ctx: CanvasRenderingContext2D, obstacle: Obstacle, gameState: GameState) => {
    ctx.save();
    const theme = THEMES[gameState.currentTheme];
    
    // 3D gölge efekti
    const shadowOffset = 5;
    const shadowOpacity = 0.3;
    
    switch (obstacle.type) {
      case 'spike':
        // Gölge çiz
        ctx.save();
        ctx.globalAlpha = shadowOpacity;
        ctx.fillStyle = '#000000';
        ctx.beginPath();
        ctx.moveTo(obstacle.x + shadowOffset, obstacle.y + obstacle.height + shadowOffset);
        ctx.lineTo(obstacle.x + obstacle.width/2 + shadowOffset, obstacle.y + shadowOffset);
        ctx.lineTo(obstacle.x + obstacle.width + shadowOffset, obstacle.y + obstacle.height + shadowOffset);
        ctx.closePath();
        ctx.fill();
        ctx.restore();
        
        // 3D kenar efekti
        const spikeDepth = 4;
        ctx.fillStyle = '#cc0044'; // Koyu kırmızı kenar
        ctx.beginPath();
        ctx.moveTo(obstacle.x + spikeDepth, obstacle.y + obstacle.height + spikeDepth);
        ctx.lineTo(obstacle.x + obstacle.width/2 + spikeDepth, obstacle.y + spikeDepth);
        ctx.lineTo(obstacle.x + obstacle.width + spikeDepth, obstacle.y + obstacle.height + spikeDepth);
        ctx.closePath();
        ctx.fill();
        
        // Ana spike
        ctx.fillStyle = theme.obstacleColors.spike;
        ctx.shadowColor = theme.obstacleColors.spike;
        ctx.shadowBlur = 10;
        
        ctx.beginPath();
        ctx.moveTo(obstacle.x, obstacle.y + obstacle.height);
        ctx.lineTo(obstacle.x + obstacle.width/2, obstacle.y);
        ctx.lineTo(obstacle.x + obstacle.width, obstacle.y + obstacle.height);
        ctx.closePath();
        ctx.fill();
        break;
        
      case 'block':
        // Gölge çiz
        ctx.save();
        ctx.globalAlpha = shadowOpacity;
        ctx.fillStyle = '#000000';
        ctx.fillRect(obstacle.x + shadowOffset, obstacle.y + shadowOffset, obstacle.width, obstacle.height);
        ctx.restore();
        
        // 3D kenar efekti
        const blockDepth = 4;
        ctx.fillStyle = '#cc1100'; // Koyu kırmızı kenar
        ctx.fillRect(obstacle.x + blockDepth, obstacle.y + blockDepth, obstacle.width, obstacle.height);
        
        // Ana blok
        ctx.fillStyle = theme.obstacleColors.block;
        ctx.shadowColor = theme.obstacleColors.block;
        ctx.shadowBlur = 10;
        ctx.fillRect(obstacle.x, obstacle.y, obstacle.width, obstacle.height);
        
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 2;
        ctx.strokeRect(obstacle.x, obstacle.y, obstacle.width, obstacle.height);
        break;
        
      case 'saw':
        const sawCenterX = obstacle.x + obstacle.width/2;
        const sawCenterY = obstacle.y + obstacle.height/2;
        const radius = obstacle.width/2;
        
        // Gölge çiz
        ctx.save();
        ctx.globalAlpha = shadowOpacity;
        ctx.fillStyle = '#000000';
        ctx.beginPath();
        ctx.arc(sawCenterX + shadowOffset, sawCenterY + shadowOffset, radius, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
        
        // 3D kenar efekti
        const sawDepth = 3;
        ctx.fillStyle = '#cc0000'; // Koyu kırmızı kenar
        ctx.beginPath();
        ctx.arc(sawCenterX + sawDepth, sawCenterY + sawDepth, radius, 0, Math.PI * 2);
        ctx.fill();
        
        // Ana saw
        ctx.fillStyle = theme.obstacleColors.saw;
        ctx.shadowColor = theme.obstacleColors.saw;
        ctx.shadowBlur = 15;
        
        // Saw blade
        ctx.beginPath();
        for (let i = 0; i < 8; i++) {
          const angle = (i * Math.PI * 2) / 8;
          const x = sawCenterX + Math.cos(angle) * radius;
          const y = sawCenterY + Math.sin(angle) * radius;
          
          if (i === 0) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
          
          // Teeth
          const toothAngle = angle + Math.PI / 8;
          const toothX = sawCenterX + Math.cos(toothAngle) * (radius * 1.3);
          const toothY = sawCenterY + Math.sin(toothAngle) * (radius * 1.3);
          ctx.lineTo(toothX, toothY);
        }
        ctx.closePath();
        ctx.fill();
        break;
        

        
      case 'ceiling_barrier':
        // Gölge çiz
        ctx.save();
        ctx.globalAlpha = shadowOpacity;
        ctx.fillStyle = '#000000';
        ctx.fillRect(obstacle.x + shadowOffset, obstacle.y + shadowOffset, obstacle.width, obstacle.height);
        ctx.restore();
        
        // 3D kenar efekti
        const ceilingDepth = 4;
        ctx.fillStyle = '#cc4400'; // Koyu turuncu kenar
        ctx.fillRect(obstacle.x + ceilingDepth, obstacle.y + ceilingDepth, obstacle.width, obstacle.height);
        
        // Ana barrier
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
        // Gölge çiz
        ctx.save();
        ctx.globalAlpha = shadowOpacity;
        ctx.fillStyle = '#000000';
        ctx.fillRect(obstacle.x + shadowOffset, obstacle.y + shadowOffset, obstacle.width, obstacle.height);
        ctx.restore();
        
        // 3D kenar efekti
        const barrierDepth = 4;
        ctx.fillStyle = '#cc4400'; // Koyu turuncu kenar
        ctx.fillRect(obstacle.x + barrierDepth, obstacle.y + barrierDepth, obstacle.width, obstacle.height);
        
        // Ana barrier
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
        
      case 'rotating_platform':
        // Dönen platform çizimi
        ctx.save();
        
        // Platform merkezini hesapla
        const centerX = obstacle.x + obstacle.width / 2;
        const centerY = obstacle.y + obstacle.height / 2;
        
        // Merkeze translate et ve döndür
        ctx.translate(centerX, centerY);
        ctx.rotate((obstacle.rotation || 0) * Math.PI / 180);
        
        // Gölge çiz
        ctx.save();
        ctx.globalAlpha = shadowOpacity;
        ctx.fillStyle = '#000000';
        ctx.fillRect(-obstacle.width/2 + shadowOffset, -obstacle.height/2 + shadowOffset, obstacle.width, obstacle.height);
        ctx.restore();
        
        // 3D kenar efekti
        const platformDepth = 3;
        ctx.fillStyle = '#0066cc'; // Koyu mavi kenar
        ctx.fillRect(-obstacle.width/2 + platformDepth, -obstacle.height/2 + platformDepth, obstacle.width, obstacle.height);
        
        // Ana platform
        const gradient = ctx.createLinearGradient(-obstacle.width/2, -obstacle.height/2, obstacle.width/2, obstacle.height/2);
        gradient.addColorStop(0, '#00aaff');
        gradient.addColorStop(0.5, '#0088dd');
        gradient.addColorStop(1, '#0066bb');
        
        ctx.fillStyle = gradient;
        ctx.shadowColor = '#00aaff';
        ctx.shadowBlur = 15;
        ctx.fillRect(-obstacle.width/2, -obstacle.height/2, obstacle.width, obstacle.height);
        
        // Platform kenarları
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 2;
        ctx.strokeRect(-obstacle.width/2, -obstacle.height/2, obstacle.width, obstacle.height);
        
        // Dönen ok işareti
        ctx.fillStyle = '#ffffff';
        ctx.font = '12px Arial';
        ctx.textAlign = 'center';
        ctx.fillText('⟲', 0, 4);
        
        ctx.restore();
        break;
        
      case 'sliding_floor':
        // Kayar zemin çizimi
        ctx.save();
        
        // Gölge çiz
        ctx.save();
        ctx.globalAlpha = shadowOpacity;
        ctx.fillStyle = '#000000';
        ctx.fillRect(obstacle.x + shadowOffset, obstacle.y + shadowOffset, obstacle.width, obstacle.height);
        ctx.restore();
        
        // 3D kenar efekti
        const slidingFloorDepth = 2;
        ctx.fillStyle = '#cc6600'; // Koyu turuncu kenar
        ctx.fillRect(obstacle.x + slidingFloorDepth, obstacle.y + slidingFloorDepth, obstacle.width, obstacle.height);
        
        // Ana zemin
        const floorGradient = ctx.createLinearGradient(obstacle.x, obstacle.y, obstacle.x + obstacle.width, obstacle.y + obstacle.height);
        floorGradient.addColorStop(0, '#ff9900');
        floorGradient.addColorStop(0.5, '#ff7700');
        floorGradient.addColorStop(1, '#ff5500');
        
        ctx.fillStyle = floorGradient;
        ctx.shadowColor = '#ff9900';
        ctx.shadowBlur = 12;
        ctx.fillRect(obstacle.x, obstacle.y, obstacle.width, obstacle.height);
        
        // Hareket çizgileri
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 2;
        for (let i = 0; i < obstacle.width; i += 20) {
          ctx.beginPath();
          ctx.moveTo(obstacle.x + i, obstacle.y + 3);
          ctx.lineTo(obstacle.x + i + 10, obstacle.y + 3);
          ctx.stroke();
        }
        
        // Kenar çizgisi
        ctx.strokeRect(obstacle.x, obstacle.y, obstacle.width, obstacle.height);
        
        ctx.restore();
        break;
        
      case 'direction_changer':
        // Yön değiştirici çizimi
        ctx.save();
        
        // Gölge çiz
        ctx.save();
        ctx.globalAlpha = shadowOpacity;
        ctx.fillStyle = '#000000';
        ctx.fillRect(obstacle.x + shadowOffset, obstacle.y + shadowOffset, obstacle.width, obstacle.height);
        ctx.restore();
        
        // 3D kenar efekti
        const changerDepth = 3;
        ctx.fillStyle = '#6600cc'; // Koyu mor kenar
        ctx.fillRect(obstacle.x + changerDepth, obstacle.y + changerDepth, obstacle.width, obstacle.height);
        
        // Ana değiştirici
        const changerGradient = ctx.createRadialGradient(
          obstacle.x + obstacle.width/2, obstacle.y + obstacle.height/2, 0,
          obstacle.x + obstacle.width/2, obstacle.y + obstacle.height/2, obstacle.width/2
        );
        changerGradient.addColorStop(0, '#aa00ff');
        changerGradient.addColorStop(0.7, '#8800dd');
        changerGradient.addColorStop(1, '#6600bb');
        
        ctx.fillStyle = changerGradient;
        ctx.shadowColor = '#aa00ff';
        ctx.shadowBlur = 15;
        ctx.fillRect(obstacle.x, obstacle.y, obstacle.width, obstacle.height);
        
        // Yön oku
        ctx.fillStyle = '#ffffff';
        ctx.font = '16px Arial';
        ctx.textAlign = 'center';
        let arrow = '↑';
        if (obstacle.changeDirection === 'down') arrow = '↓';
        else if (obstacle.changeDirection === 'left') arrow = '←';
        else if (obstacle.changeDirection === 'right') arrow = '→';
        
        ctx.fillText(arrow, obstacle.x + obstacle.width/2, obstacle.y + obstacle.height/2 + 6);
        
        // Kenar çizgisi
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 2;
        ctx.strokeRect(obstacle.x, obstacle.y, obstacle.width, obstacle.height);
        
        ctx.restore();
        break;
    }
    
    ctx.shadowBlur = 0;
    ctx.restore();
  };

  const spawnObstacle = (gameState: GameState) => {
    let types: ('spike' | 'block' | 'saw' | 'ceiling_barrier' | 'floor_barrier' | 'rotating_platform' | 'sliding_floor' | 'direction_changer')[];
    const player = gameState.player;
    
    if (gameState.rocketModeActive) {
      // In rocket mode, spawn ceiling and floor barriers
      types = ['ceiling_barrier', 'floor_barrier', 'spike', 'block'];
      // Add rotating platforms after score 300
      if (gameState.score >= 300) {
        types.push('rotating_platform');
      }
      // Add sliding floors and direction changers after score 400
      if (gameState.score >= 400) {
        types.push('sliding_floor', 'direction_changer');
      }
    } else if (player.mode === 'gravity') {
      // Gravity mode: Ceiling obstacles and inverted challenges
      types = ['ceiling_barrier', 'spike', 'block'];
      if (gameState.score >= 300) {
        types.push('rotating_platform');
      }
      if (gameState.score >= 400) {
        types.push('sliding_floor', 'direction_changer');
      }
    } else if (player.mode === 'mini') {
      // Mini mode: Lower obstacles and tight spaces
      types = ['spike', 'block', 'saw'];
      if (gameState.score >= 300) {
        types.push('rotating_platform');
      }
      if (gameState.score >= 400) {
        types.push('sliding_floor', 'direction_changer');
      }
    } else {
      // Normal obstacles
      types = ['spike', 'block', 'saw'];
      if (gameState.score >= 300) {
        types.push('rotating_platform');
      }
      if (gameState.score >= 400) {
        types.push('sliding_floor', 'direction_changer');
      }
    }
    
    const type = types[Math.floor(Math.random() * types.length)];
    let obstacle: Obstacle;
    
    switch (type) {
      case 'spike':
        let spikeHeight = 40;
        let spikeY = GAME_HEIGHT - GROUND_HEIGHT - spikeHeight;
        
        // Adjust for different modes
        if (player.mode === 'mini') {
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
        if (player.mode === 'mini') {
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
        if (player.mode === 'mini') {
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
        
      case 'rotating_platform':
        let platformY = GAME_HEIGHT - GROUND_HEIGHT - 80;
        
        // Adjust for different modes
        if (player.mode === 'mini') {
          platformY = GAME_HEIGHT - GROUND_HEIGHT - 60;
        } else if (player.mode === 'gravity') {
          platformY = 100; // Higher position for gravity mode
        }
        
        obstacle = {
          x: GAME_WIDTH + 50,
          y: platformY,
          width: 80,
          height: 20,
          type: 'rotating_platform',
          passed: false,
          rotation: 0,
          rotationSpeed: 2 + Math.random() * 3 // Random rotation speed between 2-5
        };
        break;
        
      case 'sliding_floor':
        const floorY = GAME_HEIGHT - GROUND_HEIGHT;
        let floorWidth = 120;
        
        // Adjust for different modes
        if (player.mode === 'mini') {
          floorWidth = 100;
        }
        
        obstacle = {
          x: GAME_WIDTH + 50,
          y: floorY,
          width: floorWidth,
          height: 15,
          type: 'sliding_floor',
          passed: false,
          slideDirection: Math.random() > 0.5 ? 'left' : 'right',
          slideSpeed: 1 + Math.random() * 2, // Random slide speed between 1-3
          originalX: GAME_WIDTH + 50,
          slideRange: 60 + Math.random() * 40 // Random slide range between 60-100
        };
        break;
        
      case 'direction_changer':
        let changerY = GAME_HEIGHT - GROUND_HEIGHT - 40;
        
        // Adjust for different modes
        if (player.mode === 'mini') {
          changerY = GAME_HEIGHT - GROUND_HEIGHT - 30;
        } else if (player.mode === 'gravity') {
          changerY = 80;
        }
        
        const directions: ('up' | 'down' | 'left' | 'right')[] = ['up', 'down', 'left', 'right'];
        
        obstacle = {
          x: GAME_WIDTH + 50,
          y: changerY,
          width: 30,
          height: 30,
          type: 'direction_changer',
          passed: false,
          changeDirection: directions[Math.floor(Math.random() * directions.length)]
        };
        break;
    }
    
    gameState.obstacles.push(obstacle);
  };

  const checkCollision = (player: Player, obstacle: Obstacle): boolean => {
    // Special collision for rotating platforms (platform behavior)
    if (obstacle.type === 'rotating_platform') {
      return (
        player.x < obstacle.x + obstacle.width &&
        player.x + player.width > obstacle.x &&
        player.y + player.height > obstacle.y &&
        player.y + player.height < obstacle.y + 25 && // Only top surface collision
        player.velocityY >= 0 // Only when falling down
      );
    }
    
    // Special collision for sliding floors (platform behavior)
    if (obstacle.type === 'sliding_floor') {
      return (
        player.x < obstacle.x + obstacle.width &&
        player.x + player.width > obstacle.x &&
        player.y + player.height > obstacle.y &&
        player.y + player.height < obstacle.y + 20 && // Only top surface collision
        player.velocityY >= 0 // Only when falling down
      );
    }
    
    // Direction changer has special effect (not deadly)
    if (obstacle.type === 'direction_changer') {
      return false; // Direction changers don't kill, they just change direction
    }
    
    // Normal collision for all other obstacles
    return (
      player.x < obstacle.x + obstacle.width &&
      player.x + player.width > obstacle.x &&
      player.y < obstacle.y + obstacle.height &&
      player.y + player.height > obstacle.y
    );
  };
  
  const spawnPowerUp = (gameState: GameState) => {
    const types: ('double_jump' | 'gravity_mode' | 'mini_mode')[] = [
      'double_jump', 'gravity_mode', 'mini_mode'
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
    const theme = THEMES[gameState.currentTheme];
    for (let i = 0; i < 5; i++) {
      gameState.particles.push({
        x: x + Math.random() * 20,
        y: y,
        velocityX: (Math.random() - 0.5) * 4,
        velocityY: Math.random() * -3,
        size: Math.random() * 3 + 1,
        color: theme.particleColors.jump,
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
      
      // 3D gölge efekti
      const shadowOffset = 2;
      const shadowOpacity = 0.3;
      
      // Gölge çiz
      ctx.save();
      ctx.globalAlpha = shadowOpacity;
      ctx.fillStyle = '#000000';
      ctx.beginPath();
      ctx.arc(particle.x + shadowOffset, particle.y + shadowOffset, particle.size, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
      
      // Ana partikül - gradient efekti
      const gradient = ctx.createRadialGradient(particle.x, particle.y, 0, particle.x, particle.y, particle.size);
      gradient.addColorStop(0, '#ffffff');
      gradient.addColorStop(0.5, particle.color);
      gradient.addColorStop(1, '#000000');
      ctx.fillStyle = gradient;
      ctx.shadowColor = particle.color;
      ctx.shadowBlur = 10;
      
      ctx.beginPath();
      ctx.arc(particle.x, particle.y, particle.size, 0, Math.PI * 2);
      ctx.fill();
      
      // İç ışık efekti
      ctx.globalAlpha = particle.life * 0.5;
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc(particle.x, particle.y, particle.size * 0.3, 0, Math.PI * 2);
      ctx.fill();
      
      ctx.shadowBlur = 0;
      ctx.restore();
    });
  };

  const checkNewMovementAbilities = (gameState: GameState, score: number) => {
    // Double jump ability at 300 points
    if (score >= 300 && gameState.maxMultiJumps < 2 && gameState.lastAbilityUnlockScore < 300) {
      gameState.maxMultiJumps = 2;
      gameState.lastAbilityUnlockScore = 300;
      createExplosionParticles(gameState, gameState.player.x, gameState.player.y);
    }
    
    // Triple jump ability at 600 points
    if (score >= 600 && gameState.maxMultiJumps < 3 && gameState.lastAbilityUnlockScore < 600) {
      gameState.maxMultiJumps = 3;
      gameState.lastAbilityUnlockScore = 600;
      createExplosionParticles(gameState, gameState.player.x, gameState.player.y);
    }
    
    // Dash ability at 900 points
    if (score >= 900 && !gameState.dashAbilityActive && gameState.lastAbilityUnlockScore < 900) {
      gameState.dashAbilityActive = true;
      gameState.lastAbilityUnlockScore = 900;
      createRocketParticles(gameState, gameState.player.x, gameState.player.y);
    }
    
    // Shield ability at 1300 points
    if (score >= 1300 && gameState.lastAbilityUnlockScore < 1300) {
      gameState.shieldActive = true;
      gameState.shieldEndTime = Date.now() + 5000; // 5 seconds
      gameState.lastAbilityUnlockScore = 1300;
      createExplosionParticles(gameState, gameState.player.x, gameState.player.y);
    }
    
    // Update dash cooldown
    if (gameState.dashCooldown > 0) {
      gameState.dashCooldown--;
    }
    
    // Update shield
    if (gameState.shieldActive && Date.now() > gameState.shieldEndTime) {
      gameState.shieldActive = false;
    }
  };

  const saveScore = useCallback(async () => {
    if (!playerAddress || score === 0) {
      setSaveMessage('Kaydedilecek skor yok!');
      setTimeout(() => setSaveMessage(''), 3000);
      return;
    }

    setIsSavingScore(true);
    setSaveMessage('');

    try {
      const result = await submitPlayerScore(playerAddress, score, 1);
      
      if (result.success) {
        setSaveMessage(`✅ Skor kaydedildi! TX: ${result.transactionHash?.slice(0, 8)}...`);
        console.log(`Transaction confirmed: https://testnet.monadscan.com/tx/${result.transactionHash}`);
      } else {
        setSaveMessage(`❌ Hata: ${result.error || 'Bilinmeyen hata'}`);
      }
    } catch (error) {
      console.error('Score save error:', error);
      setSaveMessage('❌ Skor kaydedilemedi!');
    } finally {
      setIsSavingScore(false);
      setTimeout(() => setSaveMessage(''), 5000);
    }
  }, [playerAddress, score]);

  const startGame = useCallback(() => {
    setGameStarted(true);
    setGameOver(false);
    setScore(0);
    setDistance(0);
    setSaveMessage('');

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
      rocketModeActive: false,
      currentTheme: 'classic',
      speedBoostActive: false,
      speedBoostEndTime: 0,
      lastSpeedChangeScore: 0,
      multiJumpCount: 0,
      maxMultiJumps: 1,
      dashAbilityActive: false,
      dashCooldown: 0,
      shieldActive: false,
      shieldEndTime: 0,
      lastAbilityUnlockScore: 0,
      score: 0,
      rocketCooldown: 0
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
      if (key === 'd' && gameStateRef.current.dashAbilityActive && gameStateRef.current.dashCooldown === 0) {
        e.preventDefault();
        // Dash ability
        gameStateRef.current.player.x += 80; // Dash forward
        gameStateRef.current.dashCooldown = 120; // 2 second cooldown at 60fps
        createRocketParticles(gameStateRef.current, gameStateRef.current.player.x, gameStateRef.current.player.y);
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
    <div className="flex min-h-screen" style={{background: 'linear-gradient(135deg, #2d1b69 0%, #1a0d3d 50%, #0f051f 100%)'}}>      
      {/* Leaderboard Sidebar */}
      <LeaderboardSidebar playerAddress={playerAddress} currentScore={score} />
      
      {/* Main Game Area */}
      <div className="flex-1 flex flex-col items-center gap-4 p-4">
      <div className="flex items-center gap-8 text-white">
        <div className="text-2xl font-bold neon-text">
          Score: <span className="text-yellow-400">{score}</span>
        </div>
        <div className="text-xl font-bold neon-text">
          Distance: <span className="text-cyan-400">{distance}m</span>
        </div>
        <div className="text-lg font-bold neon-text">
          Theme: <span className="text-purple-400">{THEMES[gameStateRef.current.currentTheme].name}</span>
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
        {gameStateRef.current.speedBoostActive && (
          <div className="text-lg font-bold neon-text animate-pulse">
            {gameStateRef.current.gameSpeed > GAME_SPEED * 1.5 ? (
              <span className="text-red-400">⚡ SPEED BOOST!</span>
            ) : (
              <span className="text-blue-400">🐌 SLOW MODE</span>
            )}
          </div>
        )}
        {gameStateRef.current.player.mode !== 'normal' && gameStateRef.current.player.mode !== 'mini' && gameStateRef.current.player.mode !== 'gravity' && gameStateRef.current.player.mode !== 'rocket' && (
          <div className="text-lg font-bold neon-text animate-pulse">
            {gameStateRef.current.player.mode === 'wave' && (
              <span className="text-green-400">🌊 WAVE MODE!</span>
            )}
            {gameStateRef.current.player.mode === 'ball' && (
              <span className="text-orange-400">⚽ BALL MODE!</span>
            )}
            {gameStateRef.current.player.mode === 'ufo' && (
              <span className="text-purple-400">🛸 UFO MODE!</span>
            )}
          </div>
        )}
        {gameStateRef.current.maxMultiJumps > 1 && (
          <div className="text-md font-bold neon-text">
            <span className="text-purple-400">🦘 Multi Jump: {gameStateRef.current.maxMultiJumps}x</span>
          </div>
        )}
        {gameStateRef.current.dashAbilityActive && (
          <div className="text-md font-bold neon-text">
            {gameStateRef.current.dashCooldown > 0 ? (
              <span className="text-gray-400">⚡ Dash: {Math.ceil(gameStateRef.current.dashCooldown / 60)}s</span>
            ) : (
              <span className="text-cyan-400">⚡ Dash Ready! (D)</span>
            )}
          </div>
        )}
        {gameStateRef.current.shieldActive && (
          <div className="text-md font-bold neon-text animate-pulse">
            <span className="text-gold-400">🛡️ SHIELD ACTIVE!</span>
          </div>
        )}
      </div>
      
      <div className="relative">
        <canvas
          ref={canvasRef}
          width={GAME_WIDTH}
          height={GAME_HEIGHT}
          className="border-2 border-purple-400 shadow-lg shadow-purple-400/50"
          style={{ background: '#000' }}
        />
        
        {!gameStarted && (
          <div className="absolute inset-0 flex items-center justify-center" style={{background: 'rgba(26, 13, 61, 0.95)'}}>
            <div className="text-center text-white">
              <h1 className="text-4xl font-bold mb-4 neon-text text-purple-300">
                NADMETRY DASH
              </h1>
              <div className="flex flex-col items-center gap-4 mb-6">
                <div className="flex gap-4">
                  <button
                    onClick={startGame}
                    className="bg-gradient-to-r from-purple-500 to-violet-600 hover:from-purple-600 hover:to-violet-700 text-white font-bold py-4 px-8 rounded-lg text-xl shadow-lg shadow-purple-400/50 transition-all duration-300 transform hover:scale-105"
                  >
                    {gameOver ? 'PLAY AGAIN' : 'START GAME'}
                  </button>
                  {gameOver && score > 0 && (
                    <button
                      onClick={saveScore}
                      disabled={isSavingScore || !playerAddress}
                      className="bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 disabled:from-gray-500 disabled:to-gray-600 disabled:cursor-not-allowed text-white font-bold py-4 px-8 rounded-lg text-xl shadow-lg shadow-green-400/50 transition-all duration-300 transform hover:scale-105 disabled:hover:scale-100"
                    >
                      {isSavingScore ? 'SAVING...' : 'SAVE SCORE'}
                    </button>
                  )}
                </div>
                {saveMessage && (
                  <div className={`text-lg font-bold neon-text ${
                    saveMessage.includes('✅') ? 'text-green-400' : 'text-red-400'
                  }`}>
                    {saveMessage}
                  </div>
                )}
              </div>
              {gameOver && (
                <div className="text-red-400 text-2xl font-bold mb-4 neon-text">
                  GAME OVER!
                </div>
              )}
              <div className="text-purple-200 text-sm space-y-2">
                <p>🎮 SPACE / ↑ to jump (Normal mode)</p>
                <p>🚀 W to hover (Rocket mode - after 500m)</p>
                <p>🦘 Multi-jump unlocks at 300 points!</p>
                <p>⚡ D for dash ability (unlocks at 900 points)</p>
                <p>🛡️ Shield protection at 1300 points</p>
                <p>🎯 Avoid obstacles & barriers!</p>
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
    </div>
  );
}

// Dynamic speed change system
function checkDynamicSpeedChange(gameState: GameState, score: number) {
  const currentTime = Date.now();
  
  // Check if speed boost has ended
  if (gameState.speedBoostActive && currentTime > gameState.speedBoostEndTime) {
    gameState.speedBoostActive = false;
    gameState.gameSpeed = GAME_SPEED + Math.floor(gameState.camera.x / 1000) * 0.5;
  }
  
  // Speed change intervals (every 200 points after 600)
  const speedChangeInterval = 200;
  const startScore = 600;
  
  if (score >= startScore && score - gameState.lastSpeedChangeScore >= speedChangeInterval) {
    gameState.lastSpeedChangeScore = score;
    
    // Random speed change type
    const changeType = Math.random();
    
    if (changeType < 0.4) {
      // Speed boost (40% chance)
      gameState.speedBoostActive = true;
      gameState.speedBoostEndTime = currentTime + 3000; // 3 seconds
      gameState.gameSpeed *= 1.8;
      
      // Create visual effect
      createRocketParticles(gameState, gameState.player.x, gameState.player.y);
    } else if (changeType < 0.7) {
      // Slow down (30% chance)
      gameState.speedBoostActive = true;
      gameState.speedBoostEndTime = currentTime + 2500; // 2.5 seconds
      gameState.gameSpeed *= 0.5;
      
      // Create visual effect
      createExplosionParticles(gameState, gameState.player.x, gameState.player.y);
    } else {
      // Sudden acceleration burst (30% chance)
      gameState.speedBoostActive = true;
      gameState.speedBoostEndTime = currentTime + 1500; // 1.5 seconds
      gameState.gameSpeed *= 2.2;
      
      // Create intense visual effect
      for (let i = 0; i < 3; i++) {
        setTimeout(() => {
          createRocketParticles(gameState, gameState.player.x + i * 20, gameState.player.y);
        }, i * 200);
      }
    }
  }
}