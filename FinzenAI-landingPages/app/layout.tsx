import type { Metadata, Viewport } from 'next';
import { Rubik, Playfair_Display } from 'next/font/google';
import Script from 'next/script';
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

export const viewport: Viewport = {
  themeColor: '#10B981',
};

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
    'finanzas personales, app finanzas, IA financiera, control de gastos, presupuesto personal, ahorro inteligente, copiloto financiero, Zenio, gastos hormiga, FinZen AI',
  authors: [{ name: 'FinZen AI' }],
  applicationName: 'FinZen AI',
  appleWebApp: {
    title: 'FinZen AI',
    capable: true,
    statusBarStyle: 'default',
  },
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
  robots: {
    index: true,
    follow: true,
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

        {/* JSON-LD Schemas */}
        <Script
          id="schema-organization"
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@type": "Organization",
              "name": "FinZen AI",
              "url": "https://www.finzenai.com",
              "logo": "https://www.finzenai.com/logo.png",
              "description": "Aplicación móvil de finanzas personales con inteligencia artificial. Zenio, tu copiloto financiero, te ayuda a registrar gastos por voz, controlar presupuestos y alcanzar metas de ahorro.",
              "founder": {
                "@type": "Person",
                "name": "Junior Ureña",
                "url": "https://www.juniorurena.com.do",
                "sameAs": [
                  "https://www.linkedin.com/in/juniorurena",
                  "https://www.ulpcorp.com"
                ]
              },
              "sameAs": [
                "https://www.instagram.com/finzenai"
              ],
              "contactPoint": {
                "@type": "ContactPoint",
                "email": "hola@finzenai.com",
                "contactType": "customer support",
                "availableLanguage": "Spanish"
              }
            })
          }}
        />
        <Script
          id="schema-software-app"
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@type": "SoftwareApplication",
              "name": "FinZen AI",
              "alternateName": "Zenio",
              "description": "Registra gastos hablando, controla presupuestos y ahorra con Zenio, tu copiloto financiero con IA. Disponible gratis en App Store y Google Play.",
              "url": "https://www.finzenai.com",
              "applicationCategory": "FinanceApplication",
              "operatingSystem": "iOS, Android",
              "offers": [
                {
                  "@type": "Offer",
                  "name": "Plan Gratis",
                  "price": "0",
                  "priceCurrency": "USD",
                  "description": "Registro de gastos por voz, presupuesto básico, reporte mensual"
                },
                {
                  "@type": "Offer",
                  "name": "Plan Esencial",
                  "price": "2.99",
                  "priceCurrency": "USD",
                  "priceSpecification": {
                    "@type": "UnitPriceSpecification",
                    "price": "2.99",
                    "priceCurrency": "USD",
                    "billingDuration": "P1M"
                  },
                  "description": "Gastos ilimitados, detector de gastos hormiga, metas de ahorro, reportes semanales"
                },
                {
                  "@type": "Offer",
                  "name": "Plan Premium",
                  "price": "5.99",
                  "priceCurrency": "USD",
                  "priceSpecification": {
                    "@type": "UnitPriceSpecification",
                    "price": "5.99",
                    "priceCurrency": "USD",
                    "billingDuration": "P1M"
                  },
                  "description": "Zenio ilimitado, análisis predictivo, exportación de datos, soporte prioritario"
                }
              ],
              "featureList": [
                "Registro de gastos por voz",
                "Control de presupuestos por categoría",
                "Detector de gastos hormiga",
                "Metas de ahorro personalizadas",
                "Reportes inteligentes semanales y mensuales",
                "Asistente financiero conversacional (Zenio)"
              ],
              "inLanguage": "es",
              "creator": {
                "@type": "Organization",
                "name": "FinZen AI",
                "url": "https://www.finzenai.com"
              }
            })
          }}
        />
        <Script
          id="schema-website"
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@type": "WebSite",
              "name": "FinZen AI",
              "alternateName": "Zenio - Copiloto Financiero con IA",
              "url": "https://www.finzenai.com",
              "description": "Aplicación móvil de finanzas personales con inteligencia artificial. Registra gastos hablando, controla presupuestos y ahorra con Zenio.",
              "inLanguage": "es",
              "publisher": {
                "@type": "Organization",
                "name": "FinZen AI",
                "url": "https://www.finzenai.com"
              }
            })
          }}
        />
        <Script
          id="schema-faq"
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@type": "FAQPage",
              "mainEntity": [
                {
                  "@type": "Question",
                  "name": "¿Es segura mi información financiera en FinZen AI?",
                  "acceptedAnswer": {
                    "@type": "Answer",
                    "text": "Sí. FinZen AI utiliza encriptación de grado bancario y nunca almacena credenciales de cuentas bancarias. Tu información se procesa de forma segura."
                  }
                },
                {
                  "@type": "Question",
                  "name": "¿Puedo usar FinZen AI sin internet?",
                  "acceptedAnswer": {
                    "@type": "Answer",
                    "text": "Las funciones básicas de registro funcionan offline. Zenio requiere conexión a internet para responder consultas ya que utiliza IA en la nube."
                  }
                },
                {
                  "@type": "Question",
                  "name": "¿En qué países está disponible FinZen AI?",
                  "acceptedAnswer": {
                    "@type": "Answer",
                    "text": "Disponible globalmente a través de App Store y Google Play. Optimizada para Latinoamérica y España."
                  }
                },
                {
                  "@type": "Question",
                  "name": "¿Cómo funciona el registro de gastos por voz?",
                  "acceptedAnswer": {
                    "@type": "Answer",
                    "text": "Simplemente dile a Zenio algo como 'Gasté 500 pesos en el supermercado' y él automáticamente extrae el monto, identifica la categoría y registra el gasto."
                  }
                },
                {
                  "@type": "Question",
                  "name": "¿Puedo cancelar mi suscripción en cualquier momento?",
                  "acceptedAnswer": {
                    "@type": "Answer",
                    "text": "Sí, puedes cancelar tu suscripción en cualquier momento sin penalidad a través de App Store o Google Play."
                  }
                },
                {
                  "@type": "Question",
                  "name": "¿Zenio reemplaza a un asesor financiero?",
                  "acceptedAnswer": {
                    "@type": "Answer",
                    "text": "Zenio es un asistente para el control diario de finanzas personales. Para planificación financiera compleja o inversiones, recomendamos consultar un asesor profesional."
                  }
                }
              ]
            })
          }}
        />
      </body>
    </html>
  );
}
