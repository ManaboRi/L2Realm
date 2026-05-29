import { Fragment } from 'react';
import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import type { Article, Server, ServerInstance } from '@/lib/types';
import { renderMarkdown, readingTime } from '@/lib/markdown';
import { activityMeta } from '@/lib/project-metrics';
import { isOpeningStillSoon } from '@/lib/opening';
import { ArticleSaveButton } from './ArticleSaveButton';
import styles from './page.module.css';

const BACKEND = process.env.BACKEND_URL || 'http://localhost:4000';
const SITE = 'https://l2realm.ru';

export const dynamic = 'force-dynamic';

type Props = { params: Promise<{ slug: string }> };

type SummaryItem = {
  label: string;
  value: string;
};

type TocItem = {
  title: string;
  id: string;
};

type OpeningPreview = {
  key: string;
  serverId: string;
  title: string;
  icon?: string | null;
  chronicle: string;
  rates: string;
  openedAt: string;
  isVip: boolean;
};

type ArticleContentPart =
  | { type: 'markdown'; content: string }
  | { type: 'server'; serverId: string };

type ParsedArticleContent = {
  body: string;
  summary: SummaryItem[];
  parts: ArticleContentPart[];
  embeddedServerIds: string[];
  toc: TocItem[];
};

async function fetchArticle(slug: string, countView = false): Promise<Article | null> {
  try {
    const endpoint = countView
      ? `/api/articles/${encodeURIComponent(slug)}/view`
      : `/api/articles/${encodeURIComponent(slug)}`;
    const res = await fetch(`${BACKEND}${endpoint}`, {
      cache: 'no-store',
    });
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}

async function fetchArticles(): Promise<Article[]> {
  try {
    const res = await fetch(`${BACKEND}/api/articles`, { cache: 'no-store' });
    if (!res.ok) return [];
    const data = await res.json();
    return (Array.isArray(data) ? data : (data.data ?? []))
      .sort((a: Article, b: Article) => articleTime(b) - articleTime(a));
  } catch {
    return [];
  }
}

async function fetchServer(id: string): Promise<Server | null> {
  try {
    const res = await fetch(`${BACKEND}/api/servers/${encodeURIComponent(id)}`, { cache: 'no-store' });
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}

async function fetchServerList(): Promise<Server[]> {
  try {
    const res = await fetch(`${BACKEND}/api/servers?limit=120`, { cache: 'no-store' });
    if (!res.ok) return [];
    const data = await res.json();
    return Array.isArray(data) ? data : (data.data ?? []);
  } catch {
    return [];
  }
}

async function fetchComingSoon(): Promise<OpeningPreview[]> {
  try {
    const res = await fetch(`${BACKEND}/api/servers/coming-soon`, { cache: 'no-store' });
    if (!res.ok) return [];
    const servers = (await res.json()) as Server[];
    return flattenOpenings(servers).slice(0, 3);
  } catch {
    return [];
  }
}

async function fetchRelatedArticles(article: Article): Promise<Article[]> {
  const articles = await fetchArticles();
  const linkedIds = new Set(article.serverIds ?? []);
  return articles
    .filter(candidate => candidate.slug !== article.slug)
    .map(candidate => {
      const sharedServer = (candidate.serverIds ?? []).some(id => linkedIds.has(id));
      const sameCategory = normalizeText(candidate.category) === normalizeText(article.category);
      return {
        article: candidate,
        score: (sharedServer ? 4 : 0) + (sameCategory ? 2 : 0),
      };
    })
    .sort((a, b) => b.score - a.score || articleTime(b.article) - articleTime(a.article))
    .slice(0, 3)
    .map(item => item.article);
}

function absoluteUrl(url: string | null | undefined): string | undefined {
  if (!url) return undefined;
  try {
    return new URL(url, SITE).toString();
  } catch {
    return undefined;
  }
}

function articleTime(a: Article) {
  return new Date(a.publishedAt ?? a.createdAt).getTime() || 0;
}

function fmtDate(s: string | null | undefined): string {
  if (!s) return 'Не указано';
  return new Date(s).toLocaleDateString('ru-RU', {
    day: 'numeric', month: 'long', year: 'numeric',
  });
}

function flattenOpenings(servers: Server[]): OpeningPreview[] {
  const now = Date.now();
  const result: OpeningPreview[] = [];

  for (const server of servers) {
    const instances: ServerInstance[] = Array.isArray(server.instances) ? server.instances : [];
    const futureInstances = instances.filter(instance => isOpeningStillSoon(instance.openedDate, now));
    const serverVip = server.subscription?.plan === 'VIP'
      && !!server.subscription.endDate
      && new Date(server.subscription.endDate).getTime() > now;

    if (futureInstances.length > 0) {
      for (const instance of futureInstances) {
        result.push({
          key: `${server.id}:${instance.id}`,
          serverId: server.id,
          title: instance.label ? `${server.name} ${instance.label}` : server.name,
          icon: server.icon,
          chronicle: instance.chronicle,
          rates: instance.rates,
          openedAt: instance.openedDate!,
          isVip: !!instance.soonVipUntil && new Date(instance.soonVipUntil).getTime() > now,
        });
      }
    } else if (isOpeningStillSoon(server.openedDate, now)) {
      result.push({
        key: server.id,
        serverId: server.id,
        title: server.name,
        icon: server.icon,
        chronicle: server.chronicle,
        rates: server.rates,
        openedAt: server.openedDate!,
        isVip: serverVip,
      });
    }
  }

  return result.sort((a, b) => {
    if (a.isVip !== b.isVip) return a.isVip ? -1 : 1;
    return new Date(a.openedAt).getTime() - new Date(b.openedAt).getTime();
  });
}

function normalizeText(value: string | null | undefined): string {
  return String(value ?? '')
    .toLowerCase()
    .replace(/ё/g, 'е')
    .replace(/\s+/g, ' ')
    .trim();
}

function stripMarkdown(value: string): string {
  return value
    .replace(/\*\*([^*]+?)\*\*/g, '$1')
    .replace(/\*([^*]+?)\*/g, '$1')
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
    .replace(/`([^`]+)`/g, '$1')
    .trim();
}

function parseSummaryItems(raw: string): SummaryItem[] {
  return raw
    .split('\n')
    .map(line => line.trim().replace(/^[-*]\s+/, ''))
    .filter(Boolean)
    .map(line => {
      const match = line.match(/^(.+?)(?::|=|\|)(.+)$/);
      if (!match) return null;
      return {
        label: stripMarkdown(match[1]).slice(0, 32),
        value: stripMarkdown(match[2]).slice(0, 80),
      };
    })
    .filter((item): item is SummaryItem => !!item && !!item.label && !!item.value)
    .slice(0, 6);
}

function readSummaryBlock(content: string): { body: string; summary: SummaryItem[] } {
  const match = content.match(/\[\[(?:summary|резюме)\]\]\s*\n([\s\S]*?)\n\s*\[\[\/(?:summary|резюме)\]\]/i);
  if (!match) return { body: content, summary: [] };
  return {
    body: content.replace(match[0], '\n\n').trim(),
    summary: parseSummaryItems(match[1]),
  };
}

function parseServerDirective(line: string): string | null {
  const match = line.trim().match(/^\[\[(?:server|сервер|project|проект|card|карточка)(?::|=|\s+id=)\s*([A-Za-z0-9_-]+)\]\]$/i);
  return match?.[1] ?? null;
}

function splitContentParts(content: string): { parts: ArticleContentPart[]; embeddedServerIds: string[] } {
  const parts: ArticleContentPart[] = [];
  const embeddedServerIds: string[] = [];
  const buffer: string[] = [];

  function flushMarkdown() {
    const text = buffer.join('\n').trim();
    if (text) parts.push({ type: 'markdown', content: text });
    buffer.length = 0;
  }

  for (const line of content.split('\n')) {
    const serverId = parseServerDirective(line);
    if (serverId) {
      flushMarkdown();
      parts.push({ type: 'server', serverId });
      embeddedServerIds.push(serverId);
      continue;
    }
    buffer.push(line);
  }

  flushMarkdown();
  return { parts, embeddedServerIds };
}

function headingSlug(value: string): string {
  const slug = normalizeText(stripMarkdown(value))
    .replace(/[^a-zа-я0-9]+/gi, '-')
    .replace(/^-+|-+$/g, '');
  return slug || 'section';
}

function extractToc(content: string): TocItem[] {
  const seen = new Map<string, number>();
  return content
    .split('\n')
    .map(line => line.match(/^##(?!#)\s*(.+)$/)?.[1])
    .filter((value): value is string => !!value)
    .map(value => {
      const title = stripMarkdown(value);
      const base = headingSlug(title);
      const count = seen.get(base) ?? 0;
      seen.set(base, count + 1);
      return {
        title,
        id: count > 0 ? `${base}-${count + 1}` : base,
      };
    });
}

function parseArticleContent(content: string): ParsedArticleContent {
  const { body, summary } = readSummaryBlock(content);
  const { parts, embeddedServerIds } = splitContentParts(body);
  return {
    body,
    summary,
    parts,
    embeddedServerIds,
    toc: extractToc(body),
  };
}

function typeLabel(type: string | undefined): string {
  const labels: Record<string, string> = {
    pvp: 'PvP',
    pve: 'PvE',
    'pvp-pve': 'PvP / PvE',
    gve: 'GvE',
    rvr: 'RvR',
    multiproff: 'MultiProff',
    multicraft: 'MultiCraft',
  };
  return type ? (labels[type] ?? type) : 'Не указано';
}

function serverTypeLabel(server: Server): string {
  const values = (server.type ?? []).filter(value => !['new', 'featured'].includes(value));
  if (!values.length) return 'Не указано';
  return values.map(typeLabel).slice(0, 2).join(' / ');
}

function projectActivity(server: Server): { label: string; color: string } | null {
  const meta = activityMeta(server.activityLevel);
  if (!meta.known) return null;
  return { label: meta.label, color: meta.color };
}

function serverImage(server: Server): string | null {
  return server.banner || null;
}

function uniqueValues(values: Array<string | null | undefined>): string[] {
  const seen = new Set<string>();
  const result: string[] = [];
  for (const value of values) {
    const trimmed = value?.trim();
    if (!trimmed) continue;
    const key = normalizeText(trimmed);
    if (seen.has(key)) continue;
    seen.add(key);
    result.push(trimmed);
  }
  return result;
}

function summarizeValues(values: string[], empty = 'Не указано'): string {
  if (!values.length) return empty;
  if (values.length <= 3) return values.join(', ');
  return `${values.slice(0, 3).join(', ')} +${values.length - 3}`;
}

function knownValue(value: string): string | null {
  return value && value !== 'Не указано' ? value : null;
}

function projectChronicles(server: Server): string {
  const values = uniqueValues([
    server.chronicle,
    ...(server.instances ?? []).map(instance => instance.chronicle),
  ]);
  return summarizeValues(values);
}

function projectRates(server: Server): string {
  const values = uniqueValues([
    server.rates,
    ...(server.instances ?? []).map(instance => instance.rates),
  ]);
  return summarizeValues(values);
}

function projectOpening(server: Server): string {
  const dates = uniqueValues([
    server.openedDate,
    ...(server.instances ?? []).map(instance => instance.openedDate),
  ]);
  if (dates.length > 1) return `${dates.length} запусков`;
  return fmtDate(dates[0]);
}

function buildServerSummary(server: Server | null): SummaryItem[] {
  if (!server) return [];
  const items: Array<[string, string | null]> = [
    ['Хроники', projectChronicles(server)],
    ['Рейты', projectRates(server)],
    ['Тип проекта', knownValue(serverTypeLabel(server))],
    ['Активность', projectActivity(server)?.label ?? null],
    ['Открытие', projectOpening(server)],
    ['Запусков', String(Math.max(1, server.instances?.length ?? 1))],
  ];
  return items
    .filter((item): item is [string, string] => !!item[1] && item[1] !== 'Не указано')
    .map(([label, value]) => ({ label, value }))
    .slice(0, 6);
}

function rateBucket(value: number): string {
  if (value <= 5) return 'low';
  if (value <= 49) return 'mid';
  if (value <= 100) return 'high';
  if (value <= 999) return 'ultra';
  if (value <= 9999) return 'mega';
  return 'extreme';
}

function relatedServerScore(primary: Server, candidate: Server): number {
  const sameChronicle = normalizeText(primary.chronicle) === normalizeText(candidate.chronicle);
  const sameRate = rateBucket(primary.rateNum) === rateBucket(candidate.rateNum);
  return (sameChronicle ? 5 : 0) + (sameRate ? 3 : 0) + ((candidate.totalVotes ?? 0) / 100000);
}

function pickRelatedServers(primary: Server | null, servers: Server[], linkedIds: Set<string>): Server[] {
  if (!primary) return [];
  return servers
    .filter(server => server.id !== primary.id && !linkedIds.has(server.id))
    .map(server => ({ server, score: relatedServerScore(primary, server) }))
    .filter(item => item.score >= 3)
    .sort((a, b) => b.score - a.score)
    .slice(0, 3)
    .map(item => item.server);
}

function ArticleServerCard({ server, compact = false }: { server: Server; compact?: boolean }) {
  const media = serverImage(server);
  const rating = server.ratingCount > 0 ? `${server.rating.toFixed(1)} (${server.ratingCount})` : 'Нет отзывов';
  const activity = projectActivity(server);
  const initials = (server.abbr || server.name.slice(0, 2)).toUpperCase();
  const tags = [
    projectChronicles(server),
    projectRates(server),
    knownValue(serverTypeLabel(server)),
  ].filter((tag): tag is string => !!tag);

  return (
    <section className={`${styles.serverCard} ${compact ? styles.serverCardCompact : ''}`}>
      <Link href={`/servers/${server.id}`} className={styles.serverMedia} aria-label={`Открыть ${server.name} в каталоге`}>
        {media ? <img className={styles.serverBanner} src={media} alt="" loading="lazy" /> : <span className={styles.serverMediaFallback} />}
        <span className={styles.serverIconBadge}>
          {server.icon ? <img src={server.icon} alt="" loading="lazy" /> : initials}
        </span>
      </Link>
      <div className={styles.serverInfo}>
        <div className={styles.serverLabel}>Проект из каталога</div>
        <h3>{server.name}</h3>
        <div className={styles.serverTags}>
          {tags.map(tag => <span key={tag}>{tag}</span>)}
        </div>
        {server.shortDesc && <p>{server.shortDesc}</p>}
        <div className={styles.serverStats}>
          {activity && (
            <span className={styles.serverOnlineStat}>
              <small>Активность</small>
              <strong style={{ color: activity.color }}><i aria-hidden="true" style={{ background: activity.color }} />{activity.label}</strong>
            </span>
          )}
          <span><small>Открыт</small><strong>{fmtDate(server.openedDate)}</strong></span>
          <span className={styles.serverRatingStat}><small>Рейтинг</small><strong>★ {rating}</strong></span>
        </div>
      </div>
      <div className={styles.serverActions}>
        <a href={server.url} target="_blank" rel="noopener nofollow" className={styles.serverPrimaryAction}>
          Сайт проекта
        </a>
        <Link href={`/servers/${server.id}`} className={styles.serverSecondaryAction}>
          В каталоге
        </Link>
      </div>
    </section>
  );
}

function RelatedArticleCard({ article }: { article: Article }) {
  return (
    <Link href={`/blog/${article.slug}`} className={styles.relatedCard}>
      {article.image && (
        <div className={styles.relatedThumb}>
          <img src={article.image} alt={article.title} loading="lazy" />
        </div>
      )}
      <div className={styles.relatedBody}>
        <span className={styles.relatedCategory}>{article.category || 'Новости'}</span>
        <h3 className={styles.relatedHeadline}>{article.title}</h3>
        <div className={styles.relatedMeta}>
          <time dateTime={article.publishedAt ?? article.createdAt}>
            {fmtDate(article.publishedAt ?? article.createdAt)}
          </time>
          <span>{readingTime(article.content)} мин чтения</span>
        </div>
      </div>
    </Link>
  );
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
      ...(article.updatedAt && { modifiedTime: article.updatedAt }),
    },
    twitter: {
      card: 'summary_large_image',
      title: article.title,
      description: article.description,
      images: [image],
    },
  };
}

export default async function BlogPostPage({ params }: Props) {
  const { slug } = await params;
  const article = await fetchArticle(slug, true);
  if (!article) notFound();

  const parsed = parseArticleContent(article.content);
  const requestedServerIds = Array.from(new Set([
    ...(article.serverIds ?? []),
    ...parsed.embeddedServerIds,
  ]));

  const [linkedServers, allServers, relatedArticles, openings] = await Promise.all([
    Promise.all(requestedServerIds.map(fetchServer)),
    fetchServerList(),
    fetchRelatedArticles(article),
    fetchComingSoon(),
  ]);

  const serverMap = new Map(
    linkedServers
      .filter((server): server is Server => !!server)
      .map(server => [server.id, server]),
  );
  const primaryServer = requestedServerIds.map(id => serverMap.get(id)).find(Boolean) ?? null;
  const linkedIdSet = new Set(requestedServerIds);
  const relatedServers = pickRelatedServers(primaryServer, allServers, linkedIdSet);
  const hasEmbeddedServerCard = parsed.parts.some(part => part.type === 'server');
  const articleImage = absoluteUrl(article.image);
  const publishedDate = article.publishedAt ?? article.createdAt;
  const modifiedDate = article.updatedAt ?? publishedDate;
  let headingIndex = 0;

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
  const breadcrumbSchema = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'L2Realm', item: SITE },
      { '@type': 'ListItem', position: 2, name: 'Статьи', item: `${SITE}/blog` },
      { '@type': 'ListItem', position: 3, name: article.title, item: `${SITE}/blog/${article.slug}` },
    ],
  };

  return (
    <div className={styles.page}>
      <script
        type="application/ld+json"
        // eslint-disable-next-line react/no-danger
        dangerouslySetInnerHTML={{ __html: JSON.stringify(articleSchema) }}
      />
      <script
        type="application/ld+json"
        // eslint-disable-next-line react/no-danger
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbSchema) }}
      />

      <div className={styles.shell}>
        <div className={styles.bread}>
          <Link href="/" className={styles.breadLink}>Главная</Link>
          <span className={styles.breadSep}>›</span>
          <Link href="/blog" className={styles.breadLink}>Статьи</Link>
          <span className={styles.breadSep}>›</span>
          <span>{article.title}</span>
        </div>

        <div className={styles.layout}>
          <main className={styles.main}>
            <article className={styles.article}>
              {article.image && (
                <div className={styles.banner}>
                  <img src={article.image} alt={article.title} />
                </div>
              )}
              <header className={styles.head}>
                <div className={styles.meta}>
                  <span className={styles.category}>{article.category || 'Новости'}</span>
                  <time dateTime={publishedDate}>
                    {fmtDate(publishedDate)}
                  </time>
                  <span className={styles.metaDot}>·</span>
                  <span>{readingTime(article.content)} мин чтения</span>
                  <ArticleSaveButton
                    article={{
                      slug: article.slug,
                      title: article.title,
                      description: article.description,
                      image: article.image,
                      category: article.category,
                    }}
                  />
                  <span className={styles.metaDot}>·</span>
                  <time className={styles.updatedMeta} dateTime={modifiedDate}>
                    Обновлено {fmtDate(modifiedDate)}
                  </time>
                </div>
                <h1 className={styles.title}>{article.title}</h1>
                {article.description && (
                  <p className={styles.lead}>{article.description}</p>
                )}
              </header>

              <div className={styles.body}>
                {parsed.parts.map((part, index) => {
                  if (part.type === 'server') {
                    const server = serverMap.get(part.serverId);
                    return server ? <ArticleServerCard key={`server-${part.serverId}-${index}`} server={server} /> : null;
                  }
                  return (
                    <Fragment key={`md-${index}`}>
                      {renderMarkdown(part.content, {
                        getHeadingId: (_heading, level) => (level === 2 ? parsed.toc[headingIndex++]?.id : undefined),
                      })}
                    </Fragment>
                  );
                })}
              </div>

              {primaryServer && !hasEmbeddedServerCard && (
                <section className={styles.serverShowcase}>
                  <ArticleServerCard server={primaryServer} />
                </section>
              )}

              {relatedServers.length > 0 && (
                <section className={styles.relatedServers}>
                  <div className={styles.blockHead}>
                    <h2>Также смотри</h2>
                    <Link href="/">Все серверы →</Link>
                  </div>
                  <div className={styles.serverGrid}>
                    {relatedServers.map(server => (
                      <ArticleServerCard key={server.id} server={server} compact />
                    ))}
                  </div>
                </section>
              )}

              {relatedArticles.length > 0 && (
                <aside className={styles.related}>
                  <div className={styles.blockHead}>
                    <h2>Похожие статьи</h2>
                    <Link href="/blog">Все статьи →</Link>
                  </div>
                  <div className={styles.relatedGrid}>
                    {relatedArticles.map(related => (
                      <RelatedArticleCard key={related.id} article={related} />
                    ))}
                  </div>
                </aside>
              )}

              <div className={styles.foot}>
                <Link href="/blog" className={styles.back}>← Все статьи</Link>
              </div>
            </article>
          </main>

          <aside className={styles.sidebar}>
            {parsed.toc.length > 0 && (
              <section className={styles.sideBlock}>
                <div className={styles.sideTitle}>Содержание статьи</div>
                <div className={styles.tocList}>
                  {parsed.toc.map(item => (
                    <a key={item.id} href={`#${item.id}`}>{item.title}</a>
                  ))}
                </div>
              </section>
            )}

            {serverMap.size > 0 && (
              <section className={styles.sideBlock}>
                <div className={styles.sideTitle}>Проекты в статье</div>
                <div className={styles.sideServers}>
                  {Array.from(serverMap.values()).slice(0, 4).map(server => (
                    <Link key={server.id} href={`/servers/${server.id}`} className={styles.sideServer}>
                      <span>{server.icon ? <img src={server.icon} alt="" loading="lazy" /> : server.name.slice(0, 2)}</span>
                      <strong>{server.name}</strong>
                      <small>{server.chronicle} {server.rates}</small>
                    </Link>
                  ))}
                </div>
              </section>
            )}

            <section className={styles.sideBlock}>
              <div className={styles.sideTitle}>Скоро открытие</div>
              <div className={styles.openings}>
                {openings.length === 0 ? (
                  <p className={styles.sideEmpty}>Пока нет ближайших открытий.</p>
                ) : openings.map(opening => (
                  <Link key={opening.key} href={`/servers/${opening.serverId}`} className={styles.openingItem}>
                    <span className={styles.openingIcon}>
                      {opening.icon ? <img src={opening.icon} alt="" loading="lazy" /> : opening.title.slice(0, 2)}
                    </span>
                    <span>
                      <strong>{opening.title}</strong>
                      <small>{opening.chronicle} {opening.rates}</small>
                      <em>{fmtDate(opening.openedAt)}</em>
                    </span>
                  </Link>
                ))}
              </div>
              <Link href="/coming-soon" className={styles.sideButton}>Все открытия →</Link>
            </section>
          </aside>
        </div>
      </div>
    </div>
  );
}
