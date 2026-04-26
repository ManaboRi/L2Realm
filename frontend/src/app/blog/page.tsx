import type { Metadata } from 'next';
import Link from 'next/link';
import type { Article } from '@/lib/types';
import { firstParagraph, readingTime } from '@/lib/markdown';
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

function ArticleMeta({ a }: { a: Article }) {
  return (
    <div className={styles.meta}>
      <time dateTime={a.publishedAt ?? a.createdAt}>{fmtDate(a.publishedAt ?? a.createdAt)}</time>
      <span className={styles.metaDot}>·</span>
      <span>{readingTime(a.content)} мин чтения</span>
    </div>
  );
}

export default async function BlogPage() {
  const articles = await fetchArticles();

  const [featured, ...rest] = articles;

  return (
    <div className={styles.page}>
      <header className={styles.hero}>
        <p className={styles.heroEye}>◆ Блог ◆</p>
        <h1 className={styles.heroTitle}>Статьи и <em>гайды</em></h1>
        <p className={styles.heroSub}>
          Обзоры серверов, опыт играющих, технические заметки. Без воды.
        </p>
      </header>

      {!featured ? (
        <p className={styles.empty}>Статей пока нет. Скоро напишем — заглядывай.</p>
      ) : (
        <div className={styles.grid}>
          {/* Главная статья — на всю ширину */}
          <Link href={`/blog/${featured.slug}`} className={`${styles.card} ${styles.cardFeatured}`}>
            <ArticleMeta a={featured} />
            <h2 className={styles.cardTitle}>{featured.title}</h2>
            <p className={styles.cardLead}>
              {featured.description || firstParagraph(featured.content, 280)}
            </p>
            <span className={styles.read}>Читать →</span>
          </Link>

          {/* Остальные — в две колонки */}
          {rest.length > 0 && (
            <div className={styles.cards}>
              {rest.map(a => (
                <Link key={a.id} href={`/blog/${a.slug}`} className={styles.card}>
                  <ArticleMeta a={a} />
                  <h3 className={styles.cardTitle}>{a.title}</h3>
                  <p className={styles.cardLead}>
                    {a.description || firstParagraph(a.content, 200)}
                  </p>
                  <span className={styles.read}>Читать →</span>
                </Link>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
