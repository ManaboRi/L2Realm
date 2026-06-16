/* Seed/update Gludio quest guide entries.
 * The script reads the public Linedia quest pages listed below, extracts
 * patch availability and walkthrough steps, then writes original L2Realm
 * guide markdown into the local database.
 *
 * Run from backend container/app root:
 *   node prisma/seed-gludio-quests.js
 *
 * Set OVERWRITE_GUIDE_CONTENT=0 if you only want metadata updates.
 */
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

const OVERWRITE_CONTENT = process.env.OVERWRITE_GUIDE_CONTENT !== '0';
const DRY_RUN = process.env.DRY_RUN === '1';
const USER_AGENT = 'Mozilla/5.0 L2RealmBot/1.0 (+https://l2realm.ru)';

const TRANSLIT = {
  а: 'a', б: 'b', в: 'v', г: 'g', д: 'd', е: 'e', ё: 'e', ж: 'zh', з: 'z',
  и: 'i', й: 'y', к: 'k', л: 'l', м: 'm', н: 'n', о: 'o', п: 'p', р: 'r',
  с: 's', т: 't', у: 'u', ф: 'f', х: 'h', ц: 'c', ч: 'ch', ш: 'sh', щ: 'sch',
  ъ: '', ы: 'y', ь: '', э: 'e', ю: 'yu', я: 'ya',
};

const PATCH_ORDER = new Map([
  ['Prelude', 0],
  ['Chronicle 1', 1],
  ['Chronicle 2', 2],
  ['Chronicle 3', 3],
  ['Chronicle 4', 4],
  ['Chronicle 5', 5],
  ['Interlude', 6],
  ['The Kamael', 7],
  ['Hellbound', 8],
  ['Gracia Part 1', 9],
  ['Gracia Part 2', 10],
  ['Gracia Final', 11],
  ['Gracia Epilogue', 12],
  ['Freya', 13],
  ['High Five', 14],
  ['Awakening', 15],
  ['Tauti', 16],
  ['Glory Days', 17],
  ['Lindvior', 18],
  ['Epeisodion', 19],
  ['Ertheia', 20],
]);

