import type { Metadata } from "next";
import { Inter, JetBrains_Mono } from "next/font/google";
import "./globals.css";
import { AppProviders } from "@/components/layout/AppProviders";
import { LiquidBackground } from "@/components/layout/LiquidBackground";

const inter = Inter({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-sans-var",
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-mono-var",
});

export const metadata: Metadata = {
  title: "CareerSync AI — Next-Gen AI Talent & Career Platform",
  description: "Deterministic AI matching, deep semantic resume parsing, and dynamic career trajectory optimization.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html 
      lang="en" 
      className={`h-full antialiased ${inter.variable} ${jetbrainsMono.variable}`} 
      data-theme="light" 
      suppressHydrationWarning
    >
      <body className="min-h-full flex flex-col bg-transparent text-text-primary font-sans">
        <LiquidBackground />
        <AppProviders>
          {children}
        </AppProviders>
      </body>
    </html>
  );
}
