import { revalidatePath } from 'next/cache';
import { NextResponse } from 'next/server';

const BACKEND = process.env.BACKEND_URL || 'http://localhost:4000';

// Защищённый эндпоинт для админки: после save/delete статьи сбрасываем
// SSR-кеш страниц блога. Авторизация — через JWT, проверяемый бэкендом
// (он же говорит role). Если не ADMIN — отказ.
export async function POST(req: Request) {
  let body: { slug?: string; token?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'bad request' }, { status: 400 });
  }

  const { slug, token } = body;
  if (!token) return NextResponse.json({ error: 'no token' }, { status: 401 });

  // Спрашиваем backend кто это и какая роль
  let me: { role?: string } | null = null;
  try {
    const meRes = await fetch(`${BACKEND}/api/auth/me`, {
      headers: { Authorization: `Bearer ${token}` },
      cache: 'no-store',
    });
    if (!meRes.ok) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
    me = await meRes.json();
  } catch {
    return NextResponse.json({ error: 'auth failed' }, { status: 502 });
  }
  if (me?.role !== 'ADMIN') {
    return NextResponse.json({ error: 'forbidden' }, { status: 403 });
  }

  revalidatePath('/blog');
  if (slug) revalidatePath(`/blog/${slug}`);
  revalidatePath('/sitemap.xml');

  return NextResponse.json({ ok: true });
}
