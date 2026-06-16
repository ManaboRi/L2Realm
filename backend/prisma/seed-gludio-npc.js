/* Seed Gludio NPC guide entries.
 * Run from backend container/app root:
 *   node prisma/seed-gludio-npc.js
 */
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

const TRANSLIT = {
  а: 'a', б: 'b', в: 'v', г: 'g', д: 'd', е: 'e', ё: 'e', ж: 'zh', з: 'z',
  и: 'i', й: 'y', к: 'k', л: 'l', м: 'm', н: 'n', о: 'o', п: 'p', р: 'r',
  с: 's', т: 't', у: 'u', ф: 'f', х: 'h', ц: 'c', ч: 'ch', ш: 'sh', щ: 'sch',
  ъ: '', ы: 'y', ь: '', э: 'e', ю: 'yu', я: 'ya',
};

function slugify(value) {
  return String(value || '')
    .toLowerCase()
    .split('')
    .map(ch => (Object.prototype.hasOwnProperty.call(TRANSLIT, ch) ? TRANSLIT[ch] : ch))
    .join('')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80);
}

function roleDescription(type) {
  const map = {
    'Торговец': 'Используется для покупки, продажи или обмена игровых предметов. Уточнения по ассортименту будут добавлены отдельно.',
    'Кузнец': 'Связан с кузнечными услугами: крафт, обработка предметов, рецепты или игровые услуги кузнеца.',
    'Хранитель склада': 'Помогает работать со складом, хранением вещей и передачей предметов через складские функции.',
    'Стража': 'Городская стража. Такие NPC часто участвуют в стартовых и локальных квестах.',
    'Телепорт': 'NPC для перемещения, входа в особые зоны или перехода к связанным игровым функциям.',
    'Мастер': 'NPC классовой или магической ветки: обучение, профессии, умения или связанные задания.',
    'Аукцион': 'NPC, связанный с аукционом и торговыми функциями.',
    'Олимпиада': 'NPC, связанный с олимпиадой и соревновательными механиками.',
    'Татуировки': 'NPC, связанный с символами, татуировками и настройкой характеристик персонажа.',
    'Квестовый NPC': 'NPC, который может участвовать в квестах, диалогах или локальных цепочках заданий.',
  };
  return map[type] || map['Квестовый NPC'];
}

const TITLE_EN = {
  'Бакалейщик Гармония': 'Grocer Harmony',
  'Варсак': 'Varsak',
  'Великий Мастер Рэйнс': 'Grand Master Rains',
  'Великий Мастер Тобиас': 'Grand Master Tobias',
  'Верховный Жрец Раймонд': 'High Priest Raymond',
  'Главный Кузнец Мендио': 'Head Blacksmith Mendio',
  'Жрец Мануэль': 'Priest Manuel',
  'Жрица Вивиан': 'Priestess Vivyan',
  'Кузнец Пинтер': 'Blacksmith Pinter',
  'Магистр Рамониэль': 'Magister Ramoniell',
  'Магистр Ромер': 'Magister Rohmer',
  'Магистр Сидра': 'Magister Sidra',
  'Мастер Аудиберти': 'Master Audiberti',
  'Мастер Вирджил': 'Master Virgil',
  'Мастер Леона': 'Master Leona',
  'Мастер Рейса': 'Master Reisa',
  'Мастер Сориус': 'Master Sorius',
  'Мастер Татуировок Келл': 'Symbol Maker Kell',
  'Начальник Склада Рикадио': 'Warehouse Chief Rikadio',
  'Начальник Стражи Батис': 'Guard Captain Bathis',
  'Понтифик Дрикус': 'Pontiff Drikus',
  'Префект Бука': 'Prefect Buka',
  'Привратник Временной Обители Кери': 'Gatekeeper Keri',
  'Привратник Обители Клана Бабак': 'Clan Hall Gatekeeper Babak',
  'Привратник Обители Клана Латиф': 'Clan Hall Gatekeeper Latif',
  'Привратник Обители Клана Лоринг': 'Clan Hall Gatekeeper Loring',
  'Привратник Обители Клана Рени': 'Clan Hall Gatekeeper Reni',
  'Провидец Ракой': 'Seer Racoy',
  'Пьяница Борис': 'Drunkard Borys',
  'Рабочий Склада Хапрок': 'Warehouse Keeper Haprock',
  'Самед': 'Samed',
  'Страж Бабен': 'Guard Baben',
  'Страж Брин': 'Guard Brynn',
  'Страж Кертис': 'Guard Curtis',
  'Страж Мельвил': 'Guard Melville',
  'Страж Моретти': 'Guard Moretti',
  'Страж Праг': 'Guard Praga',
  'Страж Тома': 'Guard Toma',
  'Торговец Доспехами Симплон': 'Armor Trader Simplon',
  'Торговец Оружием Сидни': 'Weapons Trader Sydnia',
  'Трискел': 'Triskel',
  'Управляющий Аукциона': 'Auction Manager',
  'Управляющий Олимпиады Сейдж': 'Olympiad Manager Sage',
  'Хранитель Портала Белла': 'Gatekeeper Bella',
  'Ювелир Варан': 'Jeweler Varan',
};

