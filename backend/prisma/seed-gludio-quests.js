/* Seed Gludio quest guide entries.
 * Run from backend container/app root:
 *   node prisma/seed-gludio-quests.js
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

function rewardLine(reward) {
  const parts = [];
  if (reward.exp) parts.push(`${reward.exp} :exp:`);
  if (reward.sp) parts.push(`${reward.sp} :sp:`);
  if (reward.adena) parts.push(`${reward.adena} :adena:`);
  for (const item of reward.other || []) parts.push(item);
  return parts.join(' · ');
}

function questTypes(q) {
  const types = [];
  if (/^Путь |^Испытание |Професс|Oracle|Knight|Warrior|Cleric|Artisan|Assassin|Trooper|Warder|Test of/i.test(`${q.title} ${q.titleEn}`)) {
    types.push('Профессия');
  }
  if (/питом|Pet|Wolf|Kookaburra/i.test(`${q.title} ${q.titleEn} ${rewardLine(q.reward)}`)) {
    types.push('Питомцы');
  }
  if (/Seven Signs|Семь Печатей/i.test(`${q.title} ${q.titleEn}`)) {
    types.push('Сюжетный');
  }
  if (!types.length) types.push('Разовые');
  return types;
}

function buildContent(q) {
  const reward = rewardLine(q.reward);
  const npcText = q.npc ? ` у NPC **${q.npc}**` : '';
  const levelText = q.levelMax ? `${q.levelMin}-${q.levelMax}` : `${q.levelMin}+`;
  const sectionText = q.section === 'starts'
    ? 'Квест начинается в городе Глудио или рядом с ним.'
    : 'Квест связан с городом Глудио: здесь проходит один из шагов или находится важный NPC.';

  return [
    '## Что это',
    '',
    `**${q.title}** — квест Lineage 2 Interlude для персонажей **${levelText} уровня**${npcText}. ${sectionText}`,
    '',
    '## Требования',
    '',
    `- Хроника: **Interlude**`,
    `- Уровень: **${levelText}**`,
    q.npc ? `- Стартовый или связанный NPC: **${q.npc}**` : '- Стартовый NPC будет уточнен после проверки в игре',
    '- Локация: **Глудио** / **Земли Глудио**',
    '',
    '## Прохождение',
    '',
    q.npc
      ? `1. Найдите **${q.npc}** в Глудио или на территории Глудио.`
      : '1. Найдите NPC, который запускает цепочку квеста в Глудио или на территории Глудио.',
    '2. Возьмите задание и внимательно проверьте цель в журнале квестов.',
    '3. Выполните поручение: поговорите с нужными NPC, соберите предметы или убейте указанных монстров.',
    q.npc
      ? `4. Вернитесь к **${q.npc}** или следующему NPC по цепочке и заберите награду.`
      : '4. Вернитесь к NPC по цепочке и заберите награду.',
    '',
    '## Награда',
    '',
    reward ? reward : 'Награда зависит от версии сервера и будет уточнена после проверки.',
    '',
    '## Связанные NPC и предметы',
    '',
    q.npc
      ? `Квест связан с NPC **${q.npc}**. Если карточка NPC уже есть в базе L2Realm, имя станет кликабельным автоматически.`
      : 'Связанные NPC будут добавлены после проверки квеста в игре.',
  ].join('\n');
}

const QUESTS = [
  ['starts', 'Путь Оракула Евы', 'Path of the Elven Oracle', 18, null, 'Мануэль', { exp: '228,064', sp: '16,455', adena: '163,800', other: ['Leaf of Oracle', 'Shadow Item Exchange Coupon (D-Grade)'] }],
  ['starts', 'Путь Надзирателя', 'Path of the Trooper', 18, null, 'Гвейн', { exp: '3,200', sp: '4,736', adena: '163,800', other: ["Gwain's Recommendation", 'Shadow Item Exchange Coupon (D-Grade)'] }],
  ['starts', 'Исчезнувший Сакум', 'Disappeared Sakum', 18, 40, 'Батис', { exp: '130,000', sp: '50,000', adena: '80,000', other: ['Windmill Hill Status Report'] }],
  ['starts', 'Мутант Канеус - Глудио', 'Mutated Kaneus - Gludio', 18, null, 'Батис', { exp: '70,000', sp: '32,000', adena: '17,000', other: [] }],
  ['starts', 'Путь Ассасина', 'Path of the Assassin', 18, null, 'Трискел', { exp: '228,064', sp: '16,455', adena: '163,800', other: ['Iron Heart', 'Shadow Item Exchange Coupon (D-Grade)'] }],
  ['starts', 'Путь Светлого Рыцаря', 'Path of the Elven Knight', 18, null, 'Сориус', { exp: '228,064', sp: '16,455', adena: '163,800', other: ['Elven Knight Brooch', 'Shadow Item Exchange Coupon (D-Grade)'] }],
  ['starts', 'Путь Оракула Шилен', 'Path of the Shillien Oracle', 18, null, 'Сидра', { exp: '228,064', sp: '16,455', adena: '163,800', other: ['Orb of Abyss', 'Shadow Item Exchange Coupon (D-Grade)'] }],
  ['starts', 'Путь Разведчика', 'Path of the Elven Scout', 18, null, 'Рейса', { exp: '228,064', sp: '16,455', adena: '163,800', other: ["Reisa's Recommendation", 'Shadow Item Exchange Coupon (D-Grade)'] }],
  ['starts', 'Вести и быть ведомым', 'To Lead and Be Led', 19, 40, 'Пинтер', { other: ['Clan Oath Armor', 'Clan Oath Brigandine', 'Clan Oath Aketon'] }],
  ['starts', 'Красноглазые захватчики', 'Red-eyed Invaders', 20, 28, 'Бабен', { exp: '62,366', sp: '2,783', other: ['Baby Duck Rod', 'Fishing Shot (No-grade)', 'Green Bait (High-grade)'] }],
  ['starts', 'Выследить Сакума', 'Request to Find Sakum', 23, 40, 'Батис', { exp: '250,000', sp: '100,000', adena: '90,000', other: ['Divided Sakum, Kanilov'] }],
  ['starts', 'Помощь сыну', 'Help the Son!', 24, null, 'Ланди', { other: ['Pet Exchange Ticket Kookaburra'] }],
  ['starts', 'Заговор Ящеров', "Lizardmen's Conspiracy", 25, 34, 'Праг', { sp: '42,000', other: [] }],
  ['starts', 'Беспощадный коллекционер', 'Grim Collector', 25, null, 'Кертис', { other: ['Adena'] }],
  ['starts', 'Влияние Сакума', "Sakum's Influence", 28, 40, 'Член Гильдии Путешественников', { exp: '410,000', sp: '160,000', adena: '103,000', other: ['Divided Sakum, Poslof'] }],
  ['starts', 'Следы Сакума', "Sakum's Trace", 34, 40, 'Член Гильдии Путешественников', { exp: '670,000', adena: '108,000', other: [] }],
  ['starts', 'Путь Судьбы', 'Certification of Fate', 38, null, 'Рэйнс', { exp: '2,700,000', sp: '250,000', adena: '110,000', other: ['Proof of Justice'] }],
  ['starts', 'Битва за Земли Глудио', 'For the Sake of the Territory - Gludio', 40, null, 'Gludio Territory', { other: ['Gludio Territory Badge'] }],
  ['starts', 'Самостоятельность', 'How to Stand Up For Yourself', 40, 49, 'Рэйнс', { exp: '1,020,660', sp: '692,135', adena: '41,038', other: [] }],
  ['starts', 'Деморализация', 'Path of the Palus Knight', 40, null, null, { exp: '228,064', sp: '16,455', adena: '163,800', other: ['Gaze of Abyss', 'Shadow Item Exchange Coupon (D-Grade)'] }],
  ['involved', 'Странное родство', 'Dwarven Kinship', 15, null, 'Карлон', { adena: '20,000', other: [] }],
  ['involved', 'Заведите питомца', 'Get a Pet', 15, null, 'Мартин', { other: ['Wolf Collar'] }],
  ['involved', 'Путь Клерика', 'Path of the Cleric', 18, null, 'Зигонт', { exp: '228,064', sp: '16,455', adena: '163,800', other: ['Mark of Faith', 'Shadow Item Exchange Coupon (D-Grade)'] }],
  ['involved', 'Путь Ремесленника', 'Path of the Artisan', 18, null, 'Сильвера', { exp: '228,064', sp: '16,455', adena: '163,800', other: ['Final Pass Certificate', 'Shadow Item Exchange Coupon (D-Grade)'] }],
  ['involved', 'Путь Воителя', 'Path of the Warrior', 18, null, 'Аурон', { exp: '228,064', sp: '16,455', adena: '163,800', other: ['Medallion of Warrior', 'Shadow Item Exchange Coupon (D-Grade)'] }],
  ['involved', 'Путь Рыцаря', 'Path of the Human Knight', 18, null, 'Сэр Клаус Васпер', { exp: '228,064', sp: '16,455', adena: '163,800', other: ['Sword of Ritual', 'Shadow Item Exchange Coupon (D-Grade)'] }],
  ['involved', 'Путь Берсерка', 'Path of the Warder', 18, null, 'Сион', { adena: '163,800', other: ['Steelrazor Evaluation', 'Shadow Item Exchange Coupon (D-Grade)'] }],
  ['involved', 'Клыки Дракона', 'Dragon Fangs', 19, 29, 'Льюис', { exp: '435,117', sp: '23,977', other: ['Random Reward'] }],
  ['involved', 'Опасный путь', 'Tough Road', 20, 40, 'Кекеи', { exp: '90,000', sp: '30,000', adena: '70,000', other: [] }],
  ['involved', 'Осмотр Холма Ветряных Мельниц', 'Windmill Hill Status Report', 22, 40, 'Шунайн', { exp: '150,000', sp: '60,000', adena: '85,000', other: [] }],
  ['involved', 'Канилов, порождение Сакума', 'Divided Sakum, Kanilov', 27, 40, 'Джена', { exp: '350,000', sp: '150,000', adena: '100,000', other: ['Scroll: Enchant Weapon (D-grade)'] }],
  ['involved', 'Послов, порождение Сакума', 'Divided Sakum, Poslof', 33, 40, 'Леф', { exp: '550,000', sp: '150,000', adena: '105,000', other: [] }],
  ['involved', 'Испытание умения', 'Trial of the Guildsman', 35, null, 'Валькон', { exp: '1,029,478', sp: '66,768', adena: '187,606', other: ['Dimensional Diamond', 'Mark of Guildsman'] }],
  ['involved', 'Падший Ангел - Поручение Рассвета', 'Fallen Angel - Request of Dawn', 38, null, 'Натулс', { exp: '223,036', sp: '92,676', adena: '92,676', other: [] }],
  ['involved', 'Падший Ангел - Поручение Заката', 'Fallen Angel - Request of Dusk', 38, null, 'Натулс', { exp: '223,036', sp: '13,901', adena: '89,046', other: [] }],
  ['involved', 'Испытание целителя', 'Test of the Healer', 39, null, 'Банделлос', { exp: '1,476,566', sp: '101,324', adena: '266,980', other: ['Dimensional Diamond', 'Mark of Healer'] }],
  ['involved', 'Испытание ищущего', 'Test of the Searcher', 39, null, 'Лютер', { exp: '894,888', sp: '61,408', adena: '161,806', other: ['Dimensional Diamond', 'Mark of Searcher'] }],
  ['involved', 'Испытание жреца', 'Test of the Reformer', 39, null, 'Пупина', { exp: '1,252,844', sp: '85,972', adena: '226,528', other: ['Dimensional Diamond', 'Mark of Reformer'] }],
  ['involved', 'Испытание вестника', 'Test of the War Spirit', 39, null, 'Сомак', { exp: '894,888', sp: '61,408', adena: '161,806', other: ['Dimensional Diamond', 'Mark of Warspirit'] }],
  ['involved', 'Красивая ткань', 'In Search of Cloth', 60, null, 'Радия', { other: ['Mysterious Cloth'] }],
  ['involved', 'Семь Печатей, Тайные Знания Жрецов', 'Seven Signs, Secret Ritual of the Priests', 79, null, 'Клаудия Атебальт', { exp: '10,000,000', sp: '2,500,000', other: ['Seven Signs, Seal of the Emperor'] }],
].map(([section, title, titleEn, levelMin, levelMax, npc, reward]) => ({
  section,
  title,
  titleEn,
  levelMin,
  levelMax,
  npc,
  reward,
}));

async function main() {
  let created = 0;
  let updated = 0;

  for (let index = 0; index < QUESTS.length; index += 1) {
    const q = QUESTS[index];
    const slug = slugify(`${q.title} gludio`);
    const data = {
      slug,
      chronicle: 'interlude',
      category: 'quests',
      title: q.title,
      titleEn: q.titleEn,
      description: `${q.title} (${q.titleEn}) — квест Lineage 2 Interlude в Глудио: уровень, NPC, краткое прохождение и награды.`,
      content: buildContent(q),
      image: null,
      levelMin: q.levelMin,
      levelMax: q.levelMax,
      npc: q.npc,
      location: 'Глудио',
      reward: rewardLine(q.reward),
      race: null,
      repeatable: false,
      types: questTypes(q),
      sort: 100 + index,
      publishedAt: new Date(),
    };

    const existing = await prisma.guide.findUnique({ where: { slug } });
    if (existing) {
      await prisma.guide.update({
        where: { id: existing.id },
        data: {
          titleEn: data.titleEn,
          description: data.description,
          levelMin: data.levelMin,
          levelMax: data.levelMax,
          npc: data.npc,
          location: data.location,
          reward: data.reward,
          types: data.types,
          sort: data.sort,
          ...(existing.content ? {} : { content: data.content }),
          ...(existing.publishedAt ? {} : { publishedAt: data.publishedAt }),
        },
      });
      updated += 1;
    } else {
      await prisma.guide.create({ data });
      created += 1;
    }
  }

  console.log(`Gludio quest seed complete: created=${created}, updated=${updated}, total=${QUESTS.length}`);
}

main()
  .catch(error => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
