import { SessionOptions } from 'iron-session';

export interface SessionData {
  accessToken?: string;
  refreshToken?: string;
  tokenExpiresAt?: number;
  userEmail?: string;
  userName?: string;
}

export const sessionOptions: SessionOptions = {
  password: process.env.SESSION_SECRET || 'complex_password_at_least_32_characters_long_for_iron_session',
  cookieName: 'zoom-bulk-creator-session',
  cookieOptions: {
    secure: process.env.NODE_ENV === 'production',
    httpOnly: true,
    sameSite: 'lax' as const,
  },
};