const RELATED_QUESTS = {
  'Жрец Мануэль': ['Путь Оракула Евы'],
  'Кузнец Пинтер': ['Вести и быть ведомым', 'Испытание умения'],
  'Великий Мастер Рэйнс': ['Путь Судьбы', 'Самостоятельность'],
  'Магистр Сидра': ['Путь Оракула Шилен'],
  'Мастер Вирджил': ['Путь Темного Рыцаря'],
  'Мастер Рейса': ['Путь Разведчика'],
  'Мастер Сориус': ['Путь Светлого Рыцаря'],
  'Начальник Стражи Батис': ['Исчезнувший Сакум', 'Мутант Канеус - Глудио', 'Выследить Сакума'],
  'Страж Бабен': ['Красноглазые захватчики'],
  'Страж Кертис': ['Беспощадный коллекционер'],
  'Страж Праг': ['Заговор Ящеров'],
  'Рабочий Склада Хапрок': ['Странное родство'],
  'Трискел': ['Путь Ассасина'],
  'Хранитель Портала Белла': ['Заведите питомца'],
};

function buildContent(npc) {
  const relatedQuests = RELATED_QUESTS[npc.title] ?? [];
  return [
    '## Что это',
    '',
    `**${npc.title}** — NPC в городе **${npc.location}**. Тип NPC: **${npc.type}**.`,
    '',
    '## Где находится',
    '',
    `Ищи NPC в городе **${npc.location}**. Скриншот в карточке помогает быстрее узнать персонажа в игре.`,
    '',
    '## Чем полезен',
    '',
    roleDescription(npc.type),
    '',
    '## Связанные квесты',
    '',
    relatedQuests.length
      ? relatedQuests.map(title => `- **${title}**`).join('\n')
      : 'Связанные квесты и предметы будут добавлены по мере наполнения базы знаний L2Realm.',
  ].join('\n');
}

