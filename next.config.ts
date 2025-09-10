import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: false, // Disable React Strict Mode to prevent WalletConnect double initialization
  env: {
    // Ensure environment variables are available at build time
    API_SECRET: process.env.API_SECRET,
    WALLET_PRIVATE_KEY: process.env.WALLET_PRIVATE_KEY,
  },
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          {
            key: 'Content-Security-Policy',
            value: "script-src 'self' 'unsafe-inline' https://auth.privy.io https://www.googletagmanager.com https://gc.kis.v2.scr.kaspersky-labs.com https://verify.walletconnect.com https://verify.walletconnect.org https://*.privy.io https://*.walletconnect.com; frame-src 'self' https://auth.privy.io https://verify.walletconnect.com https://verify.walletconnect.org https://privy.io https://app.privy.io https://privy.molandak.net https://*.privy.io https://*.molandak.net https://*.walletconnect.com; frame-ancestors 'self' http://localhost:3000 https://localhost:3000 https://monad-games-id-requestor-app.vercel.app https://www.molandak.net https://www.monad-games-id-requestor-app.vercel.app https://molandak.net https://privy.molandak.net https://auth.privy.io https://verify.walletconnect.com https://verify.walletconnect.org https://privy.io https://app.privy.io https://*.molandak.net https://*.privy.io https://*.walletconnect.com; connect-src 'self' https://api.monadgames.com https://monad-testnet-rpc.example.com https://*.googletagmanager.com https://*.google-analytics.com https://explorer-api.walletconnect.com https://auth.privy.io https://*.privy.io https://*.walletconnect.com;",
          },
        ],
      },
    ];
  },
};


export default nextConfig;