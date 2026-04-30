'use client';
import { useState } from 'react';
import Link from 'next/link';
import styles from './AuthModal.module.css';
import { startVkLogin } from '@/lib/vkAuth';

interface Props { open: boolean; onClose: () => void; }

export function AuthModal({ open, onClose }: Props) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [consent, setConsent] = useState(false);

  if (!open) return null;

  async function loginVk() {
    if (!consent) {
      setError('Поставьте галочку согласия — без этого вход через VK невозможен.');
      return;
    }
    setError('');
    setLoading(true);
    try {
      await startVkLogin();
    } catch (e: any) {
      setError(e.message || 'Не удалось начать вход через VK');
      setLoading(false);
    }
  }

  return (
    <div className={styles.overlay} onClick={e => e.target === e.currentTarget && onClose()}>
      <div className={styles.modal}>
        <button className={styles.close} onClick={onClose}>✕</button>
        <h2 style={{ fontFamily: "'Cinzel', serif", fontSize: '1rem', letterSpacing: '.15em', textTransform: 'uppercase', color: 'var(--gold)', textAlign: 'center', margin: '0 0 1.4rem' }}>
          Вход
        </h2>

        <label className={styles.consent}>
          <input
            type="checkbox"
            checked={consent}
            onChange={e => { setConsent(e.target.checked); if (e.target.checked) setError(''); }}
            className={styles.consentBox}
          />
          <span className={styles.consentText}>
            Я принимаю <Link href="/legal" target="_blank" style={{ color: 'var(--gold)' }}>оферту</Link>{' '}
            и <Link href="/privacy" target="_blank" style={{ color: 'var(--gold)' }}>политику конфиденциальности</Link>{' '}
            и даю согласие на обработку моих данных VK (ID, имя, email, аватар).
          </span>
        </label>

        <button
          className={styles.vkBtn}
          type="button"
          onClick={loginVk}
          disabled={loading || !consent}
          title={!consent ? 'Сначала согласитесь с условиями' : undefined}
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
            <path d="M12.785 16.241s.288-.032.435-.193c.136-.148.131-.426.131-.426s-.019-1.294.574-1.483c.584-.185 1.334 1.237 2.129 1.784.601.413 1.058.322 1.058.322l2.127-.03s1.112-.069.585-.952c-.043-.072-.306-.652-1.578-1.839-1.332-1.24-1.154-1.039.451-3.187.978-1.309 1.369-2.11 1.247-2.454-.116-.328-.84-.241-.84-.241l-2.41.015s-.179-.025-.311.054c-.129.077-.212.257-.212.257s-.379 1.015-.883 1.879c-1.063 1.821-1.489 1.917-1.662 1.804-.404-.264-.303-1.059-.303-1.624 0-1.764.266-2.5-.517-2.69-.26-.064-.451-.106-1.115-.113-.853-.009-1.575.003-1.984.203-.272.134-.482.432-.354.449.158.021.515.096.704.355.244.334.236 1.084.236 1.084s.14 2.062-.328 2.317c-.321.175-.761-.182-1.711-1.836-.487-.847-.854-1.784-.854-1.784s-.071-.173-.197-.266c-.154-.113-.369-.149-.369-.149l-2.29.015s-.344.01-.47.16c-.112.133-.009.407-.009.407s1.794 4.198 3.826 6.314c1.863 1.938 3.979 1.811 3.979 1.811h.957z"/>
          </svg>
          {loading ? <span className="spin" /> : 'Войти через VK'}
        </button>
        {error && <p className={styles.error} style={{ marginTop: '.9rem' }}>{error}</p>}
      </div>
    </div>
  );
}
