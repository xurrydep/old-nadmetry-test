import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: false, // Disable React Strict Mode to prevent WalletConnect double initialization
  env: {
    // Ensure environment variables are available at build time
    API_SECRET: process.env.API_SECRET || '',
    WALLET_PRIVATE_KEY: process.env.WALLET_PRIVATE_KEY || '',
    NEXT_PUBLIC_PRIVY_APP_ID: process.env.NEXT_PUBLIC_PRIVY_APP_ID || '',
  },
};

export default nextConfig;
