import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Swipe Tennis",
  description:
    "A browser tennis game where mouse swipe gestures control your strokes — slice, topspin, flat drives and lobs.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
