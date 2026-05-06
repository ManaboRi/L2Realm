import type { Metadata } from 'next';
import type { Server, ServersResponse } from '@/lib/types';
import { QuizClient } from './QuizClient';
import styles from './page.module.css';

const BACKEND = process.env.BACKEND_URL || 'http://localhost:4000';
const SITE = 'https://l2realm.ru';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Квиз: как выбрать сервер Lineage 2 за 5 вопросов',
  description: 'Пошаговый подбор сервера Lineage 2 по хронике, рейтам, PvP/PvE-фокусу, донату и стадии открытия.',
  alternates: { canonical: `${SITE}/quiz` },
  openGraph: {
    type: 'website',
    title: 'Квиз: как выбрать сервер Lineage 2 за 5 вопросов',
    description: 'Ответьте на 5 вопросов и получите до 3 подходящих серверов Lineage 2 из каталога L2Realm.',
    url: `${SITE}/quiz`,
    siteName: 'L2Realm',
    locale: 'ru_RU',
  },
};

async function fetchServers(): Promise<Server[]> {
  try {
    const res = await fetch(`${BACKEND}/api/servers?limit=500`, { cache: 'no-store' });
    if (!res.ok) return [];
    const data = (await res.json()) as ServersResponse;
    return data.data;
  } catch {
    return [];
  }
}

export default async function QuizPage() {
  const servers = await fetchServers();

  return (
    <div className={styles.page}>
      <section className={styles.hero}>
        <p className={styles.eyebrow}>Подбор сервера</p>
        <h1 className={styles.title}>Как выбрать сервер Lineage 2 за 5 вопросов</h1>
        <p className={styles.lead}>
          Ответьте на короткий опрос: хроника, рейты, PvP/PvE, донат и стадия проекта.
          Квиз не отсекает серверы жестко, а считает совпадения по скорингу и показывает самые близкие варианты.
        </p>
      </section>

      <QuizClient servers={servers} />
    </div>
  );
}
