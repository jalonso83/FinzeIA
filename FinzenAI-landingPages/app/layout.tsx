import type { Metadata } from 'next';
import { Rubik, Playfair_Display } from 'next/font/google';
import './globals.css';

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

const GA_MEASUREMENT_ID = 'G-XXXXXXXXXX';
const META_PIXEL_ID = 'XXXXXXXXXX';

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
        {/* Meta Pixel */}
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
      </head>
      <body className="font-rubik bg-finzen-white text-finzen-black antialiased">
        {children}
      </body>
    </html>
  );
}
