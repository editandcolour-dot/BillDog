import { MetadataRoute } from 'next';
import { municipalitiesSeoData } from '@/lib/data/seo-municipalities';

export default function sitemap(): MetadataRoute.Sitemap {
  const baseUrl = 'https://billdog.co.za';

  const coreRoutes = [
    '',
    '/how-it-works',
    '/pricing',
    '/faq',
    '/about',
    '/real-cases',
    '/contact',
    '/login',
    '/signup'
  ].map((route) => ({
    url: `${baseUrl}${route}`,
    lastModified: new Date(),
    changeFrequency: 'weekly' as const,
    priority: route === '' ? 1 : 0.9,
  }));

  const municipalityRoutes = Object.keys(municipalitiesSeoData).map((slug) => ({
    url: `${baseUrl}/disputes/${slug}`,
    lastModified: new Date(),
    changeFrequency: 'weekly' as const,
    priority: 0.8,
  }));

  // Blog content cluster (Phase 12 addition)
  const blogRoutes = [
    '/blog/how-to-dispute-municipal-bill-south-africa', // Pillar
    '/blog/section-102-municipal-systems-act',
    '/blog/how-to-read-municipal-bill',
    '/blog/municipal-billing-errors-south-africa',
    '/blog/estimated-readings-south-africa',
    '/blog/municipality-disconnection-rights',
    '/blog/water-bill-overcharge-south-africa',
    '/blog/rates-valuation-dispute',
    '/blog/municipality-complaint-not-resolved'
  ].map((route) => ({
    url: `${baseUrl}${route}`,
    lastModified: new Date(),
    changeFrequency: 'weekly' as const,
    priority: route.includes('how-to-dispute') ? 0.8 : 0.7,
  }));

  return [...coreRoutes, ...municipalityRoutes, ...blogRoutes];
}
