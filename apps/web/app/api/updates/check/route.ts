import { NextResponse, type NextRequest } from 'next/server';

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const platform = searchParams.get('platform') || 'android-tv';
  const backendBase =
    process.env.API_INTERNAL_URL ||
    process.env.BACKEND_API_URL ||
    'http://127.0.0.1:4000/api';
  try {
    const res = await fetch(`${backendBase}/updates/check?platform=${encodeURIComponent(platform)}`, {
      cache: 'no-store',
    });
    if (!res.ok) {
      return NextResponse.json({ updateAvailable: false, latestVersion: '0.1.55' }, { status: res.status });
    }
    const data = await res.json();
    return NextResponse.json(data);
  } catch {
    return NextResponse.json({ updateAvailable: false, latestVersion: '0.1.55' });
  }
}
