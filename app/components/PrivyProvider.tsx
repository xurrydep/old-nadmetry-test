"use client";

import { PrivyProvider } from "@privy-io/react-auth";
import { useMemo } from "react";

export default function Providers({ children }: { children: React.ReactNode }) {
  const privyAppId = process.env.NEXT_PUBLIC_PRIVY_APP_ID || ''
  const monadGamesId = process.env.NEXT_PUBLIC_MONAD_GAMES_ID || ''

  // Memoize config to prevent re-initialization - must be called before any early returns
  const privyConfig = useMemo(() => ({
    loginMethodsAndOrder: {
      // Don't forget to enable Monad Games ID support in:
      // Global Wallet > Integrations > Monad Games ID (click on the slide to enable)
      primary: monadGamesId ? [`privy:${monadGamesId}`] : ['wallet'], // Fallback to wallet if no Monad Games ID
    },
    // Configure appearance
    appearance: {
      theme: 'light' as const,
      accentColor: '#676FFF',
    },
    // Disable cross-app authentication to prevent CORS issues
    crossAppAuthentication: false,
  }), [monadGamesId]);

  // During build time or when no app ID is provided, render children without Privy
  if (!privyAppId) {
    console.warn('NEXT_PUBLIC_PRIVY_APP_ID is not set. Privy authentication will not be available.');
    return <>{children}</>;
  }

  return (
    <PrivyProvider
      appId={privyAppId}
      config={privyConfig}
    >
      {children}
    </PrivyProvider>
  );
}
