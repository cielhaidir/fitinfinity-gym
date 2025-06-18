import Head from 'next/head';

interface SEOProps {
  title?: string;
  description?: string;
  keywords?: string[];
  image?: string;
  url?: string;
  type?: 'website' | 'article' | 'profile';
  structuredData?: object;
}

export default function SEOHead({
  title = "Fit Infinity - Premium Fitness & Gym in Makassar",
  description = "Transform your body at Makassar's largest mega gym. Professional trainers, modern equipment, and unlimited fitness classes with one membership.",
  keywords = [
    "gym Makassar",
    "fitness center Makassar",
    "personal trainer Makassar",
    "fitness classes",
    "CrossFit",
    "yoga",
    "weightlifting"
  ],
  image = "/assets/landingpage-hero.png",
  url = "https://fitinfinity.id",
  type = "website",
  structuredData
}: SEOProps) {
  const keywordsString = keywords.join(', ');
  
  return (
    <Head>
      {/* Basic Meta Tags */}
      <title>{title}</title>
      <meta name="description" content={description} />
      <meta name="keywords" content={keywordsString} />
      <meta name="author" content="Fit Infinity" />
      <link rel="canonical" href={url} />
      
      {/* Open Graph Tags */}
      <meta property="og:title" content={title} />
      <meta property="og:description" content={description} />
      <meta property="og:image" content={`https://fitinfinity.id${image}`} />
      <meta property="og:url" content={url} />
      <meta property="og:type" content={type} />
      <meta property="og:site_name" content="Fit Infinity" />
      <meta property="og:locale" content="id_ID" />
      
      {/* Twitter Card Tags */}
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:title" content={title} />
      <meta name="twitter:description" content={description} />
      <meta name="twitter:image" content={`https://fitinfinity.id${image}`} />
      <meta name="twitter:site" content="@fitinfinity" />
      <meta name="twitter:creator" content="@fitinfinity" />
      
      {/* Additional Meta Tags */}
      <meta name="robots" content="index, follow" />
      <meta name="googlebot" content="index, follow, max-snippet:-1, max-image-preview:large, max-video-preview:-1" />
      <meta name="format-detection" content="telephone=no" />
      
      {/* Structured Data */}
      {structuredData && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
        />
      )}
    </Head>
  );
}