import type { Metadata } from "next";
import { Analytics } from "@vercel/analytics/next";
import { IBM_Plex_Mono, Inter } from "next/font/google";
import { ClarityAnalytics } from "@/components/clarity-analytics";
import "./globals.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  display: "swap",
});

const ibmPlexMono = IBM_Plex_Mono({
  variable: "--font-ibm-plex-mono",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

export const metadata: Metadata = {
  title: "demenos",
  description:
    "Encuentra las gasolineras más baratas y cercanas, aplicando tus descuentos por marca.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es">
      <body className={`${inter.variable} ${ibmPlexMono.variable}`}>
        {children}
        <Analytics />
        <ClarityAnalytics />
      </body>
    </html>
  );
}
