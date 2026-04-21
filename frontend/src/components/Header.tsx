'use client';
import React, { useState } from 'react';
import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';
import { AuthModal } from './AuthModal';
import styles from './Header.module.css';

export function Header() {
  const { user, logout, isAdmin } = useAuth();
  const [authOpen, setAuthOpen] = useState(false);

  return (
    <>
      <header className={styles.header}>
        <Link href="/" className={styles.logo}>
          <span className={styles.gem} />
          L2Realm
        </Link>

        <nav className={styles.nav}>
          <Link href="/" className={styles.navLink}>
            <span className={styles.navIcon}>⚔</span>Все серверы
          </Link>
          <Link href="/coming-soon" className={styles.navLink}>
            <span className={styles.navIcon}>⏳</span>Скоро открытие
          </Link>
          {isAdmin && (
            <Link href="/admin" className={`${styles.navLink} ${styles.navAdmin}`}>Admin</Link>
          )}
        </nav>

        <div className={styles.right}>
          {user ? (
            <>
              <Link href="/profile" className={styles.userName} style={{ textDecoration: 'none' }}>
                {user.nickname || user.name || user.email}
              </Link>
              <button className="btn-ghost" onClick={logout}>Выйти</button>
            </>
          ) : (
            <button className="btn-ghost" onClick={() => setAuthOpen(true)}>Войти</button>
          )}
          <Link href="/add" className="btn-primary">+ Добавить сервер</Link>
        </div>
      </header>

      <AuthModal open={authOpen} onClose={() => setAuthOpen(false)} />
    </>
  );
}
