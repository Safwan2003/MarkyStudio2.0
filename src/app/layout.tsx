import { Inter } from "next/font/google";
import { Metadata, Viewport } from "next";
import "../../styles/global.css";

const inter = Inter({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800", "900"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "Prompt to Motion Graphics - Remotion",
  description: "Prompt to Motion Graphics - Remotion",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className={`bg-background ${inter.className}`}>{children}</body>
    </html>
  );
}
