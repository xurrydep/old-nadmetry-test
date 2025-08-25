import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import PrivyProvider from "./components/PrivyProvider";
import { Toaster } from "react-hot-toast";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: {
    default: "Nadmetry Dash — The hardest game of Monad",
    template: "%s — Nadmetry Dash",
  },
  description:
    "Jump and try to overcome the obstacles because this will be impossible.",
  metadataBase: new URL("https://nadmetrydash.vercel.app/"),
  alternates: { canonical: "/" },
  robots: { index: true, follow: true },
  openGraph: {
    url: "https://nadmetrydash.vercel.app/",
    siteName: "Nadmetry Dash",
    title: "Nadmetry Dash — The hardest game of Monad",
    description:
      "Jump and try to overcome the obstacles because this will be impossible.",
    images: [{ url: "/og.png" }], // /public/og.png
  },
  twitter: {
    card: "summary_large_image",
    title: "Nadmetry Dash — The hardest game of Monad",
    description:
      "Jump and try to overcome the obstacles because this will be impossible.",
    images: ["/og.png"], // /public/og.png
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <PrivyProvider>{children}</PrivyProvider>
        <Toaster 
          position="top-right"
          toastOptions={{
            duration: 4000,
            style: {
              background: '#1f2937',
              color: '#fff',
            },
          }}
        />
      </body>
    </html>
  );
}
