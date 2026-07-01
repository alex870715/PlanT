import { AppSessionProvider } from "@/components/providers/session-provider";
import { ColorThemeMenu } from "@/components/settings/color-theme-menu";
import { colorThemeInitScript } from "@/lib/color-themes";
import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import Script from "next/script";
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
  title: "PlanT 🌱 — Plant Your Next Journey",
  description:
    "Smart group travel planner with branching routes and AI fairy-tale booklets.",
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "PlanT",
  },
  icons: {
    icon: "/icon.svg",
    apple: "/icon.svg",
  },
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#059669" },
    { media: "(prefers-color-scheme: dark)", color: "#059669" },
  ],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-Hant" data-color-theme="forest" suppressHydrationWarning>
      <head>
        <Script
          id="plant-color-theme-init"
          strategy="beforeInteractive"
          dangerouslySetInnerHTML={{ __html: colorThemeInitScript() }}
        />
      </head>
      <body
        className={`${geistSans.variable} ${geistMono.variable} min-h-screen font-sans antialiased`}
      >
        <ColorThemeMenu />
        <AppSessionProvider>
          <div className="pt-11">{children}</div>
        </AppSessionProvider>
      </body>
    </html>
  );
}
