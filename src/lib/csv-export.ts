import { MeetingResult } from './types';

function escapeCell(value: string): string {
  if (value.includes(',') || value.includes('"') || value.includes('\n')) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

export function exportResultsCSV(results: MeetingResult[]): void {
  const headers = [
    '번호',
    '구분',
    '일자',
    '시간',
    '강의제목',
    '강사명',
    '이메일',
    '연수대상',
    '연수주제',
    '상태',
    '회의ID',
    '참가링크',
    '비밀번호',
    '충돌여부',
    '에러',
  ];

  const rows = results.map((r, i) => [
    String(i + 1),
    r.meeting.category,
    r.meeting.date,
    `${r.meeting.startTime}-${r.meeting.endTime}`,
    r.meeting.topic,
    r.meeting.speakerName,
    r.meeting.speakerEmail,
    r.meeting.targetAudience,
    r.meeting.lectureTheme,
    r.status === 'success' ? '성공' : r.status === 'error' ? '실패' : '건너뜀',
    r.zoomMeetingId ? String(r.zoomMeetingId) : '',
    r.joinUrl || '',
    r.password || '',
    r.meeting.hasConflict ? '충돌' : '',
    r.error || '',
  ]);

  const csvContent = [headers, ...rows]
    .map((row) => row.map(escapeCell).join(','))
    .join('\n');

  // BOM for Korean Excel support
  const bom = '\ufeff';
  const blob = new Blob([bom + csvContent], { type: 'text/csv;charset=utf-8' });

  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `zoom-meetings-${new Date().toISOString().slice(0, 10)}.csv`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
