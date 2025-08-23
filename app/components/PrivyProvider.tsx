"use client";

import { PrivyProvider } from "@privy-io/react-auth";

export default function Providers({ children }: { children: React.ReactNode }) {
  const privyAppId = process.env.NEXT_PUBLIC_PRIVY_APP_ID || ''
  const monadGamesId = process.env.NEXT_PUBLIC_MONAD_GAMES_ID || ''

  // During build time or when no app ID is provided, render children without Privy
  if (!privyAppId) {
    console.warn('NEXT_PUBLIC_PRIVY_APP_ID is not set. Privy authentication will not be available.');
    return <>{children}</>;
  }

  return (
    <PrivyProvider
      appId={privyAppId}
      config={{
        loginMethodsAndOrder: {
          // Don't forget to enable Monad Games ID support in:
          // Global Wallet > Integrations > Monad Games ID (click on the slide to enable)
          primary: [`privy:${monadGamesId}`], // This is the Cross App ID
        },
        // Configure appearance
        appearance: {
          theme: 'light',
          accentColor: '#676FFF',
        },
      }}
    >
      {children}
    </PrivyProvider>
  );
}
