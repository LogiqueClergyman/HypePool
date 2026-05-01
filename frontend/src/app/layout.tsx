import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import Providers from "@/components/Providers";

const geistSans = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });
const geistMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"] });

export const metadata: Metadata = {
  title: "HypePool — Bet on Viral Trends Before They Blow Up",
  description:
    "The world's first viral prediction market. Stake on trending content before it hits 1M views. Built on Stellar Soroban with near-zero fees.",
  openGraph: {
    title: "HypePool — Bet on Viral Trends",
    description:
      "Spot a banger before it explodes. Stake $0.25 and earn big. Powered by Stellar.",
    siteName: "HypePool",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "HypePool — Bet on Viral Trends",
    description: "The internet's first viral prediction market. Built on Stellar Soroban.",
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${geistSans.variable} ${geistMono.variable}`}>
      <body className="antialiased">
        <div className="noise-overlay" />
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
