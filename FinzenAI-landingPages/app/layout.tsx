import type { Metadata } from 'next';
import { Rubik, Playfair_Display } from 'next/font/google';
import './globals.css';
import AttributionInitializer from '@/components/AttributionInitializer';

const rubik = Rubik({
  subsets: ['latin'],
  variable: '--font-rubik',
  display: 'swap',
});

const playfairDisplay = Playfair_Display({
  subsets: ['latin'],
  variable: '--font-playfair',
  display: 'swap',
});

export const metadata: Metadata = {
  metadataBase: new URL('https://finzenai.com'),
  alternates: {
    canonical: 'https://finzenai.com',
  },
  icons: {
    icon: [
      { url: '/favicon.ico', sizes: 'any' },
      { url: '/icon.png', type: 'image/png' },
    ],
    apple: '/apple-touch-icon.png',
  },
  title: 'FinZen AI | El Amigo que Sabe de Dinero que Siempre Quisiste Tener',
  description:
    'Registra gastos hablando, controla presupuestos y ahorra con Zenio, tu copiloto financiero con IA. Descarga gratis en App Store y Google Play.',
  keywords:
    'finanzas personales, app finanzas, IA financiera, control de gastos, presupuesto personal, ahorro inteligente, copiloto financiero, Zenio, gastos hormiga',
  openGraph: {
    title: 'FinZen AI | Tu Copiloto Financiero con IA',
    description:
      'Registra gastos hablando, controla presupuestos y ahorra con Zenio.',
    images: ['/og-image.png'],
    type: 'website',
    url: 'https://finzenai.com',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'FinZen AI | Tu Copiloto Financiero con IA',
    description:
      'Registra gastos hablando, controla presupuestos y ahorra con Zenio.',
    images: ['/og-image.png'],
  },
};

const GA_MEASUREMENT_ID = process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID;
const META_PIXEL_ID = process.env.NEXT_PUBLIC_META_PIXEL_ID;
const TIKTOK_PIXEL_ID = process.env.NEXT_PUBLIC_TIKTOK_PIXEL_ID;

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="es"
      className={`${rubik.variable} ${playfairDisplay.variable}`}
    >
      <head>
        {/* Google Analytics 4 */}
        {GA_MEASUREMENT_ID && (
          <>
            <script
              async
              src={`https://www.googletagmanager.com/gtag/js?id=${GA_MEASUREMENT_ID}`}
            />
            <script
              dangerouslySetInnerHTML={{
                __html: `
                  window.dataLayer = window.dataLayer || [];
                  function gtag(){dataLayer.push(arguments);}
                  gtag('js', new Date());
                  gtag('config', '${GA_MEASUREMENT_ID}');
                `,
              }}
            />
          </>
        )}

        {/* Meta Pixel */}
        {META_PIXEL_ID && (
          <script
            dangerouslySetInnerHTML={{
              __html: `
                !function(f,b,e,v,n,t,s)
                {if(f.fbq)return;n=f.fbq=function(){n.callMethod?
                n.callMethod.apply(n,arguments):n.queue.push(arguments)};
                if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';
                n.queue=[];t=b.createElement(e);t.async=!0;
                t.src=v;s=b.getElementsByTagName(e)[0];
                s.parentNode.insertBefore(t,s)}(window, document,'script',
                'https://connect.facebook.net/en_US/fbevents.js');
                fbq('init', '${META_PIXEL_ID}');
                fbq('track', 'PageView');
              `,
            }}
          />
        )}

        {/* TikTok Pixel */}
        {TIKTOK_PIXEL_ID && (
          <script
            dangerouslySetInnerHTML={{
              __html: `
                !function (w, d, t) {
                  w.TiktokAnalyticsObject=t;var ttq=w[t]=w[t]||[];ttq.methods=["page","track","identify","instances","debug","on","off","once","ready","alias","group","enableCookie","disableCookie","holdConsent","revokeConsent","grantConsent"],ttq.setAndDefer=function(t,e){t[e]=function(){t.push([e].concat(Array.prototype.slice.call(arguments,0)))}};for(var i=0;i<ttq.methods.length;i++)ttq.setAndDefer(ttq,ttq.methods[i]);ttq.instance=function(t){for(
                  var e=ttq._i[t]||[],n=0;n<ttq.methods.length;n++)ttq.setAndDefer(e,ttq.methods[n]);return e},ttq.load=function(e,n){var r="https://analytics.tiktok.com/i18n/pixel/events.js",o=n&&n.partner;ttq._i=ttq._i||{},ttq._i[e]=[],ttq._i[e]._u=r,ttq._t=ttq._t||{},ttq._t[e]=+new Date,ttq._o=ttq._o||{},ttq._o[e]=n||{};n=document.createElement("script")
                  ;n.type="text/javascript",n.async=!0,n.src=r+"?sdkid="+e+"&lib="+t;e=document.getElementsByTagName("script")[0];e.parentNode.insertBefore(n,e)};
                  ttq.load('${TIKTOK_PIXEL_ID}');
                  ttq.page();
                }(window, document, 'ttq');
              `,
            }}
          />
        )}
      </head>
      <body className="font-rubik bg-finzen-white text-finzen-black antialiased">
        <AttributionInitializer />
        {children}
      </body>
    </html>
  );
}
