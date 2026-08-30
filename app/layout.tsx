import type { Metadata } from "next";
import { Archivo_Black, Inter, IBM_Plex_Mono } from "next/font/google";
import "./globals.css";

const archivoBlack = Archivo_Black({
  subsets: ["latin"],
  weight: "400",
  variable: "--font-display",
});
const inter = Inter({ subsets: ["latin"], variable: "--font-body" });
const plexMono = IBM_Plex_Mono({
  subsets: ["latin"],
  weight: ["400", "500"],
  variable: "--font-mono",
});

export const metadata: Metadata = {
  title: "CAAS — Content Approval Artwork System",
  description: "Alur persetujuan artwork digital: Design → Produk → Purchasing",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="id" className={`${archivoBlack.variable} ${inter.variable} ${plexMono.variable}`}>
      <body className="bg-paper text-ink">{children}</body>
    </html>
  );
}
