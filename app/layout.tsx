import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { ConditionalChrome } from "@/components/site/conditional-chrome";
import { ServiceWorkerRegistrar } from "@/components/site/service-worker-registrar";
import { Toaster } from "@/components/ui/toaster";

const inter = Inter({ subsets: ["latin"], variable: "--font-sans" });

export const metadata: Metadata = {
  title: {
    default: "SwingLab — Pro swing reviews for hitting coaches",
    template: "%s · SwingLab",
  },
  description:
    "SwingLab turns a submitted swing video into a paid, useful lesson in 5–10 minutes. Web-first, coach-approved.",
  manifest: "/manifest.json",
  themeColor: "#0a0a0a",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "SwingLab",
  },
  icons: {
    icon: [{ url: "/icon.svg", type: "image/svg+xml" }],
    apple: [{ url: "/icon.svg" }],
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className={`${inter.variable} flex min-h-dvh flex-col`}>
        <ConditionalChrome>{children}</ConditionalChrome>
        <ServiceWorkerRegistrar />
        <Toaster />
      </body>
    </html>
  );
}
