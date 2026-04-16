/**
 * Миграция серверов из старого статичного сайта
 * Запуск: npm run migrate:servers
 */
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const VALID_TYPES = ['pvp', 'pve', 'new', 'featured'];

function cleanTypes(types: string[]): string[] {
  return types.filter(t => VALID_TYPES.includes(t));
}

const SERVERS = [
  {
    id:'L2meteora', abbr:'MT', name:'L2meteora',
    url:'https://l2meteora.com/', chronicle:'Essence', rates:'x50', rateNum:50,
    donate:'cosmetic', type:['pvp','featured'], vip:true,
    openedDate:'2026-03-27', country:'RU',
    icon:'https://i.imgur.com/tTP3EfR.jpeg', banner:'https://i.imgur.com/YjTT2uv.png',
    discord:'https://discord.com/invite/Bg2vg6fyCx', telegram:'https://t.me/l2promo', vk:'',
    shortDesc:'🔥 PvP-сервер Essence x50. Авто-скиллы, Telegram-бот, уникальные рейды.',
    fullDesc:'## ⚔️ Meteora SAMURAI x50\n\nСвежий PvP-проект на хрониках **Essence**, стартовавший 27 марта 2026 года. Динамичная прокачка и продуманный баланс для массовых сражений.\n\n## 🌍 Особенности сервера\n- Уникальная экономика: система "красных слотов" и альтернативная валюта L Coin\n- PvE для кланов: Мировой Валакас и Mid War боссы\n- Автоизучение всех скиллов\n- Управление персонажем через Telegram-бота\n\n## ⚔️ Рейты\n- EXP: x50-x1 | SP: x15 | Drop/Spoil: x1\n- Premium: +50% к опыту, дропу и Adena\n- Ограничение: 1 окно с 1 ПК\n\n## 💎 Монетизация\nДонат только косметический, не влияет на баланс.',
  },
  {
    id:'4game-essence', abbr:'4GE', name:'Lineage 2 Essence RUOFF',
    url:'https://ru.4game.ru/lineage2essence/', chronicle:'Essence', rates:'x1', rateNum:1,
    donate:'cosmetic', type:['pvp'], vip:false,
    openedDate:'2019-04-23', country:'RU',
    icon:'https://i.imgur.com/AuixBo9.png', banner:'https://i.imgur.com/XuMsnv2.png',
    discord:'https://discord.com/invite/l2essence', telegram:'https://t.me/Lineage2Russia',
    vk:'https://vk.com/lineage2official', youtube:'https://www.youtube.com/@Lineage2Russia/featured',
    shortDesc:'Официальный сервер с быстрой прокачкой и упором на PvP. Автобой, самодостаточные классы, битвы за боссов.',
    fullDesc:'## ✨ Lineage 2 Essence — Официальный RUOFF\n\nОфициальная версия легендарной MMORPG с фокусом на динамичный PvP и комфортную одиночную игру.\n\n## 🌟 Главные особенности\n- Ускоренная прокачка: автобой и автоматическое использование расходников\n- Самодостаточные классы: каждый класс эффективен в одиночке\n- Олимпиада с еженедельным циклом\n- Массовые сражения за эпических боссов\n\n## 📜 Особенности версии Essence\n- Упрощённая экономика: снаряжение покупается за золото с монстров\n- Уникальные классы только в этой версии\n- Межсерверные локации и торговля\n\n## 💎 Монетизация\nFree-to-play. Есть донат — по мнению части сообщества может давать преимущества в PvP.',
  },
  {
    id:'eglobal', abbr:'UE4', name:'E-Global LU4',
    url:'https://lu4.org/', chronicle:'Interlude', rates:'x1', rateNum:1,
    donate:'cosmetic', type:['pvp','featured'], vip:false,
    openedDate:'2025-03-11', country:'RU',
    icon:'https://i.imgur.com/G0pSUOj.png', banner:'https://i.imgur.com/caeRu51.png',
    discord:'https://discord.com/invite/8ABFFTbRtR', telegram:'https://t.me/diary_of_shilen', vk:'',
    shortDesc:'Lineage 2 на Unreal Engine 4. Классика Interlude с графикой нового поколения.',
    fullDesc:'## ✨ Lineage 2 LU4 — Unreal Engine 4\n\nОфициальный ремастер легендарной MMORPG на движке Unreal Engine 4. Разработчики переписали игру с нуля: многопоточный клиент, динамическое освещение, реалистичная физика.\n\n## 🎮 Особенности\n- Высокая стабильность FPS даже в массовых PvP с 1500+ участниками\n- Полная переработка моделей персонажей, оружия, брони\n- Следы на снегу, реалистичная вода, динамические тени\n- Огромный открытый мир без подгрузок\n\n## 👥 Статус\nОткрытая Pre-Alpha, онлайн более 3800 человек. Без вайпов.\n\n## ⚔️ Тип\nPvP с упором на массовые сражения, осады замков, эпических боссов. Рейты x1.\n\n## 🔧 Минимальные требования\nIntel Core i5-8400 / AMD Ryzen 5 1600, 16 ГБ RAM, NVIDIA GTX 1060.',
  },
  {
    id:'scryde', abbr:'SCR', name:'Scryde',
    url:'https://ru.scryde.game', chronicle:'High Five', rates:'x1–x1000', rateNum:1,
    donate:'cosmetic', type:['pvp','featured'], vip:false,
    openedDate:'2014-11-26', country:'RU',
    icon:'https://i.imgur.com/6KdNRmt.png', banner:'https://i.imgur.com/9boLFzL.png',
    discord:'https://discord.com/invite/scryde', telegram:'https://t.me/scryde',
    vk:'https://vk.com/thisisorion',
    shortDesc:'Легендарный проект — 4 сервера на High Five: хардкорный x1, лоу-рейт x2, флагманский x50 и PvP x1000. Без п2в, пиковый онлайн 16 000.',
    fullDesc:'## ✨ Scryde — 4 сервера на High Five\n\nНезависимая MMORPG, развивается более 11 лет. Сразу **четыре рейтовых варианта** на хрониках High Five.\n\n## 📌 Все серверы объединяет\n- Без доната с преимуществами (премиум только для комфорта)\n- Уникальные квесты NPC Rin, система Gear Score\n- Регулярные ивенты: TvT, CtF, Арена Испытаний\n- Пиковый онлайн до 16 000 человек\n\n## 🎮 Серверы\n- **x1 Хардкор** — стадийный, каждая вещь на вес золота\n- **x2 Лоу-рейт** — комфортная прокачка с друзьями\n- **x50 Флагман PvP** — 8 лет онлайн, биг-вар 1000+ игроков\n- **x1000 Ultra PvP** — мгновенный старт, экипировка в ALT+B',
  },
  {
    id:'euro-pvp', abbr:'EUR', name:'Euro-PvP',
    url:'https://euro-pvp.net/', chronicle:'Interlude', rates:'x100–x1200', rateNum:100,
    donate:'cosmetic', type:['pvp','featured'], vip:false,
    openedDate:'2025-03-11', country:'RU',
    icon:'https://i.imgur.com/D6FNAoP.jpeg', banner:'https://i.imgur.com/vp3bHkN.png',
    discord:'', telegram:'https://t.me/euro_pvp',
    vk:'https://vk.com/europvp_vk', youtube:'https://www.youtube.com/channel/UCIjcIH8BdEH4iHgwBrWXEug',
    shortDesc:'⚔️ Легендарный PvP-проект на хрониках Interlude с рейтами x100 и x1200.',
    fullDesc:'## ✨ Euro-PvP — два сервера Interlude\n\nОдин из самых известных PvP-проектов на хрониках Interlude. Огромный онлайн, честная монетизация.\n\n## 📌 Что объединяет оба сервера\n- Хроники **Interlude** — классика, любимая миллионами\n- Донат только косметический\n- Более 3000+ игроков онлайн\n- Регулярные турниры и PvP-ивенты\n\n## 🎯 Сервер x100 (Interlude Craft-PvP)\n- Рейты: x100\n- Огромный онлайн (1500+ игроков), стабильная работа без вайпов\n\n## ⚡ Сервер x1200 (Interlude Classic-PvP)\n- Рейты: x1200\n- Моментальный вход в PvP, стартовый бонус для новичков, онлайн 2600+',
  },
  {
    id:'forceplay', abbr:'FP', name:'ForcePlay',
    url:'https://forceplay.org/ru', chronicle:'Interlude', rates:'x25–x1200', rateNum:25,
    donate:'cosmetic', type:['pvp','featured'], vip:false,
    openedDate:'2025-03-11', country:'RU',
    icon:'https://i.imgur.com/iGSf3Zb.png', banner:'https://i.imgur.com/efzyFOD.png',
    discord:'https://discord.com/invite/forceplay', telegram:'https://t.me/forceplay',
    vk:'', youtube:'https://www.youtube.com/@forceplayl2',
    shortDesc:'⚡ Легендарный PvP-проект на хрониках Interlude с рейтами x25 и x1200. Тысячи игроков, без вайпов.',
    fullDesc:'## ✨ ForcePlay — два сервера Interlude\n\nОдин из старейших PvP-проектов на хрониках Interlude, работает с 2019 года, 32 успешных запуска.\n\n## 📌 Что объединяет\n- Хроники **Interlude**\n- Вечные сервера — без вайпов\n- Регулярные турниры 1x1 и 3x3\n- PvP-ивенты и массовые сражения\n\n## 🎯 Сервер x25 [NEW]\n- Рейты: x25\n- Статус: Запуск 1-го Мая 2026\n\n## ⚡ Сервер x1200 [OLD]\n- Рейты: EXP/SP x1200, Adena x1000\n- Открыт: 6 февраля 2026',
  },
  {
    id:'thebattle', abbr:'TBC', name:'TheBattle.club',
    url:'https://thebattle.club/ru', chronicle:'High Five', rates:'x15–x100', rateNum:15,
    donate:'cosmetic', type:['pvp','featured'], vip:false,
    openedDate:'2016-11-30', country:'RU',
    icon:'https://i.imgur.com/2KcJcl8.png', banner:'https://i.imgur.com/Mn1841g.png',
    discord:'https://discord.gg/fPZbfus', telegram:'https://t.me/thebattleclub', vk:'',
    shortDesc:'🏆 Легендарный PvP-проект на хрониках High Five с рейтами от x15 до x100, без вайпов.',
    fullDesc:'## ✨ TheBattle.club — 10 лет на High Five\n\nОдин из старейших и самых уважаемых PvP-проектов на хрониках High Five. Основан в 2016 году, 57 сезонов, ТОП-3 High-Five проектов рунета.\n\n## 📌 Особенности\n- Хроники **High Five** — вершина классики\n- Донат только косметический\n- Без вайпов — достижения остаются\n- Встроенный автофарм (до 6 часов)\n- Система коллекций и улучшенная клановая система\n\n## 🎯 Retro x15 (стадийный)\n- Рейты: EXP Dynamic x15-x1 | SP x30 | Adena x15\n- Заточка 16/12/12, Mana potion 1500 MP\n\n## ⚡ Eternal x100\n- Рейты: x50–x100\n- Огромный онлайн (1000+ игроков)',
  },
  {
    id:'moon-land', abbr:'ML', name:'Moon-Land',
    url:'https://moon-land.com/ru', chronicle:'Interlude', rates:'x10000', rateNum:10000,
    donate:'cosmetic', type:['pvp','featured'], vip:false,
    openedDate:'2023-11-04', country:'RU',
    icon:'https://i.imgur.com/ShRe55Q.png', banner:'https://i.imgur.com/kqJXLI3.png',
    discord:'https://discord.com/invite/eWYUFyADyx', telegram:'https://t.me/moonland_net', vk:'',
    shortDesc:'🌙 PvP-сервер Interlude x10000. Старт на 80 уровне, 99 слотов баффа, ИИ у мобов, безлимитная заточка.',
    fullDesc:'## ✨ Moon-Land — NoLimits проект\n\nРаботает без вайпов с 4 ноября 2023 года. Уникальная смесь классической механики Interlude и современных решений.\n\n## 📌 Ключевые особенности\n- Серверная часть Interlude + клиент Classic\n- Старт сразу на 80 уровне в S-grade экипировке\n- Максимальный уровень заточки не ограничен\n- 99 слотов баффов, сохраняются после смерти\n\n## 🌍 Контент\n- 15+ новых фарм-зон и подземных лабиринтов\n- Рейд-боссы с искусственным интеллектом\n- 300 скинов оружия, 50 костюмов\n- Встроенный бесплатный ACP бот',
  },
  {
    id:'flauron', abbr:'FL', name:'Flauron',
    url:'https://flauron.com/ru', chronicle:'Interlude', rates:'x1–x10', rateNum:1,
    donate:'cosmetic', type:['pvp'], vip:false,
    openedDate:'2026-04-11', country:'RU',
    icon:'https://i.imgur.com/TZiiN5I.png', banner:'https://i.imgur.com/zzzLECd.png',
    discord:'https://discord.com/invite/flauron', telegram:'https://t.me/flauron', vk:'',
    shortDesc:'🏰 Комплекс серверов Interlude на современном клиенте с автофармом и системой заданий.',
    fullDesc:'## ✨ Flauron — Interlude на современном клиенте\n\nПринципиально новый взгляд на хроники Interlude. Классический геймплей на высокопроизводительном современном клиенте.\n\n## 📌 Ключевые особенности\n- Современный клиент (не движок 2006 года)\n- Система заданий: каждый вход даёт ощутимый результат\n- Продвинутый Auto-Farm из Essence\n\n## 🎮 Три сервера\n- **NOVA x1** — хардкорный классический сервер, старт 11 апреля 2026\n- **REVOLUTION x10** — динамичный x10\n- **NOSTALGIA x1** — для ценителей аутентичного геймплея',
  },
];

