import type { Metadata } from "next";
import "./globals.css";
import { RecruiterProvider } from "@/lib/context/RecruiterContext";

export const metadata: Metadata = {
  title: "CareerSync AI — Decision-Support Portal",
  description: "Enterprise recruiter workflow for evaluating and ranking candidate resumes against job descriptions.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full antialiased" data-theme="dark">
      <body className="min-h-full flex flex-col bg-ink-base text-text-primary">
        <RecruiterProvider>
          {children}
        </RecruiterProvider>
      </body>
    </html>
  );
}
