import Link from 'next/link';
import styles from './Footer.module.css';

export function Footer() {
  return (
    <footer className={styles.footer}>
      <div className={styles.inner}>
        <div className={styles.col}>
          <div className={styles.brand}>
            <span className={styles.gem} />
            <span className={styles.brandText}>L2Realm</span>
          </div>
          <p className={styles.about}>Каталог приватных серверов Lineage 2.</p>
          <p className={styles.disclaimer}>
            L2Realm не является официальным ресурсом и не аффилирован с NCSoft Corp.,
            NC Interactive LLC, Иннова/4game или другими правообладателями Lineage 2.
          </p>
        </div>

        <div className={styles.col}>
          <div className={styles.colTitle}>Каталог</div>
          <Link href="/" className={styles.link}>Все серверы</Link>
          <Link href="/coming-soon" className={styles.link}>Скоро открытие</Link>
          <Link href="/blog" className={styles.link}>Статьи</Link>
          <Link href="/methodology" className={styles.link}>Как мы проверяем</Link>
          <Link href="/contacts" className={styles.link}>Контакты</Link>
        </div>

        <div className={styles.col}>
          <div className={styles.colTitle}>Документы</div>
          <Link href="/privacy" className={styles.link}>Политика конфиденциальности</Link>
          <Link href="/terms" className={styles.link}>Пользовательское соглашение</Link>
        </div>
      </div>
      <div className={styles.bottom}>
        <span>© {new Date().getFullYear()} L2Realm</span>
        <span className={styles.ageMark} title="Сайт предназначен для пользователей 16 лет и старше">16+</span>
      </div>
    </footer>
  );
}
