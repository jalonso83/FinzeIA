import type { MetadataRoute } from 'next';

// /invite no se bloquea: los buscadores no la indexan (tiene noindex), pero los
// lectores de vista previa de WhatsApp y redes necesitan poder leerla.
export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: '*',
      allow: '/',
      disallow: ['/dashboard', '/login', '/api/', '/verify'],
    },
    sitemap: 'https://finzenai.com/sitemap.xml',
  };
}
