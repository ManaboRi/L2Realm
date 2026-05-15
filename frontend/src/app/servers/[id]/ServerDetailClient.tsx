'use client';
import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { api } from '@/lib/api';
import { useAuth } from '@/context/AuthContext';
import { AuthModal } from '@/components/AuthModal';
import { isOpeningStillSoon } from '@/lib/opening';
import type { DownloadLink, Server, Review, VoteStatus, VoteSummary } from '@/lib/types';
import { DONATE_OPTIONS, SERVER_TYPES } from '@/lib/types';
import styles from './page.module.css';

const typeLabels = new Map(SERVER_TYPES.map(t => [t.v, t.l]));
const donateLabels = new Map(DONATE_OPTIONS.map(d => [d.v, d.l]));

function normalizedDonate(value?: string | null) {
  return value && value !== 'free' && donateLabels.has(value as any) ? value : null;
}

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
function flag(c?: string) { return { RU:'🇷🇺',EU:'🇪🇺',US:'🇺🇸',DE:'🇩🇪',PL:'🇵🇱',BY:'🇧🇾',UA:'🇺🇦' }[c??''] ?? ''; }

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

function linkHostLabel(url: string) {
  if (url.toLowerCase().startsWith('magnet:')) return 'Magnet';
  try {
    const host = new URL(url).hostname.replace(/^www\./, '').toLowerCase();
    if (host.includes('disk.yandex') || host.includes('yadi.sk')) return 'Яндекс Диск';
    if (host.includes('drive.google')) return 'Google Drive';
    if (host.includes('mega.nz')) return 'MEGA';
    if (host.includes('dropbox.com')) return 'Dropbox';
    if (host.includes('mediafire.com')) return 'MediaFire';
    if (url.toLowerCase().includes('.torrent') || host.includes('torrent')) return 'Torrent';
    return host;
  } catch {
    return 'Внешняя ссылка';
  }
}

const DOWNLOAD_LABELS: Record<string, string> = {
  client: '',
  patch: '',
  updater: '',
  torrent: '',
  mirror: '',
};

function downloadLinkLabel(link: DownloadLink) {
  return link.label?.trim() || linkHostLabel(link.url) || DOWNLOAD_LABELS[link.kind] || 'Скачать';
}

function serverDownloadLinks(server: Server): DownloadLink[] {
  const links = Array.isArray(server.downloadLinks)
    ? server.downloadLinks.filter(link => link?.url)
    : [];
  if (links.length > 0) return links;
  return [
    server.clientUrl && { kind: 'client' as const, label: null, url: server.clientUrl },
    server.patchUrl && { kind: 'patch' as const, label: null, url: server.patchUrl },
    server.updaterUrl && { kind: 'updater' as const, label: null, url: server.updaterUrl },
  ].filter(Boolean) as DownloadLink[];
}

function renderDescInline(text: string) {
  return text.split(/(\*\*[^*]+?\*\*)/g).map((part, index) => {
    const match = part.match(/^\*\*([^*]+?)\*\*$/);
    return match ? <strong key={index}>{match[1]}</strong> : <React.Fragment key={index}>{part}</React.Fragment>;
  });
}

