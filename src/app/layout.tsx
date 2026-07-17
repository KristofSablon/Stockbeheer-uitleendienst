import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Uitleendienst Londerzeel",
  description: "Stockbeheer- en beheersysteem voor de uitleendienst van de gemeente Londerzeel",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="nl">
      <body>{children}</body>
    </html>
  );
}
