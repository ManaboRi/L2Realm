/**
 * Одноразовый скрипт: пересжимает существующие иконки в /uploads
 * до 96×96 (вместо 256×256 которые были раньше). Сохраняет файл
 * с тем же именем — БД ничего перезаписывать не надо.
 *
 * Запускать на VPS:
 *   docker compose exec backend node /app/dist/scripts/reoptimize-icons.js
 *
 * Дополнительно дампит до/после размеры в консоль для отчёта.
 *
 * Безопасность: бэкапит каждый файл в .bak ПЕРЕД пересжатием.
 * Если что-то пойдёт не так — можно откатить через `mv *.webp.bak *.webp`.
 */
import * as path from 'path';
import * as fs from 'fs';
import * as sharp from 'sharp';
import { PrismaClient } from '@prisma/client';

const UPLOAD_DIR = process.env.UPLOAD_DIR ?? path.join(process.cwd(), 'uploads');
const TARGET_WIDTH = 96;
const TARGET_HEIGHT = 96;
const QUALITY = 78;

async function main() {
  const prisma = new PrismaClient();

  // Собираем все URL'ы иконок из БД (Server.icon)
  const servers = await prisma.server.findMany({ select: { icon: true } });
  const iconUrls = servers
    .map(s => s.icon)
    .filter((u): u is string => typeof u === 'string' && u.startsWith('/uploads/'));

  console.log(`Found ${iconUrls.length} server icons to process`);

  let processed = 0;
  let totalBefore = 0;
  let totalAfter = 0;

  for (const url of iconUrls) {
    const filename = url.replace(/^\/uploads\//, '');
    const filepath = path.join(UPLOAD_DIR, filename);
    if (!fs.existsSync(filepath)) {
      console.warn(`  skip (not found): ${filename}`);
      continue;
    }

    const sizeBefore = fs.statSync(filepath).size;

    // Бэкап
    const backupPath = filepath + '.bak';
    if (!fs.existsSync(backupPath)) {
      fs.copyFileSync(filepath, backupPath);
    }

    // Проверяем что картинка действительно крупнее target — иначе пропускаем
    const meta = await sharp(filepath).metadata();
    if ((meta.width ?? 0) <= TARGET_WIDTH && (meta.height ?? 0) <= TARGET_HEIGHT) {
      console.log(`  skip (already small ${meta.width}x${meta.height}): ${filename}`);
      continue;
    }

    // Пересохраняем через временный файл (sharp не любит читать и писать одновременно)
    const tmpPath = filepath + '.tmp';
    await sharp(backupPath)
      .resize(TARGET_WIDTH, TARGET_HEIGHT, { fit: 'cover', withoutEnlargement: true })
      .webp({ quality: QUALITY })
      .toFile(tmpPath);
    fs.renameSync(tmpPath, filepath);

    const sizeAfter = fs.statSync(filepath).size;
    totalBefore += sizeBefore;
    totalAfter  += sizeAfter;
    processed++;

    console.log(
      `  ${filename}: ${(sizeBefore / 1024).toFixed(1)}KB → ${(sizeAfter / 1024).toFixed(1)}KB ` +
      `(${(meta.width ?? 0)}x${(meta.height ?? 0)} → ${TARGET_WIDTH}x${TARGET_HEIGHT})`,
    );
  }

  console.log('\nДоне.');
  console.log(`Processed: ${processed} icons`);
  console.log(`Total: ${(totalBefore / 1024).toFixed(0)}KB → ${(totalAfter / 1024).toFixed(0)}KB ` +
              `(saved ${((totalBefore - totalAfter) / 1024).toFixed(0)}KB)`);

  await prisma.$disconnect();
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
