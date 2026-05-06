import type { Metadata } from 'next';
import type { Server, ServersResponse } from '@/lib/types';
import { QuizClient } from './QuizClient';
import styles from './page.module.css';

const BACKEND = process.env.BACKEND_URL || 'http://localhost:4000';
const SITE = 'https://l2realm.ru';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Какой сервер Lineage 2 тебе подойдёт — Квиз | L2Realm',
  description: '4 вопроса — и ты знаешь какой сервер Lineage 2 тебе подойдёт. Персональные рекомендации из каталога l2realm.ru',
  alternates: { canonical: `${SITE}/quiz` },
  openGraph: {
    type: 'website',
    title: 'Какой сервер Lineage 2 тебе подойдёт — Квиз | L2Realm',
    description: '4 вопроса — и ты знаешь какой сервер Lineage 2 тебе подойдёт. Персональные рекомендации из каталога l2realm.ru',
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
        <h1 className={styles.title}>Какой сервер Lineage 2 тебе подойдёт</h1>
        <p className={styles.lead}>
          Ответьте на 4 вопроса: версия Lineage 2, темп прокачки, донат и стадия проекта.
          Квиз подберёт точные рекомендации из каталога L2Realm без сложных ручных фильтров.
        </p>
      </section>

      <QuizClient servers={servers} />
    </div>
  );
}
