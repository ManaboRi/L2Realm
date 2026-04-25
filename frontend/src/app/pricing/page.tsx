import type { Metadata } from 'next';
import { PricingClient } from './PricingClient';

const SITE = 'https://l2realm.ru';

export const metadata: Metadata = {
  title: 'Тарифы: VIP, Буст, Сервер дня',
  description:
    'Размещение сервера Lineage 2 в каталоге L2Realm бесплатное. Платные опции: VIP-слот 5000₽/31 день (3 места), буст «в огне» 500₽/7 дней. «Сервер дня» раздаётся бесплатно по ротации.',
  alternates: { canonical: `${SITE}/pricing` },
  openGraph: {
    type: 'website',
    title: 'Тарифы — L2Realm',
    description:
      'VIP (5000₽/31 день, 3 слота), буст (500₽/7 дней), Сервер дня бесплатно. Размещение в каталоге — бесплатно.',
    url: `${SITE}/pricing`,
    siteName: 'L2Realm',
    locale: 'ru_RU',
  },
};

export default function Page() {
  return <PricingClient />;
}
