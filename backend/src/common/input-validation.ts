import { BadRequestException } from '@nestjs/common';
import { isIP } from 'node:net';
import { z, ZodError } from 'zod';

export const safeText = (min: number, max: number) =>
  z.string().transform(sanitizeText).pipe(z.string().min(min).max(max));

export const safeMarkdownText = (min: number, max: number) =>
  z.string().transform(sanitizeMarkdownText).pipe(z.string().min(min).max(max));

export const optionalSafeText = (max: number) =>
  z.string().transform(sanitizeText).pipe(z.string().max(max)).optional();

export const optionalSafeMarkdownText = (max: number) =>
  z.string().transform(sanitizeMarkdownText).pipe(z.string().max(max)).optional();

export const safeSlug = z
  .string()
  .trim()
  .min(2)
  .max(100)
  .regex(/^[a-z0-9][a-z0-9-]*[a-z0-9]$/i, 'Slug must contain only latin letters, numbers and hyphens');

export const safeUrl = z
  .string()
  .trim()
  .url()
  .refine(value => {
    try {
      const u = new URL(value);
      return u.protocol === 'https:' || u.protocol === 'http:';
    } catch {
      return false;
    }
  }, 'URL must use http or https');

export const safeAssetUrl = z.union([
  safeUrl,
  z
    .string()
    .trim()
    .regex(/^\/(?:uploads|images)\/[A-Za-z0-9._~!$&'()*+,;=:@/%-]+$/, 'Asset URL must start with /uploads/ or /images/'),
]);

export const safeIp = z
  .string()
  .trim()
  .refine(value => isIP(value) > 0, 'Invalid IP address');

export const optionalSafeUrl = z.union([safeUrl, z.literal(''), z.null()]).optional()
  .transform(value => value || null);

export const optionalSafeAssetUrl = z.union([safeAssetUrl, z.literal(''), z.null()]).optional()
  .transform(value => value || null);

export const dateString = z.string().trim().refine(value => {
  const date = new Date(value);
  return !Number.isNaN(date.getTime());
}, 'Invalid date');

export function parseOrThrow<T>(schema: z.ZodType<T>, input: unknown): T {
  const parsed = schema.safeParse(input);
  if (parsed.success) return parsed.data;
  throw new BadRequestException(formatZodError(parsed.error));
}

function formatZodError(error: ZodError): string {
  return error.issues
    .map(issue => `${issue.path.join('.') || 'body'}: ${issue.message}`)
    .join('; ');
}

// Чистит control chars кроме \n (0x0A) и \t (0x09) — переносы строк сохраняются.
// Раньше убивал \n тоже → описания серверов в textarea теряли все переносы
// после сохранения, текст слипался в один абзац. Markdown-санитайзер ниже
// делает почти то же самое, но дополнительно нормализует CRLF и допускает
// до 3 \n подряд (для пустых строк-разделителей в markdown).
function sanitizeText(value: string): string {
  return value
    .replace(/\r\n?/g, '\n')
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, ' ')
    .replace(/<script[\s\S]*?>[\s\S]*?<\/script>/gi, '')
    .replace(/<style[\s\S]*?>[\s\S]*?<\/style>/gi, '')
    .replace(/\son[a-z]+\s*=\s*(['"]).*?\1/gi, '')
    .replace(/\s(href|src)\s*=\s*(['"])\s*javascript:[\s\S]*?\2/gi, '')
    .replace(/javascript:/gi, '')
    .replace(/<\/?[^>]+>/g, '')
    .replace(/[ \t]{2,}/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

function sanitizeMarkdownText(value: string): string {
  return value
    .replace(/\r\n?/g, '\n')
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, ' ')
    .replace(/<script[\s\S]*?>[\s\S]*?<\/script>/gi, '')
    .replace(/<style[\s\S]*?>[\s\S]*?<\/style>/gi, '')
    .replace(/\son[a-z]+\s*=\s*(['"]).*?\1/gi, '')
    .replace(/\s(href|src)\s*=\s*(['"])\s*javascript:[\s\S]*?\2/gi, '')
    .replace(/javascript:/gi, '')
    .replace(/<\/?[^>]+>/g, '')
    .replace(/[ \t]{2,}/g, ' ')
    .replace(/\n{4,}/g, '\n\n\n')
    .trim();
}
