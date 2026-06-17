/* Seed/update Aden-related guide entries and useful quest items.
 *
 * This file is intentionally manual. Aden has many long quests (SA, Noblesse,
 * Seven Signs, 3rd profession), so we keep compact original L2Realm routes
 * instead of dumping source text into the page.
 *
 * Run from backend app root:
 *   node prisma/seed-aden-quests.js
 *
 * Set OVERWRITE_GUIDE_CONTENT=0 if you only want metadata updates.
 * Set DRY_RUN=1 to preview without writing.
 */
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

const OVERWRITE_CONTENT = process.env.OVERWRITE_GUIDE_CONTENT !== '0';
const DRY_RUN = process.env.DRY_RUN === '1';

function slugify(value) {
  return String(value || '')
    .toLowerCase()
    .replace(/&/g, ' and ')
    .replace(/['’]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 86);
}

function rewardLine(reward) {
  const parts = [];
  if (reward.exp) parts.push(`${reward.exp} :exp:`);
  if (reward.sp) parts.push(`${reward.sp} :sp:`);
  if (Object.prototype.hasOwnProperty.call(reward, 'adena')) parts.push(`${reward.adena || ''} :adena:`.trim());
  for (const item of reward.items || []) parts.push(item);
  return parts.join(' · ');
}

function levelText(q) {
  if (q.levelMin != null && q.levelMax != null) return `${q.levelMin}-${q.levelMax}`;
  if (q.levelMin != null) return `${q.levelMin}+`;
  if (q.levelMax != null) return `до ${q.levelMax}`;
  return 'любой';
}

function q(data) {
  return {
    category: 'quests',
    location: 'Аден',
    repeatable: false,
    types: ['Разовые'],
    reward: {},
    related: [],
    chronicle: 'interlude,high-five',
    public: true,
    ...data,
  };
}

function item(data) {
  return {
    category: 'items',
    chronicle: 'interlude,high-five',
    location: null,
    levelMin: null,
    levelMax: null,
    race: null,
    repeatable: false,
    reward: data.type || 'Предмет',
    types: [data.type || 'Квестовый предмет'],
    sort: 7000,
    publishedAt: new Date(),
    ...data,
  };
}

const QUESTS = [
  q({
    title: 'Поднять репутацию Клана',
    titleEn: "A Clan's Reputation",
    levelMin: 0,
    npc: 'Сэр Эрик Родемай',
    types: ['Клановые', 'Повторяемые'],
    repeatable: true,
    requirement: 'Лидер клана 5 уровня или выше.',
    reward: { items: ['Clan Reputation Points'] },
    steps: [
      'В центре **Адена** поговорите с **Сэром Эриком Родемаем** и выберите рейд-босса из списка.',
      'Соберите группу клана и убейте выбранного босса. Количество очков репутации зависит от уровня и сложности цели.',
      'После убийства вернитесь к **Эрику Родемаю** и сдайте подтверждение.',
      'Если нужен новый заход, снова выберите рейд-босса и повторите цепочку.',
    ],
    related: ['Сэр Эрик Родемай', 'Clan Reputation Points'],
  }),
  q({
    title: 'Усиление оружия',
    titleEn: 'Enhance Your Weapon',
    levelMin: 40,
    levelMax: 80,
    npc: 'Келая',
    types: ['Повторяемые'],
    repeatable: true,
    requirement: 'Подходит персонажам 40-80 уровня. Нужен подходящий Soul Crystal и оружие, которое поддерживает Special Ability.',
    reward: { items: ['Special Ability', 'Soul Crystal upgrade'] },
    notes: [
      'Квест на SA длинный из-за таблиц кристаллов. На странице оставляем практический маршрут: где взять квест, как качать кристалл и где вставлять SA.',
      'Для разных грейдов оружия нужны разные уровни Soul Crystal. Перед вставкой проверьте, что оружие поддерживает нужный эффект.',
    ],
    steps: [
      'Возьмите квест у одного из NPC: **Юрек** в Гиране, **Гидеон** в Орене или **Келая** в Адене.',
      'Получите или подготовьте **Soul Crystal** нужного цвета. Цвет выбирается под будущий эффект оружия.',
      'Качайте кристалл на подходящих монстрах или рейд-боссах. Чем выше уровень кристалла, тем сильнее и дороже цель для прокачки.',
      'Если кристалл не вырос после убийства, продолжайте охоту: повышение уровня не всегда срабатывает с первого раза.',
      'Когда Soul Crystal достиг нужного уровня, идите к кузнецу или маммону, выберите Special Ability и вставьте эффект в оружие.',
    ],
    related: ['Юрек', 'Гидеон', 'Келая', 'Soul Crystal', 'Special Ability'],
  }),
  q({
    title: 'Битва за Земли Адена',
    titleEn: 'For the Sake of the Territory - Aden',
    chronicle: 'high-five',
    levelMin: 40,
    npc: 'Капитан Наемников',
    types: ['Сюжетный', 'Разовые'],
    requirement: 'Квест берется перед Территориальными Войнами.',
    reward: { items: ['Aden Territory Badge', 'Unknown Reward'] },
    steps: [
      'В **Адене** поговорите с **Капитаном Наемников** не позднее чем за пару часов до начала Территориальных Войн.',
      'Во время войны выполняйте цели территории: уничтожайте катапульты, склады снабжения и лидеров вражеских ассоциаций.',
      'Если идет борьба за флаги, участвуйте в защите или захвате флага чужой территории.',
      'После окончания события вернитесь к **Капитану Наемников** и получите **Aden Territory Badge**, если был засчитан вклад.',
    ],
    related: ['Капитан Наемников', 'Aden Territory Badge', 'Territory Catapult', 'Supplies Safe'],
  }),
  q({
    title: 'Драгоценная душа, ч. 1',
    titleEn: 'Possessor of a Precious Soul - 1',
    levelMin: 50,
    levelMax: 75,
    npc: 'Талиен',
    types: ['Ноблес', 'Сюжетный'],
    requirement: 'Нужен активированный подкласс.',
    reward: { exp: '263,043', items: ['Possessor of a Precious Soul - 2'] },
    steps: [
      'В **Адене** найдите **Талиена** у лестницы к храму и возьмите историю о героях Антараса.',
      'В **Гиране** поговорите с **Габриэль**, затем идите ко входу в **Долину Драконов** к **Гильмору**.',
      'Найдите и убейте **Барахама**, заберите нужную легенду и вернитесь по цепочке.',
      'Дальше маршрут идет через **Мелодию**, **Кантабилона**, **Старого Гнома** и сбор материалов для песни героев.',
      'В финале вернитесь к **Талиену**, сдайте собранную историю и откройте вторую часть цепочки Ноблесса.',
    ],
    related: ['Талиен', 'Габриэль', 'Гильмор', 'Барахам', 'Possessor of a Precious Soul - 2'],
  }),
  q({
    title: 'Драгоценная душа, ч. 2',
    titleEn: 'Possessor of a Precious Soul - 2',
    levelMin: 60,
    levelMax: 75,
    location: 'Руна',
    npc: 'Вирджил',
    types: ['Ноблес', 'Сюжетный'],
    requirement: 'Выполнена первая часть Ноблесса.',
    reward: { exp: '455,764', items: ['Possessor of a Precious Soul - 3'] },
    steps: [
      'В **Руне** поговорите с **Вирджилом**, затем с **Кассандрой** и **Огмаром**.',
      'Отправляйтесь в **Болото Криков** и найдите NPC по следам сна Кассандры.',
      'Выполните поручение с мертвыми ангелами и соберите нужные доказательства.',
      'Вернитесь к **Вирджилу** и завершите вторую часть цепочки.',
    ],
    related: ['Вирджил', 'Кассандра', 'Огмар', 'Possessor of a Precious Soul - 3'],
  }),
  q({
    title: 'Драгоценная душа, ч. 3',
    titleEn: 'Possessor of a Precious Soul - 3',
    levelMin: 65,
    levelMax: 75,
    location: 'Годдард',
    npc: 'Карадин',
    types: ['Ноблес', 'Сюжетный'],
    requirement: 'Выполнена вторая часть Ноблесса.',
    reward: { exp: '719,843', items: ['Possessor of a Precious Soul - 4'] },
    steps: [
      'В **Годдарде** поговорите с **Карадин**, затем с **Оссианом** рядом с ней.',
      'В **Долине Святых** выбейте **Ring of Goddess Waterbinder** и **Necklace of Goddess Evergreen** с указанных монстров.',
      'Вернитесь к **Оссиану**. После этого понадобится предмет с рейд-босса **Flame of Splendor Barakiel**.',
      'Сдайте предмет **Оссиану**, затем поговорите с **Карадин**, чтобы открыть последнюю часть.',
    ],
    related: ['Карадин', 'Оссиан', 'Flame of Splendor Barakiel', 'Ring of Ages'],
  }),
  q({
    title: 'Драгоценная душа, ч. 4',
    titleEn: 'Possessor of a Precious Soul - 4',
    levelMin: 75,
    levelMax: 80,
    location: 'Годдард',
    npc: 'Карадин',
    types: ['Ноблес', 'Сюжетный'],
    requirement: 'Выполнена третья часть Ноблесса.',
    reward: { exp: '93,836', items: ['Noblesse Tiara', 'Статус Дворянина'] },
    steps: [
      'Поговорите с **Карадин** в **Годдарде** и согласитесь встретиться с ее госпожой.',
      'После телепорта поговорите с **Леди Озера** у Колизея.',
      'Подтвердите готовность служить Еве и завершите цепочку.',
      'Получите статус Дворянина и **Noblesse Tiara**.',
    ],
    related: ['Карадин', 'Леди Озера', 'Noblesse Tiara'],
  }),
  q({
    title: 'Обольщающий шепот',
    titleEn: 'Seductive Whispers',
    levelMin: 50,
    npc: 'Вилберт',
    repeatable: true,
    types: ['Повторяемые'],
    reward: { items: ['Unknown Reward', 'Scroll: Enchant Weapon (D-grade)', 'Scroll: Enchant Weapon (C-grade)', 'Scroll: Enchant Armor (B-grade)', 'Scroll: Enchant Weapon (B-grade)', 'Scroll: Enchant Armor (A-grade)', 'Scroll: Enchant Weapon (A-grade)'] },
    steps: [
      'В кузнице **Адена** поговорите с **Вилбертом**.',
      'Охотьтесь на монстров в **Кладбище**, **Древнем Поле Битвы** или **Поле Брани** и собирайте **Spirit Bead**.',
      'Для одной игры нужно 50 бусин. Вернитесь к **Вилберту** и сыграйте в мини-игру.',
      'Награда зависит от серии побед: можно забрать раннюю награду или рискнуть ради более высокой.',
    ],
    related: ['Вилберт', 'Spirit Bead', 'Scroll: Enchant Weapon (A-grade)', 'Unknown Reward'],
  }),
  q({
    title: 'Осквернители Кладбища',
    titleEn: 'Plunder Their Supplies',
    levelMin: 52,
    levelMax: 59,
    npc: 'Колман',
    repeatable: true,
    types: ['Повторяемые'],
    reward: { adena: '' },
    steps: [
      'У южных ворот **Адена** поговорите со стражником **Колманом**.',
      'В **Кладбище** убивайте **Taik Orc Seeker** и **Taik Orc Supply Leader**.',
      'Собирайте **Supply Items** и **Receipt of Supply**.',
      'Вернитесь к **Колману**. Адена начисляется за базовую сдачу и за каждый собранный припас.',
    ],
    related: ['Колман', 'Taik Orc Seeker', 'Taik Orc Supply Leader', 'Supply Items'],
  }),
  q({
    title: 'Поруганная честь',
    titleEn: 'Stolen Dignity',
    levelMin: 58,
    levelMax: 75,
    npc: 'Черный Голем',
    repeatable: true,
    types: ['Повторяемые'],
    reward: { items: ['Unknown Reward', 'A-grade crafting materials'] },
    steps: [
      'На складе **Адена** поговорите с **Черным Големом**.',
      'Охотьтесь на монстров в **Раскаленных Топях**, **Запретных Вратах**, **Поле Брани** и соседних высокоуровневых зонах.',
      'Собирайте **Stolen Infernium Ore**.',
      'Вернитесь на склад и сыграйте в мини-игру 5x5. Чем удачнее линия, тем лучше награда.',
    ],
    related: ['Черный Голем', 'Stolen Infernium Ore', 'Unknown Reward'],
  }),
  q({
    title: 'Вопли призраков',
    titleEn: 'Shrieks of Ghosts',
    levelMin: 59,
    levelMax: 71,
    npc: 'Рева',
    repeatable: true,
    types: ['Повторяемые'],
    reward: { adena: '' },
    steps: [
      'В **Адене** возьмите квест у **Ревы**.',
      'В **Башне Дерзости** охотьтесь на **Hallate’s Warrior**, **Hallate’s Knight** и **Hallate’s Commander**.',
      'Собирайте **Ancient Ash Urn**. Если накопить больше 100 урн, награда обычно выгоднее.',
      'Сдайте урны **Реве** и повторяйте фарм, пока зона подходит по уровню.',
    ],
    related: ['Рева', 'Hallate’s Warrior', 'Ancient Ash Urn', 'Башня Дерзости'],
  }),
  q({
    title: 'Наследие безумия',
    titleEn: 'Legacy of Insolence',
    levelMin: 59,
    levelMax: 75,
    npc: 'Вальдерал',
    repeatable: true,
    types: ['Повторяемые'],
    reward: { items: ['A Grade recipe', 'A Grade crafting materials', 'Unknown Reward'] },
    notes: [
      'Это фарм-квест Башни Дерзости. Удобнее держать страницу открытой как список этажей и предметов.',
    ],
    steps: [
      'На складе **Адена** поговорите с **Вальдералом**.',
      'Отправляйтесь в **Башню Дерзости** и фармите нужные этажи: 3-5 этажи дают первые таблички, выше идут рецепты и материалы A-grade.',
      'Собирайте страницы, чертежи и части комплектов. Не сдавайте по одной штуке, если хотите собрать конкретный набор.',
      'Когда накопите нужный комплект, вернитесь к **Вальдералу** и выберите награду.',
      'Если нужен другой рецепт или ресурс, продолжайте фармить нужный этаж и сдавайте новые наборы.',
    ],
    related: ['Вальдерал', 'Башня Дерзости', 'A Grade recipe', 'Blooded Fabric'],
  }),
  q({
    title: 'Самонадеянный поиск',
    titleEn: 'An Arrogant Search',
    levelMin: 60,
    levelMax: 75,
    npc: 'Ханелин',
    reward: { items: ['Blooded Fabric', 'Unknown Reward'] },
    steps: [
      'В гильдии темных эльфов **Адена** поговорите с **Ханелин**.',
      'Добудьте первый предмет: в старых хрониках это цель в **Пещере Гигантов**, в более поздних версиях маршрут может отправить в **Забытые Равнины**.',
      'Вернитесь к **Ханелин** и получите три письма.',
      'Обойдите NPC по письмам: один маршрут ведет через Аден, второй через Гиран, третий через Орен.',
      'После сбора поручений купите у **Ханелин** белую ткань, поднимитесь в **Башню Дерзости** и окрасьте ее на нужных ангелах.',
      'Получите **Blooded Fabric** — ключевой предмет для доступа к Баюму.',
    ],
    related: ['Ханелин', 'Blooded Fabric', 'Башня Дерзости', 'Баюм'],
  }),
  q({
    title: 'Обувь для свадьбы',
    titleEn: 'Make a Pair of Dress Shoes',
    levelMin: 60,
    npc: 'Вудли',
    reward: { items: ['Dress Shoe Box'] },
    steps: [
      'В магазине брони **Адена** поговорите с **Вудли**.',
      'Сходите к **Лейкар** рядом с оружейной лавкой и уточните заказ.',
      'Вернитесь к **Вудли** и принесите материалы: **200 Leather**, **600 Thread** и **200,000 Adena**.',
      'Сдайте материалы и получите **Dress Shoe Box**.',
    ],
    related: ['Вудли', 'Лейкар', 'Dress Shoe Box', 'Leather'],
  }),
  q({
    title: 'Сундук Огня',
    titleEn: 'Chest Caught with a Bait of Fire',
    levelMin: 60,
    levelMax: 62,
    npc: 'Линеус',
    requirement: 'Сначала выполните квест **Особая наживка Линеуса**.',
    reward: { items: ['Necklace of Protection', 'Musical Score - Theme of Journey'] },
    steps: [
      'В бакалейной лавке **Адена** поговорите с **Линеусом**.',
      'Используйте **Flaming Bait** и рыбачьте, пока не получите **Red Treasure Chest**.',
      'Если квестовой наживки не хватило, продолжайте обычной подходящей наживкой.',
      'Вернитесь к **Линеусу**, отдайте сундук и получите **Rukal’s Musical Score**, после чего награда продолжит цепочку.',
    ],
    related: ['Линеус', 'Flaming Bait', 'Red Treasure Chest', 'Necklace of Protection', 'Musical Score - Theme of Journey'],
  }),
  q({
    title: 'Свадебный наряд',
    titleEn: 'Make Formal Wear',
    levelMin: 60,
    npc: 'Алексис',
    reward: { items: ['Formal Wear'] },
    steps: [
      'В **Адене** поговорите с **Алексисом** и получите направление к **Лейкар**.',
      'Поговорите с **Лейкар** рядом с оружейной лавкой. Она попросит подготовить несколько деталей костюма.',
      'Сделайте связанные поручения: **Make a Sewing Kit**, **Make a Pair of Dress Shoes** и доставку нужных материалов.',
      'Подготовьте основные ресурсы для пошива: ткань, кожу, нитки и адену по требованиям NPC.',
      'Вернитесь к **Лейкар** и сдайте готовые детали.',
      'Получите **Formal Wear**.',
    ],
    related: ['Алексис', 'Лейкар', 'Formal Wear', 'Sewing Kit', 'Dress Shoe Box'],
  }),
  q({
    title: 'Особая наживка Линеуса',
    titleEn: "Linnaeus' Special Bait",
    levelMin: 60,
    levelMax: 62,
    npc: 'Линеус',
    reward: { items: ['Flaming Bait', 'Chest Caught with a Bait of Fire'] },
    steps: [
      'В бакалейной лавке **Адена** поговорите с членом гильдии рыболовов **Линеусом**.',
      'Отправляйтесь к **Запретным Вратам** и охотьтесь на **Crimson Drake**.',
      'Соберите **100 Crimson Drake Heart**.',
      'Вернитесь к **Линеусу** и получите **4 Flaming Bait** для квеста **Сундук Огня**.',
    ],
    related: ['Линеус', 'Crimson Drake', 'Flaming Bait', 'Chest Caught with a Bait of Fire'],
  }),
  q({
    title: 'Бессонный покойник',
    titleEn: 'For a Sleepless Deadman',
    levelMin: 60,
    levelMax: 67,
    npc: 'Орвен',
    repeatable: true,
    types: ['Повторяемые'],
    reward: { items: ['A Grade crafting materials', 'Unknown Reward'] },
    steps: [
      'В храме **Адена** поговорите с **Орвеном**.',
      'Идите в **Поле Брани** и убивайте **Doom Archer**, **Doom Guard** и **Doom Servant**.',
      'Соберите **60 Remains of Aden Residents**.',
      'Вернитесь к **Орвену** и поговорите с ним до конца диалога, чтобы получить материалы A-grade.',
    ],
    related: ['Орвен', 'Doom Archer', 'Remains of Aden Residents'],
  }),
  q({
    title: 'Швейный набор',
    titleEn: 'Make a Sewing Kit',
    levelMin: 60,
    npc: 'Феррис',
    reward: { items: ['Sewing Kit'] },
    steps: [
      'В кузнице **Адена** поговорите с **Феррисом**.',
      'Идите в **Кратер Башни Слоновой Кости** и убивайте **Enchanted Iron Golem**.',
      'Соберите **5 Enchanted Iron** и вернитесь к **Феррису**.',
      'Дополнительно отдайте **10 Oriharukon** и **10 Artisan’s Frame**.',
      'Получите **Sewing Kit** для свадебной цепочки.',
    ],
    related: ['Феррис', 'Enchanted Iron Golem', 'Sewing Kit', 'Oriharukon Ore'],
  }),
  q({
    title: 'Игра в карты',
    titleEn: 'A Game of Cards',
    levelMin: 61,
    levelMax: 80,
    npc: 'Кламп',
    repeatable: true,
    types: ['Повторяемые'],
    reward: { items: ['Unknown Reward', 'Scroll: Enchant Armor (D-grade)', 'Scroll: Enchant Weapon (D-grade)', 'Scroll: Enchant Weapon (C-grade)', 'Scroll: Enchant Weapon (B-grade)', 'Scroll: Enchant Weapon (A-grade)', 'Scroll: Enchant Weapon (S-grade)'] },
    steps: [
      'На складе **Адена** поговорите с **Клампом**.',
      'Фармите **Red Gem** на монстрах в Раскаленных Топях, Поле Брани, Запретных Вратах и соседних высокоуровневых зонах.',
      'Для одной партии нужно **50 Red Gem**.',
      'Вернитесь к **Клампу** и сыграйте в карты. Чем лучше комбинация, тем выше шанс на ценные свитки.',
    ],
    related: ['Кламп', 'Red Gem', 'Scroll: Enchant Weapon (S-grade)', 'Unknown Reward'],
  }),
  q({
    title: 'Путешествие в Грацию',
    titleEn: 'Journey to Gracia',
    chronicle: 'high-five',
    levelMin: 75,
    npc: 'Орвен',
    reward: { exp: '5,326,400', sp: '6,000,000', adena: '1,135,000' },
    steps: [
      'В храме **Адена** поговорите с **Орвеном** и получите письмо для командования Грации.',
      'Через **Говорящий Остров** отправляйтесь в **Воздушную Гавань Глудио**.',
      'В гавани найдите **Фафику** и передайте письмо.',
      'С помощью воздушного корабля отправляйтесь на материк Грация.',
      'Поговорите с **Адмиралом Кецериусом** и завершите знакомство с континентом.',
    ],
    related: ['Орвен', 'Фафику', 'Адмирал Кецериус'],
  }),
  q({
    title: 'Сага Полководца',
    titleEn: 'Saga of the Dreadnought',
    levelMin: 76,
    npc: 'Айкен',
    types: ['Профессия'],
    requirement: 'Класс **Копейщик**.',
    reward: { exp: '2,299,404', adena: '5,000,000', items: ["Lesser Giant's Codex", 'Профессия Dreadnought'] },
    steps: sagaSteps('Айкен', 'Ульрих', 'Донат', 'Рыбный суп', 'Dreadnought'),
    related: ['Айкен', 'Ульрих', 'Донат', "Lesser Giant's Codex"],
  }),
  q({
    title: 'Путь Солдата',
    titleEn: 'Law Enforcement',
    chronicle: 'high-five',
    levelMin: 76,
    npc: 'Лиен',
    types: ['Профессия'],
    requirement: 'Камаэль после базовой цепочки инспектора.',
    reward: { adena: '26,000', items: ['Профессия Judicator'] },
    steps: [
      'В **Адене** поговорите с **Лиен**.',
      'Отправляйтесь в **Деревню Камаэль** к **Кекропусу**.',
      'После разговора найдите **Эйндбранча**.',
      'Сдайте поручение и получите профессию **Judicator**.',
    ],
    related: ['Лиен', 'Кекропус', 'Эйндбранч'],
  }),
  q({
    title: 'Сага Виртуоза',
    titleEn: 'Saga of the Sword Muse',
    levelMin: 76,
    npc: 'Раен',
    types: ['Профессия'],
    requirement: 'Класс **Менестрель**.',
    reward: { exp: '2,299,404', adena: '5,000,000', items: ["Lesser Giant's Codex", 'Профессия Sword Muse'] },
    steps: sagaSteps('Раен', 'Фейнн', 'Донат', 'Холодное пиво', 'Sword Muse'),
    related: ['Раен', 'Фейнн', 'Донат', "Lesser Giant's Codex"],
  }),
  q({
    title: 'Сага Дуэлиста',
    titleEn: 'Saga of the Duelist',
    levelMin: 76,
    npc: 'Седрик',
    types: ['Профессия'],
    requirement: 'Класс **Гладиатор**.',
    reward: { exp: '2,299,404', adena: '5,000,000', items: ["Lesser Giant's Codex", 'Профессия Duelist'] },
    steps: sagaSteps('Седрик', 'Директор Арены', 'Донат', 'Роскошное блюдо', 'Duelist'),
    related: ['Седрик', 'Директор Арены', 'Донат', "Lesser Giant's Codex"],
  }),
  q({
    title: 'Сага Рыцаря Феникса',
    titleEn: 'Saga of the Phoenix Knight',
    levelMin: 76,
    npc: 'Седрик',
    types: ['Профессия'],
    requirement: 'Класс **Паладин**.',
    reward: { exp: '2,299,404', adena: '5,000,000', items: ["Lesser Giant's Codex", 'Профессия Phoenix Knight'] },
    steps: sagaSteps('Седрик', 'Феликс', 'Донат', 'Ледяной цветок', 'Phoenix Knight'),
    related: ['Седрик', 'Феликс', 'Донат', "Lesser Giant's Codex"],
  }),
  q({
    title: 'Сила Стихий',
    titleEn: 'Containing the Attribute Power',
    chronicle: 'high-five',
    levelMin: 76,
    npc: 'Учитель Инь',
    types: ['Разовые'],
    reward: { exp: '10,000,000', sp: '11,200,000', items: ['Attribute Stone', 'Unknown Reward'] },
    steps: [
      'В **Адене** поговорите с **Учителем Инь** или **Учителем Ян**. Выберите ветку стихии.',
      'Для ветки Инь ловите **Безумного Духа Воды** в окрестностях Адена или на Равнинах Неистовства.',
      'Для ветки Ян выполняйте аналогичную охоту по направлению Руны и земель Руны.',
      'Используйте выданное оружие или усиление: обычная атака без квестового эффекта может не засчитать цель.',
      'Вернитесь к выбранному учителю, сдайте пойманных духов и получите награду стихии.',
    ],
    related: ['Учитель Инь', 'Учитель Ян', 'Attribute Stone', 'Безумный Дух Воды'],
  }),
  q({
    title: 'Сага Храмовника Евы',
    titleEn: "Saga of the Eva's Templar",
    levelMin: 76,
    npc: 'Синден',
    types: ['Профессия'],
    requirement: 'Класс **Рыцарь Евы**.',
    reward: { exp: '2,299,404', adena: '5,000,000', items: ["Lesser Giant's Codex", "Профессия Eva's Templar"] },
    steps: sagaSteps('Синден', 'Бронвин', 'Донат', 'Pure Ice', "Eva's Templar"),
    related: ['Синден', 'Бронвин', 'Донат', "Lesser Giant's Codex"],
  }),
  sevenSigns('Семь Печатей, Священное Писание Печати', 'Seven Signs, the Sacred Book of Seal', 'Уд', 'Выполнен квест **Семь Печатей, Печать Императора**.', { exp: '10,000,000', sp: '2,500,000', items: ['Seven Signs, Embryo'] }, [
    'В храме **Адена** поговорите с **Удом**, затем с **Орвеном**.',
    'Отнесите письмо **Леопарду** в Годдард.',
    'После расшифровки вернитесь по цепочке к **Уду**.',
    'Получите переход к следующей части Seven Signs.',
  ]),
  sevenSigns('Семь Печатей, Эмбрио', 'Seven Signs, Embryo', 'Уд', 'Выполнен квест **Семь Печатей, Священное Писание Печати**.', { exp: '67,500,000', sp: '15,000,000', adena: '1,500,000', items: ["Dawn's Bracelet", 'Seven Signs, Mysterious Girl'] }, [
    'В **Адене** поговорите с **Удом** и согласитесь встретиться с **Францем**.',
    'В инстансе убейте капитана среди трех **Shilen’s Evil Thoughts**.',
    'После боя поговорите с **Францем**, затем с **Джейной**.',
    'Вернитесь к **Уду** и получите **Dawn’s Bracelet**.',
  ]),
  sevenSigns('Семь Печатей, Тайные Знания Жрецов', 'Seven Signs, Secret Ritual of the Priests', 'Клаудия Атебальт', 'Выполнен квест **Семь Печатей, Договор Маммона**.', { exp: '10,000,000', sp: '2,500,000', items: ['Seven Signs, Seal of the Emperor'] }, [
    'В **Адене** поговорите с **Клаудией Атебальт**.',
    'В **Глудио** найдите **Джона**, затем **Раймонда** в храме.',
    'Запомните код библиотеки: **72.79.78.71**.',
    'В трансформации стражника используйте скрытность и пройдите Секретный Оракул.',
    'Заберите книгу и вернитесь по цепочке к **Клаудии**.',
  ]),
  q({
    title: 'Шаг к Славе',
    titleEn: 'Steps for Honor',
    chronicle: 'high-five',
    levelMin: 80,
    npc: 'Рапидус',
    types: ['Клановые', 'Повторяемые'],
    repeatable: true,
    reward: { items: ['Sealed Ancient Cloak'] },
    steps: [
      'В **Адене** поговорите с **Рапидусом**.',
      'Участвуйте в Территориальных Войнах и убивайте противников выше 61 уровня, записанных за другие территории.',
      'Сначала соберите 9 подтверждений, затем цепочка попросит больше убийств.',
      'После этапов возвращайтесь к **Рапидусу** и сдавайте прогресс.',
      'Финальная награда — **Sealed Ancient Cloak**.',
    ],
    related: ['Рапидус', 'Sealed Ancient Cloak'],
  }),
  sevenSigns('Семь Печатей, Таинственная Дева', 'Seven Signs, Mysterious Girl', 'Уд', 'Выполнен квест **Семь Печатей, Эмбрио**.', { exp: '10,000,000', sp: '1,000,000', items: ['Seven Signs, One Who Seeks the Power of the Seal'] }, [
    'В храме **Адена** поговорите с **Удом** и переместитесь к **Францу**.',
    'После разговора через **Джейну** вернитесь наружу.',
    'В **Руне** отправляйтесь на **Ферму Диких Зверей** и найдите **Неприветливого Мужчину**.',
    'Попадите к **Элькардии**, поговорите с ней и продолжайте цепочку через Руны и Павловы Руины.',
  ]),
  sevenSigns('Семь Печатей, Ищущий силу печати', 'Seven Signs, One Who Seeks the Power of the Seal', 'Уд', 'Выполнен квест **Семь Печатей, Гробница Святой**.', { exp: '70,000,000', sp: '12,500,000', items: ['Certificate of Dawn'] }, [
    'В **Адене** поговорите с **Удом**.',
    'Отправляйтесь в **Монастырь Безмолвия** и найдите **Странный Глобус**.',
    'В тайной комнате поговорите с мыслями Эрис и посмотрите сцену с Элькардией.',
    'Убейте **Etis van Etina**, поговорите с **Элькардией** и выйдите из инстанса.',
    'Вернитесь к **Уду** и получите **Certificate of Dawn**.',
  ]),
  q({
    title: 'Сплоченность Клана',
    titleEn: 'Proof of Clan Alliance',
    levelMin: 0,
    location: 'Гиран',
    npc: 'Сэр Кристоф Родемай',
    types: ['Клановые'],
    requirement: 'Лидер клана 3 уровня. Нужна группа из выбранных участников клана.',
    reward: { sp: '120,000', items: ['Proof of Alliance'] },
    steps: [
      'В **Гиране** поговорите с **Сэром Кристофом Родемаем**.',
      'Возьмите с собой минимум трех участников клана и лекаря: часть задания требует жертвенного этапа.',
      'У **Башни Слоновой Кости** поговорите с **Калис**.',
      'Участники получают **Symbol of Loyalty** через статуи подношения.',
      'Соберите противоядие и необходимые травы по поручению Калис.',
      'Вернитесь к **Кристофу** и получите **Proof of Alliance**.',
    ],
    related: ['Сэр Кристоф Родемай', 'Калис', 'Proof of Alliance', 'Symbol of Loyalty'],
  }),
  q({
    title: 'Мандолина Барда',
    titleEn: "Bard's Mandolin",
    levelMin: 15,
    location: 'Дион',
    npc: 'Сван',
    reward: { adena: '10,000', items: ['Musical Score - Theme of Journey'] },
    steps: [
      'В **Дионе** поговорите с бардом **Сваном**.',
      'В **Адене** найдите **Вудро** в оружейном магазине и уточните, где посылка.',
      'Отправляйтесь к пристани Гирана и заберите флейту у нужного NPC.',
      'Передайте подарок девушке Свана, затем вернитесь к барду.',
      'Получите адену и **Musical Score - Theme of Journey**.',
    ],
    related: ['Сван', 'Вудро', 'Musical Score - Theme of Journey'],
  }),
  q({
    title: 'Тысяча Лет: Конец Плача',
    titleEn: '1000 years, the End of Lamentation',
    levelMin: 48,
    levelMax: 55,
    location: 'Долина Драконов',
    npc: 'Гильмор',
    repeatable: true,
    types: ['Повторяемые'],
    reward: { adena: '', items: ['Unknown Reward', 'Scroll: Enchant Armor (C-grade)', 'Scroll: Enchant Weapon (C-grade)'] },
    steps: [
      'У входа в **Долину Драконов** поговорите с **Гильмором**.',
      'Охотьтесь на нежить в Долине Драконов.',
      'Собирайте **Articles of Dead Heroes**.',
      'Сдавайте предметы **Гильмору**. Базовая награда идет за каждый предмет, иногда выпадают дополнительные награды.',
    ],
    related: ['Гильмор', 'Articles of Dead Heroes', 'Scroll: Enchant Weapon (C-grade)'],
  }),
  q({
    title: 'Аудиенция у Дракона Земли',
    titleEn: 'Audience with the Land Dragon',
    levelMin: 50,
    levelMax: 64,
    location: 'Гиран',
    npc: 'Габриэль',
    reward: { items: ['Portal Stone'] },
    steps: [
      'В **Гиране** поговорите с **Габриэль** и получите перо-поручение.',
      'Соберите печати хранителей: маршрут ведет через **Забытые Равнины**, **Пещеру Гигантов**, **Лес Зеркал** и другие зоны.',
      'Для каждой печати убивайте указанных монстров до выпадения нужного предмета и сдавайте его соответствующему NPC.',
      'После основных печатей вернитесь к **Габриэль** и выполните финальные поручения.',
      'Получите **Portal Stone** для входа к Антарасу.',
    ],
    related: ['Габриэль', 'Portal Stone', 'Антарас'],
  }),
  q({
    title: 'Шепот Судьбы',
    titleEn: "Fate's Whisper",
    levelMin: 75,
    location: 'Орен',
    npc: 'Реорин',
    types: ['Сюжетный'],
    reward: { items: ['Star of Destiny', 'Low A-grade Weapon', 'Unknown Reward'] },
    steps: [
      'Найдите **Маэстро Реорина** в районе Орена и возьмите квест.',
      'Дождитесь убийства **Shilen’s Messenger Cabrio** на Кладбище и откройте сундук после рейда, чтобы получить сферу души.',
      'Вернитесь к **Реорину**, затем соберите три Infernium Scepter с рейд-боссов в **Башне Дерзости**.',
      'Обойдите торговца и кузнеца по цепочке Реорина, чтобы подготовить форму и материалы.',
      'Сдайте **984 B-grade кристалла** и нужное B-grade оружие.',
      'Выберите Low A-grade оружие и получите **Star of Destiny** для сабкласса.',
    ],
    related: ['Реорин', 'Shilen’s Messenger Cabrio', 'Star of Destiny', 'Raid Sword'],
  }),
  q({
    title: 'Сага Мастера Стихий',
    titleEn: 'Saga of the Elemental Master',
    levelMin: 76,
    location: 'Аден',
    npc: 'Аркениас',
    types: ['Профессия'],
    requirement: 'Класс **Призыватель**.',
    reward: { exp: '2,299,404', adena: '5,000,000', items: ["Lesser Giant's Codex", 'Профессия Elemental Master'] },
    steps: sagaSteps('Аркениас', 'Радисс', 'Серенас', 'лекарство для Радисса', 'Elemental Master'),
    related: ['Аркениас', 'Радисс', 'Серенас', "Lesser Giant's Codex"],
  }),
  q({
    title: 'Сага Владыки Теней',
    titleEn: 'Saga of the Spectral Master',
    levelMin: 76,
    location: 'Аден',
    npc: 'Фэйрен',
    types: ['Профессия'],
    requirement: 'Класс **Последователь Тьмы**.',
    reward: { exp: '2,299,404', adena: '5,000,000', items: ["Lesser Giant's Codex", 'Профессия Spectral Master'] },
    steps: sagaSteps('Фэйрен', 'Ноктисс', 'Камилен', 'Cure for Fever', 'Spectral Master'),
    related: ['Фэйрен', 'Ноктисс', 'Камилен', "Lesser Giant's Codex"],
  }),
  q({
    title: 'Сага Карателя',
    titleEn: 'Saga of the Doombringer',
    chronicle: 'high-five',
    levelMin: 76,
    location: 'Деревня Камаэль',
    npc: 'Кекропус',
    types: ['Профессия'],
    requirement: 'Класс **Берсерк**.',
    reward: { exp: '2,299,404', adena: '5,000,000', items: ["Lesser Giant's Codex", 'Профессия Doombringer'] },
    steps: sagaSteps('Кекропус', 'Дурога', 'Мист', 'Freezer', 'Doombringer'),
    related: ['Кекропус', 'Дурога', 'Мист', "Lesser Giant's Codex"],
  }),
  sevenSigns('Семь Печатей, Печать Императора', 'Seven Signs, Seal of the Emperor', 'Ясон Хейн', 'Выполнен квест **Семь Печатей, Тайные Знания Жрецов**.', { exp: '10,000,000', sp: '2,500,000', items: ['Seven Signs, the Sacred Book of Seal'] }, [
    'В **Хейне** поговорите с **Ясоном Хейном**, затем с **Торговцем Маммона**.',
    'Найдите **Обещание Маммона** у входа в Некрополь Апостолов.',
    'Пройдите инстанс прошлого, помогая армии Шунаймана.',
    'После финальной сцены вернитесь к **Ясону Хейну** и откройте следующую часть цепочки.',
  ]),
  sevenSigns('Семь Печатей, Договор Маммона', "Seven Signs, Mammon's Contract", 'Сэр Густав Атебальт', 'Выполнен квест **Семь Печатей, Весть о Смерти**.', { exp: '10,000,000', sp: '2,500,000', items: ['Seven Signs, Secret Ritual of the Priests'] }, [
    'В **Орене** поговорите с **Сэром Густавом Атебальтом**.',
    'В **Адене** найдите **Коллина** у южного выхода с площади.',
    'Пройдите три трансформации Коллина: лягушка, ребенок и туземец. В каждой форме добегите до цели и вернитесь за следующим этапом.',
    'После тренировки получите доступ к последней странице договора.',
    'Вернитесь к **Атебальту** и завершите часть цепочки.',
  ]),
];

function sevenSigns(title, titleEn, npc, requirement, reward, steps) {
  return q({
    title,
    titleEn,
    chronicle: titleEn.includes('One Who Seeks') || titleEn.includes('Mysterious Girl') ? 'high-five' : 'high-five',
    levelMin: titleEn.includes('One Who Seeks') || titleEn.includes('Mysterious Girl') ? 81 : 79,
    npc,
    types: ['Сюжетный'],
    requirement,
    reward,
    steps,
    related: [npc, ...(reward.items || [])],
  });
}

function sagaSteps(startNpc, secondNpc, helperNpc, helperItem, profession) {
  return [
    `Поговорите с **${startNpc}** и получите первое поручение на путь третьей профессии.`,
    `Найдите **${secondNpc}**. Он направит вас за предметом **${helperItem}**.`,
    `У **${helperNpc}** подготовьте нужный предмет. Обычно понадобится **Ice Crystal** и дополнительный ингредиент: рыба, мясо или особый предмет по классу.`,
    `Вернитесь к **${secondNpc}** и получите первый **Resonance Amulet**.`,
    'Обойдите шесть **Tablet of Vision**. Для каждой таблички используйте соответствующий амулет резонанса.',
    'На этапах с монстрами убивайте только квестовые цели, пока не появится следующий амулет или NPC.',
    `После последней таблички вернитесь к стартовому мастеру и завершите профессию **${profession}**.`,
  ];
}

const ITEMS = [
  item({ title: 'Значок Адена', titleEn: 'Aden Territory Badge', slug: 'aden-territory-badge', type: 'Квестовый предмет', image: '/images/WIKI/ADEN%20ZNACHOK.jpg', source: 'Территориальные Войны Адена', usedIn: ['For the Sake of the Territory - Aden'] }),
  item({ title: 'Окровавленная ткань', titleEn: 'Blooded Fabric', slug: 'blooded-fabric', type: 'Квестовый предмет', image: '/images/WIKI/Blooded%20Fabric.jpg', source: 'An Arrogant Search', usedIn: ['An Arrogant Search', 'Баюм'] }),
  item({ title: 'Знак Рассвета', titleEn: 'Certificate of Dawn', slug: 'certificate-of-dawn', chronicle: 'high-five', type: 'Квестовый предмет', image: '/images/WIKI/Certificate%20of%20Dawn.jpg', source: 'Seven Signs, One Who Seeks the Power of the Seal', usedIn: ['Seven Signs'] }),
  item({ title: 'Браслет Рассвета', titleEn: "Dawn's Bracelet", slug: 'dawns-bracelet', chronicle: 'high-five', type: 'Награда', image: '/images/WIKI/Dawn%27s%20Bracelet.jpg', source: 'Seven Signs, Embryo', usedIn: ['Seven Signs'] }),
  item({ title: 'Коробка с туфельками', titleEn: 'Dress Shoe Box', slug: 'dress-shoe-box', type: 'Квестовый предмет', image: '/images/WIKI/Dress%20Shoe%20Box.jpg', source: 'Make a Pair of Dress Shoes', usedIn: ['Make Formal Wear'] }),
  item({ title: 'Наживка Огня', titleEn: 'Flaming Bait', slug: 'flaming-bait', type: 'Квестовый предмет', image: '/images/WIKI/Flaming%20Bait.jpg', source: "Linnaeus' Special Bait", usedIn: ['Chest Caught with a Bait of Fire'] }),
  item({ title: 'Свадебный наряд', titleEn: 'Formal Wear', slug: 'formal-wear', type: 'Броня', image: '/images/WIKI/Formal%20Wear.jpg', source: 'Make Formal Wear', usedIn: ['Свадебная цепочка'] }),
  item({ title: 'Кодекс Гигантов', titleEn: "Lesser Giant's Codex", slug: 'lesser-giants-codex', type: 'Книга / скилл', image: '/images/WIKI/Lesser%20Giant%27s%20Codex.jpg', source: 'Квесты на третью профессию', usedIn: ['Saga quests'] }),
  item({ title: 'Ноты - Тема: Путешествие', titleEn: 'Musical Score - Theme of Journey', slug: 'musical-score-theme-of-journey', type: 'Квестовый предмет', image: '/images/WIKI/Musical%20Score%20-%20Theme%20of%20Journey.jpg', source: "Bard's Mandolin", usedIn: ['Музыкальные задания'] }),
  item({ title: 'Ожерелье Защиты', titleEn: 'Necklace of Protection', slug: 'necklace-of-protection', type: 'Бижутерия', image: '/images/WIKI/Necklace%20of%20Protection.jpg', source: 'Chest Caught with a Bait of Fire', usedIn: ['Награда за рыбалку'] }),
  item({ title: 'Украшение Дворянина', titleEn: 'Noblesse Tiara', slug: 'noblesse-tiara', type: 'Награда', image: '/images/WIKI/noobles%20tiara.jpg', source: 'Possessor of a Precious Soul - 4', usedIn: ['Noblesse'] }),
  item({ title: 'Манифест Альянса', titleEn: 'Proof of Alliance', slug: 'proof-of-alliance', type: 'Квестовый предмет', image: '/images/WIKI/Proof%20of%20Alliance.jpg', source: 'Proof of Clan Alliance', usedIn: ['Создание альянса'] }),
  item({ title: 'Рейдовый Меч', titleEn: 'Raid Sword', slug: 'raid-sword', type: 'Оружие', image: '/images/WIKI/Raid%20Sword.jpg', source: "Fate's Whisper", usedIn: ['Fate’s Whisper'] }),
  item({ title: 'Кольцо Веков', titleEn: 'Ring of Ages', slug: 'ring-of-ages', type: 'Квестовый предмет', image: '/images/WIKI/Ring%20of%20Ages.jpg', source: 'Possessor of a Precious Soul - 3', usedIn: ['Noblesse'] }),
  item({ title: 'Запечатанный Древний Плащ', titleEn: 'Sealed Ancient Cloak', slug: 'sealed-ancient-cloak', chronicle: 'high-five', type: 'Броня', image: '/images/WIKI/Sealed%20Ancient%20Cloak.jpg', source: 'Steps for Honor', usedIn: ['Территориальные Войны'] }),
  item({ title: 'Швейный набор', titleEn: 'Sewing Kit', slug: 'sewing-kit', type: 'Квестовый предмет', image: '/images/WIKI/Sewing%20Kit.jpg', source: 'Make a Sewing Kit', usedIn: ['Make Formal Wear'] }),
  item({ title: 'Кожа', titleEn: 'Leather', slug: 'leather', type: 'Ресурсы', image: '/images/WIKI/Leather.jpg', source: 'Дроп, спойл, торговля', usedIn: ['Make a Pair of Dress Shoes', 'Make Formal Wear'] }),
  item({ title: 'Орихаруконовая руда', titleEn: 'Oriharukon Ore', slug: 'oriharukon-ore', type: 'Ресурсы', image: '/images/WIKI/Oriharukon%20Ore.jpg', source: 'Дроп, спойл, крафт', usedIn: ['Make a Sewing Kit'] }),
  item({ title: 'Кокс', titleEn: 'Cokes', slug: 'cokes', type: 'Ресурсы', image: '/images/WIKI/Cokes.jpg', source: 'Крафт и ресурсы', usedIn: ['Крафтовые цепочки'] }),
  item({ title: 'Камень Чистоты', titleEn: 'Stone of Purity', slug: 'stone-of-purity', type: 'Ресурсы', image: '/images/WIKI/Stone%20of%20Purity.jpg', source: 'Дроп, спойл, крафт', usedIn: ['Крафтовые цепочки'] }),
];

function itemContent(data) {
  return [
    '## Что это',
    '',
    `**${data.titleEn || data.title}** — предмет базы знаний Lineage 2. Тип: **${data.type || 'Предмет'}**.`,
    '',
    '## Где получить',
    '',
    `1. Основной источник: **${data.source || 'уточняется'}**.`,
    '2. Если сервер менял награды или дроп, сверяйте финальный результат в игре.',
    '',
    '## Где используется',
    '',
    ...(data.usedIn || []).map(name => `- **${name}**`),
    '',
    '## Связанные квесты и NPC',
    '',
    ...(data.usedIn || []).map(name => `- **${name}**`),
  ].join('\n');
}

function questContent(quest) {
  const reqs = [
    `- Хроники: **${chronicleLabel(quest.chronicle)}**`,
    `- Уровень: **${levelText(quest)}**`,
    quest.requirement ? `- Условие: ${quest.requirement}` : null,
    quest.npc ? `- Стартовый или ключевой NPC: **${quest.npc}**` : null,
    quest.location ? `- Локация: **${quest.location}**` : null,
  ].filter(Boolean);

  const related = unique([quest.npc, quest.location, ...(quest.related || []), ...extractRewardNames(rewardLine(quest.reward))])
    .filter(Boolean)
    .slice(0, 14);

  return [
    '## Что это',
    '',
    `**${quest.title}** — квест Lineage 2${quest.chronicle === 'high-five' ? ' High Five' : ''}. Ниже короткий рабочий маршрут без лишних диалогов, чтобы пройти задание в игре и не потеряться по NPC.`,
    '',
    ...(quest.notes?.length ? ['## Важно', '', ...quest.notes.map(note => `- ${note}`), ''] : []),
    '## Требования',
    '',
    ...reqs,
    '',
    '## Прохождение',
    '',
    ...quest.steps.map((step, index) => `${index + 1}. ${step}`),
    '',
    '## Награда',
    '',
    rewardLine(quest.reward) || 'Награда зависит от версии сервера.',
    '',
    '## Связанные NPC и предметы',
    '',
    ...(related.length ? related.map(name => `- **${name}**`) : ['- Связанные сущности будут дополнены после проверки в игре.']),
  ].join('\n');
}

function chronicleLabel(value) {
  if (value === 'interlude,high-five') return 'Interlude / High Five';
  if (value === 'high-five') return 'High Five';
  if (value === 'interlude') return 'Interlude';
  return value;
}

function extractRewardNames(reward) {
  return String(reward || '')
    .split('·')
    .map(part => part.replace(/:[a-z]+:/g, '').replace(/^[\d,\s.]+/, '').trim())
    .filter(part => part && !/^Адена$|^Опыт$|^SP$/i.test(part));
}

function unique(items) {
  return [...new Set(items.filter(Boolean))];
}

async function findExistingGuide(data, slug) {
  return prisma.guide.findFirst({
    where: {
      OR: [
        { slug },
        data.titleEn ? { titleEn: data.titleEn } : null,
        { title: data.title },
      ].filter(Boolean),
    },
  });
}

async function upsertGuide(data, content, sort) {
  const slug = data.slug || slugify(data.titleEn || data.title);
  const existing = DRY_RUN ? null : await findExistingGuide(data, slug);
  const payload = {
    slug,
    chronicle: data.chronicle,
    category: data.category,
    title: data.title,
    titleEn: data.titleEn || null,
    description: data.description || `${data.title} (${data.titleEn || data.title}) — гайд Lineage 2: требования, прохождение, награды и связанные NPC.`,
    content,
    image: data.image || null,
    levelMin: data.levelMin ?? null,
    levelMax: data.levelMax ?? null,
    npc: data.npc || null,
    location: data.location || null,
    reward: typeof data.reward === 'string' ? data.reward : rewardLine(data.reward),
    race: data.race || null,
    repeatable: Boolean(data.repeatable),
    types: data.types || [],
    sort,
    publishedAt: data.public === false ? null : (existing?.publishedAt ?? new Date()),
  };

  if (DRY_RUN) {
    console.log(`${payload.publishedAt ? 'PUBLIC' : 'DRAFT'}\t${existing ? 'update' : 'create'}\t${payload.category}\t${existing?.slug || payload.slug}\t${payload.title}`);
    return { created: existing ? 0 : 1, updated: existing ? 1 : 0, drafted: payload.publishedAt ? 0 : 1 };
  }

  if (existing) {
    await prisma.guide.update({
      where: { id: existing.id },
      data: {
        chronicle: payload.chronicle,
        category: payload.category,
        title: payload.title,
        titleEn: payload.titleEn,
        description: payload.description,
        image: payload.image,
        levelMin: payload.levelMin,
        levelMax: payload.levelMax,
        npc: payload.npc,
        location: payload.location,
        reward: payload.reward,
        race: payload.race,
        repeatable: payload.repeatable,
        types: payload.types,
        sort: payload.sort,
        publishedAt: payload.publishedAt,
        ...(OVERWRITE_CONTENT ? { content: payload.content } : {}),
      },
    });
    return { created: 0, updated: 1, drafted: payload.publishedAt ? 0 : 1 };
  }

  await prisma.guide.create({ data: payload });
  return { created: 1, updated: 0, drafted: payload.publishedAt ? 0 : 1 };
}

async function main() {
  let created = 0;
  let updated = 0;
  let drafted = 0;

  for (let i = 0; i < ITEMS.length; i += 1) {
    const r = await upsertGuide(ITEMS[i], itemContent(ITEMS[i]), 7000 + i);
    created += r.created; updated += r.updated; drafted += r.drafted;
  }

  for (let i = 0; i < QUESTS.length; i += 1) {
    const r = await upsertGuide(QUESTS[i], questContent(QUESTS[i]), 500 + i);
    created += r.created; updated += r.updated; drafted += r.drafted;
  }

  console.log(`Aden guide seed complete: created=${created}, updated=${updated}, drafted=${drafted}, quests=${QUESTS.length}, items=${ITEMS.length}${DRY_RUN ? ' (dry-run)' : ''}`);
}

main()
  .catch(error => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
