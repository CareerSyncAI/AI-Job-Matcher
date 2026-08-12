import type { Metadata } from "next";
import "./globals.css";
import { AppProviders } from "@/components/layout/AppProviders";
import { LiquidBackground } from "@/components/layout/LiquidBackground";

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
    <html lang="en" className="h-full antialiased" data-theme="dark" suppressHydrationWarning>
      <body className="min-h-full flex flex-col bg-transparent text-text-primary">
        <LiquidBackground />
        <AppProviders>
          {children}
        </AppProviders>
      </body>
    </html>
  );
}