const QUESTS = [
  q('starts', 'https://linedia.ru/wiki/Path_of_the_Elven_Oracle', 18, null, 'Мануэль', { exp: '228,064', sp: '16,455', adena: '163,800', other: ['Leaf of Oracle', 'Shadow Item Exchange Coupon (D-Grade)'] }),
  q('starts', 'https://linedia.ru/wiki/Path_of_the_Trooper', 18, null, 'Гвейн', { exp: '3,200', sp: '4,736', adena: '163,800', other: ["Gwain's Recommendation", 'Shadow Item Exchange Coupon (D-Grade)'] }),
  q('starts', 'https://linedia.ru/wiki/Disappeared_Sakum', 18, 40, 'Батис', { exp: '130,000', sp: '50,000', adena: '80,000', other: ['Windmill Hill Status Report'] }),
  q('starts', 'https://linedia.ru/wiki/Mutated_Kaneus_-_Gludio', 18, null, 'Батис', { exp: '70,000', sp: '32,000', adena: '17,000', other: [] }),
  q('starts', 'https://linedia.ru/wiki/Path_of_the_Assassin', 18, null, 'Трискел', { exp: '228,064', sp: '16,455', adena: '163,800', other: ['Iron Heart', 'Shadow Item Exchange Coupon (D-Grade)'] }),
  q('starts', 'https://linedia.ru/wiki/Path_of_the_Elven_Knight', 18, null, 'Сориус', { exp: '228,064', sp: '16,455', adena: '163,800', other: ['Elven Knight Brooch', 'Shadow Item Exchange Coupon (D-Grade)'] }),
  q('starts', 'https://linedia.ru/wiki/Path_of_the_Shillien_Oracle', 18, null, 'Сидра', { exp: '228,064', sp: '16,455', adena: '163,800', other: ['Orb of Abyss', 'Shadow Item Exchange Coupon (D-Grade)'] }),
  q('starts', 'https://linedia.ru/wiki/Path_of_the_Elven_Scout', 18, null, 'Рейса', { exp: '228,064', sp: '16,455', adena: '163,800', other: ["Reisa's Recommendation", 'Shadow Item Exchange Coupon (D-Grade)'] }),
  q('starts', 'https://linedia.ru/wiki/To_Lead_and_Be_Led', 19, 40, 'Пинтер', { other: ['Clan Oath Armor', 'Clan Oath Brigandine', 'Clan Oath Aketon'] }),
  q('starts', 'https://linedia.ru/wiki/Red-eyed_Invaders', 20, 28, 'Бабен', { exp: '62,366', sp: '2,783', other: ['Baby Duck Rod', 'Fishing Shot (No-grade)', 'Green Bait (High-grade)'] }),
  q('starts', 'https://linedia.ru/wiki/Request_to_Find_Sakum', 23, 40, 'Батис', { exp: '250,000', sp: '100,000', adena: '90,000', other: ['Divided Sakum, Kanilov'] }),
  q('starts', 'https://linedia.ru/wiki/Help_the_Son!', 24, null, 'Ланди', { other: ['Pet Exchange Ticket Kookaburra'] }),
  q('starts', 'https://linedia.ru/wiki/Lizardmen%27s_Conspiracy', 25, 34, 'Праг', { sp: '42,000', other: [] }),
  q('starts', 'https://linedia.ru/wiki/Grim_Collector', 25, null, 'Кертис', { adena: '', other: ['адена за сданные части скелета'] }),
  q('starts', 'https://linedia.ru/wiki/Sakum%27s_Influence', 28, 40, 'Член Гильдии Путешественников', { exp: '410,000', sp: '160,000', adena: '103,000', other: ['Divided Sakum, Poslof'] }, { legacyTitleEn: "Sakum's Influence" }),
  q('starts', 'https://linedia.ru/wiki/Sakum%27s_Trace', 34, 40, 'Член Гильдии Путешественников', { exp: '670,000', adena: '108,000', other: [] }),
  q('starts', 'https://linedia.ru/wiki/Certification_of_Fate', 38, null, 'Рэйнс', { exp: '2,700,000', sp: '250,000', adena: '110,000', other: ['Proof of Justice'] }),
  q('starts', 'https://linedia.ru/wiki/For_the_Sake_of_the_Territory_-_Gludio', 40, null, 'Капитан Наемников', { other: ['Gludio Territory Badge'] }),
  q('starts', 'https://linedia.ru/wiki/How_to_Stand_Up_For_Yourself', 40, 49, 'Рэйнс', { exp: '1,020,660', sp: '692,135', adena: '41,038', other: [] }),
  q('starts', 'https://linedia.ru/wiki/Path_of_the_Palus_Knight', 18, null, 'Вирджил', { exp: '228,064', sp: '16,455', adena: '163,800', other: ['Gaze of Abyss', 'Shadow Item Exchange Coupon (D-Grade)'] }, { legacyTitleEn: 'Path of the Palus Knight', legacySlug: 'demoralizaciya-gludio' }),
  q('involved', 'https://linedia.ru/wiki/Dwarven_Kinship', 15, null, 'Карлон', { adena: '20,000', other: [] }),
  q('involved', 'https://linedia.ru/wiki/Get_a_Pet', 15, null, 'Мартин', { other: ['Wolf Collar'] }),
  q('involved', 'https://linedia.ru/wiki/Path_of_the_Cleric', 18, null, 'Зигонт', { exp: '228,064', sp: '16,455', adena: '163,800', other: ['Mark of Faith', 'Shadow Item Exchange Coupon (D-Grade)'] }),
  q('involved', 'https://linedia.ru/wiki/Path_of_the_Warrior', 18, null, 'Аурон', { exp: '228,064', sp: '16,455', adena: '163,800', other: ['Medallion of Warrior', 'Shadow Item Exchange Coupon (D-Grade)'] }),
  q('involved', 'https://linedia.ru/wiki/Path_of_the_Human_Knight', 18, null, 'Сэр Клаус Васпер', { exp: '228,064', sp: '16,455', adena: '163,800', other: ['Sword of Ritual', 'Shadow Item Exchange Coupon (D-Grade)'] }),
  q('involved', 'https://linedia.ru/wiki/Path_of_the_Artisan', 18, null, 'Сильвера', { exp: '228,064', sp: '16,455', adena: '163,800', other: ['Final Pass Certificate', 'Shadow Item Exchange Coupon (D-Grade)'] }),
  q('involved', 'https://linedia.ru/wiki/Path_of_the_Warder', 18, null, 'Сион', { adena: '163,800', other: ['Steelrazor Evaluation', 'Shadow Item Exchange Coupon (D-Grade)'] }),
  q('involved', 'https://linedia.ru/wiki/Dragon_Fangs', 19, 29, 'Льюис', { exp: '435,117', sp: '23,977', other: ['Random Reward'] }),
  q('involved', 'https://linedia.ru/wiki/Tough_Road', 20, 40, 'Кекеи', { exp: '90,000', sp: '30,000', adena: '70,000', other: [] }),
  q('involved', 'https://linedia.ru/wiki/Windmill_Hill_Status_Report', 22, 40, 'Шунайн', { exp: '150,000', sp: '60,000', adena: '85,000', other: [] }),
  q('involved', 'https://linedia.ru/wiki/Divided_Sakum,_Kanilov', 27, 40, 'Джена', { exp: '350,000', sp: '150,000', adena: '100,000', other: ['Scroll: Enchant Weapon (D-grade)'] }),
  q('involved', 'https://linedia.ru/wiki/Divided_Sakum,_Poslof', 33, 40, 'Леф', { exp: '550,000', sp: '150,000', adena: '105,000', other: [] }),
  q('involved', 'https://linedia.ru/wiki/Trial_of_the_Guildsman', 35, null, 'Валькон', { exp: '1,029,478', sp: '66,768', adena: '187,606', other: ['Dimensional Diamond', 'Mark of Guildsman'] }, { location: 'Гиран' }),
  q('involved', 'https://linedia.ru/wiki/Fallen_Angel_-_Request_of_Dawn', 38, null, 'Натулс', { exp: '223,036', sp: '92,676', adena: '92,676', other: [] }),
  q('involved', 'https://linedia.ru/wiki/Fallen_Angel_-_Request_of_Dusk', 38, null, 'Натулс', { exp: '223,036', sp: '13,901', adena: '89,046', other: [] }),
  q('involved', 'https://linedia.ru/wiki/Test_of_the_Healer', 39, null, 'Банделлос', { exp: '1,476,566', sp: '101,324', adena: '266,980', other: ['Dimensional Diamond', 'Mark of Healer'] }),
  q('involved', 'https://linedia.ru/wiki/Test_of_the_Searcher', 39, null, 'Лютер', { exp: '894,888', sp: '61,408', adena: '161,806', other: ['Dimensional Diamond', 'Mark of Searcher'] }),
  q('involved', 'https://linedia.ru/wiki/Test_of_the_Reformer', 39, null, 'Пупина', { exp: '1,252,844', sp: '85,972', adena: '226,528', other: ['Dimensional Diamond', 'Mark of Reformer'] }),
  q('involved', 'https://linedia.ru/wiki/Test_of_the_War_Spirit', 39, null, 'Сомак', { exp: '894,888', sp: '61,408', adena: '161,806', other: ['Dimensional Diamond', 'Mark of Warspirit'] }),
  q('involved', 'https://linedia.ru/wiki/In_Search_of_Cloth', 60, null, 'Радия', { other: ['Mysterious Cloth'] }),
  q('involved', 'https://linedia.ru/wiki/Seven_Signs,_Secret_Ritual_of_the_Priests', 79, null, 'Клаудия Атебальт', { exp: '10,000,000', sp: '2,500,000', other: ['Seven Signs, Seal of the Emperor'] }),
];

