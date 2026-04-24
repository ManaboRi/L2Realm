'use client';
import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { api } from '@/lib/api';
import { useAuth } from '@/context/AuthContext';
import type { Server, Review, VoteStatus } from '@/lib/types';
import styles from './page.module.css';

function fmtDate(s?: string | null) {
  if (!s) return '—';
  return new Date(s).toLocaleDateString('ru-RU', { day: 'numeric', month: 'long', year: 'numeric' });
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

function formatDesc(text: string) {
  if (!text) return null;
  const lines = text.split(/\\n|\n/);
  const result: React.ReactNode[] = [];
  let bullets: string[] = [];

  function flushBullets() {
    if (!bullets.length) return;
    result.push(
      <div key={result.length} className={styles.descBullets}>
        {bullets.map((b, i) => <div key={i} className={styles.descBullet} dangerouslySetInnerHTML={{ __html: b.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>') }} />)}
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
      result.push(<p key={result.length} className={styles.descPara} dangerouslySetInnerHTML={{ __html: line.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>') }} />);
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
  const [voting,      setVoting]      = useState(false);

  // Мониторинг и аптайм-график — свежие данные, подгружаются на клиенте.
  // SEO-критичный контент (название, описание, отзывы) уже в initialServer.
  useEffect(() => {
    api.monitoring.status(id).then(setStatus).catch(() => {});
    api.monitoring.daily(id, 30).then(setDaily).catch(() => {});
  }, [id]);

  useEffect(() => {
    if (!token) { setIsFav(false); return; }
    api.favorites.ids(token).then(ids => setIsFav(ids.includes(id))).catch(() => {});
  }, [token, id]);

  useEffect(() => {
    if (!token) { setVoteStatus(null); return; }
    api.votes.status(id, token).then(setVoteStatus).catch(() => {});
  }, [token, id]);

  async function handleVote() {
    if (!token) return showToast('Войдите, чтобы проголосовать');
    setVoting(true);
    try {
      await api.votes.vote(id, token);
      showToast('Голос принят! ▲ +1 к рейтингу сервера');
      setServer(prev => ({ ...prev, monthlyVotes: (prev.monthlyVotes ?? 0) + 1 }));
      const fresh = await api.votes.status(id, token);
      setVoteStatus(fresh);
    } catch {
      // Обновляем статус чтобы показать cooldown, если голосование заблокировано
      if (token) api.votes.status(id, token).then(setVoteStatus).catch(() => {});
      showToast('Голос уже учтён — следующий через 12 ч.');
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

  return (
    <div className={styles.page}>
      {toast && <div className={`${styles.toast} ${toast.includes('Ошибка') ? styles.toastError : ''}`}>{toast}</div>}

      {/* Breadcrumb */}
      <div className={styles.bread}>
        <Link href="/" className={styles.breadLink}>Главная</Link>
        <span className={styles.breadSep}>›</span>
        <Link href="/" className={styles.breadLink}>Все серверы</Link>
        <span className={styles.breadSep}>›</span>
        <span>{server.name}</span>
      </div>

      {/* Баннер */}
      <div className={styles.banner}>
        {server.banner
          ? <><img src={server.banner} alt={server.name} /><div className={styles.bannerOverlay} /></>
          : <div className={styles.bannerPh}><span>{server.name.toUpperCase()}</span></div>}
      </div>

      {/* Шапка сервера */}
      <div className={styles.header}>
        <div className={styles.headerInner}>
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
                <span className={styles.hstat}>
                  <img src="/images/vote-icon.png" alt="" style={{ width: 14, height: 14, objectFit: 'contain' }} />
                  {server.monthlyVotes ?? 0} голосов / мес.
                </span>
                {server.ratingCount > 0 && (
                  <>
                    <span className={styles.hstatDot}>·</span>
                    <span className={styles.hstat}>★ {server.rating.toFixed(1)} / 5</span>
                    <span className={styles.hstatDot}>·</span>
                    <span className={styles.hstat}>{server.ratingCount} {server.ratingCount === 1 ? 'отзыв' : server.ratingCount < 5 ? 'отзыва' : 'отзывов'}</span>
                  </>
                )}
              </div>
            </div>
          </div>
          <div className={styles.headerRight}>
            {/* Ряд 1: Голосовать + Избранное */}
            <div className={styles.headerActions}>
              <div className={styles.voteWrap}>
                <button
                  type="button"
                  className="btn-primary"
                  style={{ opacity: voteStatus?.voted ? 0.45 : 1, padding: '.48rem 1rem' }}
                  onClick={handleVote}
                  disabled={voting || !!voteStatus?.voted}
                  title="Проголосовать за сервер (раз в 12 часов)"
                >
                  {voting
                    ? <span className="spin" />
                    : <><img src="/images/vote-icon.png" alt="" style={{ width: 26, height: 26, objectFit: 'contain', marginRight: '.35rem', verticalAlign: 'middle' }} />Проголосовать</>}
                </button>
                {(server.weeklyVotes ?? 0) > 0 && (
                  <span className={styles.weeklyCount}>
                    {server.weeklyVotes} голосов за 7 дн.
                  </span>
                )}
                {voteStatus?.voted && cooldownText(voteStatus.cooldownEnds) && (
                  <span className={styles.weeklyCount}>{cooldownText(voteStatus.cooldownEnds)}</span>
                )}
              </div>
              <button
                type="button"
                className="btn-ghost"
                style={{ color: isFav ? 'var(--gold)' : undefined, borderColor: isFav ? 'var(--gold)' : undefined, padding: '.48rem .9rem' }}
                onClick={toggleFavorite}
                disabled={favBusy}
                title={isFav ? 'Убрать из избранного' : 'Добавить в избранное'}
              >
                {isFav ? '★ В избранном' : '⚔ В избранное'}
              </button>
            </div>
            {/* Ряд 2: Перейти на сервер — главный CTA */}
            <a href={server.url} target="_blank" rel="noopener" className={styles.btnSiteLarge}>
              Перейти на сервер →
            </a>
          </div>
        </div>
      </div>

      {/* Тело */}
      <div className={styles.body}>

        {/* Левая колонка */}
        <div className={styles.left}>
          <div className={styles.block}>
            <div className={styles.blockTitle}>Характеристики</div>
            <div className={styles.rows}>
              {[
                ['Хроника',    server.chronicle],
                ['Рейты',      server.rates],
                ['Страна',     flag(server.country)],
                ['Открылся',   relativeOpened(server.openedDate)],
                ['Рейтинг',    server.ratingCount > 0 ? `${server.rating.toFixed(1)} ⭐ (${server.ratingCount})` : 'Нет отзывов'],
                ['Голосов / нед.', (server.weeklyVotes ?? 0) > 0 ? `▲ ${server.weeklyVotes}` : '—'],
                ['Тариф',      server.subscription?.plan ?? 'FREE'],
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

          {/* Новости */}
          <div className={styles.dblock}>
            <div className={styles.dblockTitle}>Новости и обновления</div>
            <div className={styles.dblockBody}>
              {server.news && server.news.length > 0 ? (
                <div className={styles.newsList}>
                  {server.news.map(n => (
                    <div key={n.id} className={styles.newsCard}>
                      <div className={styles.newsSrc}>{server.name}</div>
                      <h3 className={styles.newsTitle}>{n.title}</h3>
                      <p className={styles.newsBody}>{n.body}</p>
                      <p className={styles.newsDate}>{fmtDate(n.date)}</p>
                    </div>
                  ))}
                </div>
              ) : (
                <p className={styles.empty}>Новостей пока нет</p>
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
              alt=""
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
