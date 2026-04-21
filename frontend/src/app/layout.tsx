import type { Metadata, Viewport } from 'next';
import './globals.css';
import { Header } from '@/components/Header';
import { NicknamePrompt } from '@/components/NicknamePrompt';
import { AuthProvider } from '@/context/AuthContext';

export const metadata: Metadata = {
  title: 'L2Realm — Каталог серверов Lineage 2',
  description: 'Лучший каталог приватных серверов Lineage 2. Фильтры, честные отзывы, рейтинг.',
  keywords: 'lineage 2, l2, приватный сервер, каталог',
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
          <NicknamePrompt />
        </AuthProvider>
      </body>
    </html>
  );
}