function q(section, source, levelMin, levelMax, npc, reward, extra = {}) {
  return { section, source, levelMin, levelMax, npc, reward, location: 'Глудио', ...extra };
}

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
  if (Object.prototype.hasOwnProperty.call(reward, 'adena')) parts.push(`${reward.adena || ''} :adena:`.trim());
  for (const item of reward.other || []) parts.push(item);
  return parts.join(' · ');
}

function questTypes(q, parsed) {
  const haystack = `${parsed.title} ${parsed.titleEn} ${rewardLine(q.reward)}`;
  const types = [];
  if (/^Путь |^Испытание |Професс|Oracle|Knight|Warrior|Cleric|Artisan|Assassin|Trooper|Warder|Test of/i.test(haystack)) {
    types.push('Профессия');
  }
  if (/питом|Pet|Wolf|Kookaburra/i.test(haystack)) types.push('Питомцы');
  if (/Seven Signs|Семь Печатей/i.test(haystack)) types.push('Сюжетный');
  if (!types.length) types.push('Разовые');
  return types;
}

function decodeHtml(value) {
  return String(value || '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#039;|&apos;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&#x([0-9a-f]+);/gi, (_, h) => String.fromCodePoint(parseInt(h, 16)))
    .replace(/&#(\d+);/g, (_, d) => String.fromCodePoint(parseInt(d, 10)));
}

function htmlToText(html) {
  return decodeHtml(String(html || '')
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<img\b[^>]*>/gi, ' ')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/(?:p|li|tr|div|h\d)>/gi, '\n')
    .replace(/<[^>]+>/g, ' ')
    .replace(/[ \t\r\f\v]+/g, ' ')
    .replace(/\n\s+/g, '\n')
    .replace(/\s+\n/g, '\n')
    .replace(/\n{2,}/g, '\n')
    .trim());
}

