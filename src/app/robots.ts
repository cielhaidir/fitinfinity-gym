import { MetadataRoute } from 'next'
 
export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: '*',
      allow: '/',
      disallow: [
        '/api/',
        '/admin/',
        '/management/',
        '/personal-trainers/',
        '/fitness-consultants/',
        '/finance/',
        '/pos/',
        '/member/',
        '/auth/',
      ],
    },
    sitemap: 'https://fitinfinity.id/sitemap.xml',
  }
}