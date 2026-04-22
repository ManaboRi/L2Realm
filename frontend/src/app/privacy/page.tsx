import type { Metadata } from 'next';
import Link from 'next/link';
import styles from './page.module.css';

export const metadata: Metadata = {
  title: 'Политика конфиденциальности — L2Realm',
  description: 'Какие персональные данные собирает L2Realm, зачем, где хранятся и какие у вас права по 152-ФЗ.',
};

const OPERATOR = 'Тараскин Егор Андреевич';
const INN      = '772795297504';
const EMAIL    = 'server.l2realm@inbox.ru';

export default function PrivacyPage() {
  const today = new Date().toLocaleDateString('ru-RU', { day: 'numeric', month: 'long', year: 'numeric' });

  return (
    <div className={styles.page}>
      <div className={styles.hero}>
        <p className={styles.heroEye}>◆ Политика конфиденциальности ◆</p>
        <h1 className={styles.heroTitle}>Обработка <em>персональных данных</em></h1>
        <p className={styles.heroSub}>Какие данные мы собираем, зачем, где они хранятся и как ими управлять.</p>
      </div>

      <div className={styles.wrap}>

        <section className={styles.card}>
          <h2 className={styles.cardTitle}>1. Кто обрабатывает данные</h2>
          <p className={styles.meta}>Редакция от {today}</p>
          <p>
            Оператор персональных данных — самозанятый {OPERATOR} (ИНН {INN}), владелец сайта
            <a href="https://l2realm.ru"> l2realm.ru</a> (далее — «Сайт»). Контакт для обращений:
            {' '}<a href={`mailto:${EMAIL}`}>{EMAIL}</a>,{' '}
            <a href="https://t.me/ManaboRi" target="_blank" rel="noopener">Telegram @ManaboRi</a>.
          </p>
          <p>
            Настоящая Политика описывает обработку персональных данных (далее — ПД) пользователей Сайта
            в соответствии с Федеральным законом № 152-ФЗ «О персональных данных» и разработана
            с учётом требований 242-ФЗ (локализация ПД граждан РФ).
          </p>
        </section>

        <section className={styles.card}>
          <h2 className={styles.cardTitle}>2. Какие данные мы собираем</h2>
          <p>Мы собираем минимум, необходимый для работы сервиса. Никаких паспортов, телефонов, адресов.</p>

          <div className={styles.dataGrid}>
            <div className={styles.dataItem}>
              <div className={styles.dataItemTitle}>Вход через VK ID</div>
              <div className={styles.dataItemBody}>
                При нажатии «Войти через VK» мы запрашиваем у ВКонтакте и сохраняем: <strong>числовой VK ID</strong>,
                имя (first_name + last_name), email и URL аватара. Пароль от ВК мы <strong>не видим</strong> —
                авторизация происходит на стороне VK ID. Ник на сайте вы задаёте сами при первом входе,
                он не связан с данными ВК.
              </div>
            </div>

            <div className={styles.dataItem}>
              <div className={styles.dataItemTitle}>Оплата через ЮKassa</div>
              <div className={styles.dataItemBody}>
                При покупке VIP или буста ЮKassa передаёт нам только: идентификатор платежа, сумму, статус и
                ваш email для чека (54-ФЗ). <strong>Данные карты мы не получаем и не храним</strong> — они
                остаются на стороне ЮKassa (ООО НКО «ЮMoney»).
              </div>
            </div>

            <div className={styles.dataItem}>
              <div className={styles.dataItemTitle}>Технические данные</div>
              <div className={styles.dataItemBody}>
                При регистрации — IP-адрес (для защиты от спама при подаче заявок).
                В браузере хранится JWT-токен авторизации (localStorage). Данных о посещениях, кликах
                и переходах мы не собираем — сторонних трекеров на сайте нет.
              </div>
            </div>

            <div className={styles.dataItem}>
              <div className={styles.dataItemTitle}>Пользовательский контент</div>
              <div className={styles.dataItemBody}>
                Отзывы, оценки, заявки на добавление сервера, избранное — то, что вы сами публикуете
                или сохраняете на сайте. Отзывы публикуются под вашим ником после модерации.
              </div>
            </div>
          </div>
        </section>

        <section className={styles.card}>
          <h2 className={styles.cardTitle}>3. Зачем мы их обрабатываем</h2>
          <ul className={styles.list}>
            <li>аутентификация и вход в личный кабинет;</li>
            <li>отображение ника и аватара рядом с вашими отзывами и заявками;</li>
            <li>приём платежей и отправка электронных чеков по 54-ФЗ;</li>
            <li>предоставление оплаченных услуг (VIP, буст);</li>
            <li>защита от спама и злоупотреблений (лимит заявок);</li>
            <li>ответы на ваши обращения в поддержку.</li>
          </ul>
        </section>

        <section className={styles.card}>
          <h2 className={styles.cardTitle}>4. Правовые основания</h2>
          <ul className={styles.list}>
            <li><strong>Ваше согласие</strong> — при входе через VK и при регистрации по email (п. 1 ч. 1 ст. 6 152-ФЗ);</li>
            <li><strong>Исполнение договора</strong> (публичной оферты) — для обработки платежей и оказания услуг (п. 5 ч. 1 ст. 6 152-ФЗ);</li>
            <li><strong>Требование закона</strong> — для отправки кассовых чеков (54-ФЗ, 422-ФЗ о самозанятых).</li>
          </ul>
        </section>

        <section className={styles.card}>
          <h2 className={styles.cardTitle}>5. Где и сколько хранятся</h2>
          <p>
            Базы данных и резервные копии размещены на серверах в Российской Федерации (Москва, ООО «Регистратор
            доменных имён РЕГ.РУ»), что соответствует требованию 242-ФЗ о локализации ПД граждан РФ.
          </p>
          <ul className={styles.list}>
            <li>Данные аккаунта — пока аккаунт существует и до запроса на удаление;</li>
            <li>Платёжные данные (номер платежа, сумма, email) — 5 лет (требование налогового учёта для самозанятых);</li>
            <li>Отзывы — до вашего запроса на удаление или до снятия сервера с каталога;</li>
            <li>IP-адрес при регистрации — не более 30 дней;</li>
            <li>JWT в вашем браузере — до вашего выхода или очистки localStorage.</li>
          </ul>
        </section>

        <section className={styles.card}>
          <h2 className={styles.cardTitle}>6. Кому передаются</h2>
          <p>Мы не продаём и не передаём ПД третьим лицам, кроме случаев, необходимых для работы сервиса:</p>
          <ul className={styles.list}>
            <li><strong>ВКонтакте</strong> (ООО «В Контакте») — при входе через VK ID для проверки вашей личности;</li>
            <li><strong>ЮKassa</strong> (ООО НКО «ЮMoney») — при оплате услуг, для обработки платежа и отправки чека;</li>
            <li><strong>Федеральная налоговая служба</strong> — сведения о чеке автоматически передаются через приложение «Мой налог» в рамках режима НПД;</li>
            <li><strong>Reg.ru</strong> — как хостинг-провайдер, имеет физический доступ к серверам (данные на них зашифрованы на уровне диска VPS).</li>
          </ul>
          <p>Передача ПД за пределы РФ не производится.</p>
        </section>

        <section className={styles.card}>
          <h2 className={styles.cardTitle}>7. Ваши права</h2>
          <p>Вы имеете право в любой момент:</p>
          <ul className={styles.list}>
            <li>получить сведения о том, какие ваши ПД мы обрабатываем;</li>
            <li>потребовать уточнения, блокировки или удаления неточных или устаревших данных;</li>
            <li>отозвать согласие на обработку ПД — в этом случае мы удалим аккаунт и связанные с ним данные (кроме сведений, которые мы обязаны хранить по закону, например, налоговых);</li>
            <li>обратиться с жалобой в Роскомнадзор, если считаете, что ваши права нарушены.</li>
          </ul>
          <p>
            Для реализации прав напишите на <a href={`mailto:${EMAIL}`}>{EMAIL}</a> или в
            {' '}<a href="https://t.me/ManaboRi" target="_blank" rel="noopener">Telegram @ManaboRi</a>.
            Ответ — в срок до 30 дней.
          </p>
        </section>

        <section className={styles.card}>
          <h2 className={styles.cardTitle}>8. Cookies и локальное хранилище</h2>
          <p>
            Сайт не использует аналитические cookies, рекламные трекеры, Яндекс.Метрику, Google Analytics,
            пиксели соцсетей и прочие сторонние скрипты отслеживания. В браузере сохраняется только
            JWT-токен авторизации в localStorage — он нужен, чтобы не просить вас логиниться на каждой странице.
            Вы можете удалить его в любой момент через настройки браузера.
          </p>
        </section>

        <section className={styles.card}>
          <h2 className={styles.cardTitle}>9. Изменения политики</h2>
          <p>
            Мы можем обновлять эту Политику. Актуальная редакция всегда доступна по адресу
            {' '}<Link href="/privacy">l2realm.ru/privacy</Link>. Дата последней редакции указана в начале страницы.
            Существенные изменения мы отметим баннером на главной.
          </p>
        </section>

        <p style={{ fontSize: '.82rem', color: 'var(--text3)', textAlign: 'center', margin: '.4rem 0 0' }}>
          Связанные документы: <Link href="/legal" style={{ color: 'var(--gold)' }}>Оферта и реквизиты</Link>.
        </p>

      </div>
    </div>
  );
}
