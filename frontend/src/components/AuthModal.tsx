'use client';
import React, { useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { api } from '@/lib/api';
import styles from './AuthModal.module.css';

interface Props { open: boolean; onClose: () => void; }

type Tab = 'login' | 'register' | 'code';

export function AuthModal({ open, onClose }: Props) {
  const { login } = useAuth();
  const [tab,   setTab]   = useState<Tab>('login');
  const [email, setEmail] = useState('');
  const [pass,  setPass]  = useState('');
  const [name,  setName]  = useState('');
  const [code,  setCode]  = useState('');
  const [codeSent, setCodeSent] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  if (!open) return null;

  function reset() {
    setError('');
    setPass('');
    setCode('');
    setCodeSent(false);
  }

  function switchTab(next: Tab) {
    setTab(next);
    reset();
  }

  async function submitPassword(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res = tab === 'login'
        ? await api.auth.login(email, pass)
        : await api.auth.register({ email, password: pass, name });
      login(res.access_token, res.user);
      onClose();
    } catch (e: any) {
      setError(e.message || 'Ошибка. Попробуйте снова.');
    } finally {
      setLoading(false);
    }
  }

  async function sendCode() {
    setError('');
    setLoading(true);
    try {
      await api.auth.sendCode(email);
      setCodeSent(true);
    } catch (e: any) {
      setError(e.message || 'Не удалось отправить код');
    } finally {
      setLoading(false);
    }
  }

  async function verifyCode(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res = await api.auth.verifyCode(email, code);
      login(res.access_token, res.user);
      onClose();
    } catch (e: any) {
      setError(e.message || 'Неверный код');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className={styles.overlay} onClick={e => e.target === e.currentTarget && onClose()}>
      <div className={styles.modal}>
        <button className={styles.close} onClick={onClose}>✕</button>
        <div className={styles.tabs}>
          <button className={`${styles.tab} ${tab === 'login' ? styles.active : ''}`} onClick={() => switchTab('login')}>Войти</button>
          <button className={`${styles.tab} ${tab === 'register' ? styles.active : ''}`} onClick={() => switchTab('register')}>Регистрация</button>
          <button className={`${styles.tab} ${tab === 'code' ? styles.active : ''}`} onClick={() => switchTab('code')}>По коду</button>
        </div>

        {tab === 'code' ? (
          <form onSubmit={codeSent ? verifyCode : (e) => { e.preventDefault(); sendCode(); }} className={styles.form}>
            <input
              className="input"
              type="email"
              placeholder="Email"
              required
              disabled={codeSent}
              value={email}
              onChange={e => setEmail(e.target.value)}
            />
            {codeSent && (
              <input
                className="input"
                type="text"
                inputMode="numeric"
                maxLength={6}
                placeholder="Код из письма (6 цифр)"
                required
                value={code}
                onChange={e => setCode(e.target.value.replace(/\D/g, ''))}
                autoFocus
              />
            )}
            {error && <p className={styles.error}>{error}</p>}
            {codeSent && (
              <p style={{ fontSize: '.8rem', color: 'var(--text3)', margin: 0 }}>
                Код отправлен на <strong>{email}</strong>. Проверь почту (и папку «Спам»).
              </p>
            )}
            <button className="btn-primary" type="submit" disabled={loading} style={{ width: '100%', padding: '.5rem' }}>
              {loading ? <span className="spin" /> : codeSent ? 'Войти' : 'Получить код'}
            </button>
            {codeSent && (
              <button
                type="button"
                className="btn-ghost"
                onClick={() => { setCodeSent(false); setCode(''); setError(''); }}
                style={{ width: '100%', padding: '.4rem', fontSize: '.8rem' }}
              >
                Изменить email
              </button>
            )}
          </form>
        ) : (
          <form onSubmit={submitPassword} className={styles.form}>
            {tab === 'register' && (
              <input className="input" placeholder="Имя (необязательно)" value={name} onChange={e => setName(e.target.value)} />
            )}
            <input className="input" type="email" placeholder="Email" required value={email} onChange={e => setEmail(e.target.value)} />
            <input className="input" type="password" placeholder="Пароль" required minLength={6} value={pass} onChange={e => setPass(e.target.value)} />
            {error && <p className={styles.error}>{error}</p>}
            <button className="btn-primary" type="submit" disabled={loading} style={{ width: '100%', padding: '.5rem' }}>
              {loading ? <span className="spin" /> : tab === 'login' ? 'Войти' : 'Зарегистрироваться'}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
