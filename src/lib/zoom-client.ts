import { SessionData } from './session';

const ZOOM_OAUTH_URL = 'https://zoom.us/oauth';
const ZOOM_API_URL = 'https://api.zoom.us/v2';

export function getZoomAuthUrl(): string {
  const params = new URLSearchParams({
    response_type: 'code',
    client_id: process.env.ZOOM_CLIENT_ID!,
    redirect_uri: `${process.env.NEXT_PUBLIC_BASE_URL}/api/zoom/callback`,
  });
  return `${ZOOM_OAUTH_URL}/authorize?${params.toString()}`;
}

export async function exchangeCodeForTokens(code: string): Promise<{
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
}> {
  const credentials = Buffer.from(
    `${process.env.ZOOM_CLIENT_ID}:${process.env.ZOOM_CLIENT_SECRET}`
  ).toString('base64');

  const response = await fetch(`${ZOOM_OAUTH_URL}/token`, {
    method: 'POST',
    headers: {
      Authorization: `Basic ${credentials}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({
      grant_type: 'authorization_code',
      code,
      redirect_uri: `${process.env.NEXT_PUBLIC_BASE_URL}/api/zoom/callback`,
    }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(`Token exchange failed: ${error.reason || response.status}`);
  }

  const data = await response.json();
  return {
    accessToken: data.access_token,
    refreshToken: data.refresh_token,
    expiresIn: data.expires_in,
  };
}

export async function refreshAccessToken(refreshToken: string): Promise<{
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
}> {
  const credentials = Buffer.from(
    `${process.env.ZOOM_CLIENT_ID}:${process.env.ZOOM_CLIENT_SECRET}`
  ).toString('base64');

  const response = await fetch(`${ZOOM_OAUTH_URL}/token`, {
    method: 'POST',
    headers: {
      Authorization: `Basic ${credentials}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({
      grant_type: 'refresh_token',
      refresh_token: refreshToken,
    }),
  });

  if (!response.ok) {
    throw new Error(`Token refresh failed: ${response.status}`);
  }

  const data = await response.json();
  return {
    accessToken: data.access_token,
    refreshToken: data.refresh_token,
    expiresIn: data.expires_in,
  };
}

export async function getValidToken(session: SessionData): Promise<{
  accessToken: string;
  refreshToken: string;
  expiresAt: number;
} | null> {
  if (!session.accessToken || !session.refreshToken) return null;

  // If token is still valid (with 5-minute buffer), return as-is
  if (session.tokenExpiresAt && Date.now() < session.tokenExpiresAt - 300_000) {
    return {
      accessToken: session.accessToken,
      refreshToken: session.refreshToken,
      expiresAt: session.tokenExpiresAt,
    };
  }

  // Refresh the token
  try {
    const tokens = await refreshAccessToken(session.refreshToken);
    return {
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
      expiresAt: Date.now() + tokens.expiresIn * 1000,
    };
  } catch {
    return null;
  }
}

export async function getZoomUser(accessToken: string): Promise<{
  email: string;
  display_name: string;
}> {
  const response = await fetch(`${ZOOM_API_URL}/users/me`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  if (!response.ok) {
    throw new Error(`Failed to get user info: ${response.status}`);
  }

  const data = await response.json();
  return { email: data.email, display_name: data.display_name || data.first_name || '' };
}

export interface CreateMeetingParams {
  topic: string;
  startTime: string;  // ISO without timezone: "2026-02-23T16:00:00"
  duration: number;   // minutes
  agenda?: string;
  use_pmi?: boolean;
  settings: {
    host_video: boolean;
    participant_video: boolean;
    join_before_host: boolean;
    waiting_room: boolean;
    audio: string;
    auto_recording: string;
    alternative_hosts: string;
  };
  password?: string;
}

export async function createZoomMeeting(
  accessToken: string,
  params: CreateMeetingParams
): Promise<{
  id: number;
  join_url: string;
  start_url: string;
  password: string;
}> {
  const body: Record<string, unknown> = {
    topic: params.topic,
    type: 2,  // scheduled meeting
    start_time: params.startTime,
    duration: params.duration,
    timezone: 'Asia/Seoul',
    settings: {
      ...params.settings,
      use_pmi: !!params.use_pmi,
    },
  };

  if (params.agenda) body.agenda = params.agenda;
  if (params.password) body.password = params.password;

  const response = await fetch(`${ZOOM_API_URL}/users/me/meetings`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error.message || `Zoom API error: ${response.status}`);
  }

  const data = await response.json();
  return {
    id: data.id,
    join_url: data.join_url,
    start_url: data.start_url,
    password: data.password || '',
  };
}
