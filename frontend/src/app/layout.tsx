import type { Metadata, Viewport } from 'next';
import './globals.css';
import { Header } from '@/components/Header';
import { Footer } from '@/components/Footer';
import { NicknamePrompt } from '@/components/NicknamePrompt';
import { AuthProvider } from '@/context/AuthContext';
import { YandexMetrika } from '@/components/YandexMetrika';
import { VKPixel } from '@/components/VKPixel';

export const metadata: Metadata = {
  metadataBase: new URL('https://l2realm.ru'),
  title: {
    default: 'L2Realm — Каталог серверов Lineage 2',
    template: '%s | L2Realm',
  },
  description: 'Лучший каталог приватных серверов Lineage 2. Фильтры, честные отзывы, рейтинг.',
  keywords: 'lineage 2, l2, приватный сервер, каталог',
  openGraph: {
    type: 'website',
    locale: 'ru_RU',
    siteName: 'L2Realm',
  },
  verification: {
    yandex: 'cef19d9162540d2b',
  },
  icons: {
    icon: '/favicon.ico',
    apple: '/apple-touch-icon.png',
  },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  themeColor: '#090B10',
};

// JSON-LD Organization schema — общая для всего сайта.
// Помогает Яндексу/Google понять что это за организация, какие у неё соцсети.
const organizationSchema = {
  '@context': 'https://schema.org',
  '@type': 'Organization',
  name: 'L2Realm',
  url: 'https://l2realm.ru',
  logo: 'https://l2realm.ru/icon.svg',
  description: 'Каталог приватных серверов Lineage 2. Фильтры, отзывы, рейтинг.',
  sameAs: [
    'https://t.me/l2realm_ru',
    'https://vk.com/l2realmru',
  ],
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ru">
      <head>
        {/* Preconnect к Google Fonts — TLS-соединение устанавливается параллельно
            с парсингом HTML, шрифты приходят на ~200-400мс быстрее. */}
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        {/* Preload hero-bg — это LCP-элемент главной, без preload Lighthouse
            показывает 8+ секунд. Браузер начнёт грузить параллельно с CSS. */}
        <link rel="preload" as="image" href="/images/hero-bg.webp" type="image/webp" />
        <script
          type="application/ld+json"
          // eslint-disable-next-line react/no-danger
          dangerouslySetInnerHTML={{ __html: JSON.stringify(organizationSchema) }}
        />
      </head>
      <body>
        <AuthProvider>
          <Header />
          <main>{children}</main>
          <Footer />
          <NicknamePrompt />
        </AuthProvider>
        <YandexMetrika />
        <VKPixel />
      </body>
    </html>
  );
}
