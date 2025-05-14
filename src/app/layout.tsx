import "@/styles/globals.css";
import ClientThemeProvider from "@/components/ClientThemeProvider";

import { GeistSans } from "geist/font/sans";
import { type Metadata } from "next";

import { TRPCReactProvider } from "@/trpc/react";
import { InstallPWA } from "@/components/pwa/install-prompt";

export const metadata: Metadata = {
  title: "Fit Infinity",
  description: "Largest mega gym in Makassar, with the best trainers and facilities to help you force your legacy",
  icons: [{ rel: "icon", url: "/favicon.ico" }],
  manifest: '/manifest.json',
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className={`${GeistSans.variable}`} suppressHydrationWarning>
      <head>
      <meta name="apple-mobile-web-app-title" content="Fitinifnity" />
      {/* <link rel="manifest" href="/manifest.json" /> */}
      </head>
      <body>
        <TRPCReactProvider>
          <ClientThemeProvider>
            <InstallPWA />
            {children}
          </ClientThemeProvider>
        </TRPCReactProvider>
      </body>
    </html>
  );
}
