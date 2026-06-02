import { NextRequest, NextResponse } from 'next/server';

const BACKEND = process.env.BACKEND_URL || 'http://127.0.0.1:4000';

// Онлайн-оплата удалена — блокировать через прокси больше нечего.
const BLOCKED_PATHS = new Set<string>([]);

async function proxy(req: NextRequest, { params }: { params: Promise<{ path: string[] }> }) {
  const { path } = await params;
  const joined = path.join('/');

  if (BLOCKED_PATHS.has(joined)) {
    return NextResponse.json({ message: 'Not Found' }, { status: 404 });
  }

  const url = new URL(req.url);
  const target = `${BACKEND}/api/${joined}${url.search}`;

  const headers = new Headers();
  for (const h of ['accept', 'authorization', 'content-type', 'cookie', 'x-forwarded-for', 'x-real-ip']) {
    const value = req.headers.get(h);
    if (value) headers.set(h, value);
  }

  const init: RequestInit = { method: req.method, headers };
  if (req.method !== 'GET' && req.method !== 'HEAD') {
    const ct = req.headers.get('content-type') ?? '';
    // multipart/form-data (файлы) — пробрасываем как blob, иначе бинарные данные портятся
    init.body = ct.startsWith('multipart/') ? await req.blob() : await req.text();
  }

  let res: Response;
  try {
    res = await fetch(target, init);
  } catch (error) {
    console.error(`[api/proxy] ${joined}`, error);
    return NextResponse.json({ message: 'Backend proxy failed' }, { status: 502 });
  }
  const body = await res.text();

  return new NextResponse(body, {
    status: res.status,
    headers: { 'content-type': res.headers.get('content-type') || 'application/json' },
  });
}

export const GET = proxy;
export const POST = proxy;
export const PUT = proxy;
export const PATCH = proxy;
export const DELETE = proxy;
