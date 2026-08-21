import type { Metadata, Viewport } from "next";
import { Playfair_Display, DM_Sans, Macondo } from "next/font/google";
import { Analytics } from "@vercel/analytics/next";
import "./globals.css";
import { AuthProvider } from "@/lib/auth";
import { ParkDataProvider } from "@/lib/park-data";
import { ToastProvider } from "@/lib/toast";
import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";

const playfair = Playfair_Display({
  subsets: ["latin"],
  variable: "--font-playfair",
  display: "swap",
  weight: ["400", "500", "600", "700", "800", "900"],
  style: ["normal", "italic"],
});

const dmSans = DM_Sans({
  subsets: ["latin"],
  variable: "--font-dm-sans",
  display: "swap",
});

const macondo = Macondo({
  subsets: ["latin"],
  variable: "--font-macondo",
  display: "swap",
  weight: "400",
});

const BASE_URL = "https://trailquest.app";

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#fbfbf8",
  colorScheme: "light",
};

export const metadata: Metadata = {
  metadataBase: new URL(BASE_URL),
  title: {
    default: "TrailQuest — National Parks Hiker Planner",
    template: "%s | TrailQuest",
  },
  description:
    "Discover, plan, and experience national parks. Interactive trail maps, smart itineraries, and more.",
  openGraph: {
    type: "website",
    url: BASE_URL,
    siteName: "TrailQuest",
    title: "TrailQuest — National Parks Hiker Planner",
    description:
      "Discover, plan, and experience national parks. Interactive trail maps, smart itineraries, and more.",
    images: [
      {
        url: "/hero.jpg",
        width: 1200,
        height: 630,
        alt: "TrailQuest — National Parks Hiker Planner",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "TrailQuest — National Parks Hiker Planner",
    description:
      "Discover, plan, and experience national parks. Interactive trail maps, smart itineraries, and more.",
    images: ["/hero.jpg"],
  },
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "TrailQuest",
  },
  icons: {
    icon: "/favicon.ico",
    apple: "/favicon.ico",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${playfair.variable} ${dmSans.variable} ${macondo.variable} font-sans`}>
      <body className="min-h-screen flex flex-col">
        <AuthProvider>
          <ParkDataProvider>
            <ToastProvider>
              <TooltipProvider>
                {children}
                <Toaster />
                <Analytics />
              </TooltipProvider>
            </ToastProvider>
          </ParkDataProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
