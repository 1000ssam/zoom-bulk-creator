import { NextRequest } from 'next/server';
import { getIronSession } from 'iron-session';
import { cookies } from 'next/headers';
import { sessionOptions, SessionData } from '@/lib/session';
import { getValidToken, createZoomMeeting } from '@/lib/zoom-client';
import { ParsedMeeting, MeetingSettings, MeetingResult } from '@/lib/types';

async function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function POST(request: NextRequest) {
  const session = await getIronSession<SessionData>(await cookies(), sessionOptions);

  if (!session.accessToken) {
    return new Response(JSON.stringify({ error: 'Zoom에 로그인되어 있지 않습니다' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const body = await request.json() as {
    meetings: ParsedMeeting[];
    settings: MeetingSettings;
  };

  const { meetings, settings } = body;

  const stream = new ReadableStream({
    async start(controller) {
      const encoder = new TextEncoder();

      function send(data: object) {
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`));
      }

      const results: MeetingResult[] = [];

      // Get/refresh token once before batch
      let currentToken = session.accessToken!;
      let currentRefreshToken = session.refreshToken!;
      let tokenExpiresAt = session.tokenExpiresAt!;

      for (let i = 0; i < meetings.length; i++) {
        const meeting = meetings[i];

        // Auto-refresh token if near expiry (5-minute buffer)
        if (Date.now() >= tokenExpiresAt - 300_000) {
          try {
            const tokenResult = await getValidToken({
              accessToken: currentToken,
              refreshToken: currentRefreshToken,
              tokenExpiresAt,
            });
            if (tokenResult) {
              currentToken = tokenResult.accessToken;
              currentRefreshToken = tokenResult.refreshToken;
              tokenExpiresAt = tokenResult.expiresAt;
            } else {
              send({ type: 'error', message: '토큰 갱신에 실패했습니다. 다시 로그인해주세요.' });
              controller.close();
              return;
            }
          } catch {
            send({ type: 'error', message: '토큰 갱신에 실패했습니다. 다시 로그인해주세요.' });
            controller.close();
            return;
          }
        }

        try {
          const agendaParts = [];
          if (meeting.speakerName) agendaParts.push(`강사: ${meeting.speakerName}`);
          if (meeting.targetAudience) agendaParts.push(`대상: ${meeting.targetAudience}`);
          if (meeting.lectureTheme) agendaParts.push(`주제: ${meeting.lectureTheme}`);

          const zoom = await createZoomMeeting(currentToken, {
            topic: meeting.topic || `${meeting.category} - ${meeting.speakerName}`,
            startTime: meeting.startDateTime,
            duration: meeting.durationMinutes,
            agenda: agendaParts.join('\n'),
            use_pmi: settings.use_pmi,
            settings: {
              host_video: settings.host_video,
              participant_video: settings.participant_video,
              join_before_host: settings.join_before_host,
              waiting_room: settings.waiting_room,
              audio: settings.audio,
              auto_recording: settings.auto_recording,
              alternative_hosts: settings.alternative_hosts,
            },
            password: settings.password || undefined,
          });

          const result: MeetingResult = {
            meeting,
            status: 'success',
            zoomMeetingId: zoom.id,
            joinUrl: zoom.join_url,
            startUrl: zoom.start_url,
            password: zoom.password,
          };
          results.push(result);
          send({ type: 'progress', index: i, total: meetings.length, result });
        } catch (error) {
          const result: MeetingResult = {
            meeting,
            status: 'error',
            error: error instanceof Error ? error.message : '알 수 없는 오류',
          };
          results.push(result);
          send({ type: 'progress', index: i, total: meetings.length, result });
        }

        // Rate limit buffer: 300ms between requests
        if (i < meetings.length - 1) {
          await sleep(300);
        }
      }

      const successCount = results.filter((r) => r.status === 'success').length;
      const errorCount = results.filter((r) => r.status === 'error').length;

      send({
        type: 'complete',
        results,
        summary: {
          total: meetings.length,
          success: successCount,
          error: errorCount,
        },
      });

      controller.close();
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive',
    },
  });
}
