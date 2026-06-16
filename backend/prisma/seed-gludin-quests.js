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
