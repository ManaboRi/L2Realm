import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import type { Article } from '@/lib/types';
import { renderMarkdown, readingTime } from '@/lib/markdown';
import styles from './page.module.css';

const BACKEND = process.env.BACKEND_URL || 'http://localhost:4000';
const SITE = 'https://l2realm.ru';

export const dynamic = 'force-dynamic';

type Props = { params: Promise<{ slug: string }> };

async function fetchArticle(slug: string): Promise<Article | null> {
  try {
    const res = await fetch(`${BACKEND}/api/articles/${encodeURIComponent(slug)}`, {
      cache: 'no-store',
    });
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}

async function fetchRelatedArticles(currentSlug: string): Promise<Article[]> {
  try {
    const res = await fetch(`${BACKEND}/api/articles?limit=6`, { cache: 'no-store' });
    if (!res.ok) return [];
    const data = await res.json();
    const list: Article[] = Array.isArray(data) ? data : (data.data ?? []);
    return list.filter(a => a.slug !== currentSlug).slice(0, 2);
  } catch {
    return [];
  }
}

function absoluteUrl(url: string | null | undefined): string | undefined {
  if (!url) return undefined;
  try {
    return new URL(url, SITE).toString();
  } catch {
    return undefined;
  }
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const article = await fetchArticle(slug);
  if (!article) {
    return { title: 'Статья не найдена', robots: { index: false, follow: false } };
  }
  const canonical = `${SITE}/blog/${article.slug}`;
  const image = absoluteUrl(article.image) || `${SITE}/apple-touch-icon.png`;
  return {
    title: article.title,
    description: article.description,
    alternates: { canonical },
    openGraph: {
      type: 'article',
      title: article.title,
      description: article.description,
      url: canonical,
      siteName: 'L2Realm',
      locale: 'ru_RU',
      images: [{ url: image, width: 1200, height: 630, alt: article.title }],
      ...(article.publishedAt && { publishedTime: article.publishedAt }),
    },
    twitter: {
      card: 'summary_large_image',
      title: article.title,
      description: article.description,
      images: [image],
    },
  };
}

function fmtDate(s: string | null): string {
  if (!s) return '';
  return new Date(s).toLocaleDateString('ru-RU', {
    day: 'numeric', month: 'long', year: 'numeric',
  });
}

export default async function BlogPostPage({ params }: Props) {
  const { slug } = await params;
  const article = await fetchArticle(slug);
  if (!article) notFound();

  // Параллельно подгружаем 2 другие статьи для блока «Читать ещё».
  const related = await fetchRelatedArticles(article.slug);
  const articleImage = absoluteUrl(article.image);

  // Article schema (JSON-LD) — даёт Google/Яндексу понять что это статья,
  // подтягивает картинку, дату публикации, автора. Может дать rich snippet.
  const articleSchema = {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: article.title,
    description: article.description,
    image: articleImage ? [articleImage] : undefined,
    datePublished: article.publishedAt ?? article.createdAt,
    dateModified: article.updatedAt ?? article.publishedAt ?? article.createdAt,
    author: { '@type': 'Organization', name: 'L2Realm' },
    publisher: {
      '@type': 'Organization',
      name: 'L2Realm',
      logo: { '@type': 'ImageObject', url: `${SITE}/icon.svg` },
    },
    mainEntityOfPage: { '@type': 'WebPage', '@id': `${SITE}/blog/${article.slug}` },
  };

  return (
    <div className={styles.page}>
      <script
        type="application/ld+json"
        // eslint-disable-next-line react/no-danger
        dangerouslySetInnerHTML={{ __html: JSON.stringify(articleSchema) }}
      />

      <div className={styles.bread}>
        <Link href="/" className={styles.breadLink}>Главная</Link>
        <span className={styles.breadSep}>›</span>
        <Link href="/blog" className={styles.breadLink}>Блог</Link>
        <span className={styles.breadSep}>›</span>
        <span>{article.title}</span>
      </div>

      <article className={styles.article}>
        {article.image && (
          <div className={styles.banner}>
            <img src={article.image} alt={article.title} />
          </div>
        )}
        <header className={styles.head}>
          <h1 className={styles.title}>{article.title}</h1>
          <div className={styles.meta}>
            <span className={styles.category}>{article.category || 'Новости'}</span>
            <time dateTime={article.publishedAt ?? article.createdAt}>
              {fmtDate(article.publishedAt ?? article.createdAt)}
            </time>
            <span className={styles.metaDot}>·</span>
            <span>{readingTime(article.content)} мин чтения</span>
          </div>
          {article.description && (
            <p className={styles.lead}>{article.description}</p>
          )}
        </header>

        <div className={styles.body}>
          {renderMarkdown(article.content)}
        </div>

        {related.length > 0 && (
          <aside className={styles.related}>
            <h2 className={styles.relatedTitle}>Читать ещё</h2>
            <div className={styles.relatedGrid}>
              {related.map(r => (
                <Link key={r.id} href={`/blog/${r.slug}`} className={styles.relatedCard}>
                  {r.image && (
                    <div className={styles.relatedThumb}>
                      <img src={r.image} alt={r.title} loading="lazy" />
                    </div>
                  )}
                  <div className={styles.relatedBody}>
                    <time className={styles.relatedDate} dateTime={r.publishedAt ?? r.createdAt}>
                      {fmtDate(r.publishedAt ?? r.createdAt)}
                    </time>
                    <h3 className={styles.relatedHeadline}>{r.title}</h3>
                    {r.description && <p className={styles.relatedDesc}>{r.description}</p>}
                  </div>
                </Link>
              ))}
            </div>
          </aside>
        )}

        <div className={styles.foot}>
          <Link href="/blog" className={styles.back}>← Все статьи</Link>
        </div>
      </article>
    </div>
  );
}
