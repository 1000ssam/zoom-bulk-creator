'use client';

import { useState } from 'react';
import { ParsedMeeting } from '@/lib/types';

interface Props {
  meetings: ParsedMeeting[];
  onNext: (selected: ParsedMeeting[]) => void;
  onBack: () => void;
}

type SortKey = 'date' | 'time' | 'category' | 'speaker';

export default function MeetingPreview({ meetings, onNext, onBack }: Props) {
  const [selectedIds, setSelectedIds] = useState<Set<string>>(
    () => new Set(meetings.map((m) => m.id))
  );
  const [sortKey, setSortKey] = useState<SortKey | null>(null);
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');
  const [searchQuery, setSearchQuery] = useState('');

  const sorted = [...meetings]
    .filter((m) => {
      if (!searchQuery) return true;
      const q = searchQuery.toLowerCase();
      return m.topic.toLowerCase().includes(q) || m.speakerName.toLowerCase().includes(q);
    })
    .sort((a, b) => {
      if (!sortKey) return 0;
      let av = '';
      let bv = '';
      if (sortKey === 'date') { av = a.date; bv = b.date; }
      else if (sortKey === 'time') { av = a.startTime; bv = b.startTime; }
      else if (sortKey === 'category') { av = a.category; bv = b.category; }
      else if (sortKey === 'speaker') { av = a.speakerName; bv = b.speakerName; }
      return sortDir === 'asc' ? av.localeCompare(bv) : bv.localeCompare(av);
    });

  const allIds = meetings.map((m) => m.id);
  const allChecked = allIds.length > 0 && allIds.every((id) => selectedIds.has(id));
  const someChecked = allIds.some((id) => selectedIds.has(id));
  const selectedCount = meetings.filter((m) => selectedIds.has(m.id)).length;

  const 업무count = meetings.filter((m) => m.category === '업무특강').length;
  const 교과count = meetings.filter((m) => m.category === '교과특강').length;

  function SortableHeader({ col, label }: { col: SortKey; label: string }) {
    const active = sortKey === col;
    return (
      <th
        onClick={() => {
          if (active) setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
          else { setSortKey(col); setSortDir('asc'); }
        }}
        className="cursor-pointer select-none px-3 py-2 text-left font-medium"
      >
        {label}{active ? (sortDir === 'asc' ? ' ↑' : ' ↓') : ''}
      </th>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-bold tracking-tight text-gray-900">미리보기</h2>
        <span className="text-sm text-gray-500">
          업무특강 {업무count}건 · 교과특강 {교과count}건
        </span>
      </div>

      {/* 검색 */}
      <div className="flex items-center mb-4">
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="강의제목 또는 강사명 검색"
          className="border border-gray-300 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#D2886F] w-56"
        />
      </div>

      {/* 테이블 */}
      <div className="bg-white rounded-2xl shadow-[0_4px_24px_rgba(0,0,0,0.06)] overflow-hidden mb-4">
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="bg-gray-50 text-gray-600">
              <tr>
                <th className="px-3 py-2 w-10">
                  <input
                    type="checkbox"
                    checked={allChecked}
                    ref={(el) => {
                      if (el) el.indeterminate = !allChecked && someChecked;
                    }}
                    onChange={() => {
                      const next = new Set(selectedIds);
                      if (allChecked) {
                        allIds.forEach((id) => next.delete(id));
                      } else {
                        allIds.forEach((id) => next.add(id));
                      }
                      setSelectedIds(next);
                    }}
                    className="cursor-pointer"
                  />
                </th>
                <th className="px-3 py-2 text-left font-medium w-10">행</th>
                <SortableHeader col="category" label="구분" />
                <SortableHeader col="date" label="일자" />
                <SortableHeader col="time" label="시간" />
                <th className="px-3 py-2 text-left font-medium">강의제목</th>
                <SortableHeader col="speaker" label="강사명" />
                <th className="px-3 py-2 text-left font-medium w-16">충돌</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {sorted.map((m) => (
                <tr
                  key={m.id}
                  className={
                    !selectedIds.has(m.id)
                      ? 'opacity-50'
                      : m.hasConflict
                      ? 'bg-amber-50'
                      : 'hover:bg-gray-50'
                  }
                >
                  <td className="px-3 py-2">
                    <input
                      type="checkbox"
                      checked={selectedIds.has(m.id)}
                      onChange={() => {
                        const next = new Set(selectedIds);
                        next.has(m.id) ? next.delete(m.id) : next.add(m.id);
                        setSelectedIds(next);
                      }}
                      className="cursor-pointer"
                    />
                  </td>
                  <td className="px-3 py-2 text-gray-500">{m.rowIndex}</td>
                  <td className="px-3 py-2">
                    <span
                      className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium ${
                        m.category === '업무특강'
                          ? 'bg-[#FAF0EC] text-[#D2886F]'
                          : 'bg-green-100 text-green-700'
                      }`}
                    >
                      {m.category}
                    </span>
                  </td>
                  <td className="px-3 py-2 text-gray-700">{m.date}</td>
                  <td className="px-3 py-2 text-gray-700">
                    {m.startTime}–{m.endTime}
                  </td>
                  <td className="px-3 py-2 text-gray-900 max-w-xs truncate" title={m.topic}>
                    {m.topic || <span className="text-gray-400">(제목 없음)</span>}
                  </td>
                  <td className="px-3 py-2 text-gray-700">{m.speakerName}</td>
                  <td className="px-3 py-2">
                    {m.hasConflict && (
                      <span
                        className="text-amber-600 text-xs"
                        title={`행 ${m.conflictWith?.join(', ')}와 충돌`}
                      >
                        ⚠️ {m.conflictWith?.join(',')}
                      </span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center justify-between">
        <button
          onClick={onBack}
          className="px-5 py-2 text-sm text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50"
        >
          ← 이전
        </button>
        <div className="flex items-center gap-3">
          <span className="text-sm text-gray-500">선택: {selectedCount}건</span>
          <button
            onClick={() => onNext(meetings.filter((m) => selectedIds.has(m.id)))}
            disabled={selectedCount === 0}
            className="px-6 py-2 text-sm font-semibold text-white bg-[#D2886F] rounded-lg hover:bg-[#C0735A] disabled:opacity-50"
          >
            회의 설정 →
          </button>
        </div>
      </div>
    </div>
  );
}
