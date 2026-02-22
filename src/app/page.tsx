'use client';

import { useCallback, useEffect, useReducer, useRef, useState } from 'react';
import { parseCSVRaw, parseCSVWithMapping } from '@/lib/csv-parser';
import { detectConflicts } from '@/lib/conflict-detector';
import {
  AppStep,
  ColumnMapping,
  ConflictGroup,
  DEFAULT_MEETING_SETTINGS,
  MeetingResult,
  MeetingSettings,
  ParsedMeeting,
  RawCSVData,
  ZoomStatus,
} from '@/lib/types';
import ColumnMapper from '@/components/ColumnMapper';
import ConflictWarning from '@/components/ConflictWarning';
import MeetingPreview from '@/components/MeetingPreview';
import MeetingSettingsForm from '@/components/MeetingSettingsForm';
import ProgressTracker from '@/components/ProgressTracker';
import ResultsTable from '@/components/ResultsTable';
import TransformResult from '@/components/TransformResult';

type AppMode = 'direct' | 'transform';

// ── State ──────────────────────────────────────────────────────────────────

interface State {
  step: AppStep;
  mode: AppMode;
  zoomStatus: ZoomStatus;
  zoomLoading: boolean;
  rawCSV: RawCSVData | null;
  columnMapping: ColumnMapping | null;
  meetings: ParsedMeeting[];
  parseErrors: { row: number; message: string }[];
  conflicts: ConflictGroup[];
  selectedMeetings: ParsedMeeting[];
  meetingSettings: MeetingSettings;
  results: MeetingResult[];
  isAborted: boolean;
}

type Action =
  | { type: 'SET_MODE'; payload: AppMode }
  | { type: 'SET_ZOOM'; payload: ZoomStatus }
  | { type: 'SET_ZOOM_LOADING'; payload: boolean }
  | { type: 'SET_RAW_CSV'; payload: RawCSVData }
  | { type: 'SET_PARSED'; payload: { meetings: ParsedMeeting[]; errors: { row: number; message: string }[]; conflicts: ConflictGroup[]; mapping: ColumnMapping } }
  | { type: 'SET_SELECTED_MEETINGS'; payload: ParsedMeeting[] }
  | { type: 'SET_SETTINGS'; payload: MeetingSettings }
  | { type: 'SET_STEP'; payload: AppStep }
  | { type: 'ADD_RESULT'; payload: MeetingResult }
  | { type: 'SET_RESULTS'; payload: MeetingResult[] }
  | { type: 'ABORT' }
  | { type: 'RESET' };

const initial: State = {
  step: 'upload',
  mode: 'direct',
  zoomStatus: { loggedIn: false },
  zoomLoading: true,
  rawCSV: null,
  columnMapping: null,
  meetings: [],
  parseErrors: [],
  conflicts: [],
  selectedMeetings: [],
  meetingSettings: DEFAULT_MEETING_SETTINGS,
  results: [],
  isAborted: false,
};

function reducer(state: State, action: Action): State {
  switch (action.type) {
    case 'SET_MODE':
      return { ...state, mode: action.payload };
    case 'SET_ZOOM':
      return { ...state, zoomStatus: action.payload };
    case 'SET_ZOOM_LOADING':
      return { ...state, zoomLoading: action.payload };
    case 'SET_RAW_CSV':
      return { ...state, rawCSV: action.payload, step: 'mapping' };
    case 'SET_PARSED':
      return {
        ...state,
        meetings: action.payload.meetings,
        parseErrors: action.payload.errors,
        conflicts: action.payload.conflicts,
        columnMapping: action.payload.mapping,
        step: 'preview',
      };
    case 'SET_SELECTED_MEETINGS':
      return { ...state, selectedMeetings: action.payload, step: 'settings' };
    case 'SET_SETTINGS':
      return { ...state, meetingSettings: action.payload };
    case 'SET_STEP':
      return { ...state, step: action.payload };
    case 'ADD_RESULT':
      return { ...state, results: [...state.results, action.payload] };
    case 'SET_RESULTS':
      return { ...state, results: action.payload };
    case 'ABORT':
      return { ...state, isAborted: true };
    case 'RESET':
      return { ...initial, mode: state.mode, zoomStatus: state.zoomStatus, zoomLoading: false };
    default:
      return state;
  }
}

