'use client';

import { MeetingResult } from '@/lib/types';
import { exportResultsCSV } from '@/lib/csv-export';

interface Props {
  results: MeetingResult[];
  onRetryFailed: (failed: MeetingResult[]) => void;
  onReset: () => void;
}

export default function ResultsTable({ results, onRetryFailed, onReset }: Props) {
  const successCount = results.filter((r) => r.status === 'success').length;
  const errorCount = results.filter((r) => r.status === 'error').length;
  const failedResults = results.filter((r) => r.status === 'error');

  return (
    <div>
      {/* 요약 */}
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-bold text-gray-900">생성 완료</h2>
        <div className="flex gap-3 text-sm">
          <span className="text-green-600 font-medium">✅ 성공 {successCount}건</span>
          {errorCount > 0 && (
            <span className="text-red-600 font-medium">❌ 실패 {errorCount}건</span>
          )}
        </div>
      </div>

      {/* 결과 테이블 */}
      <div className="bg-white rounded-2xl shadow-[0_4px_24px_rgba(0,0,0,0.06)] overflow-hidden mb-4">
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="bg-gray-50 text-gray-600">
              <tr>
                <th className="px-3 py-2 text-left font-medium w-10">행</th>
                <th className="px-3 py-2 text-left font-medium w-24">구분</th>
                <th className="px-3 py-2 text-left font-medium">강의제목</th>
                <th className="px-3 py-2 text-left font-medium w-32">일시</th>
                <th className="px-3 py-2 text-left font-medium w-16">상태</th>
                <th className="px-3 py-2 text-left font-medium">참가 링크</th>
                <th className="px-3 py-2 text-left font-medium w-24">비밀번호</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {results.map((r) => (
                <tr
                  key={r.meeting.id}
                  className={
                    r.status === 'error'
                      ? 'bg-red-50'
                      : r.meeting.hasConflict
                      ? 'bg-amber-50'
                      : 'hover:bg-gray-50'
                  }
                >
                  <td className="px-3 py-2 text-gray-500">{r.meeting.rowIndex}</td>
                  <td className="px-3 py-2">
                    <span
                      className={`inline-block whitespace-nowrap px-2 py-0.5 rounded-full text-xs font-medium ${
                        r.meeting.category === '업무특강'
                          ? 'bg-[#FAF0EC] text-[#D2886F]'
                          : 'bg-green-100 text-green-700'
                      }`}
                    >
                      {r.meeting.category}
                    </span>
                  </td>
                  <td className="px-3 py-2 text-gray-900 max-w-xs truncate" title={r.meeting.topic}>
                    {r.meeting.topic || `(${r.meeting.speakerName})`}
                  </td>
                  <td className="px-3 py-2 text-gray-700 text-xs">
                    {r.meeting.date}<br />{r.meeting.startTime}–{r.meeting.endTime}
                  </td>
                  <td className="px-3 py-2">
                    {r.status === 'success' ? (
                      <span className="text-green-600">✅</span>
                    ) : (
                      <span className="text-red-600" title={r.error}>❌</span>
                    )}
                    {r.meeting.hasConflict && (
                      <span className="ml-1 text-amber-500" title="시간 충돌">⚠️</span>
                    )}
                  </td>
                  <td className="px-3 py-2 max-w-xs">
                    {r.joinUrl ? (
                      <a
                        href={r.joinUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="block truncate text-[#D2886F] hover:underline text-xs"
                        title={r.joinUrl}
                      >
                        {r.joinUrl}
                      </a>
                    ) : (
                      <span className="text-red-500 text-xs">{r.error}</span>
                    )}
                  </td>
                  <td className="px-3 py-2 text-gray-700 font-mono text-xs">
                    {r.password || '-'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Actions */}
      <div className="flex flex-wrap gap-3">
        <button
          onClick={() => exportResultsCSV(results)}
          className="px-4 py-2 text-sm font-medium text-white bg-green-600 rounded-lg hover:bg-green-700"
        >
          📥 결과 CSV 다운로드
        </button>
        {failedResults.length > 0 && (
          <button
            onClick={() => onRetryFailed(failedResults)}
            className="px-4 py-2 text-sm font-medium text-red-600 border border-red-300 rounded-lg hover:bg-red-50"
          >
            🔄 실패 {failedResults.length}건 재시도
          </button>
        )}
        <button
          onClick={onReset}
          className="px-4 py-2 text-sm font-medium text-gray-500 border border-gray-300 rounded-lg hover:bg-gray-50"
        >
          처음으로
        </button>
      </div>
    </div>
  );
}
