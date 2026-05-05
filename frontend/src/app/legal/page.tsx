import type { Metadata } from 'next';
import Link from 'next/link';
import styles from './page.module.css';

export const metadata: Metadata = {
  title: 'Оферта и реквизиты — L2Realm',
  description: 'Публичная оферта, реквизиты исполнителя и порядок оказания платных услуг на L2Realm.',
};

const FIO     = 'Тараскин Егор Андреевич';
const INN     = '772795297504';
const EMAIL   = 'server.l2realm@inbox.ru';

export default function LegalPage() {
  const today = new Date().toLocaleDateString('ru-RU', { day: 'numeric', month: 'long', year: 'numeric' });

  return (
    <div className={styles.page}>
      <div className={styles.hero}>
        <p className={styles.heroEye}>◆ Правовая информация ◆</p>
        <h1 className={styles.heroTitle}>Оферта и <em>реквизиты</em></h1>
        <p className={styles.heroSub}>Условия оказания платных услуг на сайте l2realm.ru и данные исполнителя.</p>
      </div>

      <div className={styles.wrap}>

        <section className={styles.card}>
          <h2 className={styles.cardTitle}>Реквизиты исполнителя</h2>
          <div className={styles.rows}>
            <Row label="ФИО"            value={FIO} />
            <Row label="Статус"         value="Плательщик налога на профессиональный доход (самозанятый)" />
            <Row label="ИНН"            value={INN} />
            <Row label="Email"          value={<a href={`mailto:${EMAIL}`}>{EMAIL}</a>} />
            <Row label="Telegram"       value={<a href="https://t.me/ManaboRi" target="_blank" rel="noopener">@ManaboRi</a>} />
            <Row label="Сайт"           value={<a href="https://l2realm.ru">l2realm.ru</a>} />
          </div>
        </section>

        <section className={styles.card}>
          <h2 className={styles.cardTitle}>Публичная оферта</h2>
          <p className={styles.meta}>Редакция от {today}</p>

          <h3 className={styles.h3}>1. Предмет оферты</h3>
          <p>
            Исполнитель (указан в разделе «Реквизиты») предлагает любому физическому или юридическому лицу (далее — Заказчику)
            платные услуги по продвижению сервера Lineage 2 в каталоге l2realm.ru. Перечень услуг и цены опубликованы
            на странице <Link href="/pricing">Тарифы</Link>.
          </p>

          <h3 className={styles.h3}>2. Состав и стоимость услуг</h3>
          <ul className={styles.list}>
            <li><strong>VIP-размещение</strong> — 5 000 ₽ за 31 день. Сервер отображается в отдельном блоке «VIP» в верхней части каталога с подсветкой и бейджем. Количество мест — 5.</li>
            <li><strong>Буст 🔥</strong> — 500 ₽ за 7 дней. Сервер поднимается выше обычных позиций с меткой «огонёк».</li>
            <li><strong>«Скоро открытие» ⏳</strong> — 500 ₽ разово. Платное размещение анонса сервера, ещё не открытого на момент оплаты, в специальном разделе «Скоро открытие». Услуга оказывается после модерации до даты открытия, указанной Заказчиком в форме.</li>
            <li><strong>VIP в «Скоро открытие»</strong> — 2 000 ₽ за 31 день. Сервер отображается в отдельном VIP-блоке раздела «Скоро открытие» с подсветкой и бейджем. Количество мест — 5.</li>
          </ul>
          <p>Актуальные цены всегда указаны на странице <Link href="/pricing">/pricing</Link>. Изменение цен не влияет на уже оплаченные услуги.</p>

          <h3 className={styles.h3}>3. Порядок оплаты</h3>
          <p>
            Оплата производится через платёжный сервис ЮKassa (ООО НКО «ЮMoney»): банковскими картами, СБП или
            электронными кошельками. Оплата считается произведённой в момент поступления подтверждения от ЮKassa.
          </p>

          <h3 className={styles.h3}>4. Порядок оказания услуги</h3>
          <p>
            VIP, VIP в «Скоро открытие» и буст активируются автоматически в течение нескольких секунд после подтверждения оплаты — Заказчик
            сразу видит изменения на сайте (VIP-блок или метка огонька у своего сервера). Сроки: 31 календарный день
            для VIP-услуг, 7 календарных дней для буста.
          </p>
          <p>
            Размещение «Скоро открытие» проходит модерацию контента (название, описание, URL) в течение 24 часов
            с момента оплаты. После одобрения модератором сервер автоматически появляется в разделе «Скоро открытие»
            и показывается там до даты открытия, указанной Заказчиком; после открытия — переходит в обычный каталог.
            При отказе по результатам модерации (нарушение правил каталога, недостоверная информация) производится
            возврат полной стоимости услуги в порядке п. 5.
          </p>

          <h3 className={styles.h3}>5. Возврат средств</h3>
          <p>
            Возврат возможен в течение 14 дней с момента оплаты при следующих условиях:
          </p>
          <ul className={styles.list}>
            <li>услуга не была использована (прошло менее 24 часов с активации и сервер не отображался в VIP-блоке / с бустом);</li>
            <li>сервер был снят с каталога не по инициативе Заказчика;</li>
            <li>техническая ошибка, из-за которой услуга не была оказана.</li>
          </ul>
          <p>
            Для возврата — напишите в <a href="https://t.me/ManaboRi" target="_blank" rel="noopener">Telegram @ManaboRi</a> или
            на <a href={`mailto:${EMAIL}`}>{EMAIL}</a> с номером платежа. Средства возвращаются на тот же платёжный
            инструмент в срок до 10 рабочих дней.
          </p>

          <h3 className={styles.h3}>6. Ответственность сторон</h3>
          <p>
            Исполнитель не несёт ответственности за содержание, работоспособность и действия игровых серверов,
            размещённых в каталоге — каталог выполняет исключительно информационно-рекламную функцию. Заказчик
            самостоятельно отвечает за достоверность данных о своём сервере.
          </p>

          <h3 className={styles.h3}>7. Акцепт оферты</h3>
          <p>
            Оплата услуги через ЮKassa является полным и безоговорочным акцептом настоящей оферты. Заказчик
            подтверждает, что ознакомился с её условиями и согласен с ними.
          </p>

          <h3 className={styles.h3}>8. Персональные данные</h3>
          <p>
            При оплате ЮKassa передаёт Исполнителю только идентификатор платежа, сумму и email Заказчика (используется
            для отправки чека в рамках 54-ФЗ). Эти данные не передаются третьим лицам и не используются в иных целях.
          </p>
        </section>

        <section className={styles.card}>
          <h2 className={styles.cardTitle}>Способы связи</h2>
          <div className={styles.rows}>
            <Row label="Вопросы и поддержка" value={<a href="https://t.me/ManaboRi" target="_blank" rel="noopener">Telegram @ManaboRi</a>} />
            <Row label="Email"               value={<a href={`mailto:${EMAIL}`}>{EMAIL}</a>} />
            <Row label="Ответ"               value="Обычно в течение 24 часов" />
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
