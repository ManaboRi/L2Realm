// Конфиг страниц по хроникам — /interlude, /high-five, /classic, /essence, /gracia.
// Используется page.tsx (для metadata) и ChroniclePage.tsx (для SSR-рендера).

export type ChronicleCfg = {
  slug:         string;  // путь URL без слеша — 'interlude' / 'high-five' / ...
  chronicle:    string;  // значение для фильтра backend (?chronicle=Interlude — startsWith insensitive)
  title:        string;  // <title> страницы
  description:  string;  // meta description + OG description
  h1:           string;  // заголовок страницы
  intro:        string;  // подзаголовок под H1
};

export const CHRONICLE_CONFIGS: Record<string, ChronicleCfg> = {
  interlude: {
    slug:        'interlude',
    chronicle:   'Interlude',
    title:       'Серверы Lineage 2 Interlude — каталог приватных серверов',
    description: 'Каталог приватных серверов Lineage 2 Interlude. Хроника C6 — самая популярная и сбалансированная. Рейты, рейтинг, отзывы, мониторинг онлайна.',
    h1:          'Серверы Lineage 2 Interlude',
    intro:       'Хроника C6 (Interlude) — золотой стандарт классики Lineage 2. Сбалансированный геймплей, эпические битвы, крафт и осады замков.',
  },
  'high-five': {
    slug:        'high-five',
    chronicle:   'High Five',
    title:       'Серверы Lineage 2 High Five — каталог приватных серверов',
    description: 'Каталог приватных серверов Lineage 2 High Five. Расширенная классика с обновлениями интерфейса, новыми зонами и квестами. Рейты, рейтинг, отзывы.',
    h1:          'Серверы Lineage 2 High Five',
    intro:       'High Five — продолжение Interlude с расширенным геймплеем: новые зоны Кетра/Варка, обновлённый интерфейс, рейды.',
  },
  classic: {
    slug:        'classic',
    chronicle:   'Classic',
    title:       'Серверы Lineage 2 Classic — каталог приватных серверов',
    description: 'Каталог приватных серверов Lineage 2 Classic. Современная NCSoft-версия классики 2018 года. Рейты, рейтинг, отзывы, мониторинг.',
    h1:          'Серверы Lineage 2 Classic',
    intro:       'Lineage 2 Classic — официальный ремастер классики от NCSoft. Низкие рейты, ориентир на оригинальную сложность и долгий прогресс.',
  },
  essence: {
    slug:        'essence',
    chronicle:   'Essence',
    title:       'Серверы Lineage 2 Essence — каталог приватных серверов',
    description: 'Каталог приватных серверов Lineage 2 Essence. Hard-core ветка с переработкой игры под современный темп: соло-данжи, авто-фарм, новые механики.',
    h1:          'Серверы Lineage 2 Essence',
    intro:       'Essence — переработанная версия Lineage 2 для современного темпа: соло-данжи, авто-механики, рейтовые бои.',
  },
  gracia: {
    slug:        'gracia',
    chronicle:   'Gracia',
    title:       'Серверы Lineage 2 Gracia — каталог приватных серверов',
    description: 'Каталог приватных серверов Lineage 2 Gracia. Хроники Final/Epilogue, новые SA, фрагменты Камаэль и атрибуты оружия. Рейты, рейтинг, отзывы.',
    h1:          'Серверы Lineage 2 Gracia',
    intro:       'Gracia (Final/Epilogue) — продолжение Interlude с новой расой Камаэль, атрибутами оружия и переработанным эндгеймом.',
  },
};
