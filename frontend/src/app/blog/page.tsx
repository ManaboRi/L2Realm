import type { Metadata } from 'next';
import Link from 'next/link';
import type { Article } from '@/lib/types';
import { firstParagraph } from '@/lib/markdown';
import styles from './page.module.css';

const BACKEND = process.env.BACKEND_URL || 'http://localhost:4000';
const SITE = 'https://l2realm.ru';

export const revalidate = 300;

export const metadata: Metadata = {
  title: 'Статьи о Lineage 2',
  description:
    'Гайды, обзоры серверов, новости и аналитика по Lineage 2 — статьи каталога L2Realm.',
  alternates: { canonical: `${SITE}/blog` },
  openGraph: {
    type: 'website',
    title: 'Блог L2Realm',
    description: 'Гайды и обзоры серверов Lineage 2 от каталога L2Realm.',
    url: `${SITE}/blog`,
    siteName: 'L2Realm',
    locale: 'ru_RU',
  },
};

async function fetchArticles(): Promise<Article[]> {
  try {
    const res = await fetch(`${BACKEND}/api/articles`, { next: { revalidate: 300 } });
    if (!res.ok) return [];
    return await res.json();
  } catch {
    return [];
  }
}

function fmtDate(s: string | null): string {
  if (!s) return '';
  return new Date(s).toLocaleDateString('ru-RU', {
    day: 'numeric', month: 'long', year: 'numeric',
  });
}

export default async function BlogPage() {
  const articles = await fetchArticles();

  return (
    <div className={styles.page}>
      <div className={styles.hero}>
        <p className={styles.heroEye}>◆ Блог ◆</p>
        <h1 className={styles.heroTitle}>Статьи и <em>гайды</em></h1>
        <p className={styles.heroSub}>
          Обзоры серверов, опыт играющих, технические заметки. Без воды.
        </p>
      </div>

      {articles.length === 0 ? (
        <p className={styles.empty}>Статей пока нет. Скоро напишем — заглядывай.</p>
      ) : (
        <ul className={styles.list}>
          {articles.map(a => (
            <li key={a.id}>
              <Link href={`/blog/${a.slug}`} className={styles.card}>
                <time className={styles.date} dateTime={a.publishedAt ?? a.createdAt}>
                  {fmtDate(a.publishedAt ?? a.createdAt)}
                </time>
                <h2 className={styles.cardTitle}>{a.title}</h2>
                <p className={styles.cardLead}>
                  {a.description || firstParagraph(a.content)}
                </p>
                <span className={styles.read}>Читать →</span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
