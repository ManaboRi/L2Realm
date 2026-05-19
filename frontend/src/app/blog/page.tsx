import type { Metadata } from 'next';
import Link from 'next/link';
import type { Article } from '@/lib/types';
import { firstParagraph, readingTime } from '@/lib/markdown';
import styles from './page.module.css';

const BACKEND = process.env.BACKEND_URL || 'http://localhost:4000';
const SITE = 'https://l2realm.ru';
const PAGE_SIZE = 15;

export const dynamic = 'force-dynamic';

type Props = { searchParams?: Promise<{ category?: string; page?: string; q?: string }> };

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

function articleViews(a: Article): number {
  const raw = (a as Article & { views?: number; viewCount?: number }).views
    ?? (a as Article & { views?: number; viewCount?: number }).viewCount
    ?? 0;
  return Number.isFinite(raw) ? raw : 0;
}

function formatMetric(value: number): string {
  if (value >= 1000) {
    const short = Math.round(value / 100) / 10;
    return `${short.toLocaleString('ru-RU')}k`;
  }
  return value.toLocaleString('ru-RU');
}

function buildBlogHref(params: { category?: string; q?: string; page?: number }) {
  const qs = new URLSearchParams();
  if (params.category) qs.set('category', params.category);
  if (params.q) qs.set('q', params.q);
  if (params.page && params.page > 1) qs.set('page', String(params.page));
  const query = qs.toString();
  return `/blog${query ? `?${query}` : ''}`;
}

function ArticleCard({ a, large = false }: { a: Article; large?: boolean }) {
  return (
    <Link href={`/blog/${a.slug}`} className={`${styles.articleCard} ${large ? styles.articleLarge : ''}`}>
      <div className={styles.cover}>
        {a.image ? (
          <img src={a.image} alt={a.title} loading="lazy" />
        ) : (
          <div className={styles.coverFallback} />
        )}
        <span className={styles.coverShade} />
        <span className={styles.coverCategory}>{articleCategory(a)}</span>
      </div>
      <div className={styles.cardBody}>
        <div className={styles.meta}>
          <time dateTime={a.publishedAt ?? a.createdAt}>{fmtDate(a.publishedAt ?? a.createdAt)}</time>
          <span>•</span>
          <span>{readingTime(a.content)} мин чтения</span>
        </div>
        <h2 className={styles.cardTitle}>{a.title}</h2>
        <p className={styles.cardLead}>
          {a.description || firstParagraph(a.content, large ? 230 : 170)}
        </p>
        <div className={styles.cardStats}>
          <span title="Просмотры">◉ {formatMetric(articleViews(a))}</span>
          <span title="Комментарии">□ 0</span>
        </div>
      </div>
    </Link>
  );
}

function SidebarArticle({ a }: { a: Article }) {
  return (
    <Link href={`/blog/${a.slug}`} className={styles.sideArticle}>
      <span className={styles.sideThumb}>
        {a.image ? <img src={a.image} alt="" loading="lazy" /> : <span />}
      </span>
      <span>
        <strong>{a.title}</strong>
        <small>◉ {formatMetric(articleViews(a))}</small>
      </span>
    </Link>
  );
}

export default async function BlogPage({ searchParams }: Props) {
  const articles = await fetchArticles();
  const sp = await searchParams;
  const activeCategory = sp?.category?.trim() || '';
  const q = sp?.q?.trim() || '';
  const currentPage = Math.max(1, Number(sp?.page ?? 1) || 1);

  const categoryCounts = articles.reduce<Record<string, number>>((acc, a) => {
    const c = articleCategory(a);
    acc[c] = (acc[c] ?? 0) + 1;
    return acc;
  }, {});

  const categories = Object.entries(categoryCounts).sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0], 'ru'));
  const searched = q
    ? articles.filter(a => [a.title, a.description, articleCategory(a)].join(' ').toLowerCase().includes(q.toLowerCase()))
    : articles;
  const visible = activeCategory
    ? searched.filter(a => articleCategory(a) === activeCategory)
    : searched;

  const pages = Math.max(1, Math.ceil(visible.length / PAGE_SIZE));
  const safePage = Math.min(currentPage, pages);
  const pageArticles = visible.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);
  const latest = articles.slice(0, 5);

  return (
    <main className={styles.page}>
      <section className={styles.hero}>
        <div className={styles.heroCopy}>
          <p className={styles.heroEye}>◆ Блог L2Realm</p>
          <h1>Статьи и <span>гайды</span></h1>
          <p>
            Подробные обзоры серверов, гайды для игроков, новости и практические заметки по Lineage 2.
          </p>
        </div>

        <form className={styles.searchBox} action="/blog">
          {activeCategory && <input type="hidden" name="category" value={activeCategory} />}
          <input name="q" defaultValue={q} placeholder="Поиск по статьям..." />
          <button type="submit" aria-label="Найти статьи">⌕</button>
        </form>
      </section>

      {articles.length === 0 ? (
        <p className={styles.empty}>Статей пока нет. Скоро напишем — заглядывай.</p>
      ) : (
        <div className={styles.layout}>
          <section className={styles.feed}>
            {pageArticles.length === 0 ? (
              <div className={styles.empty}>По выбранным параметрам статей не найдено.</div>
            ) : (
              <div className={styles.cardsGrid}>
                {pageArticles.map((a, index) => <ArticleCard key={a.id} a={a} large={index < 2} />)}
              </div>
            )}

            {pages > 1 && (
              <nav className={styles.pagination} aria-label="Страницы статей">
                {Array.from({ length: pages }, (_, i) => i + 1).map(page => (
                  <Link
                    key={page}
                    href={buildBlogHref({ category: activeCategory, q, page })}
                    className={`${styles.pageLink} ${page === safePage ? styles.pageLinkActive : ''}`}
                  >
                    {page}
                  </Link>
                ))}
              </nav>
            )}
          </section>

          <aside className={styles.sidebar}>
            <section className={styles.sideBlock}>
              <div className={styles.sideTitle}>Категории</div>
              <Link href={buildBlogHref({ q })} className={`${styles.categoryLink} ${!activeCategory ? styles.categoryActive : ''}`}>
                <span>Все статьи</span>
                <strong>{articles.length}</strong>
              </Link>
              {categories.map(([name, count]) => (
                <Link
                  key={name}
                  href={buildBlogHref({ category: name, q })}
                  className={`${styles.categoryLink} ${activeCategory === name ? styles.categoryActive : ''}`}
                >
                  <span>{name}</span>
                  <strong>{count}</strong>
                </Link>
              ))}
            </section>

            <section className={styles.sideBlock}>
              <div className={styles.sideTitle}>Свежие статьи</div>
              <div className={styles.sideArticles}>
                {latest.map(a => <SidebarArticle key={a.id} a={a} />)}
              </div>
            </section>
          </aside>
        </div>
      )}
    </main>
  );
}
