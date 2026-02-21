// ── Column Mapping ──────────────────────────────────────────────────────────

export type MappableField =
  | 'category' | 'topic' | 'speakerName' | 'speakerEmail'
  | 'teacherName' | 'date' | 'time' | 'targetAudience' | 'lectureTheme';

export type ColumnMapping = Record<MappableField, number | null>;

export interface RawCSVData {
  headers: string[];
  rows: string[][];
}

export const FIELD_META: Record<MappableField, { label: string; required: boolean }> = {
  topic:          { label: '강의 제목',  required: true },
  date:           { label: '날짜',       required: true },
  time:           { label: '시간',       required: true },
  category:       { label: '구분',       required: false },
  speakerName:    { label: '강사명',     required: false },
  speakerEmail:   { label: '이메일',     required: false },
  teacherName:    { label: '담당 교사',  required: false },
  targetAudience: { label: '연수 대상',  required: false },
  lectureTheme:   { label: '연수 주제',  required: false },
};

// ── Parsed Meeting ──────────────────────────────────────────────────────────

// Parsed and validated meeting data
export interface ParsedMeeting {
  id: string;
  rowIndex: number;
  category: '업무특강' | '교과특강';
  topic: string;
  speakerName: string;
  speakerEmail: string;
  teacherName: string;
  targetAudience: string;
  lectureTheme: string;
  date: string;           // ISO: "2026-02-23"
  startTime: string;      // "16:00"
  endTime: string;        // "18:00"
  durationMinutes: number;
  startDateTime: string;  // "2026-02-23T16:00:00"
  hasConflict: boolean;
  conflictWith?: number[];
}

export interface ConflictGroup {
  category: '업무특강' | '교과특강';
  date: string;
  timeSlot: string;
  rows: number[];
}

export interface MeetingSettings {
  use_pmi: boolean;
  password: string;
  host_video: boolean;
  participant_video: boolean;
  join_before_host: boolean;
  waiting_room: boolean;
  audio: 'both' | 'voip' | 'telephony';
  auto_recording: 'none' | 'cloud' | 'local';
  alternative_hosts: string;
}

export const DEFAULT_MEETING_SETTINGS: MeetingSettings = {
  use_pmi: false,
  password: '',
  host_video: false,
  participant_video: false,
  join_before_host: true,
  waiting_room: false,
  audio: 'both',
  auto_recording: 'none',
  alternative_hosts: '',
};

export interface MeetingResult {
  meeting: ParsedMeeting;
  status: 'success' | 'error' | 'skipped';
  zoomMeetingId?: number;
  joinUrl?: string;
  startUrl?: string;
  password?: string;
  error?: string;
}

export type AppStep = 'upload' | 'mapping' | 'preview' | 'settings' | 'creating' | 'results';

export interface ZoomStatus {
  loggedIn: boolean;
  email?: string;
  displayName?: string;
}
