import Papa from 'papaparse';
import { ParsedMeeting } from './types';

// Column indices (0-based)
const COL = {
  순번: 0,
  구분: 1,
  선생님성함: 2,
  활동강사명: 3,
  이메일주소: 5,
  일자: 8,
  시간: 9,
  연수대상: 12,
  연수주제: 13,
  강의제목: 17,
} as const;

function parseDate(dateStr: string): string | null {
  // "2026. 2. 23" → "2026-02-23"
  const cleaned = dateStr.trim();
  const match = cleaned.match(/(\d{4})\.\s*(\d{1,2})\.\s*(\d{1,2})/);
  if (!match) return null;
  const [, year, month, day] = match;
  return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
}

function parseTimeRange(
  timeStr: string
): { start: string; end: string; duration: number } | null {
  // "16:00-18:00" or "16:00~18:00" → { start: "16:00", end: "18:00", duration: 120 }
  const match = timeStr.trim().match(/(\d{1,2}:\d{2})\s*[-~]\s*(\d{1,2}:\d{2})/);
  if (!match) return null;
  const [, start, end] = match;
  const [sh, sm] = start.split(':').map(Number);
  const [eh, em] = end.split(':').map(Number);
  const duration = eh * 60 + em - (sh * 60 + sm);
  if (duration <= 0) return null;
  return { start, end, duration };
}

export function parseCSVFile(file: File): Promise<{
  meetings: ParsedMeeting[];
  errors: { row: number; message: string }[];
}> {
  return new Promise((resolve, reject) => {
    Papa.parse(file, {
      header: false,
      skipEmptyLines: true,
      complete: (results) => {
        const meetings: ParsedMeeting[] = [];
        const errors: { row: number; message: string }[] = [];
        const rows = results.data as string[][];

        // Index 0 is the header row (may span multiple lines but PapaParse merges it)
        // Data rows start at index 1
        for (let i = 1; i < rows.length; i++) {
          const row = rows[i];
          const rowNum = i + 1; // 1-based for user display

          // Skip rows without valid category
          const category = row[COL.구분]?.trim();
          if (!category) continue;

          if (category !== '업무특강' && category !== '교과특강') {
            errors.push({ row: rowNum, message: `알 수 없는 구분: "${category}"` });
            continue;
          }

          const dateStr = row[COL.일자]?.trim();
          if (!dateStr) {
            errors.push({ row: rowNum, message: '일자가 비어있습니다' });
            continue;
          }

          const date = parseDate(dateStr);
          if (!date) {
            errors.push({ row: rowNum, message: `날짜 파싱 실패: "${dateStr}"` });
            continue;
          }

          const timeStr = row[COL.시간]?.trim();
          if (!timeStr) {
            errors.push({ row: rowNum, message: '시간이 비어있습니다' });
            continue;
          }

          const time = parseTimeRange(timeStr);
          if (!time) {
            errors.push({ row: rowNum, message: `시간 파싱 실패: "${timeStr}"` });
            continue;
          }

          meetings.push({
            id: crypto.randomUUID(),
            rowIndex: rowNum,
            category: category as '업무특강' | '교과특강',
            topic: row[COL.강의제목]?.trim() || '',
            speakerName: row[COL.활동강사명]?.trim() || '',
            speakerEmail: row[COL.이메일주소]?.trim() || '',
            teacherName: row[COL.선생님성함]?.trim() || '',
            targetAudience: row[COL.연수대상]?.trim() || '',
            lectureTheme: row[COL.연수주제]?.trim() || '',
            date,
            startTime: time.start,
            endTime: time.end,
            durationMinutes: time.duration,
            startDateTime: `${date}T${time.start}:00`,
            hasConflict: false,
            conflictWith: [],
          });
        }

        resolve({ meetings, errors });
      },
      error: (error) => reject(new Error(`CSV 파싱 오류: ${error.message}`)),
    });
  });
}
