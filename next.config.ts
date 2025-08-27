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
            value: "frame-src 'self' https://auth.privy.io https://verify.walletconnect.com https://verify.walletconnect.org https://privy.io https://app.privy.io https://privy.molandak.net https://*.privy.io https://*.molandak.net; frame-ancestors 'self' http://localhost:3000 https://localhost:3000 https://monad-games-id-requestor-app.vercel.app https://www.molandak.net https://www.monad-games-id-requestor-app.vercel.app https://molandak.net https://privy.molandak.net https://auth.privy.io https://verify.walletconnect.com https://verify.walletconnect.org https://privy.io https://app.privy.io https://*.molandak.net https://*.privy.io;",
          },
        ],
      },
    ];
  },
};


export default nextConfig;
