'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';
import { api } from '@/lib/api';
import type { FavoriteServer } from '@/lib/types';

type MyReview = {
  id: string;
  rating: number;
  text: string;
  approved: boolean;
  createdAt: string;
  server: { id: string; name: string; icon: string | null };
};

const NICK_RE = /^[a-zA-Zа-яА-ЯёЁ0-9_\-]{3,16}$/;

const labelStyle: React.CSSProperties = {
  fontFamily: "'Cinzel',serif",
  fontSize: '.58rem',
  color: 'var(--text3)',
  textTransform: 'uppercase',
  letterSpacing: '.1em',
};

const cardStyle: React.CSSProperties = {
  background: 'var(--bg2)',
  border: '1px solid var(--border)',
  borderRadius: '.8rem',
  padding: 'clamp(1rem, 4vw, 2rem)',
};

const sectionTitleStyle: React.CSSProperties = {
  fontFamily: "'Cinzel',serif",
  fontSize: '.65rem',
  color: 'var(--gold)',
  textTransform: 'uppercase',
  letterSpacing: '.15em',
  marginBottom: '1rem',
};

export default function ProfilePage() {
  const router = useRouter();
  const { user, token, loading, logout, updateUser } = useAuth();

  const [reviews, setReviews] = useState<MyReview[]>([]);
  const [reviewsLoading, setReviewsLoading] = useState(true);

  const [favorites, setFavorites] = useState<FavoriteServer[]>([]);
  const [favLoading, setFavLoading] = useState(true);

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
    if (!token) return;
    api.reviews.my(token)
      .then(setReviews)
      .catch(() => setReviews([]))
      .finally(() => setReviewsLoading(false));
    api.favorites.list(token)
      .then(setFavorites)
      .catch(() => setFavorites([]))
      .finally(() => setFavLoading(false));
  }, [token]);

  async function handleNickSubmit(e: React.FormEvent) {
    e.preventDefault();
    setNickError('');
    setNickSuccess(false);
    const trimmed = nick.trim();
    if (!NICK_RE.test(trimmed)) {
      setNickError('3–16 символов, только буквы / цифры / _ / -');
      return;
    }
    if (trimmed === user?.nickname) {
      setNickError('Этот никнейм уже твой');
      return;
    }
    setNickSaving(true);
    try {
      const updated = await api.auth.updateNickname(trimmed, token!);
      updateUser(updated);
      setNickSuccess(true);
    } catch (err) {
      setNickError(err instanceof Error ? err.message : 'Не удалось сохранить');
    }
    setNickSaving(false);
  }

  async function removeFavorite(serverId: string) {
    if (!token) return;
    try {
      await api.favorites.remove(serverId, token);
      setFavorites(prev => prev.filter(f => f.server.id !== serverId));
    } catch {}
  }

  if (loading || !user) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '60vh' }}>
        Загрузка...
      </div>
    );
  }

  return (
    <div style={{ maxWidth: '780px', margin: '0 auto', padding: 'clamp(1rem, 3vw, 2rem) clamp(.7rem, 2vw, 1rem)', display: 'flex', flexDirection: 'column', gap: '1.2rem' }}>

      {/* ── Карточка профиля ─────────────────────── */}
      <section style={cardStyle}>
        <div style={sectionTitleStyle}>Личный кабинет</div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 'clamp(.8rem, 2.5vw, 1.2rem)', marginBottom: '1.4rem', flexWrap: 'wrap' }}>
          {user.avatar ? (
            <img
              src={user.avatar}
              alt=""
              style={{ width: 'clamp(56px, 14vw, 72px)', height: 'clamp(56px, 14vw, 72px)', borderRadius: '50%', objectFit: 'cover', border: '1px solid var(--border2)', flexShrink: 0 }}
            />
          ) : (
            <div style={{
              width: 'clamp(56px, 14vw, 72px)', height: 'clamp(56px, 14vw, 72px)', borderRadius: '50%',
              background: 'var(--bg1)', border: '1px solid var(--border2)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontFamily: "'Cinzel',serif", fontSize: 'clamp(1.2rem, 4vw, 1.6rem)', color: 'var(--gold)', flexShrink: 0,
            }}>
              {(user.nickname || user.name || user.email)[0]?.toUpperCase()}
            </div>
          )}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '.25rem', minWidth: 0, flex: 1, wordBreak: 'break-word' }}>
            <div style={{ fontFamily: "'Cinzel',serif", fontSize: '1.1rem', color: 'var(--text1)' }}>
              {user.nickname || user.name || 'Без ника'}
            </div>
            <div style={{ fontSize: '.7rem', color: 'var(--text3)' }}>
              {user.vkId ? 'VK ID: ' : 'Email: '}{user.email}
            </div>
            <div style={{ fontSize: '.72rem', color: 'var(--text3)' }}>
              {user.role === 'ADMIN' ? 'Администратор' : 'Игрок L2Realm'}
            </div>
          </div>
        </div>

        <button
          className="btn-ghost"
          onClick={() => { logout(); router.push('/'); }}
        >
          Выйти
        </button>
      </section>

      {/* ── Никнейм ──────────────────────────────── */}
      <section style={cardStyle}>
        <div style={sectionTitleStyle}>Никнейм</div>
        <form onSubmit={handleNickSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '.3rem' }}>
            <label style={labelStyle}>Новый никнейм</label>
            <input
              className="input"
              type="text"
              maxLength={16}
              value={nick}
              onChange={e => { setNick(e.target.value); setNickSuccess(false); }}
              placeholder="3–16 символов"
            />
            <div style={{ fontSize: '.7rem', color: 'var(--text3)' }}>
              Буквы (лат/кир), цифры, «_» и «-». Виден другим игрокам.
            </div>
          </div>

          {nickError && <p style={{ color: '#e55', fontSize: '.82rem', margin: 0 }}>{nickError}</p>}
          {nickSuccess && <p style={{ color: '#5c5', fontSize: '.82rem', margin: 0 }}>✅ Никнейм сохранён</p>}

          <button
            className="btn-primary"
            type="submit"
            disabled={nickSaving}
            style={{ padding: '.5rem', alignSelf: 'flex-start', minWidth: '180px' }}
          >
            {nickSaving ? 'Сохраняем...' : 'Сохранить'}
          </button>
        </form>
      </section>

      {/* ── Избранное ────────────────────────────── */}
      <section style={cardStyle}>
        <div style={sectionTitleStyle}>Избранные серверы</div>
        {favLoading ? (
          <p style={{ color: 'var(--text3)', margin: 0 }}>Загрузка...</p>
        ) : favorites.length === 0 ? (
          <p style={{ color: 'var(--text3)', margin: 0 }}>Пока ничего не добавлено. Открой страницу сервера и нажми «⚔ В избранное».</p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '.6rem' }}>
            {favorites.map(f => (
              <div
                key={f.id}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '.8rem',
                  padding: '.65rem .9rem',
                  background: 'var(--bg1)',
                  border: '1px solid var(--border)',
                  borderRadius: '.5rem',
                }}
              >
                {f.server.icon && (
                  <img
                    src={f.server.icon}
                    alt=""
                    style={{ width: 36, height: 36, borderRadius: '.3rem', objectFit: 'cover' }}
                  />
                )}
                <Link
                  href={`/servers/${f.server.id}`}
                  style={{ flex: 1, textDecoration: 'none', color: 'var(--text1)' }}
                >
                  <div style={{ fontWeight: 600 }}>{f.server.name}</div>
                  <div style={{ fontSize: '.72rem', color: 'var(--text3)' }}>
                    {f.server.chronicle} · {f.server.rates} ·{' '}
                    <span style={{
                      color: f.server.status === 'online' ? '#5c5' : f.server.status === 'offline' ? '#e55' : 'var(--text3)',
                    }}>
                      {f.server.status === 'online' ? `онлайн ${f.server.online ?? ''}` : f.server.status === 'offline' ? 'оффлайн' : '—'}
                    </span>
                  </div>
                </Link>
                <button
                  type="button"
                  onClick={() => removeFavorite(f.server.id)}
                  className="btn-ghost"
                  style={{ padding: '.35rem .7rem', fontSize: '.72rem' }}
                  title="Убрать из избранного"
                >
                  ✕
                </button>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* ── Мои отзывы ──────────────────────────── */}
      <section style={cardStyle}>
        <div style={sectionTitleStyle}>Мои отзывы</div>
        {reviewsLoading ? (
          <p style={{ color: 'var(--text3)', margin: 0 }}>Загрузка...</p>
        ) : reviews.length === 0 ? (
          <p style={{ color: 'var(--text3)', margin: 0 }}>У тебя пока нет отзывов.</p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '.75rem' }}>
            {reviews.map(r => (
              <Link
                key={r.id}
                href={`/servers/${r.server.id}`}
                style={{
                  display: 'block',
                  padding: '.75rem 1rem',
                  background: 'var(--bg1)',
                  border: '1px solid var(--border)',
                  borderRadius: '.5rem',
                  textDecoration: 'none',
                  color: 'var(--text1)',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '.4rem' }}>
                  <span style={{ fontWeight: 600 }}>{r.server.name}</span>
                  <span style={{ fontSize: '.8rem', color: 'var(--gold)' }}>{'★'.repeat(r.rating)}{'☆'.repeat(5 - r.rating)}</span>
                </div>
                <p style={{ margin: 0, fontSize: '.88rem', color: 'var(--text2)' }}>{r.text}</p>
                <div style={{ marginTop: '.4rem', fontSize: '.72rem', color: 'var(--text3)' }}>
                  {new Date(r.createdAt).toLocaleDateString('ru-RU')}
                  {r.approved ? ' · опубликован' : ' · на модерации'}
                </div>
              </Link>
            ))}
          </div>
        )}
      </section>

    </div>
  );
}
