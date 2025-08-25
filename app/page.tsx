"use client";
import { useState } from 'react';
import NadmetryDashGame from './components/Dash';
import AuthComponent from './components/AuthComponent';
import ScoreDebugger from './components/ScoreDebugger';

export default function Home() {
  const [playerAddress, setPlayerAddress] = useState<string>("");

  return (
    <div className="min-h-screen bg-black flex flex-col items-center justify-center gap-8">
      <AuthComponent onAddressChange={setPlayerAddress} />
      {playerAddress ? (
        <>
          <NadmetryDashGame playerAddress={playerAddress} />
          <ScoreDebugger playerAddress={playerAddress} />
        </>
      ) : (
        <div className="text-center text-white">
          <h1 className="text-4xl font-bold mb-4 neon-text text-purple-500">
            NADMETRY DASH 
          </h1>
          <p className="text-cyan-300 text-lg mb-8">
            Monad Games ID ile giriş yapın ve oyuna başlayın!
          </p>
          <div className="text-cyan-300 text-sm space-y-2">
            <p>🎮 SPACE / ↑ to jump (Normal mode)</p>
            <p>🚀 W to hover (Rocket mode - after 500m)</p>
            <p>🦘 Multi-jump unlocks at 300 points!</p>
            <p>⚡ D for dash ability (unlocks at 900 points)</p>
            <p>🛡️ Shield protection at 1300 points</p>
            <p>🎯 Avoid obstacles & barriers!</p>
            <p>⚡ Survive as long as possible!</p>
          </div>
        </div>
      )}
      
      <style jsx>{`
        .neon-text {
          text-shadow: 0 0 5px currentColor, 0 0 10px currentColor, 0 0 15px currentColor;
        }
      `}</style>
    </div>
  );
}