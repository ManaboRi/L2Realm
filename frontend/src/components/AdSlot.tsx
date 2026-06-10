import styles from './AdSlot.module.css';

// ──────────────────────────────────────────────────────────────
// Каркас рекламного блока (по 38-ФЗ «О рекламе»).
// СЕЙЧАС ВЫКЛЮЧЕН: ADS_ENABLED=false → AdSlot ничего не рендерит.
//
// Как включить (когда подключим ОРД и пойдёт трафик):
//   1. Зарегистрироваться в ОРД (VK ОРД / Яндекс ОРД), получить на каждое
//      размещение токен erid.
//   2. Поставить ADS_ENABLED = true.
//   3. Передавать в AdSlot проп `ad` с erid + данными рекламодателя.
// Без erid и пометки «Реклама» блок ставить НЕЛЬЗЯ — это нарушение закона.
// ──────────────────────────────────────────────────────────────
export const ADS_ENABLED = false;

export type AdData = {
  erid: string;            // токен из ОРД — обязателен по закону
  advertiser: string;      // наименование рекламодателя (ИП/ООО/ИНН)
  href: string;            // ссылка на сервер/проект
  title: string;
  subtitle?: string;
  image?: string | null;
};

export function AdSlot({ ad, placement }: { ad?: AdData; placement: string }) {
  // Реклама выключена глобально или нет валидного размещения с erid — ничего не показываем.
  if (!ADS_ENABLED || !ad || !ad.erid) return null;

  return (
    <a
      href={ad.href}
      target="_blank"
      rel="noopener nofollow"
      className={styles.ad}
      data-placement={placement}
    >
      <span className={styles.adMark} title={`Реклама. Рекламодатель: ${ad.advertiser}. erid: ${ad.erid}`}>
        Реклама
      </span>
      {ad.image && (
        <span className={styles.adMedia}>
          <img src={ad.image} alt="" loading="lazy" decoding="async" />
        </span>
      )}
      <span className={styles.adBody}>
        <strong>{ad.title}</strong>
        {ad.subtitle && <span>{ad.subtitle}</span>}
        <small className={styles.adAdvertiser}>{ad.advertiser} · erid: {ad.erid}</small>
      </span>
    </a>
  );
}
