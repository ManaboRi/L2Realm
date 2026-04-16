'use client';
import { useState } from 'react';
import Link from 'next/link';
import { api } from '@/lib/api';

export default function ForgotPasswordPage() {
  const [email,     setEmail]     = useState('');
  const [sent,      setSent]      = useState(false);
  const [loading,   setLoading]   = useState(false);
  const [error,     setError]     = useState('');

  async function handleSubmit(e: { preventDefault(): void }) {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      await api.auth.forgotPassword(email);
      setSent(true);
    } catch (err: any) {
      setError(err.message || 'Ошибка отправки');
    }
    setLoading(false);
  }

  return (
    <div style={{ display:'flex', alignItems:'center', justifyContent:'center', minHeight:'60vh', padding:'2rem' }}>
      <div style={{ width:'100%', maxWidth:'420px' }}>
        <div style={{ fontFamily:"'Cinzel',serif", fontSize:'.65rem', color:'var(--gold)', textTransform:'uppercase', letterSpacing:'.15em', marginBottom:'1.5rem', textAlign:'center' }}>
          Восстановление пароля
        </div>

        {sent ? (
          <div style={{ background:'var(--bg2)', border:'1px solid var(--border)', borderRadius:'.8rem', padding:'2rem', textAlign:'center' }}>
            <div style={{ fontSize:'2rem', marginBottom:'1rem' }}>✉️</div>
            <p style={{ color:'var(--text1)', marginBottom:'.5rem' }}>Письмо отправлено!</p>
            <p style={{ color:'var(--text3)', fontSize:'.85rem', marginBottom:'1.5rem' }}>
              Проверь почту <strong>{email}</strong>. Ссылка для сброса действует 1 час.
            </p>
            <Link href="/" style={{ color:'var(--gold)', textDecoration:'none', fontSize:'.85rem' }}>← На главную</Link>
          </div>
        ) : (
          <form onSubmit={handleSubmit} style={{ background:'var(--bg2)', border:'1px solid var(--border)', borderRadius:'.8rem', padding:'2rem', display:'flex', flexDirection:'column', gap:'1rem' }}>
            <p style={{ color:'var(--text2)', fontSize:'.87rem', margin:0 }}>
              Введи email аккаунта. Мы отправим ссылку для сброса пароля.
            </p>

            <div style={{ display:'flex', flexDirection:'column', gap:'.3rem' }}>
              <label style={{ fontFamily:"'Cinzel',serif", fontSize:'.58rem', color:'var(--text3)', textTransform:'uppercase', letterSpacing:'.1em' }}>Email</label>
              <input
                className="input"
                type="email"
                required
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="admin@l2realm.ru"
              />
            </div>

            {error && <p style={{ color:'#e55', fontSize:'.82rem', margin:0 }}>{error}</p>}

            <button className="btn-primary" type="submit" disabled={loading} style={{ padding:'.5rem', marginTop:'.25rem' }}>
              {loading ? 'Отправляем...' : 'Отправить ссылку'}
            </button>

            <Link href="/" style={{ color:'var(--text3)', textDecoration:'none', fontSize:'.8rem', textAlign:'center' }}>← Вернуться</Link>
          </form>
        )}
      </div>
    </div>
  );
}
