import MaintenanceMode from "@/components/MaintenanceMode";
import QueryProvider from "@/components/providers/QueryProvider";
import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Temis - 시간표 에디터",
  description: "테미스, 버튜버를 위한 맞춤형 시간표 플랫폼",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Temis",
  },
  formatDetection: {
    telephone: false,
  },
  openGraph: {
    type: "website",
    siteName: "Temis",
    title: "Temis - 시간표 에디터",
    description: "테미스, 버튜버를 위한 맞춤형 시간표 플랫폼",
  },
  twitter: {
    card: "summary",
    title: "Temis - 시간표 에디터",
    description: "테미스, 버튜버를 위한 맞춤형 시간표 플랫폼",
  },
  icons: {
    icon: [
      { url: "/icons/114.png", sizes: "114x114" },
      { url: "/icons/120.png", sizes: "120x120" },
      { url: "/icons/180.png", sizes: "180x180" },
    ],
    apple: [
      { url: "/icons/57.png", sizes: "57x57" },
      { url: "/icons/60.png", sizes: "60x60" },
      { url: "/icons/114.png", sizes: "114x114" },
      { url: "/icons/120.png", sizes: "120x120" },
      { url: "/icons/180.png", sizes: "180x180" },
    ],
    other: [
      { url: "/icons/29.png", sizes: "29x29" },
      { url: "/icons/40.png", sizes: "40x40" },
      { url: "/icons/58.png", sizes: "58x58" },
      { url: "/icons/80.png", sizes: "80x80" },
      { url: "/icons/87.png", sizes: "87x87" },
      { url: "/icons/1024.png", sizes: "1024x1024" },
    ],
  },
};

export const viewport: Viewport = {
  themeColor: "#2F4157",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: "cover",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="kr">
      <body
        className={`${geistSans.variable} ${geistMono.variable} $antialiased`}
      >
        <QueryProvider>
          <MaintenanceMode>
            {children}
            {/* <PWAInstallPrompt /> */}
          </MaintenanceMode>
        </QueryProvider>
      </body>
    </html>
  );
}
