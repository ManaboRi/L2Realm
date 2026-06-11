// Правовой дисклеймер для раздела гайдов (ст. 1274 ГК РФ — справочное использование).
export function GuidesDisclaimer() {
  return (
    <p
      style={{
        maxWidth: 1000,
        margin: '2.6rem auto 0',
        padding: '1rem 1.1rem 0',
        borderTop: '1px solid rgba(118, 141, 151, .12)',
        color: 'rgba(232, 221, 186, .34)',
        fontSize: '.72rem',
        lineHeight: 1.55,
        textAlign: 'center',
      }}
    >
      Иконки, названия предметов, NPC и локаций Lineage&nbsp;2 — собственность NCSoft, используются
      в информационно-справочных целях (ст.&nbsp;1274 ГК&nbsp;РФ). L2Realm не аффилирован с NCSoft.
    </p>
  );
}
