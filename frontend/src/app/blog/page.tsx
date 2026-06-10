import type { CSSProperties } from 'react';
import type { Metadata } from 'next';
import Link from 'next/link';
import type { Article, Server, ServerInstance } from '@/lib/types';
import { firstParagraph, readingTime } from '@/lib/markdown';
import { isOpeningStillSoon } from '@/lib/opening';
import styles from './page.module.css';

const BACKEND = process.env.BACKEND_URL || 'http://localhost:4000';
const SITE = 'https://l2realm.ru';
const PAGE_SIZE = 5;

export const dynamic = 'force-dynamic';

type Props = { searchParams?: Promise<{ category?: string; page?: string; q?: string }> };

type CategoryConfig = {
  label: string;
  aliases: string[];
  color: string;
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

type ArticleBadge = {
  src: string;
  label: string;
  kind: 'server' | 'ncsoft' | 'fourgame';
};

const CATEGORY_CONFIGS: CategoryConfig[] = [
  { label: 'Обзоры серверов', aliases: ['обзор', 'обзоры', 'обзор серверов', 'обзоры серверов', 'серверы', 'сервера'], color: '#58aef7' },
  { label: 'Гайды', aliases: ['гайд', 'гайды'], color: '#56d178' },
  { label: 'Новости', aliases: ['новости', 'новости lineage 2'], color: '#6f8dff' },
  { label: 'Патчи и обновления', aliases: ['патчи', 'патчи и обновления', 'обновления'], color: '#d56ee6' },
  { label: 'Корейские новости', aliases: ['корейские новости', 'корея', 'korea'], color: '#f2a044' },
  { label: 'Скоро открытие', aliases: ['скоро открытие'], color: '#d2ab52' },
];

const REVIEW_CATEGORY = 'Обзоры серверов';
const OPENING_CATEGORY = 'Скоро открытие';
const BLOG_TABS = [
  { label: 'Все статьи', category: undefined },
  { label: 'Обзоры серверов', category: REVIEW_CATEGORY },
  { label: 'Новости', category: 'Новости' },
  { label: 'Открытия', category: OPENING_CATEGORY },
] as const;

export const metadata: Metadata = {
  title: 'Блог L2Realm — статьи, обзоры и гайды Lineage 2',
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
    const data = await res.json();
    return (Array.isArray(data) ? data : []).sort((a, b) => articleTime(b) - articleTime(a));
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

async function fetchTopVoteServers(): Promise<Server[]> {
  try {
    const res = await fetch(`${BACKEND}/api/servers?page=1&limit=100&compact=true`, { cache: 'no-store' });
    if (!res.ok) return [];
    const data = (await res.json()) as Server[] | { data?: Server[] };
    const servers = Array.isArray(data) ? data : (data.data ?? []);
    return selectWeeklyRailServers(servers);
  } catch {
    return [];
  }
}

async function fetchArticleServers(articles: Article[]): Promise<Map<string, Server>> {
  const ids = Array.from(new Set(articles.flatMap(article => article.serverIds ?? [])));
  const servers = await Promise.all(ids.map(async id => {
    try {
      const res = await fetch(`${BACKEND}/api/servers/${encodeURIComponent(id)}`, { cache: 'no-store' });
      if (!res.ok) return null;
      return await res.json() as Server;
    } catch {
      return null;
    }
  }));
  return new Map(
    servers
      .filter((server): server is Server => !!server)
      .map(server => [server.id, server]),
  );
}

function normalizeCategory(value: string) {
  return value
    .toLowerCase()
    .replace(/ё/g, 'е')
    .replace(/\s+/g, ' ')
    .trim();
}

function articleCategory(a: Article) {
  return a.category?.trim() || 'Новости';
}

function categoryConfigFor(value: string): CategoryConfig | null {
  const normalized = normalizeCategory(value);
  return CATEGORY_CONFIGS.find(config =>
    normalizeCategory(config.label) === normalized ||
    config.aliases.some(alias => normalizeCategory(alias) === normalized),
  ) ?? null;
}

function categoryMatches(a: Article, selected: string) {
  if (!selected) return true;
  if (normalizeCategory(selected) === normalizeCategory(OPENING_CATEGORY)) {
    return normalizeCategory(articleCategory(a)) === normalizeCategory(OPENING_CATEGORY);
  }
  const articleValue = articleCategory(a);
  const selectedConfig = categoryConfigFor(selected);
  if (selectedConfig) {
    const articleConfig = categoryConfigFor(articleValue);
    return articleConfig?.label === selectedConfig.label;
  }
  return normalizeCategory(articleValue) === normalizeCategory(selected);
}

function articleTime(a: Article) {
  return new Date(a.publishedAt ?? a.createdAt).getTime() || 0;
}

function fmtDate(s: string | null): string {
  if (!s) return '';
  return new Date(s).toLocaleDateString('ru-RU', {
    day: 'numeric', month: 'long', year: 'numeric',
  }).replace(/\s?г\.$/, '');
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
    return `${short.toLocaleString('ru-RU')}K`;
  }
  return value.toLocaleString('ru-RU');
}

function weeklyVoteCount(server: Server): number {
  return Math.max(0, Number(server.weeklyVotes ?? 0));
}

function selectWeeklyRailServers(servers: Server[]): Server[] {
  const ranked = [...servers]
    .filter(server => weeklyVoteCount(server) > 0)
    .sort((left, right) => weeklyVoteCount(right) - weeklyVoteCount(left))
    .slice(0, 5);

  if (ranked.length > 0) return ranked;
  return stableShuffle(servers, weekSalt()).slice(0, 5);
}

function weekSalt() {
  const now = new Date();
  const yearStart = new Date(Date.UTC(now.getUTCFullYear(), 0, 1));
  const week = Math.ceil((((Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()) - yearStart.getTime()) / 86_400_000) + 1) / 7);
  return `${now.getUTCFullYear()}-${week}`;
}

