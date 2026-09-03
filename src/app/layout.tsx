import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Barcode Scanner PWA",
  description: "Scan a barcode and fetch the matching MongoDB record instantly.",
  keywords: ["barcode", "scanner", "student lookup", "pwa"],
  manifest: "/manifest.webmanifest",
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
