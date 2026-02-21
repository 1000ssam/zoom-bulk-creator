import Papa from 'papaparse';
import { ColumnMapping, MappableField, ParsedMeeting, RawCSVData } from './types';

// ── Keyword dictionary for auto-detection ─────────────────────────────────

const FIELD_KEYWORDS: Record<MappableField, string[]> = {
  category:       ['구분', '분류', 'category', '유형', '종류'],
  topic:          ['강의제목', '제목', 'title', 'topic', '강의명', '강좌명'],
  date:           ['일자', '날짜', 'date', '일시', '수업일'],
  time:           ['시간', 'time', '시간대', '교시'],
  speakerName:    ['강사', '활동강사', 'speaker', '강사명', '발표자', '강사성명'],
  speakerEmail:   ['이메일', 'email', '메일', 'e-mail'],
  teacherName:    ['선생님', '담당자', '교사', 'teacher', '성함', '담당교사'],
  targetAudience: ['대상', '연수대상', '참가대상', 'audience', '수강대상'],
  lectureTheme:   ['연수주제', '주제', 'theme', '과목'],
};

// ── Phase 1: Raw CSV parsing ──────────────────────────────────────────────

export function parseCSVRaw(file: File): Promise<RawCSVData> {
  return new Promise((resolve, reject) => {
    Papa.parse(file, {
      header: false,
      skipEmptyLines: true,
      complete: (results) => {
        const allRows = results.data as string[][];
        if (allRows.length < 2) {
          reject(new Error('CSV 파일에 데이터가 없습니다.'));
          return;
        }
        resolve({
          headers: allRows[0].map((h) => h?.trim() || ''),
          rows: allRows.slice(1),
        });
      },
      error: (error) => reject(new Error(`CSV 파싱 오류: ${error.message}`)),
    });
  });
}

// ── Phase 2: Auto-detect column mapping ───────────────────────────────────

export function autoDetectMapping(headers: string[]): ColumnMapping {
  const mapping: ColumnMapping = {
    category: null,
    topic: null,
    speakerName: null,
    speakerEmail: null,
    teacherName: null,
    date: null,
    time: null,
    targetAudience: null,
    lectureTheme: null,
  };

  const lowerHeaders = headers.map((h) => h.toLowerCase().replace(/\s/g, ''));
  const usedIndices = new Set<number>();

  // First pass: exact keyword match (prioritize specificity)
  for (const field of Object.keys(FIELD_KEYWORDS) as MappableField[]) {
    const keywords = FIELD_KEYWORDS[field];
    for (const kw of keywords) {
      const idx = lowerHeaders.findIndex(
        (h, i) => !usedIndices.has(i) && h.includes(kw.toLowerCase().replace(/\s/g, ''))
      );
      if (idx !== -1) {
        mapping[field] = idx;
        usedIndices.add(idx);
        break;
      }
    }
  }

  return mapping;
}

// ── Phase 3: Parse with mapping ───────────────────────────────────────────

export function parseCSVWithMapping(
  rows: string[][],
  mapping: ColumnMapping
): { meetings: ParsedMeeting[]; errors: { row: number; message: string }[] } {
  const meetings: ParsedMeeting[] = [];
  const errors: { row: number; message: string }[] = [];

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    const rowNum = i + 2; // 1-based, +1 for header row

    const getVal = (field: MappableField): string => {
      const idx = mapping[field];
      if (idx === null || idx === undefined) return '';
      return row[idx]?.trim() || '';
    };

    // Skip completely empty rows
    if (row.every((cell) => !cell?.trim())) continue;

    // Required: topic
    const topicRaw = getVal('topic');
    if (!topicRaw) {
      errors.push({ row: rowNum, message: '강의 제목이 비어있습니다' });
      continue;
    }

    // Required: date
    const dateRaw = getVal('date');
    if (!dateRaw) {
      errors.push({ row: rowNum, message: '날짜가 비어있습니다' });
      continue;
    }
    const date = parseDate(dateRaw);
    if (!date) {
      errors.push({ row: rowNum, message: `날짜 파싱 실패: "${dateRaw}"` });
      continue;
    }

    // Required: time
    const timeRaw = getVal('time');
    if (!timeRaw) {
      errors.push({ row: rowNum, message: '시간이 비어있습니다' });
      continue;
    }
    const time = parseTimeRange(timeRaw);
    if (!time) {
      errors.push({ row: rowNum, message: `시간 파싱 실패: "${timeRaw}"` });
      continue;
    }

    // Optional: category
    const categoryRaw = getVal('category').trim();
    let category: '업무특강' | '교과특강' = '업무특강';
    if (categoryRaw === '업무특강' || categoryRaw === '교과특강') {
      category = categoryRaw;
    }

    meetings.push({
      id: crypto.randomUUID(),
      rowIndex: rowNum,
      category,
      topic: topicRaw,
      speakerName: getVal('speakerName'),
      speakerEmail: getVal('speakerEmail'),
      teacherName: getVal('teacherName'),
      targetAudience: getVal('targetAudience'),
      lectureTheme: getVal('lectureTheme'),
      date,
      startTime: time.start,
      endTime: time.end,
      durationMinutes: time.duration,
      startDateTime: `${date}T${time.start}:00`,
      hasConflict: false,
      conflictWith: [],
    });
  }

  return { meetings, errors };
}

