'use client';
import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
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
            <Link href="/" className={`${styles.navLink} ${styles.navLinkHome}`} onClick={closeMenu}>
              <img src="/images/nav-servers.png" alt="Каталог серверов Lineage 2" className={styles.navIcon} />
              <span className={styles.navText}>Все серверы</span>
            </Link>
            <Link href="/coming-soon" className={styles.navLink} onClick={closeMenu}>
              <img src="/images/nav-coming-soon.png" alt="Скоро открытие серверов Lineage 2" className={styles.navIcon} />
              <span className={styles.navText}>
                <span className={styles.navTextFull}>Скоро открытие</span>
                <span className={styles.navTextShort}>Скоро</span>
              </span>
            </Link>
            <Link href="/pricing" className={styles.navLink} onClick={closeMenu}>
              <img src="/images/nav-pricing.png" alt="Тарифы L2Realm" className={styles.navIcon} />
              <span className={styles.navText}>Тарифы</span>
            </Link>
            <Link href="/blog" className={styles.navLink} onClick={closeMenu}>
              <img src="/images/nav-blog.png" alt="Статьи L2Realm" className={styles.navIcon} />
              <span className={styles.navText}>Статьи</span>
            </Link>
            {isAdmin && (
              <Link href="/admin" className={`${styles.navLink} ${styles.navAdmin}`} onClick={closeMenu}>
                <span className={styles.navText}>Admin</span>
              </Link>
            )}
          </nav>

          <div className={styles.right}>
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
            <Link href="/add" className={`btn-primary ${styles.addBtn}`} onClick={closeMenu}>+ Добавить сервер</Link>
            <Link href="/add" className={`btn-primary ${styles.addBtnShort}`} title="Добавить сервер" onClick={closeMenu}>+</Link>
          </div>
        </div>
      </header>

      <AuthModal open={authOpen} onClose={() => setAuthOpen(false)} />
    </>
  );
}
