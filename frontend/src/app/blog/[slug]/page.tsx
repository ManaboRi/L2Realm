import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import type { Article } from '@/lib/types';
import { renderMarkdown, readingTime } from '@/lib/markdown';
import styles from './page.module.css';

const BACKEND = process.env.BACKEND_URL || 'http://localhost:4000';
const SITE = 'https://l2realm.ru';

export const revalidate = 300;

type Props = { params: Promise<{ slug: string }> };

async function fetchArticle(slug: string): Promise<Article | null> {
  try {
    const res = await fetch(`${BACKEND}/api/articles/${encodeURIComponent(slug)}`, {
      next: { revalidate: 300 },
    });
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const article = await fetchArticle(slug);
  if (!article) {
    return { title: 'Статья не найдена', robots: { index: false, follow: false } };
  }
  const canonical = `${SITE}/blog/${article.slug}`;
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
      ...(article.publishedAt && { publishedTime: article.publishedAt }),
    },
    twitter: {
      card: 'summary',
      title: article.title,
      description: article.description,
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

  return (
    <div className={styles.page}>
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

        <div className={styles.foot}>
          <Link href="/blog" className={styles.back}>← Все статьи</Link>
        </div>
      </article>
    </div>
  );
}
