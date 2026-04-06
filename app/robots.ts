import { MetadataRoute } from 'next';

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: '*',
      allow: '/',
      disallow: [
        '/api/', 
        '/dashboard/', 
        '/upload/', 
        '/analysis/', 
        '/letter/', 
        '/case/', 
        '/settings/'
      ],
    },
    sitemap: 'https://billdog.co.za/sitemap.xml',
  };
}