const NPCS = [
  ['Бакалейщик Гармония', 'Торговец', '/images/guides/npc/gludio/gludio-npc-01.webp'],
  ['Варсак', 'Квестовый NPC', '/images/guides/npc/gludio/gludio-npc-02.webp'],
  ['Великий Мастер Рэйнс', 'Мастер', '/images/guides/npc/gludio/gludio-npc-03.webp'],
  ['Великий Мастер Тобиас', 'Мастер', '/images/guides/npc/gludio/gludio-npc-04.webp'],
  ['Верховный Жрец Раймонд', 'Мастер', '/images/guides/npc/gludio/gludio-npc-05.webp'],
  ['Главный Кузнец Мендио', 'Кузнец', '/images/guides/npc/gludio/gludio-npc-06.webp'],
  ['Жрец Мануэль', 'Мастер', '/images/guides/npc/gludio/gludio-npc-07.webp'],
  ['Жрица Вивиан', 'Мастер', '/images/guides/npc/gludio/gludio-npc-08.webp'],
  ['Кузнец Пинтер', 'Кузнец', '/images/guides/npc/gludio/gludio-npc-09.webp'],
  ['Магистр Рамониэль', 'Мастер', '/images/guides/npc/gludio/gludio-npc-10.webp'],
  ['Магистр Ромер', 'Мастер', '/images/guides/npc/gludio/gludio-npc-11.webp'],
  ['Магистр Сидра', 'Мастер', '/images/guides/npc/gludio/gludio-npc-12.webp'],
  ['Мастер Аудиберти', 'Мастер', '/images/guides/npc/gludio/gludio-npc-13.webp'],
  ['Мастер Вирджил', 'Мастер', '/images/guides/npc/gludio/gludio-npc-14.webp'],
  ['Мастер Леона', 'Мастер', '/images/guides/npc/gludio/gludio-npc-15.webp'],
  ['Мастер Рейса', 'Мастер', '/images/guides/npc/gludio/gludio-npc-16.webp'],
  ['Мастер Сориус', 'Мастер', '/images/guides/npc/gludio/gludio-npc-17.webp'],
  ['Мастер Татуировок Келл', 'Татуировки', '/images/guides/npc/gludio/gludio-npc-18.webp'],
  ['Начальник Склада Рикадио', 'Хранитель склада', '/images/guides/npc/gludio/gludio-npc-19.webp'],
  ['Начальник Стражи Батис', 'Стража', '/images/guides/npc/gludio/gludio-npc-20.webp'],
  ['Понтифик Дрикус', 'Мастер', '/images/guides/npc/gludio/gludio-npc-21.webp'],
  ['Префект Бука', 'Мастер', '/images/guides/npc/gludio/gludio-npc-22.webp'],
  ['Привратник Временной Обители Кери', 'Телепорт', '/images/guides/npc/gludio/gludio-npc-23.webp'],
  ['Привратник Обители Клана Бабак', 'Телепорт', '/images/guides/npc/gludio/gludio-npc-24.webp'],
  ['Привратник Обители Клана Латиф', 'Телепорт', '/images/guides/npc/gludio/gludio-npc-25.webp'],
  ['Привратник Обители Клана Лоринг', 'Телепорт', '/images/guides/npc/gludio/gludio-npc-26.webp'],
  ['Привратник Обители Клана Рени', 'Телепорт', '/images/guides/npc/gludio/gludio-npc-27.webp'],
  ['Провидец Ракой', 'Мастер', '/images/guides/npc/gludio/gludio-npc-28.webp'],
  ['Пьяница Борис', 'Квестовый NPC', '/images/guides/npc/gludio/gludio-npc-29.webp'],
  ['Рабочий Склада Хапрок', 'Хранитель склада', '/images/guides/npc/gludio/gludio-npc-30.webp'],
  ['Самед', 'Квестовый NPC', '/images/guides/npc/gludio/gludio-npc-31.webp'],
  ['Страж Бабен', 'Стража', '/images/guides/npc/gludio/gludio-npc-32.webp'],
  ['Страж Брин', 'Стража', '/images/guides/npc/gludio/gludio-npc-33.webp'],
  ['Страж Кертис', 'Стража', '/images/guides/npc/gludio/gludio-npc-34.webp'],
  ['Страж Мельвил', 'Стража', '/images/guides/npc/gludio/gludio-npc-35.webp'],
  ['Страж Моретти', 'Стража', '/images/guides/npc/gludio/gludio-npc-36.webp'],
  ['Страж Праг', 'Стража', '/images/guides/npc/gludio/gludio-npc-37.webp'],
  ['Страж Тома', 'Стража', '/images/guides/npc/gludio/gludio-npc-38.webp'],
  ['Торговец Доспехами Симплон', 'Торговец', '/images/guides/npc/gludio/gludio-npc-39.webp'],
  ['Торговец Оружием Сидни', 'Торговец', '/images/guides/npc/gludio/gludio-npc-40.webp'],
  ['Трискел', 'Квестовый NPC', '/images/guides/npc/gludio/gludio-npc-41.webp'],
  ['Управляющий Аукциона', 'Аукцион', '/images/guides/npc/gludio/gludio-npc-42.webp'],
  ['Управляющий Олимпиады Сейдж', 'Олимпиада', '/images/guides/npc/gludio/gludio-npc-43.webp'],
  ['Хранитель Портала Белла', 'Телепорт', '/images/guides/npc/gludio/gludio-npc-44.webp'],
  ['Ювелир Варан', 'Торговец', '/images/guides/npc/gludio/gludio-npc-45.webp'],
].map(([title, type, image], index) => ({
  title,
  type,
  titleEn: TITLE_EN[title] ?? null,
  image,
  location: 'Глудио',
  slug: slugify(`${title}-gludio`),
  sort: 1000 + index,
}));

async function main() {
  let created = 0;
  let updated = 0;
  for (const npc of NPCS) {
    const data = {
      slug: npc.slug,
      chronicle: 'all',
      category: 'npc',
      title: npc.title,
      titleEn: npc.titleEn,
      description: `${npc.title} — NPC в городе Глудио. Роль: ${npc.type}. Карточка базы знаний Lineage 2 с местоположением и связями.`,
      content: buildContent(npc),
      image: npc.image,
      levelMin: null,
      levelMax: null,
      npc: null,
      location: npc.location,
      reward: npc.type,
      race: null,
      repeatable: false,
      types: [npc.type],
      sort: npc.sort,
      publishedAt: new Date(),
    };

    const exists = await prisma.guide.findUnique({ where: { slug: npc.slug } });
    if (exists) {
      await prisma.guide.update({
        where: { slug: npc.slug },
        data: {
          chronicle: 'all',
          category: 'npc',
          title: npc.title,
          titleEn: npc.titleEn,
          description: data.description,
          content: data.content,
          image: npc.image,
          location: npc.location,
          reward: npc.type,
          types: [npc.type],
          sort: npc.sort,
          publishedAt: exists.publishedAt ?? new Date(),
        },
      });
      updated += 1;
    } else {
      await prisma.guide.create({ data });
      created += 1;
    }
  }
  console.log(`Gludio NPC seed complete: created=${created}, updated=${updated}, total=${NPCS.length}`);
}

main()
  .catch(error => {
    console.error(error);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
