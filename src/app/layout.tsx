import type { Metadata } from "next";
import localFont from "next/font/local";
import "@livekit/components-styles";
import "./globals.css";

const outfit = localFont({
  src: "../components/Outfit/Outfit-VariableFont_wght.ttf",
  variable: "--font-outfit",
  display: "swap",
  weight: "100 900"
});

export const metadata: Metadata = {
  title: "AI Hiring Copilot for SMEs",
  description: "A focused hiring copilot MVP for practical SME candidate review."
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body className={outfit.variable}>{children}</body>
    </html>
  );
}
