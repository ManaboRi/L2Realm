'use client';
import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { api } from '@/lib/api';
import { useAuth } from '@/context/AuthContext';
import { AuthModal } from '@/components/AuthModal';
import { isOpeningStillSoon } from '@/lib/opening';
import type { Article, Server, Review, VoteStatus, VoteSummary } from '@/lib/types';
import { SERVER_TYPES } from '@/lib/types';
import {
  formatOnline,
  instanceOnlineLast24Hours,
  instanceOnlineIsEstimated,
  instanceOnlineValue,
  onlineChartPath,
  onlineSeries,
  serverOnlineDisclosure,
  serverOnlineIsEstimated,
  serverOnlineHistorySeries,
  serverOnlineValue,
  type OnlineRange,
} from '@/lib/online';
import {
  currentProjectWorlds,
  formatTraffic,
  formatTrafficPeriod,
  historicalProjectWorlds,
  nextProjectOpening,
  projectOpeningCount,
  projectTrafficHistory,
  projectWorldCount,
  worldLifecycle,
  worldLifecycleLabel,
} from '@/lib/project-metrics';
import styles from './page.module.css';

const typeLabels = new Map(SERVER_TYPES.map(t => [t.v, t.l]));

function relativeOpened(s?: string | null): string {
  if (!s) return '—';
  const days = Math.floor((Date.now() - new Date(s).getTime()) / 86400000);
  if (days < 0) {
    const u = -days;
    if (u === 1) return 'Открытие завтра';
    return `Открытие через ${u} дн.`;
  }
  if (days === 0) return 'Сегодня';
  if (days === 1) return 'Вчера';
  if (days < 7)   return `${days} дн. назад`;
  const w = Math.floor(days / 7);
  if (w < 5)      return w === 1 ? 'Неделю назад' : `${w} нед. назад`;
  const m = Math.floor(days / 30);
  if (m < 12)     return m === 1 ? 'Месяц назад' : `${m} мес. назад`;
  const y = Math.floor(days / 365);
  if (y === 1)    return 'Год назад';
  if (y < 5)      return `${y} года назад`;
  return `${y} лет назад`;
}
function languageMark(value?: string) {
  const clean = String(value || '').trim();
  if (!clean) return '';
  return { RU:'🇷🇺',EU:'🇪🇺',US:'🇺🇸',DE:'🇩🇪',PL:'🇵🇱',BY:'🇧🇾',UA:'🇺🇦',KZ:'🇰🇿' }[clean.toUpperCase()] ?? clean;
}

const LANGUAGE_LABELS: Record<string, string> = {
  RU: 'Россия',
  EU: 'Европа',
  US: 'США',
  DE: 'Германия',
  PL: 'Польша',
  BY: 'Беларусь',
  UA: 'Украина',
  KZ: 'Казахстан',
};

function languageMarks(value?: string | null) {
  return String(value || 'RU')
    .split(/[,\s]+/)
    .map(code => code.trim())
    .filter(Boolean)
    .map(mark => ({ raw: mark, label: languageMark(mark) }))
    .filter(mark => mark.label);
}

function formatFullDate(value?: string | null) {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '—';
  return date.toLocaleDateString('ru-RU', { day: 'numeric', month: 'long', year: 'numeric' });
}

function onlinePointLabel(index: number, count: number, range: OnlineRange) {
  const point = new Date();
  if (range === 'hours') {
    point.setHours(point.getHours() - (count - 1 - index));
    return point.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit', timeZone: 'Europe/Moscow' });
  }
  if (range === 'days' || range === 'monthDays') {
    point.setDate(point.getDate() - (count - 1 - index));
    return point.toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' });
  }
  if (range === 'weeks') {
    const end = new Date(point);
    end.setDate(point.getDate() - (count - 1 - index) * 7);
    const start = new Date(end);
    start.setDate(end.getDate() - 6);
    return `${start.toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' })} - ${end.toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' })}`;
  }
  point.setMonth(point.getMonth() - (count - 1 - index), 1);
  return point.toLocaleDateString('ru-RU', { month: 'short', year: 'numeric' });
}

function ChartHint({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <span className={styles.chartHint}>
      <button type="button" aria-label={label}>?</button>
      <span className={styles.chartHintPopup} role="tooltip">{children}</span>
    </span>
  );
}

function niceChartStep(value: number) {
  if (!Number.isFinite(value) || value <= 0) return 1;
  const power = Math.pow(10, Math.floor(Math.log10(value)));
  const fraction = value / power;
  const multiplier = fraction <= 1 ? 1 : fraction <= 2 ? 2 : fraction <= 3 ? 3 : fraction <= 5 ? 5 : 10;
  return multiplier * power;
}

function niceOnlineTicks(maxValue: number) {
  if (!Number.isFinite(maxValue) || maxValue <= 0) return [];
  const step = niceChartStep(maxValue / 3);
  const top = step * 3;
  return [top, top - step, top - step * 2, 0];
}

function normalizeSearchText(value: string) {
  return value.toLowerCase().replace(/ё/g, 'е');
}

function cooldownText(cooldownEnds: string | null): string {
  if (!cooldownEnds) return '';
  const diff = new Date(cooldownEnds).getTime() - Date.now();
  if (diff <= 0) return '';
  const h = Math.floor(diff / 3600000);
  const m = Math.floor((diff % 3600000) / 60000);
  if (h > 0) return `Следующий голос через ${h} ч. ${m} мин.`;
  return `Следующий голос через ${m} мин.`;
}

function voteWord(value: number) {
  const mod10 = value % 10;
  const mod100 = value % 100;
  if (mod10 === 1 && mod100 !== 11) return 'голос';
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)) return 'голоса';
  return 'голосов';
}

function compactVoteDate(value?: string | null) {
  if (!value) return '—';
  const date = new Date(value);
  const today = new Date();
  const startToday = new Date(today.getFullYear(), today.getMonth(), today.getDate()).getTime();
  const startDate = new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime();
  const diffDays = Math.round((startToday - startDate) / 86400000);
  if (diffDays === 0) return 'Сегодня';
  if (diffDays === 1) return 'Вчера';
  return date.toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' });
}

function voterRankLabel(votes: number, place: number) {
  if (place === 1) return 'Властелин голосов';
  if (votes >= 5) return 'Легенда голосования';
  if (votes >= 3) return 'Активный игрок';
  return 'Новичок';
}

function renderDescInline(text: string) {
  return text.split(/(\*\*[^*]+?\*\*)/g).map((part, index) => {
    const match = part.match(/^\*\*([^*]+?)\*\*$/);
    return match ? <strong key={index}>{match[1]}</strong> : <React.Fragment key={index}>{part}</React.Fragment>;
  });
}

