interface BusinessSchema {
  name: string;
  description: string;
  url: string;
  logo: string;
  address: {
    street: string;
    city: string;
    region: string;
    country: string;
  };
  phone: string;
  email: string;
  openingHours: string;
  amenities: string[];
  priceRange: string;
  socialMedia: string[];
}

interface ClassSchema {
  name: string;
  description: string;
  instructor: string;
  duration: string;
  difficulty: string;
  category: string;
}

interface TrainerSchema {
  name: string;
  jobTitle: string;
  worksFor: string;
  description: string;
  image: string;
  specialties: string[];
}

export function generateBusinessSchema(business: BusinessSchema) {
  return {
    "@context": "https://schema.org",
    "@type": "Gym",
    "name": business.name,
    "description": business.description,
    "url": business.url,
    "logo": business.logo,
    "address": {
      "@type": "PostalAddress",
      "streetAddress": business.address.street,
      "addressLocality": business.address.city,
      "addressRegion": business.address.region,
      "addressCountry": business.address.country
    },
    "telephone": business.phone,
    "email": business.email,
    "openingHoursSpecification": {
      "@type": "OpeningHoursSpecification",
      "dayOfWeek": [
        "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"
      ],
      "opens": "07:00",
      "closes": "22:00"
    },
    "amenityFeature": business.amenities.map(amenity => ({
      "@type": "LocationFeatureSpecification",
      "name": amenity,
      "value": true
    })),
    "priceRange": business.priceRange,
    "sameAs": business.socialMedia
  };
}

export function generateClassSchema(classData: ClassSchema) {
  return {
    "@context": "https://schema.org",
    "@type": "ExerciseClass",
    "name": classData.name,
    "description": classData.description,
    "instructor": {
      "@type": "Person",
      "name": classData.instructor
    },
    "duration": classData.duration,
    "difficulty": classData.difficulty,
    "category": classData.category,
    "provider": {
      "@type": "Gym",
      "name": "Fit Infinity"
    }
  };
}

export function generateTrainerSchema(trainer: TrainerSchema) {
  return {
    "@context": "https://schema.org",
    "@type": "Person",
    "name": trainer.name,
    "jobTitle": trainer.jobTitle,
    "worksFor": {
      "@type": "Gym",
      "name": trainer.worksFor
    },
    "description": trainer.description,
    "image": trainer.image,
    "knowsAbout": trainer.specialties
  };
}

export function generateWebPageSchema(title: string, description: string, url: string) {
  return {
    "@context": "https://schema.org",
    "@type": "WebPage",
    "name": title,
    "description": description,
    "url": url,
    "isPartOf": {
      "@type": "WebSite",
      "name": "Fit Infinity",
      "url": "https://fitinfinity.id"
    },
    "about": {
      "@type": "Gym",
      "name": "Fit Infinity"
    }
  };
}

export function generateFAQSchema(faqs: Array<{question: string, answer: string}>) {
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    "mainEntity": faqs.map(faq => ({
      "@type": "Question",
      "name": faq.question,
      "acceptedAnswer": {
        "@type": "Answer",
        "text": faq.answer
      }
    }))
  };
}

interface StructuredDataProps {
  data: object;
}

export default function StructuredData({ data }: StructuredDataProps) {
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(data) }}
    />
  );
}