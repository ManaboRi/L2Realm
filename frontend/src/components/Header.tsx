'use client';
import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import Image from 'next/image';
import { useAuth } from '@/context/AuthContext';
import styles from './Header.module.css';

export function Header() {
  const { isAdmin } = useAuth();
  const [menuOpen, setMenuOpen] = useState(false);
  const headerRef = useRef<HTMLElement>(null);
  const pathname = usePathname();

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
          <Link href="/guides" className={navClass('/guides')} onClick={closeMenu}>
            <svg className={styles.navIcon} viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
              <path d="M4 5a2 2 0 0 1 2-2h6v16H6a2 2 0 0 0-2 2V5Z" />
              <path d="M20 5a2 2 0 0 0-2-2h-6v16h6a2 2 0 0 1 2 2V5Z" />
            </svg>
            <span className={styles.navText}>Гайды</span>
          </Link>
          <Link href="/blog" className={navClass('/blog')} onClick={closeMenu}>
            <Image src="/images/nav-blog.webp" alt="Статьи L2Realm" width={24} height={24} className={styles.navIcon} unoptimized />
            <span className={styles.navText}>Статьи</span>
          </Link>
        </nav>

        <div className={styles.right}>
          <Link href="/contacts" className={navClass('/contacts', styles.contactsLink)} onClick={closeMenu}>
            <span className={styles.navText}>Добавить сервер</span>
          </Link>
          {isAdmin && (
            <Link href="/admin" className={navClass('/admin', styles.navAdmin)} onClick={closeMenu}>
              <span className={styles.navText}>Admin</span>
            </Link>
          )}
        </div>
      </div>
    </header>
  );
}
