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

// icon: 128x128 обрезка по центру.
// banner/article: держим запас под широкие hero-блоки и крупные картинки в статьях.
const SPECS = {
  icon:   { width: 128, height: 128, fit: 'cover'    as const },
  banner: { width: 1920, height: undefined, fit: 'inside' as const, quality: 90 },
  article:{ width: 1920, height: undefined, fit: 'inside' as const, quality: 92 },
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
      .webp({ quality: 'quality' in spec ? spec.quality : 85 })
      .toFile(dest);

    return { url: `/uploads/${filename}` };
  }
}