function formatDesc(text: string) {
  if (!text) return null;
  const lines = text.split(/\\n|\n/);
  const result: React.ReactNode[] = [];
  let bullets: string[] = [];

  function flushBullets() {
    if (!bullets.length) return;
    result.push(
      <div key={result.length} className={styles.descBullets}>
        {bullets.map((b, i) => <div key={i} className={styles.descBullet}>{renderDescInline(b)}</div>)}
      </div>
    );
    bullets = [];
  }

  for (const raw of lines) {
    const line = raw.trim();
    if (/^#{1,3} /.test(line)) {
      flushBullets();
      const txt = line.replace(/^#{1,3} /, '').replace(/\*\*/g, '');
      const match = txt.match(/^([\u{1F300}-\u{1FFFF}\u{2600}-\u{26FF}⚔🛡🎯⚡📌🎮💎🌍👥🔧🌟✨🚀💪⭐🔥📜💬🏰⚙🎁])/u);
      result.push(
        <div key={result.length} className={styles.descHeading}>
          {match && <span>{match[1]}</span>}
          {txt.replace(match?.[1] ?? '', '').trim()}
        </div>
      );
    } else if (/^[•\-\*] /.test(line)) {
      bullets.push(line.replace(/^[•\-\*] /, ''));
    } else if (/^-{3,}$/.test(line)) {
      flushBullets();
      result.push(<div key={result.length} className={styles.descDivider} />);
    } else if (line === '') {
      flushBullets();
    } else {
      flushBullets();
      result.push(<p key={result.length} className={styles.descPara}>{renderDescInline(line)}</p>);
    }
  }
  flushBullets();
  return result;
}

export function ServerDetailClient({ initialServer }: { initialServer: Server }) {
  const id = initialServer.id;
  const { user, token, isAdmin } = useAuth();
  // Initial data приходит из server component — никакого loading-state для body.
  // Боты и медленный интернет получают полностью отрендеренный HTML сразу.
  const [server,   setServer]   = useState<Server>(initialServer);
  const [status,   setStatus]   = useState<any>(null);
  const [daily,    setDaily]    = useState<any>(null);
  const [reviewTxt, setReviewTxt] = useState('');
  const [reviewRating, setReviewRating] = useState(5);
  const [submitting, setSubmitting] = useState(false);
  const [toast,    setToast]    = useState('');
  const [isFav,       setIsFav]       = useState(false);
  const [favBusy,     setFavBusy]     = useState(false);
  const [voteStatus,  setVoteStatus]  = useState<VoteStatus | null>(null);
  const [voteSummary, setVoteSummary] = useState<VoteSummary | null>(null);
  const [voteTab, setVoteTab] = useState<'top' | 'recent'>('top');
  const [voting,      setVoting]      = useState(false);
  const [voteNickname, setVoteNickname] = useState('');
  const [authOpen, setAuthOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'overview' | 'info' | 'servers' | 'reviews'>('overview');
  const [onlineRange, setOnlineRange] = useState<OnlineRange>('hours');
  const [hoveredTrafficIndex, setHoveredTrafficIndex] = useState<number | null>(null);
  const [relatedArticles, setRelatedArticles] = useState<Article[]>([]);

  // Свежие данные на клиенте: SSR кешируется 5 мин (revalidate:300),
  // поэтому отзывы и рейтинг обновляем сразу при монтировании.
  useEffect(() => {
    api.servers.get(id).then(setServer).catch(() => {});
    api.monitoring.status(id).then(setStatus).catch(() => {});
    api.monitoring.daily(id, 30).then(setDaily).catch(() => {});
  }, [id]);

  useEffect(() => {
    if (!token) { setIsFav(false); return; }
    api.favorites.ids(token).then(ids => setIsFav(ids.includes(id))).catch(() => {});
  }, [token, id]);

  useEffect(() => {
    api.votes.status(id, token).then(setVoteStatus).catch(() => {});
    api.votes.summary(id).then(setVoteSummary).catch(() => {});
  }, [token, id]);

  useEffect(() => {
    const needle = normalizeSearchText(server.name);
    api.articles.list()
      .then(list => {
        const linked = list.filter(article => article.serverIds?.includes(server.id));
        const fallback = linked.length > 0
          ? []
          : list.filter(article => {
              const haystack = normalizeSearchText(`${article.title} ${article.description} ${article.content}`);
              return haystack.includes(needle);
            });
        setRelatedArticles(
          [...linked, ...fallback]
            .filter((article, index, self) => self.findIndex(item => item.id === article.id) === index)
            .slice(0, 4)
        );
      })
      .catch(() => setRelatedArticles([]));
  }, [server.id, server.name]);

  async function handleVote() {
    if (!token) {
      setAuthOpen(true);
      return;
    }
    const nickname = voteNickname.trim();
    if (nickname.length < 2) {
      showToast('Укажи ник персонажа на сервере');
      return;
    }
    setVoting(true);
    try {
      await api.votes.vote(id, nickname, token);
      showToast('Голос принят! Если проект подключил бонусы, награда придёт по нику');
      setServer(prev => ({
        ...prev,
        totalVotes: (prev.totalVotes ?? prev.weeklyVotes ?? 0) + 1,
        weeklyVotes: (prev.weeklyVotes ?? 0) + 1,
        monthlyVotes: (prev.monthlyVotes ?? 0) + 1,
      }));
      const fresh = await api.votes.status(id, token);
      setVoteStatus(fresh);
      api.votes.summary(id).then(setVoteSummary).catch(() => {});
    } catch {
      // Обновляем статус чтобы показать cooldown, если голосование заблокировано
      api.votes.status(id, token).then(setVoteStatus).catch(() => {});
      showToast('Голос уже учтён — следующий через 24 ч.');
    }
    setVoting(false);
  }

  async function toggleFavorite() {
    if (!token) return showToast('Войдите, чтобы добавить в избранное');
    setFavBusy(true);
    try {
      if (isFav) {
        await api.favorites.remove(id, token);
        setIsFav(false);
        showToast('Убрано из избранного');
      } else {
        await api.favorites.add(id, token);
        setIsFav(true);
        showToast('Добавлено в избранное');
      }
    } catch (e) {
      showToast(e instanceof Error ? e.message : 'Ошибка');
    }
    setFavBusy(false);
  }

  function showToast(msg: string) {
    setToast(msg);
    setTimeout(() => setToast(''), 3000);
  }

  async function shareServer() {
    const url = typeof window !== 'undefined' ? window.location.href : `https://l2realm.ru/servers/${id}`;
    try {
      await navigator.clipboard.writeText(url);
      showToast('Ссылка скопирована');
    } catch {
      showToast(url);
    }
  }

  async function deleteReview(reviewId: string) {
    if (!token) return;
    if (!confirm('Удалить этот отзыв?')) return;
    try {
      await api.reviews.delete(reviewId, token);
      showToast('Отзыв удалён');
      const fresh = await api.servers.get(id);
      setServer(fresh);
    } catch (e: any) {
      showToast(e.message || 'Ошибка удаления');
    }
  }

  async function submitReview(e: { preventDefault(): void }) {
    e.preventDefault();
    if (!token) return showToast('Войдите чтобы оставить отзыв');
    setSubmitting(true);
    try {
      await api.reviews.create(id, { rating: reviewRating, text: reviewTxt }, token);
      showToast('Отзыв отправлен на модерацию');
      setReviewTxt('');
    } catch (e: any) {
      showToast(e.message || 'Ошибка');
    }
    setSubmitting(false);
  }

  const isOnline = status?.status === 'online';
  const hasInstances = (server.instances?.length ?? 0) > 0;
  const instances = server.instances ?? [];
  const currentWorlds = currentProjectWorlds(server);
  const historicalWorlds = historicalProjectWorlds(server);
  const visibleWorlds = instances.length > 0 ? currentWorlds : instances;
  const worldCount = projectWorldCount(server);
  const openingCount = projectOpeningCount(server);
  const nextOpening = nextProjectOpening(server);
  const reviews = server.reviews ?? [];
  const mainType = server.type?.find(t => typeLabels.has(t as any));
  const totalVotes = voteSummary?.totalVotes ?? server.totalVotes ?? server.weeklyVotes ?? 0;
  const monthlyVotes = voteSummary?.monthlyVotes ?? server.monthlyVotes ?? 0;
  const projectOnline = serverOnlineValue(server);
  const estimatedProjectOnline = serverOnlineIsEstimated(server);
  const onlineDisclosure = serverOnlineDisclosure(server);
  const voteRewardsEnabled = voteSummary?.rewardsEnabled ?? server.voteRewardsEnabled ?? false;
  const tagSet = new Set<string>();
  if (visibleWorlds.length) {
    visibleWorlds.forEach(inst => {
      if (inst.chronicle) tagSet.add(inst.chronicle);
      if (inst.rates) tagSet.add(inst.rates);
      if (inst.type) tagSet.add(typeLabels.get(inst.type as any) ?? inst.type);
    });
  } else {
    if (server.chronicle) tagSet.add(server.chronicle);
    if (server.rates) tagSet.add(server.rates);
    if (mainType) tagSet.add(typeLabels.get(mainType as any) ?? mainType);
  }
  const displayTags = Array.from(tagSet).slice(0, 7);
  const languages = languageMarks(server.country);
  const startDate = formatFullDate(server.openedDate);
  const uptimeValue = status?.uptime != null ? `${status.uptime}%` : '—';
  const statusText = isOnline ? 'Онлайн' : status?.status === 'offline' ? 'Оффлайн' : 'Неизвестно';
  const statusClass = isOnline ? styles.serverOnline : styles.serverUnknown;
  const heroDescription = server.shortDesc || 'Каталог проекта на L2Realm: хроники, рейты, описание, отзывы игроков и голосование.';
  const activeBoost = Boolean(server.boost?.endDate && new Date(server.boost.endDate) > new Date());
  const estimatedOnlineValues = onlineSeries(projectOnline, onlineRange);
  const onlineHistory = serverOnlineHistorySeries(server, onlineRange, estimatedOnlineValues);
  const onlineValues = onlineHistory.values;
  const chartLeft = 46;
  const chartTop = 10;
  const chartWidth = 396;
  const chartHeight = 108;
  const chartBottom = chartTop + chartHeight;
  const onlineMax = onlineValues.length > 0 ? Math.max(...onlineValues) : 0;
  const onlineTicks = niceOnlineTicks(onlineMax);
  const onlineDomainMax = onlineTicks[0] || Math.max(1, onlineMax);
  const onlineGraphPoints = onlineValues.map((value, index) => ({
    value,
    label: onlinePointLabel(index, onlineValues.length, onlineRange),
    x: chartLeft + (onlineValues.length === 1 ? chartWidth : (index / (onlineValues.length - 1)) * chartWidth),
    y: chartBottom - (Math.min(value, onlineDomainMax) / onlineDomainMax) * chartHeight,
  }));
  const onlinePath = onlineGraphPoints
    .map((point, index) => `${index === 0 ? 'M' : 'L'} ${point.x.toFixed(1)} ${point.y.toFixed(1)}`)
    .join(' ');
  const onlineFillPath = onlinePath
    ? `${onlinePath} L ${(chartLeft + chartWidth).toFixed(1)} ${chartBottom} L ${chartLeft} ${chartBottom} Z`
    : '';
  const onlineGraphScale = onlineTicks.map(value => {
    const y = chartBottom - (value / onlineDomainMax) * chartHeight;
    return {
      label: value.toLocaleString('ru-RU'),
      y,
      textY: Math.min(chartBottom - 2, Math.max(chartTop + 7, y + 4)),
    };
  });
  const onlineAxisIndexes = onlineGraphPoints.length <= 7
    ? onlineGraphPoints.map((_, index) => index)
    : Array.from(new Set([
        0,
        Math.round((onlineGraphPoints.length - 1) * .25),
        Math.round((onlineGraphPoints.length - 1) * .5),
        Math.round((onlineGraphPoints.length - 1) * .75),
        onlineGraphPoints.length - 1,
      ]));
  const onlineAxisMarks = onlineAxisIndexes.map(index => onlineGraphPoints[index]).filter(Boolean);
  const trafficHistory = projectTrafficHistory(server).slice(-6);
  const trafficValues = trafficHistory.map(snapshot => snapshot.monthly ?? Math.round((snapshot.threeMonths ?? 0) / 3));
  const trafficMax = trafficValues.length > 0 ? Math.max(...trafficValues) : 0;
  const trafficTicks = niceOnlineTicks(trafficMax);
  const trafficDomainMax = trafficTicks[0] || Math.max(1, trafficMax);
  const trafficGraphPoints = trafficValues.map((value, index) => {
    const slotWidth = chartWidth / Math.max(1, trafficValues.length);
    const width = Math.min(52, slotWidth * .62);
    return {
    value,
    label: formatTrafficPeriod(trafficHistory[index]?.period),
    x: chartLeft + slotWidth * index + ((slotWidth - width) / 2),
    width,
    y: chartBottom - (Math.min(value, trafficDomainMax) / trafficDomainMax) * chartHeight,
    };
  });
  const trafficGraphScale = trafficTicks.map(value => {
    const y = chartBottom - (value / trafficDomainMax) * chartHeight;
    return {
      label: formatTraffic(value),
      y,
      textY: Math.min(chartBottom - 2, Math.max(chartTop + 7, y + 4)),
    };
  });
  const voteDisabled = voting || !!voteStatus?.voted;

  return (
    <div className={styles.page}>
      {toast && <div className={`${styles.toast} ${toast.includes('Ошибка') ? styles.toastError : ''}`}>{toast}</div>}
      <AuthModal open={authOpen} onClose={() => setAuthOpen(false)} />

      <section className={styles.serverHero}>
        {server.banner ? (
          <img src={server.banner} alt="" className={styles.serverHeroBg} aria-hidden="true" />
        ) : (
          <div className={styles.serverHeroFallback} aria-hidden="true" />
        )}
        <div className={styles.serverHeroShade} />

        <div className={styles.heroMain}>
          <div className={styles.heroLogo}>
            {server.icon ? <img src={server.icon} alt={server.name} /> : <span>{server.abbr ?? server.name.slice(0, 2)}</span>}
          </div>
          <div className={styles.heroCopy}>
            <div className={styles.heroBadges}>
              {server._isVip && <span className={styles.goldBadge}>VIP</span>}
              {server._isSod && <span className={styles.goldBadge}>Сервер недели</span>}
              {activeBoost && <span className={styles.boostBadge}>Буст</span>}
            </div>
            <h1>{server.name}</h1>
            <div className={styles.heroTags}>
              {displayTags.map(tag => <span key={tag}>{tag}</span>)}
            </div>
            <p>{heroDescription}</p>
            <div className={styles.heroButtons}>
              <a href={server.url} target="_blank" rel="noopener nofollow" className={styles.primaryHeroButton}>Перейти на сайт <span>↗</span></a>
              <button
                type="button"
                className={`${styles.iconHeroButton} ${isFav ? styles.iconHeroButtonActive : ''}`}
                onClick={toggleFavorite}
                disabled={favBusy}
                title={isFav ? 'Убрать из избранного' : 'Добавить в избранное'}
                aria-label={isFav ? 'Убрать из избранного' : 'Добавить в избранное'}
              >
                {isFav ? '×' : '♡'}
              </button>
            </div>
          </div>
        </div>

        <aside className={styles.heroPanel}>
          <div className={styles.heroPanelHead}>
            <span>Показатели проекта</span>
            <Link href="/methodology">Методика</Link>
          </div>
          <div className={styles.heroMetricGrid}>
            {projectOnline != null && (
              <div>
                <span>Онлайн сейчас</span>
                <strong className={styles.serverOnline}>{formatOnline(projectOnline, estimatedProjectOnline)}</strong>
                {onlineDisclosure && <small title={onlineDisclosure.title}>{onlineDisclosure.label}</small>}
              </div>
            )}
            <div>
              <span>Миров</span>
              <strong>{worldCount}</strong>
            </div>
            <div className={styles.heroTrafficMetric}>
                <span>Трафик / до 3 мес.</span>
              <strong>{formatTraffic(server.trafficThreeMonths)}</strong>
            </div>
            <div>
              <span>Ближайший старт</span>
              <strong>{nextOpening ? formatFullDate(nextOpening) : 'Нет анонса'}</strong>
            </div>
            <div>
              <span>Открытий</span>
              <strong>{openingCount}</strong>
            </div>
            <div>
              <span>Рейтинг</span>
              <strong>★ {server.ratingCount > 0 ? server.rating.toFixed(1) : '—'}</strong>
            </div>
          </div>
        </aside>

        <div className={styles.serverTabs}>
          <button type="button" className={activeTab === 'overview' ? styles.serverTabActive : ''} onClick={() => setActiveTab('overview')}>Обзор</button>
          <button type="button" className={activeTab === 'info' ? styles.serverTabActive : ''} onClick={() => setActiveTab('info')}>Информация</button>
          <button type="button" className={activeTab === 'servers' ? styles.serverTabActive : ''} onClick={() => setActiveTab('servers')}>
            Миры и открытия {instances.length > 0 && <span>{instances.length}</span>}
          </button>
          <button type="button" className={activeTab === 'reviews' ? styles.serverTabActive : ''} onClick={() => setActiveTab('reviews')}>
            Отзывы {server.ratingCount > 0 && <span>{server.ratingCount}</span>}
          </button>
        </div>
      </section>

      {activeTab === 'overview' && (
        <div className={styles.detailGrid}>
          <section className={`${styles.infoCard} ${styles.worldOverviewCard}`}>
            <div className={styles.cardTitleRow}>
              <h2>Миры и открытия</h2>
              <button type="button" className={styles.inlineLink} onClick={() => setActiveTab('servers')}>Все открытия</button>
            </div>
            <div className={styles.worldTable} role="table" aria-label="Миры проекта">
              <div className={styles.worldTableHead} role="row">
                <span>Мир</span>
                <span>Хроники</span>
                <span>Рейт</span>
                <span>Тип</span>
                <span>Онлайн</span>
                <span>Статус</span>
                <span>Открыт</span>
                <span>Активность (24 ч)</span>
              </div>
              {(currentWorlds.length > 0 ? currentWorlds : instances).slice(0, 5).map(instance => {
                const online = instanceOnlineValue(instance);
                const label = worldLifecycleLabel(instance);
                const lifecycle = worldLifecycle(instance);
                const lifecycleClass = lifecycle === 'upcoming'
                  ? styles.worldSoon
                  : lifecycle === 'active' ? styles.worldActive : styles.worldArchive;
                const activityPath = onlineChartPath(instanceOnlineLast24Hours(instance), 110, 25);
                return (
                  <div key={instance.id} className={styles.worldTableRow} role="row">
                    <strong>{instance.label || instance.rates || instance.chronicle}</strong>
                    <span>{instance.chronicle || '—'}</span>
                    <span>{instance.rates || '—'}</span>
                    <span>{instance.type ? (typeLabels.get(instance.type as any) ?? instance.type) : '—'}</span>
                    <b>{online != null && <i aria-hidden="true" />}{online == null ? '-' : formatOnline(online, instanceOnlineIsEstimated(instance))}</b>
                    <em className={lifecycleClass}>{label}</em>
                    <span>{instance.openedDate ? formatFullDate(instance.openedDate) : '—'}</span>
                    <svg className={styles.worldActivityGraph} viewBox="0 0 110 25" aria-label="Онлайн за 24 часа">
                      {activityPath && <path d={`${activityPath} L 110 25 L 0 25 Z`} className={styles.worldActivityFill} />}
                      {activityPath && <path d={activityPath} className={styles.worldActivityLine} />}
                    </svg>
                  </div>
                );
              })}
              {instances.length === 0 && (
                <div className={styles.worldTableRow} role="row">
                  <strong>{server.name}</strong>
                  <span>{server.chronicle || '—'}</span>
                  <span>{server.rates || '—'}</span>
                  <span>{mainType ? (typeLabels.get(mainType as any) ?? mainType) : '—'}</span>
                  <b>{projectOnline != null && <i aria-hidden="true" />}{formatOnline(projectOnline, estimatedProjectOnline)}</b>
                  <em className={styles.worldActive}>Открыт</em>
                  <span>{server.openedDate ? formatFullDate(server.openedDate) : '—'}</span>
                  <span className={styles.worldNoActivity}>—</span>
                </div>
              )}
            </div>
            {historicalWorlds.length > 0 && (
              <p className={styles.worldArchiveHint}>В истории: {historicalWorlds.length} закрытых или объединённых открытий</p>
            )}
          </section>

          <section className={`${styles.infoCard} ${styles.analyticsCard}`}>
            <div className={styles.analyticsPane}>
              <div className={styles.cardTitleRow}>
                <h2 className={styles.chartHeading}>
                  Онлайн
                  <ChartHint label="Как считается онлайн">
                    <strong>Как считается онлайн</strong>
                    <span>Если у проекта есть счётчик, число берётся с его сайта.</span>
                    <span>Если счётчика нет, редакция заходит в игру и вносит визуальную оценку. Для неё строится умный суточный график: спад ночью, пик вечером, поправка на выходные и автоохоту, плюс естественный шум 5–15%.</span>
                  </ChartHint>
                </h2>
                <div className={styles.onlineRangeTabs}>
                  {(['hours', 'days', 'monthDays'] as OnlineRange[]).map(range => (
                    <button
                      key={range}
                      type="button"
                      className={onlineRange === range ? styles.onlineRangeActive : ''}
                      onClick={() => setOnlineRange(range)}
                    >
                      {range === 'hours' ? '24 часа' : range === 'days' ? '7 дней' : '30 дней'}
                    </button>
                  ))}
                </div>
              </div>
              <div className={styles.onlineGraphBox}>
                <svg viewBox="0 0 460 150" role="img" aria-label="График онлайна за выбранный период">
                  <defs>
                    <linearGradient id="serverOnlineFill" x1="0" x2="0" y1="0" y2="1">
                      <stop offset="0%" stopColor="rgba(83,217,135,.34)" />
                      <stop offset="100%" stopColor="rgba(83,217,135,0)" />
                    </linearGradient>
                  </defs>
                  {onlineGraphScale.map((mark, index) => (
                    <g key={`${mark.label}-${index}`}>
                      <text x="2" y={mark.textY} className={styles.onlineGraphScale}>{mark.label}</text>
                      <path d={`M ${chartLeft} ${mark.y} H ${chartLeft + chartWidth}`} className={styles.onlineGraphGridLine} />
                    </g>
                  ))}
                  <path d={`M ${chartLeft} ${chartBottom} H ${chartLeft + chartWidth}`} className={styles.onlineGraphAxis} />
                  {onlineFillPath && <path d={onlineFillPath} className={styles.onlineGraphFill} />}
                  {onlinePath && <path d={onlinePath} className={styles.onlineGraphLine} />}
                  {onlineGraphPoints.map((point, index) => (
                    <circle key={`${point.x}-${index}`} cx={point.x} cy={point.y} r="3.6" className={styles.onlineGraphDot}>
                      <title>{`${point.label}: онлайн ${formatOnline(point.value, estimatedProjectOnline)}`}</title>
                    </circle>
                  ))}
                  {onlineAxisMarks.map(point => (
                    <g key={`axis-${point.label}`}>
                      <path d={`M ${point.x} ${chartBottom} V ${chartBottom + 5}`} className={styles.onlineGraphTick} />
                      <text x={point.x} y={chartBottom + 20} className={styles.onlineGraphXLabel}>{point.label}</text>
                    </g>
                  ))}
                </svg>
                {!onlinePath && <div className={styles.onlineEmpty}>Онлайн появится после настройки сервера</div>}
              </div>
            </div>

            <div className={`${styles.analyticsPane} ${styles.trafficPane}`}>
            <div className={styles.cardTitleRow}>
              <h2 className={styles.chartHeading}>
                Посещаемость сайта
                <ChartHint label="Как считается посещаемость">
                  <strong>Посещаемость сайта</strong>
                  <span>Это не число игроков. Столбцы показывают оценку визитов на сайт проекта за каждый месяц.</span>
                </ChartHint>
              </h2>
              <div className={styles.trafficTitleLinks}>
                <span>6 месяцев</span>
                <Link href="/methodology" className={styles.inlineTextLink}>Методика</Link>
              </div>
            </div>
            <div className={`${styles.onlineGraphBox} ${styles.trafficGraphBox}`}>
              <svg viewBox="0 0 460 150" role="img" aria-label="График оценочного трафика сайта">
                <defs>
                  <linearGradient id="serverTrafficBars" x1="0" x2="0" y1="0" y2="1">
                    <stop offset="0%" stopColor="rgba(87,166,246,.84)" />
                    <stop offset="100%" stopColor="rgba(28,71,130,.46)" />
                  </linearGradient>
                </defs>
                {trafficGraphScale.map((mark, index) => (
                  <g key={`${mark.label}-${index}`}>
                    <text x="2" y={mark.textY} className={styles.onlineGraphScale}>{mark.label}</text>
                    <path d={`M ${chartLeft} ${mark.y} H ${chartLeft + chartWidth}`} className={styles.onlineGraphGridLine} />
                  </g>
                  ))}
                <path d={`M ${chartLeft} ${chartBottom} H ${chartLeft + chartWidth}`} className={styles.onlineGraphAxis} />
                {trafficGraphPoints.map((point, index) => (
                  <rect
                    key={`${point.x}-${index}`}
                    x={point.x}
                    y={point.y}
                    width={point.width}
                    height={chartBottom - point.y}
                    rx="3"
                    tabIndex={0}
                    className={`${styles.trafficGraphBar} ${hoveredTrafficIndex === index ? styles.trafficGraphBarActive : ''}`}
                    onMouseEnter={() => setHoveredTrafficIndex(index)}
                    onMouseLeave={() => setHoveredTrafficIndex(null)}
                    onClick={() => setHoveredTrafficIndex(index)}
                    onFocus={() => setHoveredTrafficIndex(index)}
                    onBlur={() => setHoveredTrafficIndex(null)}
                  >
                    <title>{`${point.label}: ${formatTraffic(point.value)} визитов`}</title>
                  </rect>
                ))}
                {trafficGraphPoints.map(point => (
                  <g key={`traffic-axis-${point.label}`}>
                    <path d={`M ${point.x + point.width / 2} ${chartBottom} V ${chartBottom + 5}`} className={styles.onlineGraphTick} />
                    <text x={point.x + point.width / 2} y={chartBottom + 20} className={styles.onlineGraphXLabel}>{point.label}</text>
                  </g>
                ))}
              </svg>
              {hoveredTrafficIndex != null && trafficGraphPoints[hoveredTrafficIndex] && (
                <div
                  className={styles.trafficTooltip}
                  style={{
                    left: `${((trafficGraphPoints[hoveredTrafficIndex].x + trafficGraphPoints[hoveredTrafficIndex].width / 2) / 460) * 100}%`,
                    top: `${Math.max(36, (trafficGraphPoints[hoveredTrafficIndex].y / 150) * 100)}%`,
                  }}
                >
                  <small>{trafficGraphPoints[hoveredTrafficIndex].label}</small>
                  <strong>{formatTraffic(trafficGraphPoints[hoveredTrafficIndex].value)} визитов</strong>
                </div>
              )}
              {trafficGraphPoints.length === 0 && <div className={styles.onlineEmpty}>Трафик появится после подключения источника</div>}
            </div>
            </div>
          </section>

          <aside className={styles.sideStack}>
            <section className={`${styles.sideCard} ${styles.supportCard}`}>
              <h2>Поддержать сервер</h2>
              <p>{voteRewardsEnabled ? 'Проголосуй и получи награду по нику персонажа.' : 'Vote Manager не подключен: голос учтётся на L2Realm, но бонусы проект пока не выдаёт.'}</p>
              <div className={styles.voteCompactStats}>
                <div><span>Всего</span><strong>{voteSummary?.totalVotes ?? totalVotes}</strong></div>
                <div><span>За месяц</span><strong>{voteSummary?.monthlyVotes ?? 0}</strong></div>
                <div><span>Сегодня</span><strong>{voteSummary?.todayVotes ?? 0}</strong></div>
              </div>
              <div className={styles.supportVote}>
                <input
                  className="input"
                  value={voteNickname}
                  onChange={e => setVoteNickname(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter') handleVote(); }}
                  placeholder="Ник на сервере"
                  maxLength={32}
                  disabled={!token || !!voteStatus?.voted}
                />
                <button type="button" onClick={handleVote} disabled={voteDisabled}>
                  {voting ? <span className="spin" /> : !token ? 'Войти' : voteStatus?.voted ? 'Учтено' : 'Проголосовать'}
                </button>
              </div>
              {voteStatus?.voted && cooldownText(voteStatus.cooldownEnds ?? null) && (
                <small>{cooldownText(voteStatus.cooldownEnds ?? null)}</small>
              )}
            </section>

            <section className={`${styles.sideCard} ${styles.projectArticlesCard}`}>
              <h2>Статьи по проекту</h2>
              {relatedArticles.length > 0 ? (
                <div className={styles.projectArticles}>
                  {relatedArticles.map(article => (
                    <Link key={article.id} href={`/blog/${article.slug}`} className={styles.projectArticle}>
                      {article.image && <img src={article.image} alt="" />}
                      <span>
                        <strong>{article.title}</strong>
                        <small>{formatFullDate(article.publishedAt)}</small>
                      </span>
                    </Link>
                  ))}
                </div>
              ) : (
                <p className={styles.projectArticlesEmpty}>Публикаций о проекте пока нет.</p>
              )}
            </section>

            {(server.telegram || server.discord || server.vk || server.youtube) && (
              <section className={styles.sideCard}>
                <h2>Контакты</h2>
                <div className={styles.contactLinks}>
                  {server.telegram && <SocialLink ico="TG" name="Telegram" href={server.telegram ?? ''} />}
                  {server.discord && <SocialLink ico="DC" name="Discord" href={server.discord ?? ''} />}
                  {server.vk && <SocialLink ico="VK" name="ВКонтакте" href={server.vk ?? ''} />}
                  {server.youtube && <SocialLink ico="YT" name="YouTube" href={server.youtube ?? ''} />}
                </div>
              </section>
            )}
          </aside>
        </div>
      )}

      {activeTab === 'info' && (
        <div className={styles.infoTabLayout}>
          <section className={`${styles.infoCard} ${styles.infoTabCard}`}>
            <h2>Информация</h2>
            <div className={styles.infoRows}>
              <div><span>Хроники</span><strong>{currentWorlds.length ? Array.from(new Set(currentWorlds.map(i => i.chronicle))).join(', ') : server.chronicle}</strong></div>
              <div><span>Рейты</span><strong>{currentWorlds.length ? Array.from(new Set(currentWorlds.map(i => i.rates))).join(', ') : server.rates}</strong></div>
              <div><span>Тип сервера</span><strong>{currentWorlds.length ? 'Несколько миров' : (mainType ? typeLabels.get(mainType as any) : '—')}</strong></div>
              <div><span>Старт проекта</span><strong>{startDate}</strong></div>
              <div><span>Языки</span><strong className={styles.regionList}>{languages.map(item => <span key={item.raw} title={LANGUAGE_LABELS[item.raw.toUpperCase()] ?? item.raw}>{item.label}</span>)}</strong></div>
              <div><span>Статус</span><strong className={statusClass}>● {statusText}</strong></div>
              {projectOnline != null && <div><span>Онлайн</span><strong>{formatOnline(projectOnline, estimatedProjectOnline)}</strong></div>}
              {server.trafficThreeMonths != null && <div><span>Трафик / до 3 мес.</span><strong className={styles.serverTraffic}>{formatTraffic(server.trafficThreeMonths)}</strong></div>}
              <div><span>Vote Manager</span><strong>{voteRewardsEnabled ? 'Бонусы подключены' : 'Не подключен'}</strong></div>
            </div>
          </section>
        </div>
      )}

      {activeTab === 'servers' && (
        <div className={styles.serversTabLayout}>
          <section className={`${styles.infoCard} ${styles.projectServersCard}`}>
            <div className={styles.projectServersHead}>
              <div>
                <h2>Миры и открытия <span>{instances.length || 1}</span></h2>
                <p>Сейчас миров: {worldCount}. Всего открытий в истории: {openingCount}.</p>
              </div>
            </div>
            {instances.length > 0 ? (
              <div className={styles.instancesLarge}>
                {[...instances].sort((a, b) => {
                  const rank = (instance: typeof a) => ['active', 'upcoming', 'merged', 'closed', 'archived'].indexOf(worldLifecycle(instance));
                  return rank(a) - rank(b) || (a.rateNum || 0) - (b.rateNum || 0);
                }).map(inst => {
                  const lifecycle = worldLifecycle(inst);
                  const isFuture = lifecycle === 'upcoming';
                  const isHistorical = lifecycle === 'merged' || lifecycle === 'closed' || lifecycle === 'archived';
                  const instOnline = instanceOnlineValue(inst);
                  const estimatedInstOnline = instanceOnlineIsEstimated(inst);
                  const openedLabel = isFuture ? formatFullDate(inst.openedDate) : relativeOpened(inst.openedDate);
                  return (
                    <article key={inst.id} className={`${styles.instTileLarge} ${isFuture ? styles.instTileSoon : ''} ${isHistorical ? styles.instTileHistorical : ''}`}>
                      <div className={styles.instTileHead}>
                        <span className={styles.instTileLabel}>{inst.label || inst.chronicle}</span>
                        <span className={`${styles.instTileStatus} ${isFuture ? styles.instTileSoonBadge : ''} ${isHistorical ? styles.instTileArchiveBadge : ''}`}>
                          {worldLifecycleLabel(inst)}
                        </span>
                      </div>
                      <div className={styles.instTileTags}>
                        <span>{inst.chronicle}</span>
                        <span>{inst.rates}</span>
                        {inst.type && <span>{typeLabels.get(inst.type as any) ?? inst.type}</span>}
                      </div>
                      {inst.shortDesc && <div className={styles.instTileDesc}>{inst.shortDesc}</div>}
                      {inst.statusNote && <div className={styles.instStatusNote}>{inst.statusNote}</div>}
                      <div className={styles.instTileStats}>
                        {!isHistorical && instOnline != null && (
                          <div className={styles.instTileStatOnline}>
                            <strong>{formatOnline(instOnline, estimatedInstOnline)}</strong>
                            <span>онлайн</span>
                          </div>
                        )}
                        {inst.openedDate && (
                          <div>
                            <strong>{openedLabel}</strong>
                            <span>{isFuture ? 'старт' : isHistorical ? 'открывался' : 'работает'}</span>
                          </div>
                        )}
                      </div>
                      {inst.openedDate && (
                        <div className={styles.instTileMeta}>
                          <span>{formatFullDate(inst.openedDate)}</span>
                        </div>
                      )}
                    </article>
                  );
                })}
              </div>
            ) : (
              <div className={styles.instancesLarge}>
                <article className={styles.instTileLarge}>
                  <div className={styles.instTileHead}>
                    <span className={styles.instTileLabel}>{server.name}</span>
                  </div>
                  <div className={styles.instTileTags}>
                    <span>{server.chronicle}</span>
                    <span>{server.rates}</span>
                    {mainType && <span>{typeLabels.get(mainType as any) ?? mainType}</span>}
                  </div>
                  {server.shortDesc && <div className={styles.instTileDesc}>{server.shortDesc}</div>}
                  <div className={styles.instTileStats}>
                    {projectOnline != null && (
                      <div className={styles.instTileStatOnline}>
                        <strong>{formatOnline(projectOnline, estimatedProjectOnline)}</strong>
                        <span>онлайн</span>
                      </div>
                    )}
                    {server.openedDate && (
                      <div>
                        <strong>{relativeOpened(server.openedDate)}</strong>
                        <span>работает</span>
                      </div>
                    )}
                  </div>
                  {server.openedDate && (
                    <div className={styles.instTileMeta}>
                      <span>{startDate}</span>
                    </div>
                  )}
                </article>
              </div>
            )}
          </section>
        </div>
      )}

      {activeTab === 'reviews' && (
        <div className={styles.reviewsLayout}>
          <section className={styles.infoCard}>
            <h2>Оставить отзыв</h2>
            {user ? (
              <form onSubmit={submitReview} className={styles.reviewForm}>
                <div className={styles.stars}>
                  {[1,2,3,4,5].map(n => (
                    <button key={n} type="button" className={n <= reviewRating ? styles.starOn : styles.star} onClick={() => setReviewRating(n)}>★</button>
                  ))}
                  <span className={styles.ratingLbl}>{reviewRating} / 5</span>
                </div>
                <textarea
                  className="input"
                  placeholder="Расскажи об опыте на сервере..."
                  rows={4}
                  value={reviewTxt}
                  onChange={e => setReviewTxt(e.target.value)}
                  required
                  style={{ resize: 'vertical' }}
                />
                <button className="btn-primary" type="submit" disabled={submitting} style={{ alignSelf: 'flex-start', padding: '.45rem 1.2rem' }}>
                  {submitting ? <span className="spin" /> : 'Отправить отзыв'}
                </button>
              </form>
            ) : (
              <p className={styles.empty}>Войдите в аккаунт, чтобы оставить отзыв.</p>
            )}
          </section>

          <section className={styles.infoCard}>
            <h2>Отзывы игроков {server.ratingCount > 0 && `(${server.ratingCount})`}</h2>
            {reviews.length > 0 ? (
              <div className={styles.reviewList}>
                {reviews.map(r => (
                  <ReviewCard
                    key={r.id}
                    review={r}
                    canDelete={isAdmin || r.user.id === user?.id}
                    onDelete={() => deleteReview(r.id)}
                  />
                ))}
              </div>
            ) : (
              <p className={styles.empty}>Отзывов пока нет.</p>
            )}
          </section>
        </div>
      )}
    </div>
  );

  return (
    <div className={styles.page}>
      {toast && <div className={`${styles.toast} ${toast.includes('Ошибка') ? styles.toastError : ''}`}>{toast}</div>}
      <AuthModal open={authOpen} onClose={() => setAuthOpen(false)} />

      {/* Breadcrumb */}
      <div className={styles.bread}>
        <Link href="/" className={styles.breadLink}>Главная</Link>
        <span className={styles.breadSep}>›</span>
        <Link href="/" className={styles.breadLink}>Все серверы</Link>
        <span className={styles.breadSep}>›</span>
        <span>{server.name}</span>
      </div>

      {/* Шапка сервера */}
      <div className={styles.header}>
        <div className={styles.headerInner}>
          {server.banner ? (
            <>
              <img src={server.banner} alt="" className={styles.headerBg} aria-hidden="true" />
              <div className={styles.headerOverlay} />
            </>
          ) : (
            <div className={styles.headerPh}><span>{server.name.toUpperCase()}</span></div>
          )}
          <div className={styles.headerLeft}>
            <div className={styles.icon}>
              {server.icon
                ? <img src={server.icon} alt={server.name} onError={e => { (e.target as HTMLImageElement).style.display='none'; }} />
                : <span>{server.abbr ?? server.name.slice(0,2)}</span>}
            </div>
            <div>
              <div className={styles.serverName}>
                {server.name}{' '}
                {activeBoost && (
                  <span title="Буст активен" style={{ filter: 'drop-shadow(0 0 4px rgba(240,140,70,.6))' }}>🔥</span>
                )}
              </div>
              <div className={styles.headerTags}>
                <span className="tag tc">{server.chronicle}</span>
                <span className="tag tr">{server.rates}</span>
                {!hasInstances && mainType && (
                  <span className="tag tn">{typeLabels.get(mainType as any)}</span>
                )}
              </div>
              <div className={styles.statusRow}>
                <span className={isOnline ? styles.dotOnline : styles.dotOffline} />
                <span className={isOnline ? styles.txtOnline : styles.txtOffline}>
                  {isOnline ? 'Сервер работает' : 'Статус неизвестен'}
                </span>
                {status?.uptime != null && <span className={styles.uptime}>• Аптайм {status.uptime}%</span>}
              </div>

              {/* Быстрая статистика: голоса / рейтинг / отзывы */}
              <div className={styles.headerStats}>
                {totalVotes > 0 && (
                  <span className={styles.hstat}>
                    <Image src="/images/vote-icon.png" alt="Голоса сервера" width={16} height={16} style={{ objectFit: 'contain' }} />
                    {totalVotes} {voteWord(totalVotes)}
                    <span className={styles.voteTip}>?</span>
                  </span>
                )}
                {server.ratingCount > 0 && (
                  <>
                    {totalVotes > 0 && <span className={styles.hstatDot}>·</span>}
                    <span className={styles.hstat}>★ {server.rating.toFixed(1)} / 5</span>
                    <span className={styles.hstatDot}>·</span>
                    <span className={styles.hstat}>{server.ratingCount} {server.ratingCount === 1 ? 'отзыв' : server.ratingCount < 5 ? 'отзыва' : 'отзывов'}</span>
                  </>
                )}
              </div>
            </div>
          </div>
          <div className={styles.headerRight}>
            <div className={styles.voteBox}>
              <div className={styles.voteBoxMeta}>
                <span className={styles.voteBoxCount}>
                  <span className={styles.voteBoxDot} />
                  {monthlyVotes > 0 ? `${monthlyVotes} ${voteWord(monthlyVotes)} за месяц` : 'Голосов за месяц пока нет'}
                </span>
                <span>{voteStatus?.voted && cooldownText(voteStatus?.cooldownEnds ?? null) ? cooldownText(voteStatus?.cooldownEnds ?? null) : '1 голос / 24ч IP + аккаунт'}</span>
              </div>

              <div className={styles.voteInline}>
                <input
                  className="input"
                  value={voteNickname}
                  onChange={e => setVoteNickname(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter') handleVote(); }}
                  placeholder="Ник на сервере"
                  maxLength={32}
                  disabled={!token || !!voteStatus?.voted}
                  title={voteRewardsEnabled ? 'Ник нужен для выдачи бонуса на сервере' : 'Голос учтётся на L2Realm. Бонусы зависят от подключения Vote Manager проектом'}
                />
                <button
                  type="button"
                  className={styles.voteInlineBtn}
                  onClick={handleVote}
                  disabled={voting || !!voteStatus?.voted}
                  title="Проголосовать за сервер (раз в 24 часа)"
                >
                  {voting
                    ? <span className="spin" />
                    : !token ? 'Войти' : voteStatus?.voted ? 'Учтено' : 'Голосовать'}
                </button>
              </div>

              <div className={styles.voteQuickActions}>
                <a href={server.url} target="_blank" rel="noopener" className={styles.btnSiteLarge}>
                  <span aria-hidden="true">↗</span> Перейти
                </a>
                <button
                  type="button"
                  className={styles.saveBtn}
                  onClick={toggleFavorite}
                  disabled={favBusy}
                  title={isFav ? 'Убрать из избранного' : 'Добавить в избранное'}
                >
                  <span aria-hidden="true">{isFav ? '★' : '☆'}</span> Сохранить
                </button>
              </div>

              <div className={`${styles.voteBoxHint} ${voteRewardsEnabled ? styles.voteBoxHintOn : ''}`}>
                {voteRewardsEnabled ? 'Бонусы подключены' : 'Бонус после подключения Vote Manager'}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Тело */}
      <div className={styles.body}>

        {/* Левая колонка */}
        <div className={styles.left}>
          {/* Краткая статистика — над характеристиками. Если есть instances — показываем количество. */}
          {instances.length > 0 && (
            <div className={styles.miniStats}>
              <span className={styles.miniStatsNum}>{instances.length}</span>
              <span className={styles.miniStatsLbl}>{
                instances.length === 1 ? 'сервер проекта'
                  : instances.length < 5 ? 'сервера проекта'
                    : 'серверов проекта'
              }</span>
            </div>
          )}

          <div className={styles.block}>
            <div className={styles.blockTitle}>Характеристики</div>
            <div className={styles.rows}>
              {/* Хроника / Рейты убраны — они видны в карточках серверов ниже.
                  В характеристиках только метаданные проекта. */}
              {[
                ['Языки',      languageMarks(server.country).map(item => item.label).join(' ')],
                ['Открылся',   relativeOpened(server.openedDate)],
                ['Рейтинг',    server.ratingCount > 0 ? `${server.rating.toFixed(1)} ⭐ (${server.ratingCount})` : 'Нет отзывов'],
              ].map(([l, v]) => (
                <div key={l} className={styles.row}><span className={styles.rowLbl}>{l}</span><span className={styles.rowVal}>{v}</span></div>
              ))}
            </div>
          </div>

          {/* Контакты */}
          {(server.discord || server.telegram || server.vk || server.youtube) && (
            <div className={styles.block} style={{ marginTop: 1 }}>
              <div className={styles.blockTitle}>Контакты</div>
              <div className={styles.socials}>
                {server.telegram && <SocialLink ico="✈️" name="Telegram" href={server.telegram ?? ''} />}
                {server.discord  && <SocialLink ico="💬" name="Discord"  href={server.discord ?? ''} />}
                {server.vk       && <SocialLink ico="🔵" name="ВКонтакте" href={server.vk ?? ''} />}
                {server.youtube  && <SocialLink ico="▶️" name="YouTube"  href={server.youtube ?? ''} />}
              </div>
            </div>
          )}
        </div>

        {/* Правая колонка */}
        <div className={styles.right}>

          {/* Описание */}
          <div className={styles.dblock}>
            <div className={styles.dblockTitle}>О сервере</div>
            <div className={styles.dblockBody}>
              {server.fullDesc
                ? <div className={styles.desc}>{formatDesc(server.fullDesc ?? '')}</div>
                : <p className={styles.empty}>Описание отсутствует</p>}
            </div>
          </div>

          {/* Сервера проекта — компактные плитки в сетке (без основного заголовка блока) */}
          {instances.length > 0 && (
            <div className={styles.dblock}>
              <div className={styles.dblockBody}>
                <p className={styles.instSubtitle}>
                  {instances.length} {instances.length === 1 ? 'сервер' : instances.length < 5 ? 'сервера' : 'серверов'}
                </p>
                <div className={styles.instances}>
                  {[...instances]
                    .sort((a, b) => (a.rateNum || 0) - (b.rateNum || 0))
                    .map(inst => {
                      const isFuture = isOpeningStillSoon(inst.openedDate);
                      return (
                        <div key={inst.id} className={`${styles.instTile} ${isFuture ? styles.instTileSoon : ''}`}>
                          <div className={styles.instTileHead}>
                            <span className={styles.instTileLabel}>{inst.label || inst.chronicle}</span>
                            {isFuture && <span className={styles.instTileSoonBadge}>⏳ Скоро</span>}
                          </div>
                          <div className={styles.instTileTags}>
                            <span className="tag tr">{inst.rates}</span>
                            <span className="tag tc">{inst.chronicle}</span>
                            {inst.type && <span className="tag tn">{typeLabels.get(inst.type as any) ?? inst.type}</span>}
                          </div>
                          {inst.shortDesc && <div className={styles.instTileDesc}>{inst.shortDesc}</div>}
                          {isFuture && (
                            <div className={styles.instTileDate}>
                              {new Date(inst.openedDate!).toLocaleDateString('ru-RU', { day: 'numeric', month: 'long' })}
                            </div>
                          )}
                          <a
                            href={inst.url}
                            target="_blank"
                            rel="noopener nofollow"
                            className={styles.instTileBtn}
                          >
                            На сайт →
                          </a>
                        </div>
                      );
                    })}
                </div>
              </div>
            </div>
          )}

          <div className={styles.dblock}>
            <div className={styles.votePanelHead}>
              <div>
                <div className={styles.dblockTitleInline}>Голоса за сервер</div>
                <div className={styles.votePanelMeta}>
                  Всего: {voteSummary?.totalVotes ?? totalVotes}, за месяц: {voteSummary?.monthlyVotes ?? 0}, сегодня: {voteSummary?.todayVotes ?? 0}
                </div>
              </div>
              <span className={`${styles.rewardBadge} ${voteRewardsEnabled ? styles.rewardBadgeOn : ''}`}>
                {voteRewardsEnabled ? 'Бонусы подключены' : 'Бонусы не подключены'}
              </span>
            </div>
            <div className={styles.dblockBody}>
              <div className={styles.voteTabs}>
                <button type="button" className={voteTab === 'top' ? styles.voteTabActive : ''} onClick={() => setVoteTab('top')}>
                  Топ голосующих за месяц
                </button>
                <button type="button" className={voteTab === 'recent' ? styles.voteTabActive : ''} onClick={() => setVoteTab('recent')}>
                  Последние голоса
                </button>
              </div>

              {voteTab === 'top' ? (
                voteSummary?.top?.length ? (
                  <div className={styles.voteTableWrap}>
                    <table className={styles.voteTable}>
                      <thead><tr><th>#</th><th>Игрок</th><th>Голосов</th><th>Ранг</th><th>Последний голос</th></tr></thead>
                      <tbody>
                        {voteSummary?.top.map(row => (
                          <tr key={`${row.place}-${row.nickname}`}>
                            <td>{row.place}</td>
                            <td className={styles.voterName}>{row.nickname}</td>
                            <td>{row.votes}</td>
                            <td><span className={styles.voterRank}>{voterRankLabel(row.votes, row.place)}</span></td>
                            <td>{compactVoteDate(row.lastVoteAt)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <p className={styles.empty}>Топ появится после первых голосов в этом месяце.</p>
                )
              ) : (
                voteSummary?.recent?.length ? (
                  <div className={styles.recentVotes}>
                    {voteSummary?.recent.map((row, index) => (
                      <div key={`${row.nickname}-${row.votedAt}-${index}`} className={styles.recentVoteItem}>
                        <span className={styles.recentVoteIcon}>◆</span>
                        <span className={styles.voterName}>{row.nickname}</span>
                        <span>{compactVoteDate(row.votedAt)}</span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className={styles.empty}>Последних голосов пока нет.</p>
                )
              )}
            </div>
          </div>

          {/* Аптайм-график */}
          {daily && (
            <div className={styles.dblock}>
              <div className={styles.dblockTitle}>Аптайм за 30 дней</div>
              <div className={styles.dblockBody}>
                <div style={{ display:'flex', gap:'1.2rem', marginBottom:'1rem', flexWrap:'wrap' }}>
                  {daily.uptime30 != null && (
                    <div style={{ display:'flex', flexDirection:'column', gap:'.2rem' }}>
                      <span style={{ fontFamily:"'Cinzel',serif", fontSize:'.55rem', color:'var(--text3)', textTransform:'uppercase', letterSpacing:'.1em' }}>Аптайм</span>
                      <span style={{ fontSize:'1.4rem', fontWeight:700, color: daily.uptime30 >= 95 ? '#4caf50' : daily.uptime30 >= 80 ? '#C9A227' : '#e55' }}>
                        {daily.uptime30}%
                      </span>
                    </div>
                  )}
                  {daily.avgResponse != null && (
                    <div style={{ display:'flex', flexDirection:'column', gap:'.2rem' }}>
                      <span style={{ fontFamily:"'Cinzel',serif", fontSize:'.55rem', color:'var(--text3)', textTransform:'uppercase', letterSpacing:'.1em' }}>Ср. ответ</span>
                      <span style={{ fontSize:'1.4rem', fontWeight:700, color:'var(--text1)' }}>{daily.avgResponse} мс</span>
                    </div>
                  )}
                </div>

                {/* Столбчатый график по дням */}
                <div style={{ display:'flex', gap:'2px', alignItems:'flex-end', height:'40px' }}>
                  {daily.days.map((d: { date: string; uptime: number | null; total: number }) => {
                    const color = d.uptime == null
                      ? 'var(--bg3)'
                      : d.uptime >= 95 ? '#4caf50'
                      : d.uptime >= 50 ? '#C9A227'
                      : '#e55';
                    const height = d.uptime == null ? '30%' : `${Math.max(d.uptime, 8)}%`;
                    return (
                      <div
                        key={d.date}
                        title={d.uptime != null ? `${d.date}: ${d.uptime}% (${d.total} проверок)` : `${d.date}: нет данных`}
                        style={{ flex:1, background:color, height, borderRadius:'2px 2px 0 0', transition:'height .3s', minHeight:'3px', cursor:'default' }}
                      />
                    );
                  })}
                </div>
                <div style={{ display:'flex', justifyContent:'space-between', marginTop:'.3rem' }}>
                  <span style={{ fontSize:'.68rem', color:'var(--text3)' }}>30 дней назад</span>
                  <span style={{ fontSize:'.68rem', color:'var(--text3)' }}>Сегодня</span>
                </div>
              </div>
            </div>
          )}

          {/* Форма отзыва */}
          <div className={styles.dblock}>
            <div className={styles.dblockTitle}>Оставить отзыв</div>
            <div className={styles.dblockBody}>
              {user ? (
                <form onSubmit={submitReview} className={styles.reviewForm}>
                  <div className={styles.stars}>
                    {[1,2,3,4,5].map(n => (
                      <button key={n} type="button" className={n <= reviewRating ? styles.starOn : styles.star} onClick={() => setReviewRating(n)}>★</button>
                    ))}
                    <span className={styles.ratingLbl}>{reviewRating} / 5</span>
                  </div>
                  <textarea
                    className="input"
                    placeholder="Расскажи об опыте на сервере..."
                    rows={4}
                    value={reviewTxt}
                    onChange={e => setReviewTxt(e.target.value)}
                    required
                    style={{ resize: 'vertical' }}
                  />
                  <button className="btn-primary" type="submit" disabled={submitting} style={{ alignSelf: 'flex-start', padding: '.45rem 1.2rem' }}>
                    {submitting ? <span className="spin" /> : 'Отправить отзыв'}
                  </button>
                </form>
              ) : (
                <p className={styles.empty}>Войдите в аккаунт чтобы оставить отзыв</p>
              )}
            </div>
          </div>

          {/* Отзывы */}
          <div className={styles.dblock}>
            <div className={styles.dblockTitle}>Отзывы игроков {server.ratingCount > 0 && `(${server.ratingCount})`}</div>
            <div className={styles.dblockBody}>
              {reviews.length > 0 ? (
                <div className={styles.reviewList}>
                  {reviews.map(r => (
                    <ReviewCard
                      key={r.id}
                      review={r}
                      canDelete={isAdmin || r.user.id === user?.id}
                      onDelete={() => deleteReview(r.id)}
                    />
                  ))}
                </div>
              ) : (
                <p className={styles.empty}>Отзывов пока нет — будьте первым!</p>
              )}
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}

function SocialLink({ ico, name, href }: { ico: string; name: string; href: string }) {
  return (
    <a href={href} target="_blank" rel="noopener" className={styles.socialLink}>
      <span className={styles.socialIco}>{ico}</span>
      <span>{name}</span>
      <span className={styles.socialVal}>Перейти →</span>
    </a>
  );
}
function ReviewCard({
  review: r,
  canDelete,
  onDelete,
}: {
  review: Review;
  canDelete?: boolean;
  onDelete?: () => void;
}) {
  // Только никнейм — ФИО из VK не светим
  const displayName = r.user.nickname || 'Игрок';
  return (
    <div className={styles.reviewCard}>
      <div className={styles.reviewHead}>
        <span className={styles.reviewUser} style={{ display: 'inline-flex', alignItems: 'center', gap: '.5rem' }}>
          {r.user.avatar && (
            <img
              src={r.user.avatar}
              alt={`Аватар ${displayName}`}
              style={{ width: 22, height: 22, borderRadius: '50%', objectFit: 'cover' }}
            />
          )}
          {displayName}
        </span>
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: '.6rem' }}>
          <span className={styles.reviewDate}>{new Date(r.createdAt).toLocaleDateString('ru-RU')}</span>
          {canDelete && onDelete && (
            <button
              type="button"
              onClick={onDelete}
              title="Удалить отзыв"
              style={{
                background: 'transparent',
                border: '1px solid var(--border)',
                color: 'var(--text3)',
                fontSize: '.7rem',
                padding: '.15rem .45rem',
                borderRadius: 2,
                cursor: 'pointer',
                lineHeight: 1,
              }}
            >
              ✕
            </button>
          )}
        </span>
      </div>
      <div className={styles.reviewStars}>{'★'.repeat(r.rating)}{'☆'.repeat(5 - r.rating)}</div>
      <p className={styles.reviewTxt}>{r.text}</p>
    </div>
  );
}
