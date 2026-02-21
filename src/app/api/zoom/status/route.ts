import { NextResponse } from 'next/server';
import { getIronSession } from 'iron-session';
import { cookies } from 'next/headers';
import { sessionOptions, SessionData } from '@/lib/session';
import { getValidToken } from '@/lib/zoom-client';

export async function GET() {
  const session = await getIronSession<SessionData>(await cookies(), sessionOptions);
  
  if (!session.accessToken) {
    return NextResponse.json({ loggedIn: false });
  }

  const tokenResult = await getValidToken(session);
  
  if (!tokenResult) {
    // Token expired and refresh failed
    session.destroy();
    return NextResponse.json({ loggedIn: false });
  }

  // Update session if token was refreshed
  if (tokenResult.accessToken !== session.accessToken) {
    session.accessToken = tokenResult.accessToken;
    session.refreshToken = tokenResult.refreshToken;
    session.tokenExpiresAt = tokenResult.expiresAt;
    await session.save();
  }

  return NextResponse.json({
    loggedIn: true,
    email: session.userEmail,
    displayName: session.userName,
  });
}