function stableShuffle<T extends { id: string }>(items: T[], salt: string): T[] {
  return [...items].sort((left, right) => stableHash(`${salt}:${left.id}`) - stableHash(`${salt}:${right.id}`));
}

function stableHash(value: string): number {
  let hash = 2166136261;
  for (let i = 0; i < value.length; i++) {
    hash ^= value.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

function buildBlogHref(params: { category?: string; q?: string; page?: number }) {
  const qs = new URLSearchParams();
  if (params.category) qs.set('category', params.category);
  if (params.q) qs.set('q', params.q);
  if (params.page && params.page > 1) qs.set('page', String(params.page));
  const query = qs.toString();
  return `/blog${query ? `?${query}` : ''}`;
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

function categoryStyle(category: string): CSSProperties {
  const config = categoryConfigFor(category);
  return { '--cat-color': config?.color ?? '#d2ab52' } as CSSProperties;
}

function articleBadge(article: Article, serverMap: Map<string, Server>): ArticleBadge | null {
  const category = normalizeCategory(articleCategory(article));
  if (category.includes('корейск') || category.includes('ncsoft') || category.includes('нцсофт')) {
    return { src: '/images/article-source-ncsoft.png', label: 'NCSOFT', kind: 'ncsoft' };
  }
  if (category.includes('фогейм') || category.includes('форгейм') || category.includes('4game')) {
    return { src: '/images/article-source-4game.png', label: '4GAME', kind: 'fourgame' };
  }
  const server = (article.serverIds ?? []).map(id => serverMap.get(id)).find(item => !!item?.icon);
  return server?.icon
    ? { src: server.icon, label: server.name, kind: 'server' }
    : null;
}

function ArticleStats({ article, compact = false }: { article: Article; compact?: boolean }) {
  return (
    <span className={`${styles.stats} ${compact ? styles.statsCompact : ''}`}>
      <span title="Время чтения"><i className={`${styles.statIcon} ${styles.statClock}`} aria-hidden="true" />{readingTime(article.content)} мин</span>
      <span title="Просмотры"><i className={`${styles.statIcon} ${styles.statEye}`} aria-hidden="true" />{formatMetric(articleViews(article))}</span>
    </span>
  );
}

function BlogTabs({ activeCategory, q }: { activeCategory: string; q: string }) {
  return (
    <div className={styles.listHead}>
      <h2><span>◆</span>Последние статьи</h2>
      <nav className={styles.articleTabs} aria-label="Категории статей">
        {BLOG_TABS.map(tab => {
          const isActive = tab.category
            ? normalizeCategory(activeCategory) === normalizeCategory(tab.category)
            : !activeCategory;
          return (
            <Link
              key={tab.label}
              href={buildBlogHref({ category: tab.category, q })}
              className={`${styles.articleTab} ${isActive ? styles.articleTabActive : ''}`}
            >
              {tab.label}
            </Link>
          );
        })}
      </nav>
    </div>
  );
}

function ArticleListItem({ article, badge }: { article: Article; badge: ArticleBadge | null }) {
  const badgeClass = badge?.kind === 'ncsoft'
    ? styles.articleSourceNcsoft
    : badge?.kind === 'fourgame'
      ? styles.articleSourceFourgame
      : '';
  const description = article.description?.trim() || firstParagraph(article.content, 175);

  return (
    <Link href={`/blog/${article.slug}`} className={styles.articleListItem}>
      <span className={styles.listCover}>
        {article.image ? <img src={article.image} alt="" loading="lazy" /> : <span className={styles.coverFallback} />}
        {badge && (
          <span className={`${styles.listSourceBadge} ${badgeClass}`} title={badge.label}>
            <img src={badge.src} alt="" loading="lazy" />
          </span>
        )}
      </span>
      <span className={styles.listBody}>
        <span className={styles.listMetaTop}>
          <span className={styles.categoryBadge} style={categoryStyle(articleCategory(article))}>{articleCategory(article)}</span>
          <time dateTime={article.publishedAt ?? article.createdAt}>{fmtDate(article.publishedAt ?? article.createdAt)}</time>
        </span>
        <strong>{article.title}</strong>
        <span className={styles.listDescription}>{description}</span>
        <ArticleStats article={article} compact />
      </span>
      <span className={styles.readMore}>Читать<i aria-hidden="true" /></span>
    </Link>
  );
}

function SidebarArticle({ article }: { article: Article }) {
  return (
    <Link href={`/blog/${article.slug}`} className={styles.sideArticle}>
      <span className={styles.sideThumb}>
        {article.image ? <img src={article.image} alt="" loading="lazy" /> : <span />}
      </span>
      <span>
        <strong>{article.title}</strong>
        <small>{formatMetric(articleViews(article))} просмотров</small>
      </span>
    </Link>
  );
}

function SidebarTopVotes({ servers }: { servers: Server[] }) {
  const hasWeeklyVotes = servers.some(server => weeklyVoteCount(server) > 0);

  return (
    <div className={styles.voteList}>
      {servers.length > 0 ? servers.map((server, index) => (
        <Link key={server.id} href={`/servers/${server.id}`} className={styles.voteItem}>
          <span className={styles.voteRank}>{index + 1}</span>
          <span className={styles.voteIcon}>
            {server.icon ? <img src={server.icon} alt="" loading="lazy" /> : (server.abbr || server.name).slice(0, 2)}
          </span>
          <span className={styles.voteText}>
            <strong>{server.name}</strong>
            <small>{server.chronicle}</small>
          </span>
          <span className={styles.voteCount}>{hasWeeklyVotes ? `+ ${weeklyVoteCount(server).toLocaleString('ru-RU')}` : '→'}</span>
        </Link>
      )) : (
        <span className={styles.sideEmpty}>Голоса появятся после первых голосований на этой неделе.</span>
      )}
    </div>
  );
}

function Pagination({ pages, currentPage, category, q }: { pages: number; currentPage: number; category: string; q: string }) {
  if (pages <= 1) return null;
  return (
    <nav className={styles.pagination} aria-label="Страницы статей">
      {Array.from({ length: pages }, (_, i) => i + 1).map(page => (
        <Link
          key={page}
          href={buildBlogHref({ category, q, page })}
          className={`${styles.pageLink} ${page === currentPage ? styles.pageLinkActive : ''}`}
        >
          {page}
        </Link>
      ))}
    </nav>
  );
}

export default async function BlogPage({ searchParams }: Props) {
  const [articles, openings, topVotes] = await Promise.all([
    fetchArticles(),
    fetchComingSoon(),
    fetchTopVoteServers(),
  ]);
  const articleServers = await fetchArticleServers(articles);
  const sp = await searchParams;
  const activeCategory = sp?.category?.trim() || '';
  const q = sp?.q?.trim() || '';
  const currentPage = Math.max(1, Number(sp?.page ?? 1) || 1);

  const searched = q
    ? articles.filter(a => [a.title, a.description, articleCategory(a), firstParagraph(a.content, 120)].join(' ').toLowerCase().includes(q.toLowerCase()))
    : articles;
  const visible = activeCategory
    ? searched.filter(a => categoryMatches(a, activeCategory))
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
          <h1>Блог <span>L2Realm</span></h1>
          <p>Обзоры серверов, гайды для игроков, новости и полезные материалы по Lineage 2.</p>
        </div>

        <form className={styles.searchBox} action="/blog">
          {activeCategory && <input type="hidden" name="category" value={activeCategory} />}
          <input name="q" defaultValue={q} placeholder="Поиск по статьям..." />
          <button type="submit" aria-label="Найти статьи">⌕</button>
        </form>
      </section>

      {articles.length === 0 ? (
        <div className={styles.empty}>
          <svg className={styles.emptyIcon} viewBox="0 0 24 24" aria-hidden="true">
            <path d="M5 3h11l3 3v15H5V3Z" />
            <path d="M15 3v4h4" />
            <path d="M8 11h8M8 15h8M8 8h3" />
          </svg>
          <strong>Статей пока нет</strong>
          <span>Скоро напишем обзоры серверов и гайды — заглядывай.</span>
        </div>
      ) : (
        <div className={styles.layout}>
          <section className={styles.feed}>
            <section className={styles.listPanel}>
              <BlogTabs activeCategory={activeCategory} q={q} />
              {pageArticles.length === 0 ? (
                <div className={styles.emptyInline}>По выбранным параметрам статей не найдено.</div>
              ) : (
                <div className={styles.articleList}>
                  {pageArticles.map(article => (
                    <ArticleListItem key={article.id} article={article} badge={articleBadge(article, articleServers)} />
                  ))}
                </div>
              )}
              <Pagination pages={pages} currentPage={safePage} category={activeCategory} q={q} />
            </section>
          </section>

          <aside className={styles.sidebar}>
            <section className={styles.sideBlock}>
              <div className={styles.sideTitle}>Скоро открытие</div>
              <div className={styles.openings}>
                {openings.length === 0 ? (
                  <p className={styles.sideEmpty}>Пока нет ближайших открытий.</p>
                ) : openings.map(opening => (
                  <Link key={opening.key} href={`/servers/${opening.serverId}`} className={styles.openingItem}>
                    <span className={styles.openingIcon}>{opening.icon ? <img src={opening.icon} alt="" loading="lazy" /> : opening.title.slice(0, 2)}</span>
                    <span>
                      <strong>{opening.title}</strong>
                      <small>{opening.chronicle} {opening.rates}</small>
                      <em>{fmtDate(opening.openedAt)}</em>
                    </span>
                  </Link>
                ))}
              </div>
              <Link href="/coming-soon" className={styles.sideButton}>Все открытия</Link>
            </section>

            <section className={styles.sideBlock}>
              <div className={styles.sideTitle}>Топ голосов за неделю</div>
              <SidebarTopVotes servers={topVotes} />
            </section>

            <section className={styles.sideBlock}>
              <div className={styles.sideTitle}>Свежие статьи</div>
              <div className={styles.sideArticles}>
                {latest.map(article => <SidebarArticle key={article.id} article={article} />)}
              </div>
            </section>
          </aside>
        </div>
      )}
    </main>
  );
}
