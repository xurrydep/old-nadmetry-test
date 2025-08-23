// Game configuration
export const GAME_CONFIG = {
  // Your registered game address
  GAME_ADDRESS: '0x3523cd0efcec61fcb76146099fed585bfcc5bee5',
  
  // Monad Games ID for leaderboard integration
  MONAD_GAMES_ID: 'cmd8euall0037le0my79qpz42',
  
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
      url: 'https://nadmetrydash.vercel.app/',
    image: 'https://picsum.photos/536/354'
  }
} as const;