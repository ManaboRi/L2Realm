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
          <Link href="/pricing" className={styles.link}>Добавить сервер</Link>
          <Link href="/blog" className={styles.link}>Статьи</Link>
        </div>

        <div className={styles.col}>
          <div className={styles.colTitle}>Сервис</div>
          <Link href="/pricing" className={styles.link}>Тарифы и продвижение</Link>
          <Link href="/legal" className={styles.link}>Оферта и реквизиты</Link>
          <Link href="/terms" className={styles.link}>Пользовательское соглашение</Link>
          <Link href="/privacy" className={styles.link}>Политика конфиденциальности</Link>
          <a href="https://t.me/ManaboRi" target="_blank" rel="noopener" className={styles.link}>Поддержка (Telegram)</a>
        </div>
      </div>
      <div className={styles.bottom}>
        <span>© {new Date().getFullYear()} L2Realm</span>
        <div style={{ display: 'flex', gap: '1.2rem' }}>
          <Link href="/legal" className={styles.bottomLink}>Оферта</Link>
          <Link href="/terms" className={styles.bottomLink}>Соглашение</Link>
          <Link href="/privacy" className={styles.bottomLink}>Конфиденциальность</Link>
        </div>
      </div>
    </footer>
  );
}