async function main() {
  console.log('🚀 Импортируем серверы из старого сайта...\n');

  let created = 0;
  let skipped = 0;

  for (const s of SERVERS) {
    const types = cleanTypes(s.type);
    try {
      await prisma.server.upsert({
        where:  { id: s.id },
        create: {
          id:        s.id,
          name:      s.name,
          abbr:      s.abbr,
          url:       s.url,
          chronicle: s.chronicle,
          rates:     s.rates,
          rateNum:   s.rateNum,
          donate:    s.donate,
          type:      types,
          vip:       s.vip,
          openedDate: s.openedDate ? new Date(s.openedDate) : undefined,
          country:   s.country,
          icon:      s.icon || undefined,
          banner:    s.banner || undefined,
          discord:   s.discord || undefined,
          telegram:  s.telegram || undefined,
          vk:        s.vk || undefined,
          youtube:   (s as any).youtube || undefined,
          shortDesc: s.shortDesc,
          fullDesc:  s.fullDesc,
          rating:    0,
          ratingCount: 0,
        },
        update: {
          name:      s.name,
          url:       s.url,
          chronicle: s.chronicle,
          rates:     s.rates,
          rateNum:   s.rateNum,
          donate:    s.donate,
          type:      types,
          vip:       s.vip,
          icon:      s.icon || undefined,
          banner:    s.banner || undefined,
          shortDesc: s.shortDesc,
          fullDesc:  s.fullDesc,
        },
      });

      // VIP подписка для L2meteora
      if (s.id === 'L2meteora') {
        await prisma.subscription.upsert({
          where:  { serverId: s.id },
          create: { serverId: s.id, plan: 'VIP', endDate: new Date(Date.now() + 30 * 86400000), paid: true },
          update: {},
        });
      }

      console.log(`✅ ${s.name}`);
      created++;
    } catch (e: any) {
      console.log(`❌ ${s.name}: ${e.message}`);
      skipped++;
    }
  }

  console.log(`\n✨ Готово! Добавлено/обновлено: ${created}, ошибок: ${skipped}`);
}

main()
  .catch(e => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
