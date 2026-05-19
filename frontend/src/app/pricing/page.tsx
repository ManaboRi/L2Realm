import type { Metadata } from 'next';
import { PricingClient } from './PricingClient';

const SITE = 'https://l2realm.ru';

export const metadata: Metadata = {
  title: 'Тарифы L2Realm: VIP, Буст и Скоро открытие',
  description:
    'Тарифы продвижения серверов Lineage 2 в каталоге L2Realm: бесплатное размещение, VIP 5000 ₽, Буст 500 ₽, анонс Скоро открытие 500 ₽ и VIP в Скоро открытие 2000 ₽.',
  alternates: { canonical: `${SITE}/pricing` },
  openGraph: {
    type: 'website',
    title: 'Тарифы и продвижение — L2Realm',
    description:
      'Бесплатное размещение сервера, VIP-блок, Буст, платный анонс Скоро открытие и VIP-выделение будущего запуска.',
    url: `${SITE}/pricing`,
    siteName: 'L2Realm',
    locale: 'ru_RU',
  },
};

export default function Page() {
  return <PricingClient />;
}
