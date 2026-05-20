'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';
import { api } from '@/lib/api';
import type { FavoriteServer, OpeningReminder } from '@/lib/types';
import styles from './page.module.css';

type ProfileTab = 'overview' | 'security';

type MyReview = {
  id: string;
  rating: number;
  text: string;
  approved: boolean;
  createdAt: string;
  server: { id: string; name: string; icon: string | null };
};

type SavedArticle = {
  slug: string;
  title: string;
  description?: string;
  image?: string | null;
  category?: string;
  savedAt: string;
};

type RecentServer = {
  id: string;
  name: string;
  icon?: string | null;
  banner?: string | null;
  chronicle?: string;
  rates?: string;
  viewedAt: string;
};

const NICK_RE = /^[a-zA-Zа-яА-ЯёЁ0-9_-]{3,16}$/;
const SAVED_ARTICLES_KEY = 'l2r_saved_articles';
const RECENT_SERVERS_KEY = 'l2r_recent_servers';

function readStorageList<T>(key: string): T[] {
  if (typeof window === 'undefined') return [];
  try {
    const value = JSON.parse(localStorage.getItem(key) || '[]');
    return Array.isArray(value) ? value : [];
  } catch {
    return [];
  }
}

function formatDate(value?: string | null) {
  if (!value) return '—';
  return new Date(value).toLocaleDateString('ru-RU', { day: 'numeric', month: 'long', year: 'numeric' });
}

function compactDate(value?: string | null) {
  if (!value) return '—';
  const date = new Date(value);
  const diff = Date.now() - date.getTime();
  if (diff < 60_000) return 'только что';
  if (diff < 3_600_000) return `${Math.max(1, Math.floor(diff / 60_000))} мин назад`;
  if (diff < 86_400_000) return `${Math.floor(diff / 3_600_000)} ч назад`;
  return date.toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' });
}

function openingText(value: string) {
  const diff = new Date(value).getTime() - Date.now();
  if (diff <= 0) return 'открытие уже началось';
  const hoursTotal = Math.ceil(diff / 3_600_000);
  if (hoursTotal <= 1) return 'меньше часа до открытия';
  if (hoursTotal <= 5) return `примерно ${hoursTotal} ч до открытия`;
  const days = Math.floor(hoursTotal / 24);
  const hours = hoursTotal % 24;
  if (days > 0) return hours ? `${days} д ${hours} ч до открытия` : `${days} д до открытия`;
  return `${hoursTotal} ч до открытия`;
}

function statusLabel(status?: string) {
  if (status === 'online') return 'Онлайн';
  if (status === 'offline') return 'Оффлайн';
  return 'Статус неизвестен';
}

function Stars({ rating }: { rating: number }) {
  const safe = Math.max(0, Math.min(5, Math.round(rating)));
  return <span className={styles.stars}>{'★'.repeat(safe)}{'☆'.repeat(5 - safe)}</span>;
}

