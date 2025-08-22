// Game configuration
export const GAME_CONFIG = {
  // Your registered game address
  GAME_ADDRESS: process.env.NEXT_PUBLIC_CONTRACT_ADDRESS || '0xceCBFF203C8B6044F52CE23D914A1bfD997541A4',
  
  // Game settings
  SCORE_SUBMISSION: {
    // Submit score every X points
    SCORE_THRESHOLD: 10,
    
    // Track transactions (actions that cost points/tokens)
    TRANSACTION_THRESHOLD: 1,
  },
  
  // Game metadata
  METADATA: {
    name: 'Example Game',
    url: 'https://mission7-example-game.vercel.app/',
    image: 'https://picsum.photos/536/354'
  }
} as const;