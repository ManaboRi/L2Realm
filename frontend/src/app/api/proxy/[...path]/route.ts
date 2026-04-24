import { NextRequest, NextResponse } from 'next/server';

const BACKEND = process.env.BACKEND_URL || 'http://127.0.0.1:4000';

// Пути, которые НЕ должны быть доступны через публичный proxy.
// Webhook ЮКассы должен приходить прямо на backend через nginx
// (nginx отдельным location → backend:4000), иначе X-Forwarded-For
// от клиента можно спуфить.
const BLOCKED_PATHS = new Set<string>([
  'payments/webhook',
]);

async function proxy(req: NextRequest, { params }: { params: Promise<{ path: string[] }> }) {
  const { path } = await params;
  const joined = path.join('/');

  if (BLOCKED_PATHS.has(joined)) {
    return NextResponse.json({ message: 'Not Found' }, { status: 404 });
  }

  const url = new URL(req.url);
  const target = `${BACKEND}/api/${joined}${url.search}`;

  const headers = new Headers(req.headers);
  for (const h of ['host', 'connection', 'keep-alive', 'upgrade', 'proxy-authenticate', 'proxy-authorization', 'te', 'trailer', 'transfer-encoding', 'content-length']) {
    headers.delete(h);
  }

  const init: RequestInit = { method: req.method, headers };
  if (req.method !== 'GET' && req.method !== 'HEAD') {
    const ct = req.headers.get('content-type') ?? '';
    // multipart/form-data (файлы) — пробрасываем как blob, иначе бинарные данные портятся
    init.body = ct.startsWith('multipart/') ? await req.blob() : await req.text();
  }

  const res = await fetch(target, init);
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
