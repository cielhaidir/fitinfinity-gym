import "@/styles/globals.css";
import ClientThemeProvider from "@/components/ClientThemeProvider";

import { GeistSans } from "geist/font/sans";
import { type Metadata } from "next";

import { TRPCReactProvider } from "@/trpc/react";
import { InstallPWA } from "@/components/pwa/install-prompt";
import Head from "next/head";

export const metadata: Metadata = {
  title: {
    default: "Fit Infinity - Premium Fitness & Gym in Makassar",
    template: "%s | Fit Infinity"
  },
  description: "Largest mega gym in Makassar with state-of-the-art equipment, certified personal trainers, and comprehensive fitness classes. Transform your body and forge your legacy at Fit Infinity.",
  keywords: [
    "gym Makassar",
    "fitness center Makassar",
    "personal trainer Makassar",
    "fitness classes",
    "weightlifting",
    "CrossFit",
    "yoga",
    "gym membership",
    "fitness transformation",
    "strength training",
    "cardio workout",
    "mega gym Indonesia",
    "fitness facility",
    "workout programs"
  ],
  authors: [{ name: "Fit Infinity" }],
  creator: "Fit Infinity",
  publisher: "Fit Infinity",
  formatDetection: {
    email: false,
    address: false,
    telephone: false,
  },
  metadataBase: new URL('https://fitinfinity.id'),
  alternates: {
    canonical: '/',
    languages: {
      'id-ID': '/id',
      'en-US': '/en',
    },
  },
  openGraph: {
    title: "Fit Infinity - Premium Fitness & Gym in Makassar",
    description: "Transform your body at Makassar's largest mega gym. Professional trainers, modern equipment, and unlimited fitness classes with one membership.",
    url: 'https://fitinfinity.id',
    siteName: 'Fit Infinity',
    images: [
      {
        url: '/assets/landingpage-hero.png',
        width: 1200,
        height: 630,
        alt: 'Fit Infinity - Premium Gym in Makassar',
      },
      {
        url: '/assets/fitinfinity-lime.png',
        width: 800,
        height: 600,
        alt: 'Fit Infinity Logo',
      }
    ],
    locale: 'id_ID',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Fit Infinity - Premium Fitness & Gym in Makassar',
    description: 'Transform your body at Makassar\'s largest mega gym. Professional trainers, modern equipment, and unlimited fitness classes.',
    images: ['/assets/landingpage-hero.png'],
    creator: '@fitinfinity',
    site: '@fitinfinity',
  },
  viewport: {
    width: 'device-width',
    initialScale: 1,
    maximumScale: 5,
  },
  robots: {
    index: true,
    follow: true,
    nocache: true,
    googleBot: {
      index: true,
      follow: true,
      noimageindex: false,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
  icons: {
    icon: [
      { url: '/favicon.ico' },
      { url: '/web-app-manifest-192x192.png', sizes: '192x192', type: 'image/png' },
    ],
    shortcut: '/favicon.ico',
    apple: [
      { url: '/apple-icon.png' },
      { url: '/web-app-manifest-192x192.png', sizes: '192x192', type: 'image/png' },
    ],
  },
  manifest: '/manifest.json',
  category: 'fitness',
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html
      lang="en"
      className={`${GeistSans.variable}`}
      suppressHydrationWarning
    >
      <Head>
        <meta name="apple-mobile-web-app-title" content="Fitinifnity" />
        <meta
          name="viewport"
          content="width=device-width, initial-scale=0.8, maximum-scale=1, user-scalable=no; viewport-fit=cover"
        />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta
          name="apple-mobile-web-app-status-bar-style"
          content="black-translucent"
        ></meta>
        {/* <link rel="manifest" href="/manifest.json" /> */}
      </Head>
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
