'use client';

import { ParsedMeeting } from '@/lib/types';

interface TransformResultProps {
  meetings: ParsedMeeting[];
  errors: { row: number; message: string }[];
  onBack: () => void;
  onReset: () => void;
}

function buildZoomCSV(meetings: ParsedMeeting[]): string {
  const headers = ['topic', 'start_time', 'duration', 'timezone', 'agenda', 'category', 'speaker_name', 'speaker_email'];
  const rows = meetings.map((m) => {
    const agenda = [
      m.speakerName && `강사: ${m.speakerName}`,
      m.targetAudience && `대상: ${m.targetAudience}`,
      m.lectureTheme && `주제: ${m.lectureTheme}`,
    ].filter(Boolean).join(' / ');

    return [
      m.topic,
      m.startDateTime,
      String(m.durationMinutes),
      'Asia/Seoul',
      agenda,
      m.category,
      m.speakerName,
      m.speakerEmail,
    ].map((v) => `"${v.replace(/"/g, '""')}"`).join(',');
  });

  return [headers.join(','), ...rows].join('\n');
}

function downloadCSV(content: string, filename: string) {
  const bom = '\uFEFF';
  const blob = new Blob([bom + content], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export default function TransformResult({ meetings, errors, onBack, onReset }: TransformResultProps) {
  const handleDownload = () => {
    const csv = buildZoomCSV(meetings);
    const date = new Date().toISOString().slice(0, 10);
    downloadCSV(csv, `zoom-meetings-${date}.csv`);
  };

  return (
    <div>
      {/* Errors */}
      {errors.length > 0 && (
        <div className="bg-red-50 border border-red-300 rounded-2xl p-4 mb-4">
          <p className="text-sm font-semibold text-red-700 mb-2">
            파싱 오류 {errors.length}건 (건너뜀)
          </p>
          <ul className="text-xs text-red-600 space-y-0.5">
            {errors.map((e, i) => (
              <li key={i}>행 {e.row}: {e.message}</li>
            ))}
          </ul>
        </div>
      )}

      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-lg font-bold tracking-tight text-gray-900">
            변환 결과
          </h2>
          <p className="text-sm text-gray-500">
            {meetings.length}개 회의 · Zoom API 형식으로 변환됨
          </p>
        </div>
        <button
          onClick={handleDownload}
          className="px-5 py-2.5 text-sm font-medium text-white bg-[#D2886F] rounded-xl hover:bg-[#C0735A] transition-colors"
        >
          📥 CSV 다운로드
        </button>
      </div>

      {/* Preview table */}
      <div className="bg-white rounded-2xl shadow-[0_4px_24px_rgba(0,0,0,0.06)] overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50/50">
                <th className="px-3 py-2.5 text-left font-medium text-gray-500">#</th>
                <th className="px-3 py-2.5 text-left font-medium text-gray-500">topic</th>
                <th className="px-3 py-2.5 text-left font-medium text-gray-500">start_time</th>
                <th className="px-3 py-2.5 text-left font-medium text-gray-500">duration</th>
                <th className="px-3 py-2.5 text-left font-medium text-gray-500">agenda</th>
              </tr>
            </thead>
            <tbody>
              {meetings.map((m, i) => {
                const agenda = [
                  m.speakerName && `강사: ${m.speakerName}`,
                  m.targetAudience && `대상: ${m.targetAudience}`,
                  m.lectureTheme && `주제: ${m.lectureTheme}`,
                ].filter(Boolean).join(' / ');

                return (
                  <tr key={m.id} className="border-b border-gray-50 last:border-0 hover:bg-gray-50/50">
                    <td className="px-3 py-2 text-gray-400">{i + 1}</td>
                    <td className="px-3 py-2 font-medium text-gray-800">{m.topic}</td>
                    <td className="px-3 py-2 text-gray-600 font-mono text-xs">{m.startDateTime}</td>
                    <td className="px-3 py-2 text-gray-600">{m.durationMinutes}분</td>
                    <td className="px-3 py-2 text-gray-500 text-xs max-w-xs truncate" title={agenda}>
                      {agenda || '—'}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center justify-between mt-6">
        <button
          onClick={onBack}
          className="px-4 py-2 text-sm text-gray-500 hover:text-gray-700"
        >
          ← 매핑 수정
        </button>
        <div className="flex gap-3">
          <button
            onClick={handleDownload}
            className="px-5 py-2.5 text-sm font-medium text-white bg-[#D2886F] rounded-xl hover:bg-[#C0735A] transition-colors"
          >
            📥 CSV 다운로드
          </button>
          <button
            onClick={onReset}
            className="px-4 py-2.5 text-sm text-gray-500 border border-gray-200 rounded-xl hover:bg-gray-50"
          >
            처음으로
          </button>
        </div>
      </div>

      {/* Guide */}
      <div className="mt-6 bg-[#FAF0EC] rounded-2xl p-4 text-sm text-[#8B5E3C]">
        <p className="font-medium mb-1">💡 Google Sheets + Make 연동 가이드</p>
        <ol className="list-decimal list-inside space-y-0.5 text-xs">
          <li>다운로드한 CSV를 Google Sheets에 업로드</li>
          <li>Make에서 Google Sheets → Zoom 시나리오 생성</li>
          <li>topic, start_time, duration, timezone 컬럼을 Zoom 모듈에 매핑</li>
        </ol>
      </div>
    </div>
  );
}
