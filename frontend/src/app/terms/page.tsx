import type { Metadata } from 'next';
import Link from 'next/link';
import styles from './page.module.css';

const SITE = 'https://l2realm.ru';
const INN = '772795297504';
const EMAIL = 'server.l2realm@inbox.ru';
const TELEGRAM = 'https://t.me/l2realm_admin';

export const metadata: Metadata = {
  title: 'Пользовательское соглашение — L2Realm',
  description: 'Правила использования каталога L2Realm: информационный характер, голосование, интеллектуальные права, ответственность и контакты.',
  alternates: { canonical: `${SITE}/terms` },
};

export default function TermsPage() {
  const today = new Date().toLocaleDateString('ru-RU', { day: 'numeric', month: 'long', year: 'numeric' });

  return (
    <div className={styles.page}>
      <div className={styles.hero}>
        <p className={styles.heroEye}>◆ Правила L2Realm ◆</p>
        <h1 className={styles.heroTitle}>Пользовательское <em>соглашение</em></h1>
        <p className={styles.heroSub}>Условия использования каталога, голосования и размещения информации о серверах.</p>
      </div>

      <div className={styles.wrap}>
        <section className={styles.card}>
          <h2 className={styles.cardTitle}>1. Общие положения</h2>
          <p className={styles.meta}>Редакция от {today}</p>
          <p>
            Настоящее Пользовательское соглашение регулирует использование сайта <a href={SITE}>l2realm.ru</a> (далее — Сайт).
            Используя Сайт или голосуя за сервер, пользователь соглашается с настоящими условиями
            и <Link href="/privacy">Политикой конфиденциальности</Link>.
          </p>
          <p>
            Сайт предназначен для пользователей <strong>16 лет и старше</strong>. Оператор Сайта —
            самозанятый, ИНН {INN}.
          </p>
        </section>

        <section className={styles.card}>
          <h2 className={styles.cardTitle}>2. Информационный характер каталога</h2>
          <p>
            L2Realm является информационным каталогом и площадкой для публикации сведений о проектах Lineage 2.
            Информация о серверах (хроники, рейты, даты открытия, ссылки, активность) публикуется на основании
            открытых источников и/или данных, предоставленных администраторами проектов.
          </p>
          <p>
            L2Realm не является владельцем, оператором, издателем или техническим администратором игровых серверов,
            размещённых в каталоге, и не контролирует содержание, безопасность, доступность, правила, файлы и действия
            сторонних сайтов. Переход на внешние ресурсы — на усмотрение и под ответственность пользователя.
          </p>
        </section>

        <section className={styles.card}>
          <h2 className={styles.cardTitle}>3. Голосование</h2>
          <ul className={styles.list}>
            <li>Голосование анонимное и ограничено одним голосом с одного IP-адреса в течение 24 часов.</li>
            <li>Запрещены накрутка голосов, автоматизированные действия и иные способы обхода ограничений.</li>
            <li>L2Realm вправе удалять голоса, которые выглядят как накрутка или злоупотребление.</li>
            <li>Игровой ник, введённый при голосовании, может отображаться в публичном списке проголосовавших.</li>
          </ul>
        </section>

        <section className={styles.card}>
          <h2 className={styles.cardTitle}>4. Интеллектуальные права и правообладатели</h2>
          <p>
            L2Realm не является официальным ресурсом, не аффилирован с NCSoft Corp., NC Interactive LLC, ООО «Иннова», 4game
            или другими правообладателями игры Lineage 2. Торговая марка Lineage и связанные обозначения принадлежат
            их правообладателям.
          </p>
          <p>
            Упоминания Lineage 2, названий хроник, серверов и проектов используются исключительно для описания тематики
            каталога и идентификации размещаемой информации (номинативное использование). По вопросам нарушения прав
            можно обратиться на <a href={`mailto:${EMAIL}`}>{EMAIL}</a> — при получении обоснованной претензии L2Realm
            вправе скрыть или удалить спорный материал.
          </p>
        </section>

        <section className={styles.card}>
          <h2 className={styles.cardTitle}>5. Контент и поведение</h2>
          <ul className={styles.list}>
            <li>Запрещено вводить в публичные поля (ник голоса) оскорбления, спам, рекламу, персональные данные третьих лиц.</li>
            <li>Запрещены ссылки на нелегальное распространение клиентских файлов, патчей и обходов защиты.</li>
            <li>L2Realm вправе редактировать, скрывать или удалять пользовательский ввод без предварительного уведомления, если он нарушает соглашение или закон.</li>
          </ul>
        </section>

        <section className={styles.card}>
          <h2 className={styles.cardTitle}>6. Ограничение ответственности</h2>
          <p>
            Сайт предоставляется «как есть». L2Realm не гарантирует бесперебойную работу, отсутствие ошибок, точность
            сведений, предоставленных третьими лицами, и доступность сторонних ресурсов.
          </p>
          <p>
            L2Realm не отвечает за прямые или косвенные убытки пользователя, возникшие из-за использования Сайта,
            временной недоступности, технических сбоев, действий сторонних игровых проектов или перехода на внешние сайты.
          </p>
        </section>

        <section className={styles.card}>
          <h2 className={styles.cardTitle}>7. Изменение условий</h2>
          <p>
            L2Realm вправе изменять настоящее соглашение. Новая редакция публикуется на странице <Link href="/terms">/terms</Link>.
            Продолжение использования Сайта после публикации новой редакции означает согласие с обновлёнными условиями.
          </p>
        </section>

        <section className={styles.card}>
          <h2 className={styles.cardTitle}>8. Связь</h2>
          <div className={styles.rows}>
            <Row label="Email" value={<a href={`mailto:${EMAIL}`}>{EMAIL}</a>} />
            <Row label="Telegram" value={<a href={TELEGRAM} target="_blank" rel="noopener">Написать</a>} />
          </div>
        </section>
      </div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className={styles.row}>
      <span className={styles.rowLbl}>{label}</span>
      <span className={styles.rowVal}>{value}</span>
    </div>
  );
}