export default function ProfilePage() {
  const router = useRouter();
  const { user, token, loading, logout, updateUser } = useAuth();
  const [tab, setTab] = useState<ProfileTab>('overview');

  const [reviews, setReviews] = useState<MyReview[]>([]);
  const [reviewsLoading, setReviewsLoading] = useState(true);
  const [favorites, setFavorites] = useState<FavoriteServer[]>([]);
  const [favLoading, setFavLoading] = useState(true);
  const [reminders, setReminders] = useState<OpeningReminder[]>([]);
  const [voteCount, setVoteCount] = useState(0);
  const [savedArticles, setSavedArticles] = useState<SavedArticle[]>([]);
  const [recentServers, setRecentServers] = useState<RecentServer[]>([]);

  const [nick, setNick] = useState('');
  const [nickSaving, setNickSaving] = useState(false);
  const [nickError, setNickError] = useState('');
  const [nickSuccess, setNickSuccess] = useState(false);

  useEffect(() => {
    if (!loading && !token) router.push('/');
  }, [loading, token, router]);

  useEffect(() => {
    if (user?.nickname) setNick(user.nickname);
  }, [user?.nickname]);

  useEffect(() => {
    setSavedArticles(readStorageList<SavedArticle>(SAVED_ARTICLES_KEY).slice(0, 8));
    setRecentServers(readStorageList<RecentServer>(RECENT_SERVERS_KEY).slice(0, 8));
  }, []);

  useEffect(() => {
    if (!token) return;
    let alive = true;
    setReviewsLoading(true);
    setFavLoading(true);

    api.reviews.my(token)
      .then(items => { if (alive) setReviews(items); })
      .catch(() => { if (alive) setReviews([]); })
      .finally(() => { if (alive) setReviewsLoading(false); });

    api.favorites.list(token)
      .then(items => { if (alive) setFavorites(items); })
      .catch(() => { if (alive) setFavorites([]); })
      .finally(() => { if (alive) setFavLoading(false); });

    api.openingReminders.due(token)
      .then(items => { if (alive) setReminders(items); })
      .catch(() => { if (alive) setReminders([]); });

    api.votes.myCount(token)
      .then(result => { if (alive) setVoteCount(result.total || 0); })
      .catch(() => { if (alive) setVoteCount(0); });

    return () => { alive = false; };
  }, [token]);

  const displayName = user?.nickname || user?.name || user?.email || 'Игрок';
  const initial = displayName[0]?.toUpperCase() || '?';
  const joinedAt = user?.createdAt ? formatDate(user.createdAt) : 'недавно';

  const stats = useMemo(() => [
    { label: 'Избранных серверов', value: favorites.length },
    { label: 'Голосов', value: voteCount },
    { label: 'Отзывов', value: reviews.length },
    { label: 'Статей сохранено', value: savedArticles.length },
  ], [favorites.length, voteCount, reviews.length, savedArticles.length]);

  async function handleNickSubmit(e: React.FormEvent) {
    e.preventDefault();
    setNickError('');
    setNickSuccess(false);
    const trimmed = nick.trim();
    if (!NICK_RE.test(trimmed)) {
      setNickError('3-16 символов: буквы, цифры, _ или -');
      return;
    }
    if (trimmed === user?.nickname) {
      setNickError('Это уже твой никнейм');
      return;
    }
    setNickSaving(true);
    try {
      const updated = await api.auth.updateNickname(trimmed, token!);
      updateUser(updated);
      setNickSuccess(true);
    } catch (err) {
      setNickError(err instanceof Error ? err.message : 'Не удалось сохранить');
    } finally {
      setNickSaving(false);
    }
  }

  async function removeFavorite(serverId: string) {
    if (!token) return;
    try {
      await api.favorites.remove(serverId, token);
      setFavorites(prev => prev.filter(f => f.server.id !== serverId));
    } catch {}
  }

  function removeSavedArticle(slug: string) {
    const next = savedArticles.filter(item => item.slug !== slug);
    setSavedArticles(next);
    localStorage.setItem(SAVED_ARTICLES_KEY, JSON.stringify(next));
  }

  function removeRecentServer(id: string) {
    const next = recentServers.filter(item => item.id !== id);
    setRecentServers(next);
    localStorage.setItem(RECENT_SERVERS_KEY, JSON.stringify(next));
  }

  if (loading || !user) {
    return <main className={styles.loading}>Загрузка профиля...</main>;
  }

  return (
    <main className={styles.page}>
      <section className={styles.hero}>
        <div className={styles.avatarWrap}>
          {user.avatar ? (
            <img src={user.avatar} alt={`Аватар ${displayName}`} className={styles.avatar} />
          ) : (
            <span className={styles.avatarFallback}>{initial}</span>
          )}
        </div>

        <div className={styles.heroInfo}>
          <div className={styles.breadcrumb}>Главная / Профиль</div>
          <div className={styles.nameLine}>
            <h1>{displayName}</h1>
            <span>{user.role === 'ADMIN' ? 'Администратор' : 'Пользователь'}</span>
          </div>
          <p>С нами с {joinedAt}</p>
          <div className={styles.heroStats}>
            {stats.map(item => (
              <div key={item.label}>
                <strong>{item.value}</strong>
                <span>{item.label}</span>
              </div>
            ))}
          </div>
        </div>

        <button type="button" className={styles.heroButton} onClick={() => setTab('security')}>
          Настроить профиль
        </button>
      </section>

      <div className={styles.layout}>
        <aside className={styles.sidebar}>
          <button type="button" className={tab === 'overview' ? styles.navActive : ''} onClick={() => setTab('overview')}>
            Главная
          </button>
          <button type="button" className={tab === 'security' ? styles.navActive : ''} onClick={() => setTab('security')}>
            Безопасность
          </button>
          <button type="button" className={styles.logoutBtn} onClick={() => { logout(); router.push('/'); }}>
            Выйти
          </button>
        </aside>

        {tab === 'overview' ? (
          <div className={styles.content}>
            <section className={styles.activityCard}>
              <div className={styles.sectionHead}>
                <div>
                  <h2>Обзор активности</h2>
                  <p>Коротко о твоём движении на L2Realm</p>
                </div>
              </div>
              <div className={styles.activityGrid}>
                {stats.map(item => (
                  <div key={item.label} className={styles.activityItem}>
                    <strong>{item.value}</strong>
                    <span>{item.label}</span>
                  </div>
                ))}
              </div>
            </section>

            <section id="favorites" className={styles.panel}>
              <div className={styles.sectionHead}>
                <h2>Избранные серверы <span>{favorites.length}</span></h2>
                <Link href="/">Смотреть каталог</Link>
              </div>
              {favLoading ? (
                <p className={styles.empty}>Загрузка...</p>
              ) : favorites.length === 0 ? (
                <p className={styles.empty}>Пока нет избранных серверов.</p>
              ) : (
                <div className={styles.favoriteGrid}>
                  {favorites.slice(0, 4).map(f => (
                    <article key={f.id} className={styles.favoriteCard}>
                      <button type="button" onClick={() => removeFavorite(f.server.id)} aria-label="Убрать из избранного">×</button>
                      <Link href={`/servers/${f.server.id}`}>
                        <span className={styles.serverArt}>
                          {f.server.icon ? <img src={f.server.icon} alt="" /> : <span>{f.server.name[0]}</span>}
                        </span>
                        <strong>{f.server.name}</strong>
                        <small>{f.server.chronicle} · {f.server.rates}</small>
                        <em className={f.server.status === 'online' ? styles.online : ''}>{statusLabel(f.server.status)}</em>
                      </Link>
                    </article>
                  ))}
                </div>
              )}
            </section>

            <div className={styles.twoColumns}>
              <section id="notifications" className={styles.panel}>
                <div className={styles.sectionHead}>
                  <h2>Напоминания об открытиях <span>{reminders.length}</span></h2>
                </div>
                {reminders.length === 0 ? (
                  <p className={styles.empty}>Нет ближайших открытий в ближайшие 24 часа.</p>
                ) : (
                  <div className={styles.list}>
                    {reminders.map(item => (
                      <Link key={item.id} href={`/servers/${item.serverId}`} className={styles.listRow}>
                        {item.server?.icon ? <img src={item.server.icon} alt="" /> : <span className={styles.rowIcon}>{item.server?.name?.[0] || 'L'}</span>}
                        <span>
                          <strong>{item.server?.name || 'Сервер'}</strong>
                          <small>{openingText(item.openingAt)}</small>
                        </span>
                      </Link>
                    ))}
                  </div>
                )}
              </section>

              <section className={styles.panel}>
                <div className={styles.sectionHead}>
                  <h2>Последние отзывы <span>{reviews.length}</span></h2>
                </div>
                {reviewsLoading ? (
                  <p className={styles.empty}>Загрузка...</p>
                ) : reviews.length === 0 ? (
                  <p className={styles.empty}>Ты пока не оставлял отзывы.</p>
                ) : (
                  <div className={styles.reviewList}>
                    {reviews.slice(0, 3).map(r => (
                      <Link key={r.id} href={`/servers/${r.server.id}`} className={styles.reviewRow}>
                        {r.server.icon ? <img src={r.server.icon} alt="" /> : <span className={styles.rowIcon}>{r.server.name[0]}</span>}
                        <span>
                          <strong>{r.server.name}</strong>
                          <Stars rating={r.rating} />
                          <small>{r.text}</small>
                        </span>
                        <time>{formatDate(r.createdAt)}</time>
                      </Link>
                    ))}
                  </div>
                )}
              </section>
            </div>

            <div className={styles.twoColumns}>
              <section className={styles.panel}>
                <div className={styles.sectionHead}>
                  <h2>Недавние просмотры <span>{recentServers.length}</span></h2>
                </div>
                {recentServers.length === 0 ? (
                  <p className={styles.empty}>Открой пару страниц серверов, и они появятся здесь.</p>
                ) : (
                  <div className={styles.recentGrid}>
                    {recentServers.slice(0, 4).map(item => (
                      <article key={item.id} className={styles.recentCard}>
                        <button type="button" onClick={() => removeRecentServer(item.id)} aria-label="Убрать из истории">×</button>
                        <Link href={`/servers/${item.id}`}>
                          {item.banner || item.icon ? <img src={item.banner || item.icon || ''} alt="" /> : <span>{item.name[0]}</span>}
                          <strong>{item.name}</strong>
                          <small>{compactDate(item.viewedAt)}</small>
                        </Link>
                      </article>
                    ))}
                  </div>
                )}
              </section>

              <section className={styles.panel}>
                <div className={styles.sectionHead}>
                  <h2>Сохранённые статьи <span>{savedArticles.length}</span></h2>
                  <Link href="/blog">Все статьи</Link>
                </div>
                {savedArticles.length === 0 ? (
                  <p className={styles.empty}>На странице статьи нажми “Сохранить”, чтобы вернуться к ней позже.</p>
                ) : (
                  <div className={styles.articleList}>
                    {savedArticles.slice(0, 5).map(item => (
                      <div key={item.slug} className={styles.articleRow}>
                        <Link href={`/blog/${item.slug}`}>
                          {item.image && <img src={item.image} alt="" />}
                          <span>
                            <strong>{item.title}</strong>
                            <small>{compactDate(item.savedAt)}</small>
                          </span>
                        </Link>
                        <button type="button" onClick={() => removeSavedArticle(item.slug)} aria-label="Убрать статью">×</button>
                      </div>
                    ))}
                  </div>
                )}
              </section>
            </div>
          </div>
        ) : (
          <div className={styles.content}>
            <section className={styles.panel}>
              <div className={styles.sectionHead}>
                <div>
                  <h2>Безопасность и имя</h2>
                  <p>Здесь можно поменять публичный никнейм.</p>
                </div>
              </div>

              <form onSubmit={handleNickSubmit} className={styles.securityForm}>
                <label>
                  <span>Никнейм</span>
                  <input
                    type="text"
                    maxLength={16}
                    value={nick}
                    onChange={e => { setNick(e.target.value); setNickSuccess(false); }}
                    placeholder="3-16 символов"
                  />
                </label>
                <p className={styles.hint}>Буквы, цифры, “_” и “-”. Менять можно не чаще одного раза в 7 дней.</p>
                {nickError && <p className={styles.error}>{nickError}</p>}
                {nickSuccess && <p className={styles.success}>Никнейм сохранён</p>}
                <button type="submit" disabled={nickSaving}>{nickSaving ? 'Сохраняем...' : 'Сохранить имя'}</button>
              </form>
            </section>

            <section className={styles.panel}>
              <div className={styles.sectionHead}>
                <h2>Аккаунт</h2>
              </div>
              <div className={styles.accountRows}>
                <div><span>Email</span><strong>{user.email}</strong></div>
                <div><span>Вход</span><strong>{user.vkId ? 'VK ID' : 'Email'}</strong></div>
                <div><span>Роль</span><strong>{user.role === 'ADMIN' ? 'Админ' : 'Пользователь'}</strong></div>
              </div>
            </section>
          </div>
        )}
      </div>
    </main>
  );
}
