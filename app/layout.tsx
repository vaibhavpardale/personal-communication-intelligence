import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { NavBar } from "@/components/nav-bar";
import { BRAND } from "@/lib/brand";
import { RegisterServiceWorker } from "@/components/pwa/register-sw";
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
  title: `${BRAND.name}: ${BRAND.tagline.toLowerCase().replace(/\.$/, "")}`,
  description: `${BRAND.descriptor} Reads your mail and tells you what needs you, by when, and why.`,
  applicationName: BRAND.name,
  icons: { apple: "/icons/apple-touch-icon.png" },
  appleWebApp: { capable: true, title: BRAND.shortName, statusBarStyle: "default" },
};

export const viewport: Viewport = {
  themeColor: "#0f766e",
  width: "device-width",
  initialScale: 1,
  // lets the page use the whole screen on notched phones; the nav bars pad for the safe areas
  viewportFit: "cover",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      {/* on phones the tab bar is fixed at the bottom, so leave room for it */}
      <body className="flex min-h-full flex-col pb-[calc(4rem+env(safe-area-inset-bottom))] md:pb-0">
        <NavBar />
        {children}
        <RegisterServiceWorker />
      </body>
    </html>
  );
}