// ── Flexible date parser ──────────────────────────────────────────────────

function parseDate(raw: string): string | null {
  const s = raw.trim().replace(/\(.\)/g, '').trim(); // remove "(월)" etc.
  const currentYear = new Date().getFullYear();

  // Pattern 1: YYYY-MM-DD, YYYY.MM.DD, YYYY/M/D, YYYY. M. D (with optional spaces)
  const p1 = s.match(/(\d{4})\s*[.\-/]\s*(\d{1,2})\s*[.\-/]\s*(\d{1,2})/);
  if (p1) {
    return fmt(Number(p1[1]), Number(p1[2]), Number(p1[3]));
  }

  // Pattern 2: YYYYMMDD (8 digits)
  const p2 = s.match(/^(\d{4})(\d{2})(\d{2})$/);
  if (p2) {
    return fmt(Number(p2[1]), Number(p2[2]), Number(p2[3]));
  }

  // Pattern 3: M월 D일 (no year → current year)
  const p3 = s.match(/(\d{1,2})\s*월\s*(\d{1,2})\s*일/);
  if (p3) {
    return fmt(currentYear, Number(p3[1]), Number(p3[2]));
  }

  // Pattern 4: MM-DD, MM/DD, MM.DD (no year)
  const p4 = s.match(/^(\d{1,2})\s*[.\-/]\s*(\d{1,2})$/);
  if (p4) {
    return fmt(currentYear, Number(p4[1]), Number(p4[2]));
  }

  return null;
}

function fmt(y: number, m: number, d: number): string | null {
  if (m < 1 || m > 12 || d < 1 || d > 31) return null;
  return `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
}

// ── Flexible time range parser ────────────────────────────────────────────

function parseTimeRange(
  raw: string
): { start: string; end: string; duration: number } | null {
  const s = raw.trim();

  // Pattern 1: HH:MM-HH:MM or HH:MM~HH:MM (with optional spaces)
  const p1 = s.match(/(\d{1,2}:\d{2})\s*[-~]\s*(\d{1,2}:\d{2})/);
  if (p1) {
    return calcDuration(p1[1], p1[2]);
  }

  // Pattern 2: HH시-HH시 or HH시~HH시
  const p2 = s.match(/(\d{1,2})\s*시\s*[-~]\s*(\d{1,2})\s*시/);
  if (p2) {
    return calcDuration(`${p2[1]}:00`, `${p2[2]}:00`);
  }

  // Pattern 3: HH:MM (single time — assume 1 hour duration)
  const p3 = s.match(/^(\d{1,2}:\d{2})$/);
  if (p3) {
    const [h, m] = p3[1].split(':').map(Number);
    const endH = h + 1;
    return calcDuration(p3[1], `${endH}:${String(m).padStart(2, '0')}`);
  }

  return null;
}

function calcDuration(
  start: string,
  end: string
): { start: string; end: string; duration: number } | null {
  const [sh, sm] = start.split(':').map(Number);
  const [eh, em] = end.split(':').map(Number);
  const duration = eh * 60 + em - (sh * 60 + sm);
  if (duration <= 0) return null;
  // Normalize to HH:MM
  const startNorm = `${String(sh).padStart(2, '0')}:${String(sm).padStart(2, '0')}`;
  const endNorm = `${String(eh).padStart(2, '0')}:${String(em).padStart(2, '0')}`;
  return { start: startNorm, end: endNorm, duration };
}

// ── Legacy wrapper (for backward compatibility if needed) ─────────────────

export function parseCSVFile(file: File): Promise<{
  meetings: ParsedMeeting[];
  errors: { row: number; message: string }[];
}> {
  return new Promise((resolve, reject) => {
    parseCSVRaw(file)
      .then(({ headers, rows }) => {
        const mapping = autoDetectMapping(headers);
        resolve(parseCSVWithMapping(rows, mapping));
      })
      .catch(reject);
  });
}
