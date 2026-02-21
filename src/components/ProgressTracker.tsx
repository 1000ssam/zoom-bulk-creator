'use client';

import { MeetingResult } from '@/lib/types';

interface Props {
  results: MeetingResult[];
  total: number;
  onAbort: () => void;
}

export default function ProgressTracker({ results, total, onAbort }: Props) {
  const completed = results.length;
  const pct = total > 0 ? Math.round((completed / total) * 100) : 0;
  const successCount = results.filter((r) => r.status === 'success').length;
  const errorCount = results.filter((r) => r.status === 'error').length;

  return (
    <div className="max-w-2xl mx-auto">
      <h2 className="text-xl font-bold text-gray-900 mb-6">회의 생성 중...</h2>

      {/* 프로그레스 바 */}
      <div className="bg-white rounded-2xl shadow-[0_4px_24px_rgba(0,0,0,0.06)] p-6 mb-4">
        <div className="flex justify-between text-sm text-gray-600 mb-2">
          <span>{completed} / {total} 완료</span>
          <span>{pct}%</span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-3 mb-4">
          <div
            className="bg-[#D2886F] h-3 rounded-full transition-all duration-300"
            style={{ width: `${pct}%` }}
          />
        </div>
        <div className="flex gap-4 text-sm">
          <span className="text-green-600">✅ 성공: {successCount}</span>
          <span className="text-red-600">❌ 실패: {errorCount}</span>
          <span className="text-gray-500">⏳ 남음: {total - completed}</span>
        </div>
      </div>

      {/* 개별 항목 상태 */}
      <div className="bg-white rounded-2xl shadow-[0_4px_24px_rgba(0,0,0,0.06)] overflow-hidden mb-6">
        <div className="max-h-80 overflow-y-auto">
          {results.map((r) => (
            <div
              key={r.meeting.id}
              className={`flex items-center gap-3 px-4 py-2.5 border-b border-gray-100 text-sm ${
                r.status === 'error' ? 'bg-red-50' : ''
              }`}
            >
              <span className="text-base">
                {r.status === 'success' ? '✅' : r.status === 'error' ? '❌' : '🔄'}
              </span>
              <span className="text-gray-500 w-8 shrink-0">행 {r.meeting.rowIndex}</span>
              <span className="flex-1 truncate text-gray-800">
                {r.meeting.topic || `(${r.meeting.category} - ${r.meeting.speakerName})`}
              </span>
              {r.status === 'error' && (
                <span className="text-red-600 text-xs shrink-0 max-w-40 truncate" title={r.error}>
                  {r.error}
                </span>
              )}
            </div>
          ))}
          {completed < total && (
            <div className="flex items-center gap-3 px-4 py-2.5 text-sm text-gray-400">
              <span>🔄</span>
              <span>처리 중...</span>
            </div>
          )}
        </div>
      </div>

      <div className="flex justify-center">
        <button
          onClick={onAbort}
          className="px-6 py-2 text-sm text-red-600 border border-red-300 rounded-lg hover:bg-red-50"
        >
          중단
        </button>
      </div>
    </div>
  );
}
