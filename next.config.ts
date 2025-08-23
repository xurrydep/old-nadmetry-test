import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: false, // Disable React Strict Mode to prevent WalletConnect double initialization
  env: {
    // Ensure environment variables are available at build time
    API_SECRET: process.env.API_SECRET || 'client-WY6PpnMPXsBVHznEeTWM2P23WMmmTj2K3H9vijKiKAykp',
    WALLET_PRIVATE_KEY: process.env.WALLET_PRIVATE_KEY || '4aacc37022413f27533999ac24b269c9a6af38350ca4c9863c87bdab53519e1f',
    NEXT_PUBLIC_PRIVY_APP_ID: process.env.NEXT_PUBLIC_PRIVY_APP_ID || 'cmd8euall0037le0my79qpz42',
  },
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          {
            key: 'Content-Security-Policy',
            value: "frame-ancestors 'self' http://localhost:3000 https://localhost:3000 https://monad-games-id-requestor-app.vercel.app https://www.molandak.net https://www.monad-games-id-requestor-app.vercel.app https://molandak.net https://privy.molandak.net https://auth.privy.io https://verify.walletconnect.com https://verify.walletconnect.org;",
          },
        ],
      },
    ];
  },
};


export default nextConfig;
