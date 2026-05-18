'use client';
import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import Image from 'next/image';
import { useAuth } from '@/context/AuthContext';
import { AuthModal } from './AuthModal';
import styles from './Header.module.css';

export function Header() {
  const { user, isAdmin } = useAuth();
  const [authOpen, setAuthOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
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
              <Image src="/images/nav-servers.webp" alt="Каталог серверов Lineage 2" width={24} height={24} className={styles.navIcon} />
              <span className={styles.navText}>Все серверы</span>
            </Link>
            <Link href="/coming-soon" className={navClass('/coming-soon')} onClick={closeMenu}>
              <Image src="/images/nav-coming-soon.webp" alt="Скоро открытие серверов Lineage 2" width={24} height={24} className={styles.navIcon} />
              <span className={styles.navText}>
                <span className={styles.navTextFull}>Скоро открытие</span>
                <span className={styles.navTextShort}>Скоро</span>
              </span>
            </Link>
            <Link href="/pricing" className={navClass('/pricing')} onClick={closeMenu}>
              <Image src="/images/nav-pricing.webp" alt="Тарифы L2Realm" width={24} height={24} className={styles.navIcon} />
              <span className={styles.navText}>Тарифы</span>
            </Link>
            <Link href="/blog" className={navClass('/blog')} onClick={closeMenu}>
              <Image src="/images/nav-blog.webp" alt="Статьи L2Realm" width={24} height={24} className={styles.navIcon} />
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
              <span className={styles.favoritesIcon}>♡</span>
              <span>Избранное</span>
            </Link>
            <button type="button" className={styles.notifyBtn} title="Уведомления" aria-label="Уведомления">
              <span className={styles.bellIcon} />
            </button>
            {user ? (
              <Link href="/profile" className={styles.profileChip} title="Личный кабинет" onClick={closeMenu}>
                {user.avatar ? (
                  <img src={user.avatar} alt={`Аватар ${displayName}`} className={styles.profileAvatar} />
                ) : (
                  <span className={styles.profileAvatarFallback}>{initial}</span>
                )}
                <span className={styles.profileName}>{displayName}</span>
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
