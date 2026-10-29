import type { MetadataRoute } from 'next';

// Solo páginas públicas que tiene sentido indexar. Las invitaciones, la
// verificación de correo, el login y el dashboard quedan fuera a propósito.
export default function sitemap(): MetadataRoute.Sitemap {
  return [
    {
      url: 'https://finzenai.com',
      changeFrequency: 'weekly',
      priority: 1,
    },
    {
      url: 'https://finzenai.com/delete-account',
      changeFrequency: 'yearly',
      priority: 0.3,
    },
  ];
}
