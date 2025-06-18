export interface SEOConfig {
  title: string;
  description: string;
  keywords: string[];
  image?: string;
  url?: string;
  type?: 'website' | 'article' | 'profile';
}

export const defaultSEO: SEOConfig = {
  title: "Fit Infinity - Premium Fitness & Gym in Makassar",
  description: "Transform your body at Makassar's largest mega gym. Professional trainers, modern equipment, and unlimited fitness classes with one membership.",
  keywords: [
    "gym Makassar",
    "fitness center Makassar",
    "personal trainer Makassar",
    "fitness classes",
    "CrossFit",
    "yoga",
    "weightlifting",
    "mega gym Indonesia"
  ],
  image: "/assets/landingpage-hero.png",
  url: "https://fitinfinity.id",
  type: "website"
};

export function generatePageTitle(title: string, includeBase = true): string {
  if (!includeBase) return title;
  return `${title} | Fit Infinity`;
}

export function generateMetaDescription(description: string, maxLength = 160): string {
  if (description.length <= maxLength) return description;
  return description.substring(0, maxLength - 3) + '...';
}

export function generateKeywords(baseKeywords: string[], pageKeywords: string[] = []): string[] {
  return [...new Set([...baseKeywords, ...pageKeywords])];
}

export function generateCanonicalUrl(path: string, baseUrl = "https://fitinfinity.id"): string {
  return `${baseUrl}${path.startsWith('/') ? path : `/${path}`}`;
}

export function generateBreadcrumbSchema(breadcrumbs: Array<{name: string, url: string}>) {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    "itemListElement": breadcrumbs.map((crumb, index) => ({
      "@type": "ListItem",
      "position": index + 1,
      "name": crumb.name,
      "item": crumb.url
    }))
  };
}

export function generateOrganizationSchema() {
  return {
    "@context": "https://schema.org",
    "@type": "Organization",
    "name": "Fit Infinity",
    "alternateName": "Fit Infinity Gym",
    "url": "https://fitinfinity.id",
    "logo": "https://fitinfinity.id/assets/fitinfinity-lime.png",
    "contactPoint": {
      "@type": "ContactPoint",
      "telephone": "+62-123-456-7890",
      "contactType": "customer service",
      "areaServed": "ID",
      "availableLanguage": ["Indonesian", "English"]
    },
    "address": {
      "@type": "PostalAddress",
      "streetAddress": "Jl. Sungai Saddang Lama No.102",
      "addressLocality": "Makassar",
      "addressRegion": "South Sulawesi",
      "addressCountry": "ID"
    },
    "sameAs": [
      "https://www.facebook.com/fitinfinity",
      "https://www.instagram.com/fitinfinity",
      "https://www.youtube.com/fitinfinity"
    ]
  };
}

export function generateLocalBusinessSchema() {
  return {
    "@context": "https://schema.org",
    "@type": "LocalBusiness",
    "@id": "https://fitinfinity.id/#localbusiness",
    "name": "Fit Infinity",
    "image": "https://fitinfinity.id/assets/landingpage-hero.png",
    "description": "Makassar's largest mega gym with state-of-the-art equipment, certified personal trainers, and comprehensive fitness classes.",
    "url": "https://fitinfinity.id",
    "telephone": "+62-123-456-7890",
    "email": "info@fitinfinity.id",
    "address": {
      "@type": "PostalAddress",
      "streetAddress": "Jl. Sungai Saddang Lama No.102",
      "addressLocality": "Makassar",
      "addressRegion": "South Sulawesi",
      "postalCode": "90231",
      "addressCountry": "ID"
    },
    "geo": {
      "@type": "GeoCoordinates",
      "latitude": -5.1477,
      "longitude": 119.4327
    },
    "openingHoursSpecification": [
      {
        "@type": "OpeningHoursSpecification",
        "dayOfWeek": ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"],
        "opens": "07:00",
        "closes": "22:00"
      }
    ],
    "priceRange": "$$",
    "aggregateRating": {
      "@type": "AggregateRating",
      "ratingValue": "4.8",
      "reviewCount": "150"
    }
  };
}

export const fitnessKeywords = [
  "gym",
  "fitness center",
  "personal trainer",
  "fitness classes",
  "CrossFit",
  "yoga",
  "weightlifting",
  "cardio",
  "strength training",
  "fitness membership",
  "workout",
  "exercise",
  "health club",
  "fitness facility"
];

export const makassarKeywords = [
  "Makassar",
  "South Sulawesi",
  "Indonesia",
  "Sulsel",
  "fitness Makassar",
  "gym Makassar",
  "olahraga Makassar"
];