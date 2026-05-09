import { NextRequest, NextResponse } from 'next/server';

const BACKEND = process.env.BACKEND_URL || 'http://127.0.0.1:4000';

export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const target = `${BACKEND}/api/vote/check${url.search}`;
  const res = await fetch(target, { cache: 'no-store' });
  const body = await res.text();
  return new NextResponse(body, {
    status: res.status,
    headers: { 'content-type': res.headers.get('content-type') || 'application/json' },
  });
}
