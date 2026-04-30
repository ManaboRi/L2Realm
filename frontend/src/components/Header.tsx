'use client';
import { useState } from 'react';
import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';
import { AuthModal } from './AuthModal';
import styles from './Header.module.css';

export function Header() {
  const { user, isAdmin } = useAuth();
  const [authOpen, setAuthOpen] = useState(false);

  const displayName = user?.nickname || user?.name || user?.email || '';
  const initial = displayName[0]?.toUpperCase() || '?';

  return (
    <>
      <header className={styles.header}>
        <Link href="/" className={styles.logo}>
          <span className={styles.gem} />
          <span className={styles.logoText}>L2Realm</span>
        </Link>

        <nav className={styles.nav}>
          <Link href="/" className={`${styles.navLink} ${styles.navLinkHome}`}>
            <img src="/images/nav-servers.png" alt="" className={styles.navIcon} />
            <span className={styles.navText}>Все серверы</span>
          </Link>
          <Link href="/coming-soon" className={styles.navLink}>
            <img src="/images/nav-coming-soon.png" alt="" className={styles.navIcon} />
            <span className={styles.navText}>
              <span className={styles.navTextFull}>Скоро открытие</span>
              <span className={styles.navTextShort}>Скоро</span>
            </span>
          </Link>
          <Link href="/pricing" className={styles.navLink}>
            <img src="/images/nav-pricing.png" alt="" className={styles.navIcon} />
            <span className={styles.navText}>Тарифы</span>
          </Link>
          <Link href="/blog" className={styles.navLink}>
            <img src="/images/nav-blog.png" alt="" className={styles.navIcon} />
            <span className={styles.navText}>Статьи</span>
          </Link>
          {isAdmin && (
            <Link href="/admin" className={`${styles.navLink} ${styles.navAdmin}`}><span className={styles.navText}>Admin</span></Link>
          )}
        </nav>

        <div className={styles.right}>
          <div className={styles.socials}>
            <a
              href="https://t.me/l2realm_ru"
              target="_blank"
              rel="noopener"
              className={styles.socialLink}
              aria-label="Telegram-канал L2Realm"
              title="Telegram-канал"
            >
              <img src="/images/Telegram.png" alt="" className={styles.socialIcon} />
            </a>
            <a
              href="https://vk.com/l2realmru"
              target="_blank"
              rel="noopener"
              className={styles.socialLink}
              aria-label="ВКонтакте-сообщество L2Realm"
              title="ВКонтакте"
            >
              <img src="/images/Vkontakte.png" alt="" className={styles.socialIcon} />
            </a>
          </div>

          {user ? (
            <Link href="/profile" className={styles.profileChip} title="Личный кабинет">
              {user.avatar ? (
                <img src={user.avatar} alt="" className={styles.profileAvatar} />
              ) : (
                <span className={styles.profileAvatarFallback}>{initial}</span>
              )}
              <span className={styles.profileName}>{displayName}</span>
            </Link>
          ) : (
            <button className="btn-ghost" onClick={() => setAuthOpen(true)}>Войти</button>
          )}
          <Link href="/add" className={`btn-primary ${styles.addBtn}`}>+ Добавить сервер</Link>
          <Link href="/add" className={`btn-primary ${styles.addBtnShort}`} title="Добавить сервер">+</Link>
        </div>
      </header>

      <AuthModal open={authOpen} onClose={() => setAuthOpen(false)} />
    </>
  );
}
