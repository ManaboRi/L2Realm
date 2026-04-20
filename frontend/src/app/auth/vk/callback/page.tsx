'use client';
import { useEffect, useRef, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { api } from '@/lib/api';
import { readVkPkce, clearVkPkce } from '@/lib/vkAuth';

export default function VkCallbackPage() {
  const router = useRouter();
  const search = useSearchParams();
  const { login } = useAuth();
  const [error, setError] = useState('');
  const ran = useRef(false);

  useEffect(() => {
    if (ran.current) return;
    ran.current = true;

    const code     = search.get('code');
    const state    = search.get('state');
    const deviceId = search.get('device_id');

    if (!code || !state || !deviceId) {
      setError('VK не вернул нужные параметры');
      return;
    }

    const pkce = readVkPkce();
    if (!pkce || pkce.state !== state) {
      setError('Сессия входа истекла. Попробуйте снова.');
      return;
    }

    api.auth.vkCallback({
      code,
      deviceId,
      codeVerifier: pkce.codeVerifier,
      redirectUri:  pkce.redirectUri,
      state,
    })
      .then(res => {
        clearVkPkce();
        login(res.access_token, res.user);
        router.replace('/');
      })
      .catch(e => setError(e.message || 'Ошибка входа через VK'));
  }, [search, login, router]);

  return (
    <div style={{ maxWidth: 440, margin: '4rem auto', padding: '2rem', textAlign: 'center' }}>
      {error ? (
        <>
          <h1 style={{ fontFamily: "'Cinzel', serif", color: '#CC6060', fontSize: '1.2rem', marginBottom: '1rem' }}>
            Ошибка входа
          </h1>
          <p style={{ color: 'var(--text2)', marginBottom: '1.5rem' }}>{error}</p>
          <button className="btn-primary" onClick={() => router.replace('/')}>
            На главную
          </button>
        </>
      ) : (
        <>
          <span className="spin" style={{ width: 28, height: 28 }} />
          <p style={{ color: 'var(--text2)', marginTop: '1rem' }}>Завершаем вход через VK…</p>
        </>
      )}
    </div>
  );
}
