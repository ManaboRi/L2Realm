'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';
import { api } from '@/lib/api';

type MyReview = {
  id: string;
  rating: number;
  text: string;
  approved: boolean;
  createdAt: string;
  server: { id: string; name: string; icon: string | null };
};

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
  padding: '2rem',
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
  const { user, token, loading, logout } = useAuth();

  const [reviews, setReviews] = useState<MyReview[]>([]);
  const [reviewsLoading, setReviewsLoading] = useState(true);

  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [pwdSaving, setPwdSaving] = useState(false);
  const [pwdError, setPwdError] = useState('');
  const [pwdSuccess, setPwdSuccess] = useState(false);

  useEffect(() => {
    if (!loading && !token) router.push('/');
  }, [loading, token, router]);

  useEffect(() => {
    if (!token) return;
    api.reviews.my(token)
      .then(setReviews)
      .catch(() => setReviews([]))
      .finally(() => setReviewsLoading(false));
  }, [token]);

  async function handlePasswordSubmit(e: React.FormEvent) {
    e.preventDefault();
    setPwdError('');
    setPwdSuccess(false);

    if (newPassword !== confirmPassword) {
      setPwdError('Новые пароли не совпадают');
      return;
    }
    if (newPassword.length < 6) {
      setPwdError('Пароль должен быть не менее 6 символов');
      return;
    }

    setPwdSaving(true);
    try {
      await api.auth.changePassword(oldPassword, newPassword, token!);
      setPwdSuccess(true);
      setOldPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (err: any) {
      setPwdError(err.message || 'Ошибка при смене пароля');
    }
    setPwdSaving(false);
  }

  if (loading || !user) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '60vh' }}>
        Загрузка...
      </div>
    );
  }

  return (
    <div style={{ maxWidth: '780px', margin: '0 auto', padding: '2rem 1rem', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>

      {/* ── Карточка профиля ─────────────────────── */}
      <section style={cardStyle}>
        <div style={sectionTitleStyle}>Профиль</div>
        <div style={{ display: 'grid', gridTemplateColumns: 'auto 1fr', gap: '.5rem 1.25rem', fontSize: '.95rem' }}>
          <span style={{ color: 'var(--text3)' }}>Email:</span>
          <span style={{ color: 'var(--text1)' }}>{user.email}</span>

          <span style={{ color: 'var(--text3)' }}>Имя:</span>
          <span style={{ color: 'var(--text1)' }}>{user.name || '—'}</span>

          <span style={{ color: 'var(--text3)' }}>Роль:</span>
          <span style={{ color: 'var(--text1)' }}>{user.role === 'ADMIN' ? 'Администратор' : 'Пользователь'}</span>
        </div>
        <button
          className="btn-ghost"
          onClick={() => { logout(); router.push('/'); }}
          style={{ marginTop: '1.25rem' }}
        >
          Выйти
        </button>
      </section>

      {/* ── Смена пароля ─────────────────────────── */}
      <section style={cardStyle}>
        <div style={sectionTitleStyle}>Сменить пароль</div>
        <form onSubmit={handlePasswordSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '.3rem' }}>
            <label style={labelStyle}>Текущий пароль</label>
            <input
              className="input"
              type="password"
              required
              value={oldPassword}
              onChange={e => setOldPassword(e.target.value)}
            />
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '.3rem' }}>
            <label style={labelStyle}>Новый пароль</label>
            <input
              className="input"
              type="password"
              required
              minLength={6}
              value={newPassword}
              onChange={e => setNewPassword(e.target.value)}
              placeholder="Минимум 6 символов"
            />
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '.3rem' }}>
            <label style={labelStyle}>Повторите новый пароль</label>
            <input
              className="input"
              type="password"
              required
              value={confirmPassword}
              onChange={e => setConfirmPassword(e.target.value)}
            />
          </div>

          {pwdError && <p style={{ color: '#e55', fontSize: '.82rem', margin: 0 }}>{pwdError}</p>}
          {pwdSuccess && <p style={{ color: '#5c5', fontSize: '.82rem', margin: 0 }}>✅ Пароль успешно изменён</p>}

          <button className="btn-primary" type="submit" disabled={pwdSaving} style={{ padding: '.5rem', alignSelf: 'flex-start', minWidth: '180px' }}>
            {pwdSaving ? 'Сохраняем...' : 'Сохранить'}
          </button>
        </form>
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
