'use client';
import { Suspense, useState, useEffect } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { api } from '@/lib/api';

function ResetPasswordForm() {
  const params  = useSearchParams();
  const router  = useRouter();
  const token   = params.get('token') ?? '';

  const [password,  setPassword]  = useState('');
  const [confirm,   setConfirm]   = useState('');
  const [done,      setDone]      = useState(false);
  const [loading,   setLoading]   = useState(false);
  const [error,     setError]     = useState('');

  useEffect(() => {
    if (!token) setError('Токен отсутствует. Запроси новую ссылку.');
  }, [token]);

  async function handleSubmit(e: { preventDefault(): void }) {
    e.preventDefault();
    if (password !== confirm) { setError('Пароли не совпадают'); return; }
    if (password.length < 8)  { setError('Пароль должен быть не менее 8 символов'); return; }
    setLoading(true);
    setError('');
    try {
      await api.auth.resetPassword(token, password);
      setDone(true);
      setTimeout(() => router.push('/'), 3000);
    } catch (err: any) {
      setError(err.message || 'Ссылка недействительна или истекла');
    }
    setLoading(false);
  }

  return (
    <div style={{ display:'flex', alignItems:'center', justifyContent:'center', minHeight:'60vh', padding:'2rem' }}>
      <div style={{ width:'100%', maxWidth:'420px' }}>
        <div style={{ fontFamily:"'Cinzel',serif", fontSize:'.65rem', color:'var(--gold)', textTransform:'uppercase', letterSpacing:'.15em', marginBottom:'1.5rem', textAlign:'center' }}>
          Новый пароль
        </div>

        {done ? (
          <div style={{ background:'var(--bg2)', border:'1px solid var(--border)', borderRadius:'.8rem', padding:'2rem', textAlign:'center' }}>
            <div style={{ fontSize:'2rem', marginBottom:'1rem' }}>✅</div>
            <p style={{ color:'var(--text1)', marginBottom:'.5rem' }}>Пароль успешно изменён!</p>
            <p style={{ color:'var(--text3)', fontSize:'.85rem' }}>Перенаправляем на главную...</p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} style={{ background:'var(--bg2)', border:'1px solid var(--border)', borderRadius:'.8rem', padding:'2rem', display:'flex', flexDirection:'column', gap:'1rem' }}>

            <div style={{ display:'flex', flexDirection:'column', gap:'.3rem' }}>
              <label style={{ fontFamily:"'Cinzel',serif", fontSize:'.58rem', color:'var(--text3)', textTransform:'uppercase', letterSpacing:'.1em' }}>Новый пароль</label>
              <input
                className="input"
                type="password"
                required
                minLength={8}
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="Минимум 8 символов"
              />
            </div>

            <div style={{ display:'flex', flexDirection:'column', gap:'.3rem' }}>
              <label style={{ fontFamily:"'Cinzel',serif", fontSize:'.58rem', color:'var(--text3)', textTransform:'uppercase', letterSpacing:'.1em' }}>Повторите пароль</label>
              <input
                className="input"
                type="password"
                required
                value={confirm}
                onChange={e => setConfirm(e.target.value)}
                placeholder="Повторите пароль"
              />
            </div>

            {error && <p style={{ color:'#e55', fontSize:'.82rem', margin:0 }}>{error}</p>}

            <button className="btn-primary" type="submit" disabled={loading || !token} style={{ padding:'.5rem', marginTop:'.25rem' }}>
              {loading ? 'Сохраняем...' : 'Сохранить пароль'}
            </button>

            <Link href="/forgot-password" style={{ color:'var(--text3)', textDecoration:'none', fontSize:'.8rem', textAlign:'center' }}>
              Запросить новую ссылку
            </Link>
          </form>
        )}
      </div>
    </div>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={<div style={{ display:'flex', alignItems:'center', justifyContent:'center', minHeight:'60vh' }}>Загрузка...</div>}>
      <ResetPasswordForm />
    </Suspense>
  );
}
