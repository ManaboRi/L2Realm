/**
 * Seed — первоначальное наполнение БД
 * Запуск: npm run prisma:seed
 */
import { PrismaClient, Role } from '@prisma/client';
import * as bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seed: начинаем наполнение базы данных...');

  // ── Создаём admin пользователя ───────────────
  const adminEmail = process.env.ADMIN_EMAIL || 'admin@l2realm.ru';
  const adminPass  = process.env.ADMIN_PASS  || 'L2Realm_Admin_2026';

  const exists = await prisma.user.findUnique({ where: { email: adminEmail } });
  if (!exists) {
    await prisma.user.create({
      data: {
        email:    adminEmail,
        password: await bcrypt.hash(adminPass, 12),
        name:     'Администратор',
        role:     Role.ADMIN,
      },
    });
    console.log(`✅ Admin создан: ${adminEmail} / ${adminPass}`);
    console.log('   ⚠️  Смени пароль после первого входа!');
  } else {
    console.log('ℹ️  Admin уже существует');
  }

  // ── Тестовый сервер ──────────────────────────
  const testServer = await prisma.server.upsert({
    where: { id: 'L2meteora' },
    create: {
      id:        'L2meteora',
      name:      'L2meteora',
      abbr:      'MT',
      url:       'https://l2meteora.com/',
      chronicle: 'Essence',
      rates:     'x50',
      rateNum:   50,
      donate:    'cosmetic',
      type:      ['pvp', 'featured'],
      vip:       true,
      openedDate: new Date('2026-03-27'),
      country:   'RU',
      icon:      'https://i.imgur.com/tTP3EfR.jpeg',
      banner:    'https://i.imgur.com/YjTT2uv.png',
      discord:   'https://discord.com/invite/Bg2vg6fyCx',
      telegram:  'https://t.me/l2promo',
      shortDesc: 'Новый PvP сервер с уникальным контентом',
      fullDesc:  '## ⚔️ PvP сервер\nУникальный геймплей на хронике Essence.\n\n## 🎯 Особенности\n- Честная игра без Pay-to-Win\n- Активные ГМ-события\n- Рейты x50',
    },
    update: {},
  });

  // Создаём VIP подписку для тестового сервера
  await prisma.subscription.upsert({
    where:  { serverId: testServer.id },
    create: {
      serverId:  testServer.id,
      plan:      'VIP',
      endDate:   new Date(Date.now() + 30 * 86400000),
      paid:      true,
    },
    update: {},
  });

  console.log(`✅ Тестовый сервер создан: ${testServer.name}`);
  console.log('\n✨ Seed завершён!\n');
}

main()
  .catch(e => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
