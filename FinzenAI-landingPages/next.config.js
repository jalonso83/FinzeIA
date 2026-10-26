/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    formats: ['image/webp'],
  },
  // El panel interno y su login no deben aparecer en buscadores. Va como
  // cabecera porque las páginas del dashboard son componentes de cliente y no
  // pueden exportar metadata.
  async headers() {
    const noindex = [{ key: 'X-Robots-Tag', value: 'noindex, nofollow' }];
    return [
      { source: '/dashboard', headers: noindex },
      { source: '/dashboard/:path*', headers: noindex },
      { source: '/login', headers: noindex },
    ];
  },
};

module.exports = nextConfig;