const DOWNLOAD_GROUPS = [
  { kind: 'client', title: 'Клиент' },
  { kind: 'updater', title: 'Апдейтер' },
  { kind: 'patch', title: 'Патч' },
] as const;

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
  const mainType = server.type?.find(t => typeLabels.has(t as any));
  const mainDonate = normalizedDonate(server.donate);
  const totalVotes = voteSummary?.totalVotes ?? server.totalVotes ?? server.weeklyVotes ?? 0;
  const monthlyVotes = voteSummary?.monthlyVotes ?? server.monthlyVotes ?? 0;
  const voteRewardsEnabled = voteSummary?.rewardsEnabled ?? server.voteRewardsEnabled ?? false;
  const startLinks = serverDownloadLinks(server);
  const hasStartGuide = startLinks.length > 0 || !!server.installGuide;
  const startGroups = DOWNLOAD_GROUPS
    .map(group => ({
      ...group,
      links: startLinks.filter(link => group.kind === 'client'
        ? link.kind === 'client' || link.kind === 'torrent' || link.kind === 'mirror'
        : link.kind === group.kind),
    }))
    .filter(group => group.links.length > 0);

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
                {server.boost && new Date(server.boost.endDate) > new Date() && (
                  <span title="Буст активен" style={{ filter: 'drop-shadow(0 0 4px rgba(240,140,70,.6))' }}>🔥</span>
                )}
              </div>
              <div className={styles.headerTags}>
                <span className="tag tc">{server.chronicle}</span>
                <span className="tag tr">{server.rates}</span>
                {!hasInstances && mainType && (
                  <span className="tag tn">{typeLabels.get(mainType as any)}</span>
                )}
                {!hasInstances && mainDonate && <span className="tag tn">{donateLabels.get(mainDonate as any) ?? mainDonate}</span>}
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
                <span>{voteStatus?.voted && cooldownText(voteStatus.cooldownEnds) ? cooldownText(voteStatus.cooldownEnds) : '1 голос / 24ч IP + аккаунт'}</span>
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
          {server.instances && server.instances.length > 0 && (
            <div className={styles.miniStats}>
              <span className={styles.miniStatsNum}>{server.instances.length}</span>
              <span className={styles.miniStatsLbl}>{
                server.instances.length === 1 ? 'сервер проекта'
                  : server.instances.length < 5 ? 'сервера проекта'
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
                ['Страна',     flag(server.country)],
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
                {server.telegram && <SocialLink ico="✈️" name="Telegram" href={server.telegram} />}
                {server.discord  && <SocialLink ico="💬" name="Discord"  href={server.discord} />}
                {server.vk       && <SocialLink ico="🔵" name="ВКонтакте" href={server.vk} />}
                {server.youtube  && <SocialLink ico="▶️" name="YouTube"  href={server.youtube} />}
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
                ? <div className={styles.desc}>{formatDesc(server.fullDesc)}</div>
                : <p className={styles.empty}>Описание отсутствует</p>}

              {hasStartGuide && (
                <div className={styles.startInline}>
                  {startGroups.map(group => (
                    <div key={group.kind} className={styles.startGroup}>
                      <div className={styles.startGroupTitle}>{group.title}</div>
                      <div className={styles.startGroupLinks}>
                        {group.links.map((link, index) => (
                          <a key={`${link.url}-${index}`} href={link.url} target="_blank" rel="noopener nofollow" className={styles.startLink}>
                            <span className={styles.startLinkTitle}>{downloadLinkLabel(link)}</span>
                          </a>
                        ))}
                      </div>
                    </div>
                  ))}
                  {server.installGuide && (
                    <div className={styles.installGuide}>
                      <div className={styles.startGroupTitle}>Инструкция</div>
                      <div className={styles.installGuideBody}>{formatDesc(server.installGuide)}</div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Сервера проекта — компактные плитки в сетке (без основного заголовка блока) */}
          {server.instances && server.instances.length > 0 && (
            <div className={styles.dblock}>
              <div className={styles.dblockBody}>
                <p className={styles.instSubtitle}>
                  {server.instances.length} {server.instances.length === 1 ? 'сервер' : server.instances.length < 5 ? 'сервера' : 'серверов'}
                </p>
                <div className={styles.instances}>
                  {[...server.instances]
                    .sort((a, b) => (a.rateNum || 0) - (b.rateNum || 0))
                    .map(inst => {
                      const isFuture = isOpeningStillSoon(inst.openedDate);
                      const instDonate = normalizedDonate(inst.donate);
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
                            {instDonate && <span className="tag tn">{donateLabels.get(instDonate as any) ?? instDonate}</span>}
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
                        {voteSummary.top.map(row => (
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
                    {voteSummary.recent.map((row, index) => (
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
              {server.reviews && server.reviews.length > 0 ? (
                <div className={styles.reviewList}>
                  {server.reviews.map(r => (
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