function infoboxField(html, label) {
  const re = new RegExp(`<tr>\\s*<td>\\s*${label}:\\s*<\\/td>\\s*<td>([\\s\\S]*?)<\\/td>\\s*<\\/tr>`, 'i');
  const match = html.match(re);
  return match ? htmlToText(match[1]) : '';
}

function parseTitle(html) {
  const pageTitle = htmlToText(html.match(/<title>([\s\S]*?)<\/title>/i)?.[1] || '');
  const match = pageTitle.match(/^Квест\s+(.+?)\s+\((.+?)\)\s+—/);
  return match ? { titleEn: match[1].trim(), title: match[2].trim() } : { titleEn: pageTitle, title: pageTitle };
}

function extractWalkthrough(html) {
  const marker = 'Прохождение квеста';
  const start = html.indexOf(marker);
  if (start < 0) return [];
  const fromMarker = html.slice(start);
  const h2End = fromMarker.indexOf('</h2>');
  const afterHeading = fromMarker.slice(h2End + 5);
  const nextH2 = afterHeading.search(/<h2\b/i);
  const section = nextH2 >= 0 ? afterHeading.slice(0, nextH2) : afterHeading;
  return [...section.matchAll(/<li\b[^>]*>([\s\S]*?)<\/li>/gi)]
    .map(match => cleanStep(htmlToText(match[1])))
    .filter(Boolean);
}

