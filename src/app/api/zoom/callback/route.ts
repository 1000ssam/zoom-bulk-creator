import { NextRequest, NextResponse } from 'next/server';
import { getIronSession } from 'iron-session';
import { cookies } from 'next/headers';
import { sessionOptions, SessionData } from '@/lib/session';
import { exchangeCodeForTokens, getZoomUser } from '@/lib/zoom-client';

export async function GET(request: NextRequest) {
  const code = request.nextUrl.searchParams.get('code');
  
  if (!code) {
    return NextResponse.redirect(new URL('/?error=no_code', process.env.NEXT_PUBLIC_BASE_URL!));
  }

  try {
    const tokens = await exchangeCodeForTokens(code);
    const user = await getZoomUser(tokens.accessToken);
    
    const session = await getIronSession<SessionData>(await cookies(), sessionOptions);
    session.accessToken = tokens.accessToken;
    session.refreshToken = tokens.refreshToken;
    session.tokenExpiresAt = Date.now() + tokens.expiresIn * 1000;
    session.userEmail = user.email;
    session.userName = user.display_name;
    await session.save();

    return NextResponse.redirect(new URL('/?zoom=connected', process.env.NEXT_PUBLIC_BASE_URL!));
  } catch (error) {
    console.error('OAuth callback error:', error);
    return NextResponse.redirect(
      new URL(`/?error=oauth_failed`, process.env.NEXT_PUBLIC_BASE_URL!)
    );
  }
}
