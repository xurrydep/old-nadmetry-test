// Game configuration
export const GAME_CONFIG = {
  // Your registered game address
  GAME_ADDRESS: process.env.NEXT_PUBLIC_CONTRACT_ADDRESS || '0x3E828d6B4E0cca607af47C5F9a735E5884a32953',
  
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