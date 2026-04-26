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
            <span className={styles.navIcon}>⚔</span>Все серверы
          </Link>
          <Link href="/coming-soon" className={styles.navLink}>
            <span className={styles.navIcon}>⏳</span>
            <span className={styles.navTextFull}>Скоро открытие</span>
            <span className={styles.navTextShort}>Скоро</span>
          </Link>
          <Link href="/pricing" className={styles.navLink}>
            <span className={styles.navIcon}>◆</span>Тарифы
          </Link>
          <Link href="/blog" className={styles.navLink}>
            <span className={styles.navIcon}>✎</span>Статьи
          </Link>
          {isAdmin && (
            <Link href="/admin" className={`${styles.navLink} ${styles.navAdmin}`}>Admin</Link>
          )}
        </nav>

        <div className={styles.right}>
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
