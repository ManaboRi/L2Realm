import type { Metadata } from 'next';
import Link from 'next/link';
import styles from './page.module.css';

const SITE = 'https://l2realm.ru';
const INN = '772795297504';
const EMAIL = 'server.l2realm@inbox.ru';
const TELEGRAM = 'https://t.me/l2realm_admin';

export const metadata: Metadata = {
  title: 'Политика конфиденциальности — L2Realm',
  description: 'Какие данные собирает L2Realm, зачем, где хранятся и какие у вас права по 152-ФЗ. Мы собираем минимум: IP для защиты голосований и игровой ник.',
  alternates: { canonical: `${SITE}/privacy` },
};

export default function PrivacyPage() {
  const today = new Date().toLocaleDateString('ru-RU', { day: 'numeric', month: 'long', year: 'numeric' });

  return (
    <div className={styles.page}>
      <div className={styles.hero}>
        <p className={styles.heroEye}>◆ Политика конфиденциальности ◆</p>
        <h1 className={styles.heroTitle}>Обработка <em>данных</em></h1>
        <p className={styles.heroSub}>Какие данные мы собираем, зачем, где они хранятся и как ими управлять.</p>
      </div>

      <div className={styles.wrap}>

        <section className={styles.card}>
          <h2 className={styles.cardTitle}>1. Кто обрабатывает данные</h2>
          <p className={styles.meta}>Редакция от {today}</p>
          <p>
            Оператор персональных данных — самозанятый (плательщик налога на профессиональный доход),
            ИНН {INN}, владелец сайта <a href={SITE}>l2realm.ru</a> (далее — «Сайт»).
            Контакт для обращений: <a href={`mailto:${EMAIL}`}>{EMAIL}</a>,{' '}
            <a href={TELEGRAM} target="_blank" rel="noopener">Telegram</a>.
          </p>
          <p>
            Настоящая Политика описывает обработку данных пользователей Сайта в соответствии
            с Федеральным законом № 152-ФЗ «О персональных данных» и разработана с учётом требований
            242-ФЗ (локализация данных граждан РФ).
          </p>
        </section>

        <section className={styles.card}>
          <h2 className={styles.cardTitle}>2. Какие данные мы собираем</h2>
          <p>На Сайте нет регистрации и личных кабинетов. Мы собираем минимум, необходимый для работы каталога. Никаких паспортов, телефонов, адресов, ФИО пользователей.</p>

          <div className={styles.dataGrid}>
            <div className={styles.dataItem}>
              <div className={styles.dataItemTitle}>IP-адрес при голосовании</div>
              <div className={styles.dataItemBody}>
                Когда вы голосуете за сервер, мы сохраняем ваш <strong>IP-адрес</strong> и время голоса —
                исключительно для защиты от накрутки (один голос с одного IP раз в 24 часа).
                IP не используется для рекламы, профилирования или передачи третьим лицам.
              </div>
            </div>

            <div className={styles.dataItem}>
              <div className={styles.dataItemTitle}>Игровой ник</div>
              <div className={styles.dataItemBody}>
                При голосовании вы сами вводите <strong>ник персонажа</strong> на сервере. Он нужен,
                чтобы проект (если он подключил Vote Manager) мог начислить вам бонус за голос.
                Ник может показываться в публичном списке проголосовавших на странице сервера.
                Это не персональные данные — вы выбираете произвольный игровой псевдоним.
              </div>
            </div>

            <div className={styles.dataItem}>
              <div className={styles.dataItemTitle}>Технические логи сервера</div>
              <div className={styles.dataItemBody}>
                Как у любого сайта, веб-сервер ведёт служебные логи запросов (IP, время, страница) —
                для безопасности и диагностики. Они хранятся недолго и не объединяются с другими данными.
              </div>
            </div>

            <div className={styles.dataItem}>
              <div className={styles.dataItemTitle}>Чего мы НЕ собираем</div>
              <div className={styles.dataItemBody}>
                Никаких аналитических cookie, рекламных трекеров, Яндекс.Метрики, Google Analytics,
                пикселей соцсетей. Регистрации, паролей, email пользователей — нет. Платежей от
                пользователей — нет.
              </div>
            </div>
          </div>
        </section>

        <section className={styles.card}>
          <h2 className={styles.cardTitle}>3. Зачем мы их обрабатываем</h2>
          <ul className={styles.list}>
            <li>защита голосований от накрутки (лимит по IP);</li>
            <li>начисление бонусов за голос по игровому нику (если сервер подключил Vote Manager);</li>
            <li>безопасность Сайта и защита от атак/спама (служебные логи).</li>
          </ul>
        </section>

        <section className={styles.card}>
          <h2 className={styles.cardTitle}>4. Правовые основания</h2>
          <ul className={styles.list}>
            <li><strong>Законный интерес оператора</strong> — защита Сайта и голосований от злоупотреблений (п. 7 ч. 1 ст. 6 152-ФЗ);</li>
            <li><strong>Действия пользователя</strong> — ввод игрового ника и нажатие «Проголосовать» означают согласие на его обработку в описанных целях.</li>
          </ul>
        </section>

        <section className={styles.card}>
          <h2 className={styles.cardTitle}>5. Где и сколько хранятся</h2>
          <p>
            Базы данных и резервные копии размещены на серверах в Российской Федерации, что соответствует
            требованию 242-ФЗ о локализации данных граждан РФ.
          </p>
          <ul className={styles.list}>
            <li>IP-адрес и ник голоса — до 12 месяцев, затем обезличиваются или удаляются;</li>
            <li>служебные логи веб-сервера — не более 30 дней;</li>
            <li>передача данных за пределы РФ не производится.</li>
          </ul>
        </section>

        <section className={styles.card}>
          <h2 className={styles.cardTitle}>6. Кому передаются</h2>
          <p>Мы не продаём и не передаём данные третьим лицам. Исключение — хостинг-провайдер (как держатель серверов) и государственные органы по законному запросу.</p>
        </section>

        <section className={styles.card}>
          <h2 className={styles.cardTitle}>7. Ваши права</h2>
          <p>Вы имеете право в любой момент:</p>
          <ul className={styles.list}>
            <li>узнать, какие ваши данные мы обрабатываем;</li>
            <li>потребовать удаления вашего голоса/ника или уточнения данных;</li>
            <li>обратиться с жалобой в Роскомнадзор, если считаете, что ваши права нарушены.</li>
          </ul>
          <p>
            Для реализации прав напишите на <a href={`mailto:${EMAIL}`}>{EMAIL}</a> или в
            {' '}<a href={TELEGRAM} target="_blank" rel="noopener">Telegram</a>. Ответ — в срок до 30 дней.
          </p>
        </section>

        <section className={styles.card}>
          <h2 className={styles.cardTitle}>8. Cookies и локальное хранилище</h2>
          <p>
            Сайт не использует аналитические или рекламные cookies, трекеры и сторонние скрипты отслеживания.
            Технические cookie могут использоваться только для базовой работы интерфейса (например, выбранные фильтры) —
            без идентификации личности.
          </p>
        </section>

        <section className={styles.card}>
          <h2 className={styles.cardTitle}>9. Изменения политики</h2>
          <p>
            Мы можем обновлять эту Политику. Актуальная редакция всегда доступна по адресу
            {' '}<Link href="/privacy">l2realm.ru/privacy</Link>. Дата последней редакции указана в начале страницы.
          </p>
        </section>

        <p style={{ fontSize: '.82rem', color: 'var(--text3)', textAlign: 'center', margin: '.4rem 0 0' }}>
          Связанный документ:{' '}
          <Link href="/terms" style={{ color: 'var(--gold)' }}>Пользовательское соглашение</Link>.
        </p>

      </div>
    </div>
  );
}
