import type { Metadata } from "next";
import { auth } from "@/server/auth";
import { HydrateClient } from "@/trpc/server";
import MarketingLanding from "./marketing-landing";

export const metadata: Metadata = {
  title: "Fit Infinity — Premium Gym Makassar",
  description:
    "Premium gym di Makassar. Alat lengkap, coach bersertifikat, kelas unlimited untuk semua member. Klaim free trial kamu — gratis, tanpa komitmen.",
};

// Structured Data for SEO
const structuredData = {
  "@context": "https://schema.org",
  "@type": "Gym",
  name: "Fit Infinity",
  alternateName: "Fit Infinity Gym",
  description:
    "Premium gym di Makassar dengan alat lengkap, coach bersertifikat, dan kelas unlimited untuk semua member. Forge your legacy.",
  url: "https://fitinfinity.id",
  logo: "https://fitinfinity.id/assets/landing/00-fit-infinity.png",
  image: ["https://fitinfinity.id/assets/landing/01-member-berlatih-di-fit-infinity.webp"],
  address: {
    "@type": "PostalAddress",
    streetAddress: "Jl. Sungai Saddang Lama No. 102",
    addressLocality: "Makassar",
    addressRegion: "South Sulawesi",
    addressCountry: "ID",
  },
  telephone: "+62-821-9084-5159",
  email: "fitinfinitymks@gmail.com",
  openingHoursSpecification: {
    "@type": "OpeningHoursSpecification",
    dayOfWeek: ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"],
    opens: "06:00",
    closes: "22:00",
  },
  sameAs: ["https://www.instagram.com/fitinfinity.id"],
};

function getDashboardUrl(permissions: string[]): string {
  if (permissions.includes("menu:dashboard-admin")) return "/admin";
  if (permissions.includes("menu:dashboard-finance")) return "/finance";
  if (permissions.includes("menu:dashboard-fc")) return "/fitness-consultants";
  if (permissions.includes("menu:dashboard-pt")) return "/personal-trainers";
  return "/member";
}

export default async function Home() {
  const session = await auth();
  const isLoggedIn = !!session?.user;
  const dashboardUrl = getDashboardUrl(session?.user?.permissions ?? []);

  return (
    <HydrateClient>
      {/* Marketing fonts */}
      <link rel="preconnect" href="https://fonts.googleapis.com" />
      <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
      <link
        href="https://fonts.googleapis.com/css2?family=Sora:wght@400;500;600&family=Manrope:wght@400;500;600;700&display=swap"
        rel="stylesheet"
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
      />
      <MarketingLanding
        isLoggedIn={isLoggedIn}
        dashboardUrl={dashboardUrl}
        signInUrl="/api/auth/signin"
        signUpUrl="/auth/signup"
      />
    </HydrateClient>
  );
}
