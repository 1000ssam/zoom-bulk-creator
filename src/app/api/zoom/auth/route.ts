import { NextResponse } from 'next/server';
import { getZoomAuthUrl } from '@/lib/zoom-client';

export async function GET() {
  const authUrl = getZoomAuthUrl();
  return NextResponse.redirect(authUrl);
}