function cleanStep(value) {
  const cleaned = String(value || '')
    .replace(/\s+([.,;:!?])/g, '$1')
    .replace(/\(\s+/g, '(')
    .replace(/\s+\)/g, ')')
    .replace(/\s{2,}/g, ' ')
    .replace(/Oна/g, 'Она')
    .replace(/Oн/g, 'Он')
    .replace(/(^|[\s([{])нам(?=$|[\s.,;:!?)\]])/gi, '$1вам')
    .replace(/(^|[\s([{])нас(?=$|[\s.,;:!?)\]])/gi, '$1вас')
    .replace(/(^|[\s([{])мы(?=$|[\s.,;:!?)\]])/gi, '$1вы')
    .replace(/Ещ[её]\s+разок\s+(?:поговорите|говорим)\s+с/gi, 'Повторно поговорите с')
    .replace(/На сей раз он отдает/g, 'После разговора он отдаст')
    .replace(/На сей раз она отдает/g, 'После разговора она отдаст')
    .replace(/(?:Он|Она)\s+даст вам/gi, 'Вы получите')
    .replace(/(?:Он|Она)\s+дает вам/gi, 'Вы получите')
    .replace(/(?:Он|Она)\s+даёт вам/gi, 'Вы получите')
    .replace(/просит взять у/gi, 'попросит забрать у')
    .replace(/Вы получите ([^.]+?) и попросит забрать у/gi, 'Получите $1, затем заберите у')
    .replace(/он натравит на вас его/gi, 'он натравит на вас своего')
    .replace(/После разговора он отдаст ([^.]+?) для ([A-Za-zА-Яа-яЁё]+)/g, 'Получите $1 и передайте $2')
    .replace(/После разговора она отдаст ([^.]+?) для ([A-Za-zА-Яа-яЁё]+)/g, 'Получите $1 и передайте $2')
    .replace(/Она меняет квестовые вещи на/g, 'Обменяйте квестовые предметы на')
    .replace(/Он меняет квестовые вещи на/g, 'Обменяйте квестовые предметы на')
    .replace(/квестовые вещи/g, 'квестовые предметы')
    .replace(/Находим/g, 'Найдите')
    .replace(/находим/g, 'найдите')
    .replace(/Телепортируемся/g, 'Телепортируйтесь')
    .replace(/телепортируемся/g, 'телепортируйтесь')
    .replace(/становимся/g, 'смените профессию на')
    .replace(/Становимся/g, 'Смените профессию на')
    .replace(/берем/g, 'возьмите')
    .replace(/Берем/g, 'Возьмите')
    .replace(/получаем/g, 'получите')
    .replace(/Получаем/g, 'Получите')
    .replace(/отдает/g, 'отдаст')
    .replace(/Отдает/g, 'Отдаст')
    .replace(/отдаёт/g, 'отдаст')
    .replace(/Отдаёт/g, 'Отдаст')
    .replace(/Allana'ы/g, 'Allana')
    .replace(/Allan'ы/g, 'Allana')
    .replace(/([A-Za-z]+)'ы/g, '$1')
    .replace(/Говорим с/g, 'Поговорите с')
    .replace(/говорим с/g, 'поговорите с')
    .replace(/Говорите с/g, 'Поговорите с')
    .replace(/Идем к/g, 'Отправляйтесь к')
    .replace(/идем к/g, 'идите к')
    .replace(/Идите к/g, 'Отправляйтесь к')
    .replace(/Возвращаемся к/g, 'Вернитесь к')
    .replace(/возвращаемся к/g, 'вернитесь к')
    .replace(/Возвращайтесь к/g, 'Вернитесь к')
    .replace(/Убиваем/g, 'Убейте')
    .replace(/убиваем/g, 'убейте')
    .replace(/Забираем/g, 'Заберите')
    .replace(/забираем/g, 'заберите')
    .replace(/Собираем/g, 'Соберите')
    .replace(/собираем/g, 'соберите')
    .replace(/Меняем/g, 'Обменяйте')
    .replace(/меняем/g, 'обменяйте')
    .replace(/Идем/g, 'Отправляйтесь')
    .replace(/идем/g, 'идите')
    .replace(/Идите/g, 'Отправляйтесь')
    .replace(/Отравляйтесь/g, 'Отправляйтесь')
    .replace(/Oна/g, 'Она')
    .trim();
  return /[.!?]$/.test(cleaned) ? cleaned : `${cleaned}.`;
}

async function fetchQuest(q) {
  const res = await fetch(q.source, { headers: { 'User-Agent': USER_AGENT } });
  if (!res.ok) throw new Error(`Failed to fetch ${q.source}: ${res.status}`);
  const html = await res.text();
  return {
    ...parseTitle(html),
    added: infoboxField(html, 'Добавлен в'),
    removed: infoboxField(html, 'Удален в'),
    steps: extractWalkthrough(html),
  };
}

function patchOrder(label) {
  if (!label) return null;
  for (const [name, order] of PATCH_ORDER) {
    if (label.includes(name)) return order;
  }
  return null;
}

function availability(added, removed) {
  const addedOrder = patchOrder(added);
  const removedOrder = patchOrder(removed);
  const interludeOrder = PATCH_ORDER.get('Interlude');
  const highFiveOrder = PATCH_ORDER.get('High Five');

  const existsInInterlude = addedOrder != null
    && addedOrder <= interludeOrder
    && (removedOrder == null || removedOrder > interludeOrder);
  const existsInHighFive = addedOrder != null
    && addedOrder <= highFiveOrder
    && (removedOrder == null || removedOrder > highFiveOrder);

  if (existsInInterlude && existsInHighFive) return { chronicle: 'interlude,high-five', public: true, label: 'Interlude / High Five' };
  if (existsInInterlude) return { chronicle: 'interlude', public: true, label: 'Interlude' };
  if (existsInHighFive) return { chronicle: 'high-five', public: true, label: 'High Five' };
  return { chronicle: 'main', public: false, label: 'после High Five' };
}

function levelText(q) {
  if (q.levelMin != null && q.levelMax != null) return `${q.levelMin}-${q.levelMax}`;
  if (q.levelMin != null) return `${q.levelMin}+`;
  if (q.levelMax != null) return `до ${q.levelMax}`;
  return 'любой';
}

function manualContent(q, parsed, availabilityInfo) {
  const reward = rewardLine(q.reward);
  const lvl = levelText(q);

  if (q.source === 'https://linedia.ru/wiki/Get_a_Pet') {
    return [
      '## Что это',
      '',
      '**Заведите питомца** — квест на получение волка. Его берут у **Мартина** в Глудине, а основная часть задания зависит от расы персонажа.',
      '',
      '## Требования',
      '',
      `- Хроники: **${availabilityInfo.label}**`,
      `- Уровень: **${lvl}**`,
      '- Стартовый NPC: **Мартин** в **Глудине**',
      '- Нужна свободная ячейка в инвентаре для ошейника волка.',
      '',
      '## Прохождение',
      '',
      '1. Поговорите с **Мартином** в Глудине и возьмите список монстров для своей расы.',
      '2. Отправляйтесь в стартовую область своей расы и соберите **50 квестовых предметов**: люди охотятся на пауков у Обелиска Победы, эльфы — на пауков возле Эльфийской деревни, темные эльфы — на монстров в Топях, орки — на пауков Кхаши у Замерзшего Водопада, гномы — на тарантулов у северного побережья, камаэли — на Багровых Пауков возле Подземелья Норнил.',
      '3. Вернитесь к **Мартину** и сдайте собранные предметы. После этого он отправит вас поговорить с любителями животных.',
      '4. В **Глудио** поговорите с **Хранителем Портала Беллой**.',
      '5. В **Дионе** найдите **Метти** у южных ворот.',
      '6. В **Гиране** зайдите в ювелирный магазин и поговорите с **Элли**.',
      '7. Вернитесь к **Мартину** в Глудин и пройдите экзамен по волкам. Вопросы могут отличаться на разных сборках, поэтому внимательно читайте формулировку; при ошибке квест обычно можно продолжить после повторной попытки.',
      '8. После успешного экзамена получите **Wolf Collar** — через него вызывается волк.',
      '',
      '## Награда',
      '',
      reward || 'Wolf Collar',
      '',
      '## Связанные NPC и предметы',
      '',
      '- **Мартин**',
      '- **Хранитель Портала Белла**',
      '- **Метти**',
      '- **Элли**',
      '- **Wolf Collar**',
    ].join('\n');
  }

  if (q.source === 'https://linedia.ru/wiki/Trial_of_the_Guildsman') {
    return [
      '## Что это',
      '',
      '**Испытание умения** — квест для гномов на получение **Mark of Guildsman**. В цепочке нужно помочь Альтрану и изготовить семь Колец Мастера.',
      '',
      '## Требования',
      '',
      `- Хроники: **${availabilityInfo.label}**`,
      `- Уровень: **${lvl}**`,
      '- Класс: **Собиратель** или **Ремесленник**',
      '- Стартовый NPC: **Валькон**',
      '- Основные города маршрута: **Гиран**, **Говорящий Остров**, **Глудин**, **Глудио**',
      '',
      '## Прохождение',
      '',
      '1. В **Гиране** поговорите с **Вальконом** и начните испытание.',
      '2. Отправляйтесь на **Говорящий Остров** к **Кузнецу Альтрану**. Он расскажет о семи Кольцах Мастера, но сначала попросит помочь с болезнью.',
      '3. Вернитесь к **Валькону** и уточните, чем лечить Альтрана.',
      '4. Идите на **Цветочную Ферму** и выбивайте **Mandragora Berry** с мандрагор: подойдут Росток Мандрагоры, Корень Мандрагоры и Цветок Мандрагоры.',
      '5. Отнесите ягоду **Альтрану** на Говорящий Остров.',
      '6. Соберите материалы для колец: **7 Journeyman Gem** получите через **Нормана** в Глудине, а **7 Journeyman Deco Beads** — через **Пинтера** в Глудио.',
      '7. Получите рецепт, изготовьте **7 Journeyman Ring** и проверьте, что все кольца лежат в инвентаре.',
      '8. Вернитесь к **Валькону** в Гиран и сдайте готовые кольца.',
      '',
      '## Награда',
      '',
      reward || 'Mark of Guildsman',
      '',
      '## Связанные NPC и предметы',
      '',
      '- **Валькон**',
      '- **Кузнец Альтран**',
      '- **Норман**',
      '- **Кузнец Пинтер**',
      '- **Mark of Guildsman**',
      '- **Journeyman Ring**',
    ].join('\n');
  }

  if (q.source === 'https://linedia.ru/wiki/For_the_Sake_of_the_Territory_-_Gludio') {
    return [
      '## Что это',
      '',
      '**Битва за Земли Глудио** — квест Территориальных Войн. Он не похож на обычный маршрут: прогресс идет во время битвы за территорию и зависит от выполненных боевых целей.',
      '',
      '## Требования',
      '',
      `- Хроники: **${availabilityInfo.label}**`,
      `- Уровень: **${lvl}**`,
      '- Стартовый NPC: **Капитан Наемников** в **Глудио**',
      '- Квест берется перед началом Территориальных Войн.',
      '',
      '## Прохождение',
      '',
      '1. До старта Территориальных Войн поговорите с **Капитаном Наемников** в Глудио и возьмите квест.',
      '2. Во время битвы выполняйте цели противника: уничтожайте **катапульты**, ломайте **склады со снаряжением**, убивайте главарей военной, религиозной и экономической ассоциаций.',
      '3. Если идет борьба за флаги, помогайте отбить или украсть флаг чужой территории — это тоже относится к общему прогрессу войны.',
      '4. Следите за автообновляющимися задачами Территориальных Войн: этот квест фактически собирает ваш общий вклад в событие.',
      '5. После окончания битвы вернитесь к **Капитану Наемников** и заберите награду, если была выполнена хотя бы часть целей.',
      '',
      '## Награда',
      '',
      reward || 'Gludio Territory Badge',
      '',
      '## Связанные NPC и предметы',
      '',
      '- **Капитан Наемников**',
      '- **Gludio Territory Badge**',
      '- **Territory Catapult**',
      '- **Supplies Safe**',
    ].join('\n');
  }

  return null;
}

function buildContent(q, parsed, availabilityInfo) {
  const manual = manualContent(q, parsed, availabilityInfo);
  if (manual) return manual;

  const reward = rewardLine(q.reward);
  const lvl = levelText(q);
  const npcLine = q.npc ? `Стартовый или связанный NPC: **${q.npc}**` : 'Стартовый NPC: уточняется по цепочке квеста';
  const routeKind = q.section === 'starts'
    ? 'Квест начинается в Глудио или рядом с городом.'
    : 'Квест связан с Глудио: здесь находится важный NPC или один из шагов цепочки.';
  const steps = parsed.steps.length
    ? parsed.steps
    : ['Поговорите со стартовым NPC и проверьте цель в журнале квестов.', 'Выполните поручение по цепочке и вернитесь за наградой.'];
  const related = [q.npc, ...(q.reward.other || [])].filter(Boolean);

  return [
    '## Что это',
    '',
    `**${parsed.title}** — квест Lineage 2 для персонажей **${lvl} уровня**. ${routeKind}`,
    '',
    '## Требования',
    '',
    `- Хроники: **${availabilityInfo.label}**`,
    `- Уровень: **${lvl}**`,
    `- ${npcLine}`,
    `- Локация: **${q.location}**`,
    '',
    '## Прохождение',
    '',
    ...steps.map((step, index) => `${index + 1}. ${step}`),
    '',
    '## Награда',
    '',
    reward || 'Награда зависит от версии сервера и будет уточнена после проверки.',
    '',
    '## Связанные NPC и предметы',
    '',
    related.length
      ? related.map(item => `- **${item}**`).join('\n')
      : 'Связанные NPC и предметы будут дополнены после проверки в игре.',
  ].filter(Boolean).join('\n');
}

async function findExisting(q, slug, parsed) {
  const where = [
    { slug },
    q.legacySlug ? { slug: q.legacySlug } : null,
    { titleEn: parsed.titleEn },
    q.legacyTitleEn ? { titleEn: q.legacyTitleEn } : null,
  ].filter(Boolean);
  return prisma.guide.findFirst({ where: { OR: where } });
}

async function main() {
  let created = 0;
  let updated = 0;
  let drafted = 0;

  for (let index = 0; index < QUESTS.length; index += 1) {
    const q = QUESTS[index];
    const parsed = await fetchQuest(q);
    const availabilityInfo = availability(parsed.added, parsed.removed);
    const slug = slugify(`${parsed.title} gludio`);
    const existing = DRY_RUN ? null : await findExisting(q, slug, parsed);
    const data = {
      slug,
      chronicle: availabilityInfo.chronicle,
      category: 'quests',
      title: parsed.title,
      titleEn: parsed.titleEn,
      description: `${parsed.title} (${parsed.titleEn}) — подробное прохождение квеста Lineage 2: уровень, NPC, цели, монстры и награды.`,
      content: buildContent(q, parsed, availabilityInfo),
      image: null,
      levelMin: q.levelMin,
      levelMax: q.levelMax,
      npc: q.npc,
      location: q.location,
      reward: rewardLine(q.reward),
      race: null,
      repeatable: false,
      types: questTypes(q, parsed),
      sort: 100 + index,
      publishedAt: availabilityInfo.public ? (existing?.publishedAt ?? new Date()) : null,
    };

    if (DRY_RUN) {
      console.log(`${availabilityInfo.public ? 'PUBLIC' : 'DRAFT'}\t${data.chronicle}\t${data.slug}\t${data.title}\tsteps=${parsed.steps.length}`);
      if (index === 0) {
        console.log('\n--- SAMPLE CONTENT ---\n');
        console.log(data.content);
        console.log('\n--- END SAMPLE ---\n');
      }
    } else if (existing) {
      await prisma.guide.update({
        where: { id: existing.id },
        data: {
          slug: data.slug,
          chronicle: data.chronicle,
          title: data.title,
          titleEn: data.titleEn,
          description: data.description,
          levelMin: data.levelMin,
          levelMax: data.levelMax,
          npc: data.npc,
          location: data.location,
          reward: data.reward,
          types: data.types,
          sort: data.sort,
          publishedAt: data.publishedAt,
          ...(OVERWRITE_CONTENT ? { content: data.content } : {}),
        },
      });
      updated += 1;
    } else {
      await prisma.guide.create({ data });
      created += 1;
    }

    if (!availabilityInfo.public) drafted += 1;
  }

  console.log(`Gludio quest seed complete: created=${created}, updated=${updated}, drafted=${drafted}, total=${QUESTS.length}${DRY_RUN ? ' (dry-run)' : ''}`);
}

main()
  .catch(error => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