// ── Step indicator ─────────────────────────────────────────────────────────

const STEPS_DIRECT: { key: AppStep; label: string }[] = [
  { key: 'upload', label: '1. 업로드' },
  { key: 'mapping', label: '2. 매핑' },
  { key: 'preview', label: '3. 미리보기' },
  { key: 'settings', label: '4. 설정' },
  { key: 'creating', label: '5. 생성 중' },
  { key: 'results', label: '6. 결과' },
];

const STEPS_TRANSFORM: { key: AppStep; label: string }[] = [
  { key: 'upload', label: '1. 업로드' },
  { key: 'mapping', label: '2. 매핑' },
  { key: 'preview', label: '3. 변환 결과' },
];

const STEP_ORDER_DIRECT: AppStep[] = ['upload', 'mapping', 'preview', 'settings', 'creating', 'results'];
const STEP_ORDER_TRANSFORM: AppStep[] = ['upload', 'mapping', 'preview'];

// ── Component ──────────────────────────────────────────────────────────────

export default function Home() {
  const [state, dispatch] = useReducer(reducer, initial);
  const abortRef = useRef(false);
  const [dragOver, setDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Zoom 로그인 상태 확인
  useEffect(() => {
    fetch('/api/zoom/status')
      .then((res) => res.json())
      .then((data: ZoomStatus) => dispatch({ type: 'SET_ZOOM', payload: data }))
      .catch(() => dispatch({ type: 'SET_ZOOM', payload: { loggedIn: false } }))
      .finally(() => dispatch({ type: 'SET_ZOOM_LOADING', payload: false }));
  }, []);

  // ── File handling ──────────────────────────────────────────────────────

  const handleFile = useCallback(async (file: File) => {
    if (!file.name.endsWith('.csv')) {
      alert('CSV 파일만 업로드할 수 있습니다.');
      return;
    }
    try {
      const rawCSV = await parseCSVRaw(file);
      dispatch({ type: 'SET_RAW_CSV', payload: rawCSV });
    } catch (e) {
      alert(`파일 파싱 오류: ${e instanceof Error ? e.message : '알 수 없는 오류'}`);
    }
  }, []);

  const handleMappingConfirm = useCallback((mapping: ColumnMapping) => {
    if (!state.rawCSV) return;
    const { meetings, errors } = parseCSVWithMapping(state.rawCSV.rows, mapping);
    const { meetings: withConflicts, conflicts } = detectConflicts(meetings);
    dispatch({
      type: 'SET_PARSED',
      payload: { meetings: withConflicts, errors, conflicts, mapping },
    });
  }, [state.rawCSV]);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setDragOver(false);
      const file = e.dataTransfer.files[0];
      if (file) handleFile(file);
    },
    [handleFile]
  );

  // ── Meeting creation via SSE ───────────────────────────────────────────

  const startCreation = async (meetingsToCreate: ParsedMeeting[]) => {
    abortRef.current = false;
    dispatch({ type: 'SET_RESULTS', payload: [] });
    dispatch({ type: 'SET_STEP', payload: 'creating' });

    try {
      const response = await fetch('/api/zoom/create-meetings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ meetings: meetingsToCreate, settings: state.meetingSettings }),
      });

      if (!response.ok) {
        const err = await response.json();
        alert(`오류: ${err.error || '회의 생성 실패'}`);
        dispatch({ type: 'SET_STEP', payload: 'settings' });
        return;
      }

      const reader = response.body!.getReader();
      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        if (abortRef.current) {
          reader.cancel();
          break;
        }

        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const events = buffer.split('\n\n');
        buffer = events.pop() || '';

        for (const event of events) {
          if (!event.startsWith('data: ')) continue;
          try {
            const data = JSON.parse(event.slice(6));
            if (data.type === 'progress') {
              dispatch({ type: 'ADD_RESULT', payload: data.result });
            } else if (data.type === 'complete') {
              dispatch({ type: 'SET_RESULTS', payload: data.results });
              dispatch({ type: 'SET_STEP', payload: 'results' });
            } else if (data.type === 'error') {
              alert(data.message);
              dispatch({ type: 'SET_STEP', payload: 'settings' });
            }
          } catch {
            // Skip malformed SSE events
          }
        }
      }

      // If aborted, go to results with whatever we have
      if (abortRef.current) {
        dispatch({ type: 'SET_STEP', payload: 'results' });
      }
    } catch (e) {
      alert(`네트워크 오류: ${e instanceof Error ? e.message : '알 수 없는 오류'}`);
      dispatch({ type: 'SET_STEP', payload: 'settings' });
    }
  };

  const handleRetryFailed = (failed: MeetingResult[]) => {
    startCreation(failed.map((r) => r.meeting));
  };

  // ── Render ─────────────────────────────────────────────────────────────

  const steps = state.mode === 'transform' ? STEPS_TRANSFORM : STEPS_DIRECT;
  const stepOrder = state.mode === 'transform' ? STEP_ORDER_TRANSFORM : STEP_ORDER_DIRECT;
  const stepIndex = stepOrder.indexOf(state.step);

  return (
    <main className="min-h-screen bg-[#F8F7F5]">
      {/* 헤더 */}
      <div className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="max-w-5xl mx-auto flex items-center justify-between">
          <h1 className="text-xl font-bold tracking-tight text-gray-900">Zoom 회의 일괄 생성기</h1>

          {/* Zoom 로그인 상태 */}
          <div className="flex items-center gap-3">
            {state.zoomLoading ? (
              <span className="text-sm text-gray-400">확인 중...</span>
            ) : state.zoomStatus.loggedIn ? (
              <>
                <div className="flex items-center gap-1.5">
                  <span className="w-2 h-2 bg-green-500 rounded-full inline-block" />
                  <span className="text-sm text-gray-700">
                    {state.zoomStatus.displayName || state.zoomStatus.email}
                  </span>
                </div>
                <button
                  onClick={async () => {
                    await fetch('/api/zoom/logout', { method: 'POST' });
                    dispatch({ type: 'SET_ZOOM', payload: { loggedIn: false } });
                  }}
                  className="text-xs text-red-500 hover:text-red-700 border border-red-200 px-2 py-1 rounded"
                >
                  로그아웃
                </button>
              </>
            ) : (
              <button
                onClick={() => { window.location.href = '/api/zoom/auth'; }}
                className="px-4 py-1.5 text-sm font-medium text-white bg-[#D2886F] rounded-lg hover:bg-[#C0735A]"
              >
                Zoom 로그인
              </button>
            )}
          </div>
        </div>
      </div>

      {/* 스텝 인디케이터 */}
      {state.step !== 'upload' && (
        <div className="bg-white border-b border-gray-200 px-6 py-3">
          <div className="max-w-5xl mx-auto flex gap-2 flex-wrap">
            {steps.map((s, i) => (
              <div key={s.key} className="flex items-center gap-2">
                <span
                  className={`text-xs font-medium px-3 py-1 rounded-full ${
                    i < stepIndex
                      ? 'bg-green-100 text-green-700'
                      : i === stepIndex
                      ? 'bg-[#D2886F] text-white'
                      : 'bg-gray-100 text-gray-400'
                  }`}
                >
                  {s.label}
                </span>
                {i < steps.length - 1 && (
                  <span className="text-gray-300 text-xs">›</span>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="max-w-5xl mx-auto px-6 py-8">
        {/* ── Step 1: 업로드 ── */}
        {state.step === 'upload' && (
          <div className="max-w-2xl mx-auto">
            {/* 모드 선택 */}
            <div className="grid grid-cols-2 gap-3 mb-6">
              <button
                onClick={() => dispatch({ type: 'SET_MODE', payload: 'direct' })}
                className={`p-4 rounded-2xl border-2 text-left transition-colors ${
                  state.mode === 'direct'
                    ? 'border-[#D2886F] bg-[#FAF0EC]'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <div className="text-lg mb-1">🚀 직접 생성</div>
                <p className="text-xs text-gray-500">Zoom OAuth로 회의 직접 개설</p>
              </button>
              <button
                onClick={() => dispatch({ type: 'SET_MODE', payload: 'transform' })}
                className={`p-4 rounded-2xl border-2 text-left transition-colors ${
                  state.mode === 'transform'
                    ? 'border-[#D2886F] bg-[#FAF0EC]'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <div className="text-lg mb-1">📋 CSV 변환</div>
                <p className="text-xs text-gray-500">Zoom API 형식으로 변환 → Make 연동</p>
              </button>
            </div>

            {state.mode === 'direct' && !state.zoomStatus.loggedIn && !state.zoomLoading && (
              <div className="bg-amber-50 border border-amber-300 rounded-2xl p-4 mb-6 text-sm text-amber-800">
                <strong>Zoom 로그인이 필요합니다.</strong> 우측 상단 버튼을 눌러 로그인해주세요.
              </div>
            )}

            <div
              onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
              onDragLeave={() => setDragOver(false)}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              className={`border-2 border-dashed rounded-xl p-16 text-center cursor-pointer transition-colors ${
                dragOver
                  ? 'border-[#D2886F] bg-[#FAF0EC]'
                  : 'border-gray-300 hover:border-[#D2886F] hover:bg-[#FAF0EC]'
              }`}
            >
              <div className="text-5xl mb-4">📄</div>
              <p className="text-lg font-medium text-gray-700 mb-2">
                CSV 파일을 끌어오거나 클릭하여 업로드
              </p>
              <p className="text-sm text-gray-500">
                {state.mode === 'transform'
                  ? 'Zoom API 형식 CSV로 변환합니다'
                  : '교실백점 특강 리스트 CSV 파일'}
              </p>
              <input
                ref={fileInputRef}
                type="file"
                accept=".csv"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) handleFile(file);
                }}
              />
            </div>
          </div>
        )}

        {/* ── Step 2: 컬럼 매핑 ── */}
        {state.step === 'mapping' && state.rawCSV && (
          <ColumnMapper
            rawData={state.rawCSV}
            onConfirm={handleMappingConfirm}
            onBack={() => dispatch({ type: 'RESET' })}
          />
        )}

        {/* ── Step 3: 미리보기 / 변환 결과 ── */}
        {state.step === 'preview' && state.mode === 'transform' && (
          <TransformResult
            meetings={state.meetings}
            errors={state.parseErrors}
            onBack={() => dispatch({ type: 'SET_STEP', payload: 'mapping' })}
            onReset={() => dispatch({ type: 'RESET' })}
          />
        )}

        {state.step === 'preview' && state.mode === 'direct' && (
          <div>
            {state.parseErrors.length > 0 && (
              <div className="bg-red-50 border border-red-300 rounded-2xl p-4 mb-4">
                <p className="text-sm font-semibold text-red-700 mb-2">
                  파싱 오류 {state.parseErrors.length}건 (건너뜀)
                </p>
                <ul className="text-xs text-red-600 space-y-0.5">
                  {state.parseErrors.map((e, i) => (
                    <li key={i}>행 {e.row}: {e.message}</li>
                  ))}
                </ul>
              </div>
            )}
            <ConflictWarning conflicts={state.conflicts} />
            <MeetingPreview
              meetings={state.meetings}
              onNext={(selected) => dispatch({ type: 'SET_SELECTED_MEETINGS', payload: selected })}
              onBack={() => dispatch({ type: 'SET_STEP', payload: 'mapping' })}
            />
          </div>
        )}

        {/* ── Step 3: 회의 설정 ── */}
        {state.step === 'settings' && (
          <MeetingSettingsForm
            settings={state.meetingSettings}
            onChange={(s) => dispatch({ type: 'SET_SETTINGS', payload: s })}
            selectedCount={state.selectedMeetings.length}
            onBack={() => dispatch({ type: 'SET_STEP', payload: 'preview' })}
            onStart={() => startCreation(state.selectedMeetings)}
          />
        )}

        {/* ── Step 4: 생성 중 ── */}
        {state.step === 'creating' && (
          <ProgressTracker
            results={state.results}
            total={state.selectedMeetings.length}
            onAbort={() => {
              abortRef.current = true;
              dispatch({ type: 'ABORT' });
            }}
          />
        )}

        {/* ── Step 5: 결과 ── */}
        {state.step === 'results' && (
          <ResultsTable
            results={state.results}
            onRetryFailed={handleRetryFailed}
            onReset={() => dispatch({ type: 'RESET' })}
          />
        )}
      </div>
    </main>
  );
}
