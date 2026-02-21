// CSV row parsed from file
export interface CSVLectureRow {
  순번: number;
  구분: '업무특강' | '교과특강';
  선생님성함: string;
  활동강사명: string;
  이메일주소: string;
  일자: string;       // "2026. 2. 23"
  시간: string;       // "16:00-18:00"
  연수대상: string;
  연수주제: string;
  강의제목: string;
}

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

export type AppStep = 'upload' | 'preview' | 'settings' | 'creating' | 'results';

export interface ZoomStatus {
  loggedIn: boolean;
  email?: string;
  displayName?: string;
}
