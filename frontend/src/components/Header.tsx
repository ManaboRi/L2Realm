'use client';
import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import Image from 'next/image';
import { useAuth } from '@/context/AuthContext';
import { api } from '@/lib/api';
import type { OpeningReminder } from '@/lib/types';
import { AuthModal } from './AuthModal';
import styles from './Header.module.css';

export function Header() {
  const { user, token, isAdmin } = useAuth();
  const [authOpen, setAuthOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [dueReminders, setDueReminders] = useState<OpeningReminder[]>([]);
  const [favoriteCount, setFavoriteCount] = useState(0);
  const headerRef = useRef<HTMLElement>(null);
  const pathname = usePathname();

  const displayName = user?.nickname || user?.name || user?.email || '';
  const initial = displayName[0]?.toUpperCase() || '?';
  const navClass = (href: string, extra = '') => {
    const active = href === '/' ? pathname === '/' : pathname.startsWith(href);
    return [styles.navLink, active ? styles.navLinkActive : '', extra].filter(Boolean).join(' ');
  };

  // Закрываем мобильное меню при переходе на другую страницу
  useEffect(() => { setMenuOpen(false); }, [pathname]);

  useEffect(() => {
    if (!token) {
      setDueReminders([]);
      return;
    }
    let alive = true;
    const load = () => {
      api.openingReminders.due(token)
        .then(items => { if (alive) setDueReminders(items); })
        .catch(() => { if (alive) setDueReminders([]); });
    };
    load();
    const timer = window.setInterval(load, 60_000);
    return () => {
      alive = false;
      window.clearInterval(timer);
    };
  }, [token]);

  useEffect(() => {
    if (!token) {
      setFavoriteCount(0);
      return;
    }
    let alive = true;
    api.favorites.ids(token)
      .then(ids => { if (alive) setFavoriteCount(ids.length); })
      .catch(() => { if (alive) setFavoriteCount(0); });
    return () => { alive = false; };
  }, [token]);

  // Закрываем по клику снаружи и по Escape
  useEffect(() => {
    if (!menuOpen) return;
    function onClick(e: MouseEvent) {
      if (!headerRef.current?.contains(e.target as Node)) setMenuOpen(false);
    }
    function onKey(e: KeyboardEvent) { if (e.key === 'Escape') setMenuOpen(false); }
    document.addEventListener('mousedown', onClick);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onClick);
      document.removeEventListener('keydown', onKey);
    };
  }, [menuOpen]);

  function closeMenu() { setMenuOpen(false); }

  return (
    <>
      <header className={styles.header} ref={headerRef}>
        <Link href="/" className={styles.logo} onClick={closeMenu}>
          <span className={styles.gem} />
          <span className={styles.logoText}>L2Realm</span>
        </Link>

        <button
          className={`${styles.burger} ${menuOpen ? styles.burgerOpen : ''}`}
          onClick={() => setMenuOpen(o => !o)}
          aria-label={menuOpen ? 'Закрыть меню' : 'Открыть меню'}
          aria-expanded={menuOpen}
          type="button"
        >
          <span /><span /><span />
        </button>

        <div className={`${styles.collapsible} ${menuOpen ? styles.collapsibleOpen : ''}`}>
          <nav className={styles.nav}>
            <Link href="/" className={navClass('/', styles.navLinkHome)} onClick={closeMenu}>
              <Image src="/images/nav-servers.webp" alt="Каталог серверов Lineage 2" width={24} height={24} className={styles.navIcon} unoptimized />
              <span className={styles.navText}>Все серверы</span>
            </Link>
            <Link href="/coming-soon" className={navClass('/coming-soon')} onClick={closeMenu}>
              <Image src="/images/nav-coming-soon.webp" alt="Скоро открытие серверов Lineage 2" width={24} height={24} className={styles.navIcon} unoptimized />
              <span className={styles.navText}>
                <span className={styles.navTextFull}>Скоро открытие</span>
                <span className={styles.navTextShort}>Скоро</span>
              </span>
            </Link>
            <Link href="/blog" className={navClass('/blog')} onClick={closeMenu}>
              <Image src="/images/nav-blog.webp" alt="Статьи L2Realm" width={24} height={24} className={styles.navIcon} unoptimized />
              <span className={styles.navText}>Статьи</span>
            </Link>
            {isAdmin && (
              <Link href="/admin" className={navClass('/admin', styles.navAdmin)} onClick={closeMenu}>
                <span className={styles.navText}>Admin</span>
              </Link>
            )}
          </nav>

          <div className={styles.right}>
            <Link href="/profile#favorites" className={styles.favoritesChip} title="Избранные серверы" onClick={closeMenu}>
              <span className={styles.favoritesIcon}>☆</span>
              <span>Избранное</span>
              {favoriteCount > 0 && <span className={styles.headerBadge}>{Math.min(favoriteCount, 99)}</span>}
            </Link>
            <Link
              href="/profile#notifications"
              className={`${styles.notifyBtn} ${dueReminders.length > 0 ? styles.notifyBtnActive : ''}`}
              title={dueReminders.length > 0 ? `Напоминаний: ${dueReminders.length}` : 'Уведомления'}
              aria-label={dueReminders.length > 0 ? `Напоминаний: ${dueReminders.length}` : 'Уведомления'}
              onClick={closeMenu}
            >
              <svg className={styles.bellIcon} viewBox="0 0 24 24" aria-hidden="true">
                <path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9" />
                <path d="M13.7 21a2 2 0 0 1-3.4 0" />
              </svg>
              <span>Уведомления</span>
              {dueReminders.length > 0 && <span className={styles.headerBadge}>{Math.min(dueReminders.length, 99)}</span>}
            </Link>
            {user ? (
              <Link href="/profile" className={styles.profileChip} title="Личный кабинет" onClick={closeMenu}>
                {user.avatar ? (
                  <img src={user.avatar} alt={`Аватар ${displayName}`} className={styles.profileAvatar} />
                ) : (
                  <span className={styles.profileAvatarFallback}>{initial}</span>
                )}
                <span className={styles.profileText}>
                  <span className={styles.profileName}>{displayName}</span>
                  {isAdmin && <span className={styles.profileRole}>Админ</span>}
                </span>
                <span className={styles.profileArrow}>⌄</span>
              </Link>
            ) : (
              <button className={`btn-ghost ${styles.loginBtn}`} onClick={() => { setAuthOpen(true); closeMenu(); }}>
                Войти
              </button>
            )}
          </div>
        </div>
      </header>

      <AuthModal open={authOpen} onClose={() => setAuthOpen(false)} />
    </>
  );
}
