/* Seed/update Gludin-related quest guide entries.
 *
 * The source list is the user-provided Gludin batch. The script fetches
 * Linedia pages for facts, then writes original L2Realm guide markdown.
 *
 * Run from backend container/app root:
 *   node prisma/seed-gludin-quests.js
 *
 * Set OVERWRITE_GUIDE_CONTENT=0 if you only want metadata updates.
 * Set DRY_RUN=1 to preview without writing.
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
  q('https://linedia.ru/wiki/Subjugation_of_Lizardmen', 'Вейс', 'Глудин', { repeatable: true }),
  q('https://linedia.ru/wiki/Path_of_the_Rogue', 'Безик', 'Глудин'),
  q('https://linedia.ru/wiki/Path_of_the_Human_Wizard', 'Парина', 'Глудин'),
  q('https://linedia.ru/wiki/Path_of_the_Cleric', 'Зигонт', 'Глудин'),
  q('https://linedia.ru/wiki/Path_of_the_Warder', 'Сион', 'Глудин'),
  q('https://linedia.ru/wiki/Path_of_the_Warrior', 'Аурон', 'Глудин'),
  q('https://linedia.ru/wiki/Path_of_the_Human_Knight', 'Клаус Васпер', 'Глудин'),
  q('https://linedia.ru/wiki/Dragon_Fangs', 'Льюис', 'Глудин'),
  q('https://linedia.ru/wiki/Making_the_Harvest_Grounds_Safe', 'Норман', 'Глудин', { repeatable: true }),
  q('https://linedia.ru/wiki/Collector_of_Jewels', 'Нелл', 'Глудин', { repeatable: true }),
  q('https://linedia.ru/wiki/I%27d_Rather_Be_Collecting_Fairy_Breath', 'Галатея', 'Глудин', { repeatable: true }),
  q('https://linedia.ru/wiki/Acts_of_Evil', 'Альва', 'Глудин'),
  q('https://linedia.ru/wiki/Test_of_the_Summoner', 'Галатея', 'Глудин'),
  q('https://linedia.ru/wiki/Pailaka_-_Song_of_Ice_and_Fire', 'Эдлер', 'Глудин', { typeHint: 'Разовые' }),
  q('https://linedia.ru/wiki/Repent_Your_Sins', 'Черный Судья', 'Все деревни', { repeatable: true, legacySlug: 'pokayanie-repent-your-sins' }),
  q('https://linedia.ru/wiki/Millennium_Love', 'Лилит', 'Говорящий Остров'),
  q('https://linedia.ru/wiki/Path_of_the_Orc_Monk', 'Гентаки Зу Уруту', 'Шутгарт'),
  q('https://linedia.ru/wiki/Path_of_the_Elven_Knight', 'Сориус', 'Глудио'),
  q('https://linedia.ru/wiki/Path_of_the_Orc_Shaman', 'Татару Зу Хестуи', 'Шутгарт'),
  q('https://linedia.ru/wiki/Path_of_the_Assassin', 'Трискел', 'Глудио'),
  q('https://linedia.ru/wiki/Path_of_the_Artisan', 'Сильвера', 'Шутгарт'),
  q('https://linedia.ru/wiki/Path_of_the_Trooper', 'Гвейн', 'Глудио'),
  q('https://linedia.ru/wiki/Path_of_the_Shillien_Oracle', 'Сидра', 'Глудио'),
  q('https://linedia.ru/wiki/Path_of_the_Scavenger', 'Пепи', 'Шутгарт'),
  q('https://linedia.ru/wiki/Path_of_the_Orc_Raider', 'Карукия', 'Шутгарт'),
  q('https://linedia.ru/wiki/Trial_of_the_Guildsman', 'Валькон', 'Гиран', { legacySlug: 'ispytanie-umeniya-gludio' }),
  q('https://linedia.ru/wiki/Trial_of_the_Scholar', 'Мириен', 'Дион'),
  q('https://linedia.ru/wiki/Testimony_of_Fate', 'Кайра', 'Гиран'),
  q('https://linedia.ru/wiki/Testimony_of_Prosperity', 'Парман', 'Гиран'),
  q('https://linedia.ru/wiki/Testimony_of_Life', 'Кардиен', 'Дион'),
  q('https://linedia.ru/wiki/Test_of_Magus', 'Рукал', 'Дион'),
  q('https://linedia.ru/wiki/Test_of_the_Healer', 'Банделлос', 'Гиран'),
  q('https://linedia.ru/wiki/Test_of_Witchcraft', 'Орим', 'Гиран'),
  q('https://linedia.ru/wiki/Audience_with_the_Land_Dragon', 'Габриэль', 'Гиран', { typeHint: 'Разовые' }),
  q('https://linedia.ru/wiki/Test_of_Sagittarius', 'Бернард', 'Аден'),
];

const REWARD_OVERRIDES = new Map([
  ['Subjugation of Lizardmen', '14,700 :adena: · раннее завершение: 4,090 :adena:'],
  ['Making the Harvest Grounds Safe', 'Адена за сданные материалы'],
  ['Collector of Jewels', 'Адена за осколки стихий'],
  ["I'd Rather Be Collecting Fairy Breath", 'Адена за Fairy Breath'],
  ['Repent Your Sins', 'Снижение PK-счетчика'],
]);

function q(source, npc, location, extra = {}) {
  return { source, npc, location, ...extra };
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

function infoboxField(html, label) {
  const re = new RegExp(`<tr[^>]*>\\s*<td[^>]*>\\s*${escapeRegExp(label)}:?\\s*<\\/td>\\s*<td[^>]*>([\\s\\S]*?)<\\/td>\\s*<\\/tr>`, 'i');
  const match = html.match(re);
  return match ? htmlToText(match[1]) : '';
}

function escapeRegExp(value) {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function parseTitle(html) {
  let pageTitle = htmlToText(html.match(/<title>([\s\S]*?)<\/title>/i)?.[1] || '');
  pageTitle = pageTitle.replace(/^Квест\s+/u, '').split(' — ')[0].trim();
  const match = pageTitle.match(/^(.+?)\s+\((.+?)\)$/);
  return match
    ? { titleEn: match[1].trim(), title: match[2].trim() }
    : { titleEn: pageTitle, title: pageTitle };
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

function extractRewardLine(html) {
  const tabMatch = html.match(/<div[^>]*class="tabbertab"[^>]*title=\s*"?\s*Награда\s*"?>\s*<p>([\s\S]*?)<\/p>\s*<\/div>/i);
  if (!tabMatch) return '';
  const rawLines = tabMatch[1]
    .replace(/<br\s*\/?>/gi, '\n')
    .split('\n')
    .map(line => htmlToText(line).replace(/\s+/g, ' ').trim())
    .filter(Boolean);

  const parts = [];
  for (const line of rawLines) {
    const parsed = rewardPart(line);
    if (parsed) parts.push(parsed);
  }
  return unique(parts).join(' · ');
}

function rewardPart(line) {
  const clean = line.replace(/\s+/g, ' ').trim();
  const match = clean.match(/^([\d\s,.]+)?\s*(.+?)(?:\s+\(([^)]+)\))?$/);
  if (!match) return clean;
  const amountRaw = (match[1] || '').replace(/\s+/g, '');
  const amountNum = amountRaw ? Number(amountRaw.replace(/,/g, '')) : null;
  const name = (match[2] || '').trim();
  const ru = (match[3] || '').trim();
  if (amountNum === 0) return null;
  const amount = amountRaw ? formatNumber(amountRaw) : '';

  if (/^(XP|Experience)$/i.test(name)) return amount ? `${amount} :exp:` : null;
  if (/^SP$/i.test(name)) return amount ? `${amount} :sp:` : null;
  if (/^Adena$/i.test(name) || ru === 'Адена') return amount ? `${amount} :adena:` : ':adena:';

  const label = ru && !badTranslation(ru) ? ru : name;
  return amount && amount !== '1' ? `${amount} ${label}` : label;
}

function formatNumber(value) {
  const digits = String(value).replace(/[^\d]/g, '');
  return digits.replace(/\B(?=(\d{3})+(?!\d))/g, ',');
}

function unique(items) {
  return [...new Set(items.filter(Boolean))];
}

function badTranslation(value) {
  return /Переместить Закладку|Отчаявшийся Беженец|Эффект Торта|Модная Шляпа|Упаковка|Талисман/i.test(value);
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
  const startsAt = addedOrder ?? 0;

  const existsInInterlude = startsAt <= interludeOrder && (removedOrder == null || removedOrder > interludeOrder);
  const existsInHighFive = startsAt <= highFiveOrder && (removedOrder == null || removedOrder > highFiveOrder);

  if (existsInInterlude && existsInHighFive) return { chronicle: 'interlude,high-five', public: true, label: 'Interlude / High Five' };
  if (existsInInterlude) return { chronicle: 'interlude', public: true, label: 'Interlude' };
  if (existsInHighFive) return { chronicle: 'high-five', public: true, label: 'High Five' };
  return { chronicle: 'main', public: false, label: 'после High Five' };
}

function parseLevel(level) {
  const text = String(level || '').replace(/\s+/g, ' ').trim();
  const numbers = [...text.matchAll(/\d+/g)].map(match => Number(match[0]));
  if (!numbers.length) return { min: null, max: null, label: 'любой' };
  if (numbers.length >= 2) return { min: numbers[0], max: numbers[1], label: `${numbers[0]}-${numbers[1]}` };
  return { min: numbers[0], max: null, label: `${numbers[0]}+` };
}

function questTypes(q, parsed) {
  const haystack = `${parsed.title} ${parsed.titleEn} ${q.typeHint || ''}`;
  const types = [];
  if (/Путь |Испытание|Path|Trial|Testimony|Test of/i.test(haystack)) types.push('Профессия');
  if (/Pailaka|Пайлака/i.test(haystack)) types.push('Разовые');
  if (q.repeatable || parsed.repeatable) types.push('Повторяемые');
  if (!types.length) types.push(q.typeHint || 'Разовые');
  return unique(types);
}

function cleanStep(value) {
  let cleaned = String(value || '')
    .replace(/\s+([.,;:!?])/g, '$1')
    .replace(/\(\s+/g, '(')
    .replace(/\s+\)/g, ')')
    .replace(/\s{2,}/g, ' ')
    .replace(/Положение\s+/g, '')
    .replace(/Quest Monster\s+/gi, 'квестовый монстр ')
    .replace(/Gludin Village \(Деревня Глудин\)/g, 'Глудин')
    .replace(/Town of Gludio \(Город Глудио\)/g, 'Глудио')
    .replace(/Town of Giran \(Город Гиран\)/g, 'Гиран')
    .replace(/Town of Dion \(Город Дион\)/g, 'Дион')
    .replace(/Talking Island Village \(Деревня Говорящего Острова\)/g, 'Деревню Говорящего Острова')
    .replace(/Orc Village \(Деревня Орков\)/g, 'Деревню Орков')
    .replace(/Dwarven Village \(Деревня Гномов\)/g, 'Деревню Гномов')
    .replace(/Hunters Village \(Деревня Охотников\)/g, 'Деревню Охотников')
    .replace(/(^|[\s([{])нам(?=$|[\s.,;:!?)\]])/gi, '$1вам')
    .replace(/(^|[\s([{])нас(?=$|[\s.,;:!?)\]])/gi, '$1вас')
    .replace(/(^|[\s([{])мы(?=$|[\s.,;:!?)\]])/gi, '$1вы')
    .replace(/Погорите/g, 'Поговорите')
    .replace(/поговрить/g, 'поговорить')
    .replace(/Онесите/g, 'Отнесите')
    .replace(/Выберете/g, 'Выберите')
    .replace(/Разговариваем с/g, 'Поговорите с')
    .replace(/разговариваем с/g, 'поговорите с')
    .replace(/Бежим в/g, 'Отправляйтесь в')
    .replace(/Бежим к/g, 'Отправляйтесь к')
    .replace(/бежим в/g, 'идите в')
    .replace(/Идем в/g, 'Отправляйтесь в')
    .replace(/Идем к/g, 'Отправляйтесь к')
    .replace(/Идите в/g, 'Отправляйтесь в')
    .replace(/Идите к/g, 'Отправляйтесь к')
    .replace(/Возвращаемся к/g, 'Вернитесь к')
    .replace(/возвращаемся к/g, 'вернитесь к')
    .replace(/Возвращайтесь к/g, 'Вернитесь к')
    .replace(/Телепортируемся/g, 'Телепортируйтесь')
    .replace(/телепортируемся/g, 'телепортируйтесь')
    .replace(/Убиваем/g, 'Убейте')
    .replace(/убиваем/g, 'убейте')
    .replace(/Охотимся/g, 'Охотьтесь')
    .replace(/охотимся/g, 'охотьтесь')
    .replace(/Собираем/g, 'Соберите')
    .replace(/собираем/g, 'соберите')
    .replace(/Получаем/g, 'Получите')
    .replace(/получаем/g, 'получите')
    .replace(/Берем/g, 'Возьмите')
    .replace(/берем/g, 'возьмите')
    .replace(/Отдает/g, 'Отдаст')
    .replace(/отдает/g, 'отдаст')
    .replace(/отдаёт/g, 'отдаст')
    .replace(/\(\s*ур\.\)/g, '')
    .replace(/\s{2,}/g, ' ')
    .trim();

  cleaned = compactDialogue(cleaned);
  cleaned = simplifyParentheses(cleaned);
  return /[.!?]$/.test(cleaned) ? cleaned : `${cleaned}.`;
}

function compactDialogue(text) {
  if (text.length <= 720) return text;
  const sentences = text.split(/(?<=[.!?])\s+/);
  const important = sentences.filter(sentence => /(поговор|получ|отправ|идите|найд|охот|собер|вернит|убей|выберите|телепорт)/i.test(sentence));
  const compact = (important.length ? important : sentences).slice(0, 4).join(' ');
  return compact.length < text.length ? compact : text.slice(0, 720).replace(/\s+\S*$/, '');
}

function simplifyParentheses(text) {
  return text.replace(/\b([A-Z][A-Za-z'’., -]{2,})\s+\(([^)]+)\)/g, (full, en, ru) => {
    const cleanRu = String(ru || '').trim();
    if (!cleanRu || badTranslation(cleanRu) || /[A-Za-z]/.test(cleanRu)) return en.trim();
    return `${en.trim()} (${cleanRu})`;
  });
}

async function fetchQuest(q) {
  const res = await fetch(q.source, { headers: { 'User-Agent': USER_AGENT } });
  if (!res.ok) throw new Error(`Failed to fetch ${q.source}: ${res.status}`);
  const html = await res.text();
  const parsed = {
    ...parseTitle(html),
    added: infoboxField(html, 'Добавлен в'),
    removed: infoboxField(html, 'Удален в'),
    levelRaw: infoboxField(html, 'Уровень'),
    requirements: infoboxField(html, 'Требования'),
    reward: extractRewardLine(html),
    steps: extractWalkthrough(html),
    repeatable: /Можно выполнить любое количество раз/i.test(html),
  };
  return parsed;
}

function manualContent(q, parsed, availabilityInfo, level) {
  if (parsed.titleEn === 'Path of the Orc Shaman') {
    const reward = rewardText(parsed) || 'Маска Медиума';
    return [
      '## Что это',
      '',
      '**Путь Шамана** — квест на первую профессию орка-мага. Основной старт в деревне орков, но одну из веток можно пройти через Глудин.',
      '',
      '## Требования',
      '',
      `- Хроники: **${availabilityInfo.label}**`,
      `- Уровень: **${level.label}**`,
      '- Класс: **Адепт**',
      '- Стартовый NPC: **Татару Зу Хестуи** в деревне орков',
      '',
      '## Прохождение',
      '',
      '1. В деревне орков поговорите с **Татару Зу Хестуи** в зале короля и возьмите задание.',
      '2. У **Замерзшего Водопада** охотьтесь на **Kasha Bear** и **Kasha Blade Spider**, пока не получите шкуру медведя и кожу паука.',
      '3. В **Пещере Испытаний** убейте **Scarlet Salamander** и заберите огненное яйцо.',
      '4. Вернитесь к **Татару Зу Хестуи**, затем найдите **Тотемный Дух Хестуи** юго-западнее деревни орков.',
      '5. Снова поговорите с **Татару Зу Хестуи**. Для ветки через Глудин выберите вариант изучить имена 99 душ.',
      '6. В **Глудине** найдите **Прислужника Белефа / Seer Umos** в гильдии орков.',
      '7. Севернее Глудина, рядом с лагерем орков, убивайте **Grizzly Bear**, пока не соберёте **3 Grizzly Blood**.',
      '8. Сдайте кровь **Umos**, затем найдите **Тотемный Дух Дуда-Мара** северо-восточнее арены Глудина.',
      '9. Вернитесь к **Umos** и завершите испытание. На 20 уровне смените профессию у старшего наставника орков.',
      '',
      '## Награда',
      '',
      reward,
      '',
      '## Связанные NPC и предметы',
      '',
      '- **Татару Зу Хестуи**',
      '- **Seer Umos**',
      '- **Тотемный Дух Хестуи**',
      '- **Тотемный Дух Дуда-Мара**',
      '- **Grizzly Blood**',
      '- **Маска Медиума**',
    ].join('\n');
  }

  if (parsed.titleEn === 'Path of the Artisan') {
    const reward = rewardText(parsed) || 'Последнее Свидетельство';
    return [
      '## Что это',
      '',
      '**Путь Ремесленника** — квест на первую профессию гнома-ремесленника. Старт в деревне гномов, затем удобная ветка идёт через Глудин и Глудио.',
      '',
      '## Требования',
      '',
      `- Хроники: **${availabilityInfo.label}**`,
      `- Уровень: **${level.label}**`,
      '- Класс: **Подмастерье**',
      '- Стартовый NPC: **Сильвера** в деревне гномов',
      '',
      '## Прохождение',
      '',
      '1. Поговорите с **Сильверой** в кузнице деревни гномов.',
      '2. В **Заброшенном Угольном Руднике** убейте **Boogle Ratman Leader** для **2 зубов главаря** и **Boogle Ratman** для **10 зубов крысолюда**.',
      '3. Вернитесь к **Сильвере** и получите **1st Pass Certificate**.',
      '4. Для маршрута через Глудин поговорите с **Клуто** в кузнице Глудина и возьмите письмо к Пинтеру.',
      '5. В кузнице **Глудио** поговорите с **Пинтером**. Он отправит вас найти украденный ящик.',
      '6. Юго-восточнее Глудина убивайте **Vuku Orc Fighter**, пока не получите **Stolen Secret Box**.',
      '7. Сдайте ящик **Пинтеру** и получите **2nd Pass Certificate**.',
      '8. Вернитесь к **Клуто** в Глудин, выберите ответ про найденный ящик и получите **Final Pass Certificate**.',
      '9. На 20 уровне поговорите с **Тапоем** в кузнице Глудина, чтобы сменить профессию.',
      '',
      '## Награда',
      '',
      reward,
      '',
      '## Связанные NPC и предметы',
      '',
      '- **Сильвера**',
      '- **Клуто**',
      '- **Пинтер**',
      '- **Тапой**',
      '- **Stolen Secret Box**',
      '- **Final Pass Certificate**',
    ].join('\n');
  }

  if (parsed.titleEn === 'Path of the Orc Raider') {
    const reward = rewardText(parsed) || 'Знак Налетчика';
    return [
      '## Что это',
      '',
      '**Путь Налетчика** — квест на первую профессию орка-бойца. После стартовой части в деревне орков можно выбрать ветку через Глудин.',
      '',
      '## Требования',
      '',
      `- Хроники: **${availabilityInfo.label}**`,
      `- Уровень: **${level.label}**`,
      '- Класс: **Боец**',
      '- Стартовый NPC: **Карукия** в деревне орков',
      '',
      '## Прохождение',
      '',
      '1. В деревне орков поговорите с **Карукией** в зале короля.',
      '2. На северной части **Бессмертного Плато** убивайте **Goblin Tomb Raider Leader**, пока не появятся квестовые **Kuruka Ratman Leader**.',
      '3. Убейте квестовых главарей крысолюдов и соберите **10 Kuruka Ratman Tooth**.',
      '4. Вернитесь к **Карукии**. Для ветки через Глудин выберите путь в сторону Gludio Village.',
      '5. В **Глудине** поговорите с **Касманом** в гильдии орков.',
      '6. Через деревню тёмных эльфов отправляйтесь в **Гнездо Пауков** и убивайте квестовых **Umbar Orc**, пока не получите **2 Head of Betrayer**.',
      '7. Вернитесь к **Касману** в Глудин и получите **Mark of Raider**.',
      '8. На 20 уровне поговорите с **Осборном**, чтобы сменить профессию на Orc Raider.',
      '',
      '## Награда',
      '',
      reward,
      '',
      '## Связанные NPC и предметы',
      '',
      '- **Карукия**',
      '- **Касман**',
      '- **Осборн**',
      '- **Kuruka Ratman Tooth**',
      '- **Head of Betrayer**',
      '- **Mark of Raider**',
    ].join('\n');
  }

  if (parsed.titleEn === 'Trial of the Guildsman') {
    const reward = rewardText(parsed) || 'Знак Умения';
    return [
      '## Что это',
      '',
      '**Испытание умения** — второй профессиональный квест гномов. Цель простая: доказать гильдии, что вы умеете собирать материалы и доводить работу до готового изделия.',
      '',
      '## Требования',
      '',
      `- Хроники: **${availabilityInfo.label}**`,
      `- Уровень: **${level.label}**`,
      '- Классы: **Собиратель** или **Ремесленник**',
      '- Стартовый NPC: **Валькон** на складе Гирана',
      '- Нужны **2,000 аден** на вступительный взнос и **D-grade кристаллы** для крафта колец.',
      '',
      '## Прохождение',
      '',
      '1. В **Гиране** поговорите с **Вальконом** на складе и оплатите вступительный взнос.',
      '2. На **Говорящем Острове** найдите **Кузнеца Альтрана**. Он объяснит, что нужно изготовить **7 Journeyman Ring**.',
      '3. В **Землях Казнённых** выбейте **Mandragora Berry** с **Mandragora Blossom** или **Mandragora Sprout** и вернитесь к Альтрану за рецептом.',
      '4. В **Глудине** поговорите с **Норманом** на складе, затем в **Глудио** поговорите с **Пинтером** в кузнице.',
      '5. Для Пинтера соберите янтарь в **Муравейнике** с **Ant**, **Ant Captain** и **Ant Overseer**. Ремесленнику нужно переработать янтарь по рецепту, собирателю достаточно принести готовые бусины.',
      '6. В **Деревне Охотников** поговорите с **Данингом** и выбейте **30 Duning Key** с орков Брека в **Укреплении Бреки**.',
      '7. Вернитесь к **Норману**. Он даст список материалов для **Journeyman Gem**: красный пигмент, серый порошок, гранитный точильный камень и плетёную нить.',
      '8. Соберите материалы: нежить и големы в **Землях Казнённых**, а **Braided Yarn** — с **Silenos** возле ипподрома.',
      '9. У **Нормана** получите самоцветы, у **Пинтера** — декоративные бусины. Добавьте D-grade кристаллы и изготовьте **7 Journeyman Ring**.',
      '10. Вернитесь к **Валькону** в Гиран, сдайте кольца и выберите ответ про честного члена гильдии.',
      '',
      '## Награда',
      '',
      reward,
      '',
      '## Связанные NPC и предметы',
      '',
      '- **Валькон**',
      '- **Кузнец Альтран**',
      '- **Норман**',
      '- **Пинтер**',
      '- **Данинг**',
      '- **Journeyman Ring**',
      '- **Mark of Guildsman**',
    ].join('\n');
  }

  if (parsed.titleEn === 'Trial of the Scholar') {
    const reward = rewardText(parsed) || 'Знак Мудрости';
    return [
      '## Что это',
      '',
      '**Испытание мудрости** — второй профессиональный квест магов. Это длинная цепочка поручений от Мириен: сначала расследование в Дионе, затем задания Юрека и сбор глав рукописи.',
      '',
      '## Требования',
      '',
      `- Хроники: **${availabilityInfo.label}**`,
      `- Уровень: **${level.label}**`,
      '- Классы: **Маг**, **Светлый Маг** или **Темный Маг**',
      '- Стартовый NPC: **Мириен** в Дионе',
      '',
      '## Прохождение',
      '',
      '1. В **Дионе** поговорите с **Мириен**, затем с **Сильвианом** в храме.',
      '2. Выполните цепочку **Марии**, **Лукаса** и **Креты**: поговорите с ними в Дионе и Флоране, чтобы выяснить, кто украл рукопись.',
      '3. В **Долине Ящеров** убивайте **Leto Lizardman Warrior**, пока не соберёте **5 Brown Scroll Scrap**. Вернитесь к **Марии** за **Crystal of Purity**.',
      '4. Сдайте результат **Сильвиану** и **Мириен**. После этого отправляйтесь в **Гиран** к **Юреку**.',
      '5. Для **Юрека** соберите три набора: **5 Shaman Necklace** с шаманов Брека, **2 Shackle Scalp** с **Shackle** и **5 Monster Eye Destroyer Skin** с монстроглазов южнее Диона.',
      '6. Вернитесь к **Юреку**, затем к **Мириен** и получите следующую часть задания.',
      '7. В **Деревне Охотников** поговорите с **Кроносом**, затем в Гиране с **Дитером**.',
      '8. Снова посетите **Крету**, вернитесь к **Дитеру**, затем поговорите с **Эдроком** в Деревне Охотников.',
      '9. В **Глудине** найдите **Раута** на складе и **Триффа** у доков. После этого вернитесь к **Валькону** в Гиран и к **Марии** в Дион за второй **Crystal of Purity**.',
      '10. Получите у **Валькона** вторую главу рукописи, затем выбейте третью главу с **Grandis** возле академии Хардина.',
      '11. В Дионе поговорите с **Пойтаном**, потом найдите **Казиана** в **Пустоши**.',
      '12. Для Казиана соберите компоненты: **Ghoul Skin**, **Medusa Blood**, **Fettered Soul Ichor** и **Enchanted Gargoyle Nail**.',
      '13. Сдайте материалы **Казиану**, вернитесь к **Кроносу**, затем к **Мириен** в Дион и получите знак.',
      '',
      '## Награда',
      '',
      reward,
      '',
      '## Связанные NPC и предметы',
      '',
      '- **Мириен**',
      '- **Сильвиан**',
      '- **Мария**',
      '- **Юрек**',
      '- **Кронос**',
      '- **Казиан**',
      '- **Mark of Scholar**',
    ].join('\n');
  }

  if (parsed.titleEn === 'Testimony of Fate') {
    const reward = rewardText(parsed) || 'Знак Судьбы';
    return [
      '## Что это',
      '',
      '**Испытание судьбы** — второй профессиональный квест темных эльфов. Маршрут начинается у Кайры и постепенно приводит к Тифиэлю, Аркении, Кровавой Фее и Тлетворному Древню.',
      '',
      '## Требования',
      '',
      `- Хроники: **${availabilityInfo.label}**`,
      `- Уровень: **${level.label}**`,
      '- Стартовый NPC: **Кайра** в гильдии темных эльфов Гирана',
      '',
      '## Прохождение',
      '',
      '1. В **Гиране** поговорите с **Кайрой**, затем с **Метеусом** в восточной части города.',
      '2. В **Землях Казнённых** убивайте **Hangman Tree**, пока не получите останки Кассандры. Сдайте их **Метеусу**.',
      '3. В **Дионе** поговорите с **Иксией** и соберите для неё пять реагентов: кровь тирана, корень белладонны, вытяжку паука, навоз Dead Seeker и сукровицу медузы.',
      '4. Вернитесь к **Иксии**, получите **Belladonna**, затем сдайте её **Метеусу** и вернитесь к **Кайре**.',
      '5. В гильдии магов Гирана поговорите с **Роа**, затем в **Глудине** найдите **Нормана** на складе и заберите рукопись.',
      '6. Вернитесь к **Кайре**, после чего отправляйтесь в деревню темных эльфов к **Тифиэлю**.',
      '7. У **Алтаря Ритуалов** поговорите с **Аркенией**, **Кровавой Феей** и **Тлетворным Древнем**.',
      '8. Соберите предметы для Феи и Древня: **Black Willow Leaf** в топях, черепа **Breka Orc Overlord**, **Leto Lizardman Overlord**, **Karul Bugbear** и **Grandis**.',
      '9. Сдайте предметы **Кровавой Фее** и **Тлетворному Древню**, затем вернитесь к **Аркении**.',
      '10. Завершите цепочку у **Тифиэля** и получите **Mark of Fate**.',
      '',
      '## Награда',
      '',
      reward,
      '',
      '## Связанные NPC и предметы',
      '',
      '- **Кайра**',
      '- **Метеус**',
      '- **Иксия**',
      '- **Норман**',
      '- **Тифиэль**',
      '- **Аркения**',
      '- **Mark of Fate**',
    ].join('\n');
  }

  if (parsed.titleEn === 'Testimony of Prosperity') {
    const reward = rewardText(parsed) || 'Знак Успеха';
    return [
      '## Что это',
      '',
      '**Испытание успеха** — второй профессиональный квест гномов. Он состоит из двух больших частей: собрать четыре свидетельства процветания, а затем помочь Николе у Башни Крумы.',
      '',
      '## Требования',
      '',
      `- Хроники: **${availabilityInfo.label}**`,
      `- Уровень: **${level.label}**`,
      '- Классы: **Собиратель** или **Ремесленник**',
      '- Стартовый NPC: **Парман** на складе Гирана',
      '',
      '## Прохождение',
      '',
      '1. В **Гиране** поговорите с **Парманом** и получите кольцо свидетельства.',
      '2. Для свидетельства плодородия поговорите с **Брайтом** в Дионе. Соберите **20 Mandragora Petal** в Землях Казнённых и **10 Crimson Moss** с гигантских багровых муравьёв в Топях Крумы.',
      '3. Отнесите материалы **Брайту**, затем передайте букет **Эмили** в Дионе.',
      '4. Для свидетельства здоровья отправляйтесь на **Говорящий Остров** к **Вилфорду**, затем поговорите с **Лилит** в храме и передайте ей брошь.',
      '5. Для свидетельства плодородных земель поговорите с **Пиотуром** у лагеря орков и получите благословенное зерно.',
      '6. Для свидетельства богатства отправляйтесь в деревню гномов к **Локрину**.',
      '7. Обойдите старейшин в зале Локрина: **Спирон**, **Баланки**, **Киф**, **Филар** и **Арин**. Они отправят собрать взносы.',
      '8. Соберите взносы у **Торокко**, **Мион**, **Марис Редбоннет**, **Шари** и **Больтера**. Для Марис подготовьте **100 Animal Skin**, а за Торокко придётся заплатить часть долга.',
      '9. Для **Арина** найдите **Мастера Тому** на северо-восточном побережье и заберите его вклад.',
      '10. Вернитесь к старейшинам и **Локрину**, получите старую счётную книгу и сдайте первую часть **Парману** в Гиране.',
      '11. Во второй части идите к **Николе** у **Башни Крумы**.',
      '12. На первом этаже башни найдите **Box of Titan**, снимите слепок замочной скважины и вернитесь к Николе.',
      '13. Соберите материалы для **Key of Titan**: панцири стакато, железы Toad Lord, шипы Marsh Spider и D-grade кристаллы.',
      '14. Изготовьте ключ, откройте **Box of Titan** и получите фрагмент скрижали Мафр.',
      '15. Вернитесь к **Парману** в Гиран и завершите испытание.',
      '',
      '## Награда',
      '',
      reward,
      '',
      '## Связанные NPC и предметы',
      '',
      '- **Парман**',
      '- **Брайт**',
      '- **Локрин**',
      '- **Мастер Тома**',
      '- **Никола**',
      '- **Key of Titan**',
      '- **Mark of Prosperity**',
    ].join('\n');
  }

  if (parsed.titleEn === 'Testimony of Life') {
    const reward = rewardText(parsed) || 'Знак Жизни';
    return [
      '## Что это',
      '',
      '**Испытание жизни** — второй профессиональный квест светлых эльфов. Основная цепочка идёт через Кардиена, Астериоса, Талию, Пушкина, Аркению и Изаэль.',
      '',
      '## Требования',
      '',
      `- Хроники: **${availabilityInfo.label}**`,
      `- Уровень: **${level.label}**`,
      '- Классы: **Светлый Рыцарь**, **Разведчик**, **Светлый Маг** или **Оракул Евы**',
      '- Стартовый NPC: **Кардиен** в Дионе',
      '',
      '## Прохождение',
      '',
      '1. В **Дионе** поговорите с **Кардиеном**, затем отправляйтесь в эльфийскую деревню к **Астериосу**.',
      '2. У озера Ирис найдите **Талию** и получите чертёж чаши.',
      '3. В **Гиране** поговорите с **Пушкиным**. Для чаши соберите **20 Wyrm Talon**, **10 Pure Mithril Ore** и **20 Ant Soldier Acid**.',
      '4. Вернитесь к **Пушкину**, получите **Pure Mithril Cup** и отнесите её **Талии**.',
      '5. У **Алтаря Ритуалов** поговорите с **Аркенией**, затем в **Глудине** найдите **Адониуса**.',
      '6. Для Адониуса соберите **20 Spider Ichor** с болотных пауков и **20 Harpy Down** с гарпий.',
      '7. Сдайте материалы **Адониусу**, затем вернитесь к **Аркении** и снова к **Талии**.',
      '8. В **Деревне Охотников** поговорите с **Изаэль Серебряная Тень**.',
      '9. В **Долине Ящеров** убивайте **Leto Lizardman Shaman** и **Leto Lizardman Overlord**, пока не соберёте части копья и драгоценные камни Талина.',
      '10. Сдайте материалы **Изаэль**, получите **Talin Spear** и вернитесь к **Талии**.',
      '11. У озера Ирис используйте копьё против **Unicorn of Eva** и получите слёзы единорога.',
      '12. Сдайте слёзы **Талии**, затем поговорите с **Астериосом** и вернитесь к **Кардиену** в Дион.',
      '',
      '## Награда',
      '',
      reward,
      '',
      '## Связанные NPC и предметы',
      '',
      '- **Кардиен**',
      '- **Астериос**',
      '- **Талия**',
      '- **Пушкин**',
      '- **Аркения**',
      '- **Адониус**',
      '- **Talin Spear**',
      '- **Mark of Life**',
    ].join('\n');
  }

  if (parsed.titleEn === 'Test of the Summoner') {
    const reward = rewardText(parsed) || 'Знак Призывателя';
    return [
      '## Что это',
      '',
      '**Испытание призывателя** — третий профессиональный квест для магов-призывателей. Сначала нужно собрать карты у Лары, затем победить нескольких призывателей в дуэлях питомцев.',
      '',
      '## Требования',
      '',
      `- Хроники: **${availabilityInfo.label}**`,
      `- Уровень: **${level.label}**`,
      '- Классы: **Маг**, **Светлый Маг** или **Темный Маг**',
      '- Стартовый NPC: **Галатея** в магазине магии Глудина',
      '',
      '## Прохождение',
      '',
      '1. В **Глудине** поговорите с **Галатеей** и получите письмо.',
      '2. В **Дионе** найдите **Лару**. Она выдаст один из списков материалов для карт.',
      '3. По списку Лары соберите два набора по 30 предметов. Возможные цели: **Leto Lizardman**, **Giant Fungus**, **Karul Bugbear**, **Manashen Gargoyle**, **Breka Orc**, **Fettered Soul**, **Windsus**, **Tyrant**, **Wyrm** или **Noble Ant**.',
      '4. Вернитесь к **Галатее** и получите начальные карты. Их должно хватить на серию дуэлей, но при поражениях придётся добирать карты заново.',
      '5. Победите призывателей по маршруту: **Almors** на Говорящем Острове, **Basilla** у Пустоши, **Celestiel** возле эльфийской крепости, **Belthus** у Башни Крумы, **Camoniell** возле Флорана и **Brynthea** северо-восточнее Гирана.',
      '6. В каждой дуэли вызывайте своего питомца и не вмешивайтесь персонажем: нечестная победа может не засчитаться.',
      '7. После каждой победы говорите с призывателем и забирайте его карту.',
      '8. Когда соберёте шесть карт, вернитесь к **Галатее** в Глудин и получите **Mark of Summoner**.',
      '',
      '## Награда',
      '',
      reward,
      '',
      '## Связанные NPC и предметы',
      '',
      '- **Галатея**',
      '- **Лара**',
      '- **Summoner Almors**',
      '- **Summoner Basilla**',
      '- **Summoner Celestiel**',
      '- **Summoner Belthus**',
      '- **Summoner Camoniell**',
      '- **Summoner Brynthea**',
      '- **Mark of Summoner**',
    ].join('\n');
  }

  if (parsed.titleEn === 'Audience with the Land Dragon') {
    const reward = parsed.reward || 'Portal Stone';
    return [
      '## Что это',
      '',
      '**Аудиенция у Дракона Земли** — цепочка допуска к Антарасу. Квест большой, но логика простая: собрать подтверждения от нескольких хранителей печати и получить камень для входа.',
      '',
      '## Требования',
      '',
      `- Хроники: **${availabilityInfo.label}**`,
      `- Уровень: **${level.label}**`,
      '- Стартовый NPC: **Габриэль** в **Гиране**',
      '- Желательно иметь телепорты по основным городам и запас расходников: маршрут длинный.',
      '',
      '## Прохождение',
      '',
      '1. В **Гиране** поговорите с **Габриэль** и получите перо-поручение.',
      '2. Соберите подтверждения от хранителей печати: часть целей выполняется в **Забытых Равнинах**, **Пещере Гигантов**, **Лесу Зеркал**, у **Запретных Врат** и в других высокоуровневых зонах.',
      '3. Для каждой цели убивайте указанных монстров до выпадения нужного предмета, затем возвращайтесь к соответствующему NPC по цепочке.',
      '4. После сбора печатей вернитесь к **Габриэль**. Она направит к финальным NPC, которые подтверждают готовность к встрече с драконом.',
      '5. Завершите последние поручения и получите предмет доступа. На разных хрониках маршрут монстров может немного отличаться, но порядок сдачи NPC сохраняется.',
      '',
      '## Награда',
      '',
      reward,
      '',
      '## Связанные NPC и предметы',
      '',
      '- **Габриэль**',
      '- **Portal Stone**',
      '- **Антарас**',
    ].join('\n');
  }

  if (parsed.titleEn === 'Repent Your Sins') {
    const reward = parsed.reward || 'Снижение PK-счетчика';
    return [
      '## Что это',
      '',
      '**Покаяние** — повторяемый квест для персонажей с PK > 0. Через цепочку заданий вы получаете питомца **Sin Eater**, прокачиваете его и сдаете Черному Судье, чтобы снизить счетчик PK.',
      '',
      '## Требования',
      '',
      `- Хроники: **${availabilityInfo.label}**`,
      '- Условие: **PK > 0**',
      '- Стартовый NPC: **Черный Судья**',
      '',
      '## Прохождение',
      '',
      '1. Поговорите с любым **Черным Судьей** и примите квест.',
      '2. Отправляйтесь в **Башню Слоновой Кости** к **Джоан**. Она попросит добыть материалы с **Trisalim Tarantula** в **Море Спор**.',
      '3. Сдайте материалы **Джоан**, затем вернитесь к **Черному Судье**.',
      '4. Получите питомца **Sin Eater**. Его нужно прокачать в бою: чем выше уровень питомца перед сдачей, тем стабильнее результат снижения PK.',
      '5. Вернитесь к **Черному Судье** и сдайте питомца. Счетчик PK снизится случайно, обычно на 1-10 очков.',
      '6. Если PK еще остался, повторите квест заново.',
      '',
      '## Награда',
      '',
      reward,
      '',
      '## Связанные NPC и предметы',
      '',
      '- **Черный Судья**',
      '- **Джоан**',
      '- **Sin Eater**',
    ].join('\n');
  }

  return null;
}

function buildContent(q, parsed, availabilityInfo, level) {
  const manual = manualContent(q, parsed, availabilityInfo, level);
  if (manual) return manual;

  const reward = rewardText(parsed);
  const reqs = parsed.requirements && parsed.requirements !== 'Нет требований'
    ? `- Требования: **${parsed.requirements}**`
    : '- Дополнительных требований нет, если сервер не менял квест.';
  const routeNote = q.location === 'Глудин'
    ? 'Маршрут начинается или проходит через Глудин.'
    : `Квест связан с Глудином, но основной старт находится в регионе **${q.location}**.`;
  const steps = parsed.steps.length
    ? parsed.steps
    : ['Поговорите со стартовым NPC, получите квестовый предмет и следуйте цепочке до следующего NPC.', 'Соберите нужные предметы с монстров и вернитесь за наградой.'];
  const related = unique([q.npc, ...extractRelatedFromSteps(steps), ...extractRewardNames(reward)]).slice(0, 10);

  return [
    '## Что это',
    '',
    `**${parsed.title}** — квест Lineage 2 для персонажей **${level.label} уровня**. ${routeNote}`,
    '',
    '## Требования',
    '',
    `- Хроники: **${availabilityInfo.label}**`,
    `- Уровень: **${level.label}**`,
    `- Стартовый или ключевой NPC: **${q.npc}**`,
    `- Основная локация: **${q.location}**`,
    reqs,
    '',
    '## Прохождение',
    '',
    ...steps.map((step, index) => `${index + 1}. ${step}`),
    '',
    '## Награда',
    '',
    reward,
    '',
    '## Связанные NPC и предметы',
    '',
    related.length
      ? related.map(item => `- **${item}**`).join('\n')
      : '- Связанные NPC и предметы будут дополнены после проверки в игре.',
  ].filter(Boolean).join('\n');
}

function extractRelatedFromSteps(steps) {
  const names = [];
  for (const step of steps.slice(0, 12)) {
    for (const match of step.matchAll(/\*\*([^*]{3,60})\*\*/g)) {
      if (!/^\d/.test(match[1])) names.push(match[1].trim());
    }
  }
  return names;
}

