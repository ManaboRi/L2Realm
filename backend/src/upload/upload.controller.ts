import {
  Controller, Post, UploadedFile, UseGuards, UseInterceptors,
  BadRequestException, Query,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { AuthGuard } from '@nestjs/passport';
import { diskStorage, memoryStorage } from 'multer';
import * as sharp from 'sharp';
import * as path from 'path';
import * as fs from 'fs';
import { randomUUID } from 'crypto';
import { Roles, RolesGuard } from '../auth/roles.guard';

const UPLOAD_DIR = process.env.UPLOAD_DIR ?? path.join(process.cwd(), 'uploads');

// icon: 96×96 обрезка по центру — на главной отображается 48×48, 96 покрывает
// retina (2x). Раньше было 256×256 — на странице с 25 проектами это были
// мегабайты лишних пикселей (LCP-блокер).
// banner: до 1200px ширины, сохраняем пропорции.
const SPECS = {
  icon:   { width: 96, height: 96, fit: 'cover'    as const },
  banner: { width: 1200, height: undefined, fit: 'inside' as const },
};

@Controller('upload')
@UseGuards(AuthGuard('jwt'), RolesGuard)
@Roles('ADMIN')
export class UploadController {

  @Post()
  @UseInterceptors(FileInterceptor('file', {
    storage: memoryStorage(),
    limits: { fileSize: 8 * 1024 * 1024 },
    fileFilter: (_req, file, cb) => {
      if (!file.mimetype.startsWith('image/')) {
        return cb(new BadRequestException('Только изображения'), false);
      }
      cb(null, true);
    },
  }))
  async upload(
    @UploadedFile() file: Express.Multer.File,
    @Query('type') type: string,
  ) {
    if (!file) throw new BadRequestException('Файл не передан');

    const spec = SPECS[type as keyof typeof SPECS] ?? SPECS.icon;

    if (!fs.existsSync(UPLOAD_DIR)) {
      fs.mkdirSync(UPLOAD_DIR, { recursive: true });
    }

    const filename = `${randomUUID()}.webp`;
    const dest     = path.join(UPLOAD_DIR, filename);

    await sharp(file.buffer)
      .resize(spec.width, spec.height, { fit: spec.fit, withoutEnlargement: true })
      .webp({ quality: type === 'banner' ? 80 : 78 })
      .toFile(dest);

    return { url: `/uploads/${filename}` };
  }
}
