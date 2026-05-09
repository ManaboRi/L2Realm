import type { Metadata } from 'next';
import Link from 'next/link';
import type { Article } from '@/lib/types';
import { firstParagraph, readingTime } from '@/lib/markdown';
import styles from './page.module.css';

const BACKEND = process.env.BACKEND_URL || 'http://localhost:4000';
const SITE = 'https://l2realm.ru';

export const dynamic = 'force-dynamic';

type Props = { searchParams?: Promise<{ category?: string }> };

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
    const res = await fetch(`${BACKEND}/api/articles`, { cache: 'no-store' });
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

function articleCategory(a: Article) {
  return a.category?.trim() || 'Новости';
}

function ArticleCard({ a, featured = false }: { a: Article; featured?: boolean }) {
  return (
    <Link href={`/blog/${a.slug}`} className={`${styles.articleCard} ${featured ? styles.cardFeatured : ''}`}>
      <div className={styles.cover}>
        {a.image ? (
          <img src={a.image} alt={a.title} loading="lazy" />
        ) : (
          <div className={styles.coverFallback} />
        )}
        <span className={styles.coverCategory}>{articleCategory(a)}</span>
      </div>
      <div className={styles.cardBody}>
        <div className={styles.meta}>
          <time dateTime={a.publishedAt ?? a.createdAt}>{fmtDate(a.publishedAt ?? a.createdAt)}</time>
          <span className={styles.metaDot}>·</span>
          <span>{readingTime(a.content)} мин чтения</span>
        </div>
        <h2 className={styles.cardTitle}>{a.title}</h2>
        <p className={styles.cardLead}>
          {a.description || firstParagraph(a.content, featured ? 280 : 200)}
        </p>
        <span className={styles.read}>Читать статью →</span>
      </div>
    </Link>
  );
}

export default async function BlogPage({ searchParams }: Props) {
  const articles = await fetchArticles();
  const sp = await searchParams;
  const activeCategory = sp?.category?.trim() || '';

  const categoryCounts = articles.reduce<Record<string, number>>((acc, a) => {
    const c = articleCategory(a);
    acc[c] = (acc[c] ?? 0) + 1;
    return acc;
  }, {});

  const categories = Object.entries(categoryCounts).sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0], 'ru'));
  const visible = activeCategory
    ? articles.filter(a => articleCategory(a) === activeCategory)
    : articles;

  // Первая статья — featured (full-width), остальные в две колонки
  const [featured, ...rest] = visible;

  return (
    <div className={styles.page}>
      <header className={styles.hero}>
        <p className={styles.heroEye}>◆ Блог ◆</p>
        <h1 className={styles.heroTitle}>Статьи и <em>гайды</em></h1>
        <p className={styles.heroSub}>
          Подробные обзоры серверов, гайды для игроков, новости и практические заметки по Lineage 2.
        </p>
      </header>

      {articles.length === 0 ? (
        <p className={styles.empty}>Статей пока нет. Скоро напишем — заглядывай.</p>
      ) : (
        <div className={styles.layout}>
          <main className={styles.feed}>
            {featured && <ArticleCard a={featured} featured />}
            {rest.length > 0 && (
              <div className={styles.cardsGrid}>
                {rest.map(a => <ArticleCard key={a.id} a={a} />)}
              </div>
            )}
          </main>

          <aside className={styles.sidebar}>
            <div className={styles.sideTitle}>Категории</div>
            <Link href="/blog" className={`${styles.categoryLink} ${!activeCategory ? styles.categoryActive : ''}`}>
              <span>Все статьи</span>
              <strong>{articles.length}</strong>
            </Link>
            {categories.map(([name, count]) => (
              <Link
                key={name}
                href={`/blog?category=${encodeURIComponent(name)}`}
                className={`${styles.categoryLink} ${activeCategory === name ? styles.categoryActive : ''}`}
              >
                <span>{name}</span>
                <strong>{count}</strong>
              </Link>
            ))}
          </aside>
        </div>
      )}
    </div>
  );
}
