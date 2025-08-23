"use client";

import { PrivyProvider } from "@privy-io/react-auth";

export default function Providers({ children }: { children: React.ReactNode }) {
  const privyAppId = process.env.NEXT_PUBLIC_PRIVY_APP_ID || "cmejvndcq00aojo0bokftrvxb"
  const monadGamesId = process.env.NEXT_PUBLIC_MONAD_GAMES_ID || "cmd8euall0037le0my79qpz42";

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
        // Add allowed origins to fix API access issues
        allowedOrigins: [
          'http://localhost:3000',
          'https://monad-games-id-requestor-app.vercel.app',
          'https://www.molandak.net',
          'https://molandak.net',
          'https://privy.molandak.net'
        ],
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
