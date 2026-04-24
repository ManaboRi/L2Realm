import type { Metadata } from 'next';
import { ComingSoonClient } from './ComingSoonClient';

const SITE = 'https://l2realm.ru';

export const metadata: Metadata = {
  title: 'Скоро открытие — новые сервера Lineage 2',
  description:
    'Анонс открытия приватных серверов Lineage 2: дата запуска, хроника, рейты. Узнавай первым о старте новых проектов на L2Realm.',
  alternates: { canonical: `${SITE}/coming-soon` },
  openGraph: {
    type: 'website',
    title: 'Скоро открытие — L2Realm',
    description:
      'Список анонсированных серверов Lineage 2 с датой открытия. Новые проекты — хроники, рейты, анонсы.',
    url: `${SITE}/coming-soon`,
    siteName: 'L2Realm',
    locale: 'ru_RU',
  },
};

export default function Page() {
  return <ComingSoonClient />;
}