function extractRewardNames(reward) {
  return String(reward || '')
    .split('·')
    .map(part => part.replace(/:[a-z]+:/g, '').replace(/^[\d,\s]+/, '').trim())
    .filter(part => part && !/Награда зависит|Адена за сданные|Адена за осколки|Адена за Fairy Breath|Снижение PK/i.test(part));
}

function rewardText(parsed) {
  return parsed.reward || REWARD_OVERRIDES.get(parsed.titleEn) || fallbackReward(parsed);
}

function fallbackReward(parsed) {
  if (parsed.titleEn === 'Repent Your Sins') return 'Снижение PK-счетчика';
  if (/Path of|Путь /i.test(`${parsed.titleEn} ${parsed.title}`)) return 'Предмет для смены 1-й профессии';
  if (/Trial|Testimony|Test of|Испытание/i.test(`${parsed.titleEn} ${parsed.title}`)) return 'Марка для смены 2-й профессии';
  return 'Награда зависит от версии сервера и будет уточнена после проверки.';
}

async function findExisting(q, slug, parsed) {
  const where = [
    { slug },
    q.legacySlug ? { slug: q.legacySlug } : null,
    { titleEn: parsed.titleEn },
    { title: parsed.title },
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
    const level = parseLevel(parsed.levelRaw);
    const slug = slugify(`${parsed.title} gludin`);
    const existing = DRY_RUN ? null : await findExisting(q, slug, parsed);
    const reward = rewardText(parsed);
    const data = {
      slug,
      chronicle: availabilityInfo.chronicle,
      category: 'quests',
      title: parsed.title,
      titleEn: parsed.titleEn,
      description: `${parsed.title} (${parsed.titleEn}) — прохождение квеста Lineage 2: уровень, NPC, маршрут, монстры и награды.`,
      content: buildContent(q, parsed, availabilityInfo, level),
      image: null,
      levelMin: level.min,
      levelMax: level.max,
      npc: q.npc,
      location: q.location,
      reward,
      race: null,
      repeatable: Boolean(q.repeatable || parsed.repeatable),
      types: questTypes(q, parsed),
      sort: 200 + index,
      publishedAt: availabilityInfo.public ? (existing?.publishedAt ?? new Date()) : null,
    };

    if (DRY_RUN) {
      console.log(`${availabilityInfo.public ? 'PUBLIC' : 'DRAFT'}\t${data.chronicle}\t${existing ? 'update' : 'create'}\t${existing?.slug || data.slug}\t${data.title}\tsteps=${parsed.steps.length}\treward=${data.reward}`);
      if (index === 0) {
        console.log('\n--- SAMPLE CONTENT ---\n');
        console.log(data.content);
        console.log('\n--- END SAMPLE ---\n');
      }
    } else if (existing) {
      await prisma.guide.update({
        where: { id: existing.id },
        data: {
          chronicle: data.chronicle,
          title: data.title,
          titleEn: data.titleEn,
          description: data.description,
          levelMin: data.levelMin,
          levelMax: data.levelMax,
          npc: data.npc,
          location: data.location,
          reward: data.reward,
          repeatable: data.repeatable,
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

  console.log(`Gludin quest seed complete: created=${created}, updated=${updated}, drafted=${drafted}, total=${QUESTS.length}${DRY_RUN ? ' (dry-run)' : ''}`);
}

main()
  .catch(error => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
