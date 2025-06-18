import { type Metadata } from "next";

export const metadata: Metadata = {
  title: "Fit Infinity - Premium Fitness Center & Gym in Makassar",
  description: "Join Makassar's largest mega gym with state-of-the-art equipment, certified personal trainers, yoga classes, CrossFit, and weightlifting. Unlimited classes with one membership. Transform your body today!",
  keywords: [
    "gym Makassar",
    "fitness center Makassar",
    "personal trainer Makassar", 
    "yoga classes Makassar",
    "CrossFit Makassar",
    "weightlifting gym",
    "fitness membership",
    "mega gym Indonesia",
    "24 hour gym",
    "fitness transformation"
  ],
  openGraph: {
    title: "Fit Infinity - Premium Fitness Center & Gym in Makassar",
    description: "Transform your body at Makassar's largest mega gym. Professional trainers, modern equipment, and unlimited fitness classes with one membership.",
    images: [
      {
        url: '/assets/landingpage-hero.png',
        width: 1200,
        height: 630,
        alt: 'Fit Infinity Gym - Premium Fitness Center',
      }
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Fit Infinity - Premium Fitness Center & Gym in Makassar',
    description: 'Transform your body at Makassar\'s largest mega gym. Professional trainers, modern equipment, and unlimited fitness classes.',
    images: ['/assets/landingpage-hero.png'],
  },
};

export default function HomeLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}