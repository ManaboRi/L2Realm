import Link from 'next/link';
import type { Server, ServersResponse } from '@/lib/types';
import { ServerCard } from '@/components/ServerCard';
import type { ChronicleCfg } from '../_lib/chronicleConfig';
import styles from './ChroniclePage.module.css';

const BACKEND = process.env.BACKEND_URL || 'http://localhost:4000';

async function fetchServers(chronicle: string): Promise<Server[]> {
  try {
    // cache: 'no-store' — не использовать ISR для запроса.
    // Иначе при первом фейле fetch (например, backend перезапускается)
    // пустой результат закешировался бы на 5 минут — все юзеры через
    // <Link> видели бы пустую страницу, пока не нажмут F5.
    const res = await fetch(
      `${BACKEND}/api/servers?chronicle=${encodeURIComponent(chronicle)}&limit=200`,
      { cache: 'no-store' },
    );
    if (!res.ok) return [];
    const data = (await res.json()) as ServersResponse;
    return data.data;
  } catch {
    return [];
  }
}

export async function ChroniclePage({ cfg }: { cfg: ChronicleCfg }) {
  const servers = await fetchServers(cfg.chronicle);

  return (
    <div className={styles.page}>
      <div className={styles.bread}>
        <Link href="/" className={styles.breadLink}>Главная</Link>
        <span className={styles.breadSep}>›</span>
        <span>{cfg.chronicle}</span>
      </div>

      <header className={styles.hero}>
        <p className={styles.heroEye}>◆ Хроника {cfg.chronicle} ◆</p>
        <h1 className={styles.heroTitle}>{cfg.h1}</h1>
        <p className={styles.heroSub}>{cfg.intro}</p>
        <p className={styles.heroCount}>
          {servers.length === 0
            ? 'Серверов в каталоге пока нет.'
            : `Серверов в каталоге: ${servers.length}.`}
        </p>
      </header>

      {servers.length > 0 ? (
        <div className={styles.list}>
          {servers.map(s => <ServerCard key={s.id} server={s} />)}
        </div>
      ) : (
        <div className={styles.empty}>
          <p>Серверов с этой хроникой в каталоге пока нет.</p>
          <p>
            <Link href={`/?chr=${encodeURIComponent(cfg.chronicle)}`} className={styles.footLink}>
              ← Перейти в каталог
            </Link>
          </p>
        </div>
      )}

      <p className={styles.foot}>
        Не нашли свой сервер? <Link href="/add" className={styles.footLink}>Подайте заявку</Link>{' '}
        — модерация до 24 часов.
      </p>
    </div>
  );
}
