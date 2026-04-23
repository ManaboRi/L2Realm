import type { Metadata, Viewport } from 'next';
import './globals.css';
import { Header } from '@/components/Header';
import { Footer } from '@/components/Footer';
import { NicknamePrompt } from '@/components/NicknamePrompt';
import { AuthProvider } from '@/context/AuthContext';
import { YandexMetrika } from '@/components/YandexMetrika';

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
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  themeColor: '#090B10',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ru">
      <body>
        <AuthProvider>
          <Header />
          <main>{children}</main>
          <Footer />
          <NicknamePrompt />
        </AuthProvider>
        <YandexMetrika />
      </body>
    </html>
  );
}
