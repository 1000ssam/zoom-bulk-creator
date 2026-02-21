'use client';

import { ConflictGroup } from '@/lib/types';

interface Props {
  conflicts: ConflictGroup[];
}

export default function ConflictWarning({ conflicts }: Props) {
  if (conflicts.length === 0) return null;

  return (
    <div className="bg-amber-50 border border-amber-300 rounded-2xl p-4 mb-4">
      <div className="flex items-center gap-2 mb-2">
        <span className="text-amber-600 text-lg">⚠️</span>
        <h3 className="font-semibold text-amber-800">
          동일 계정 시간 충돌 감지: {conflicts.length}건
        </h3>
      </div>
      <p className="text-sm text-amber-700 mb-3">
        같은 구분(계정)의 회의가 동일 시간대에 중복됩니다. 회의는 생성되지만 호스트가 동시에 진행할 수 없습니다.
      </p>
      <ul className="space-y-1">
        {conflicts.map((c, idx) => (
          <li key={idx} className="text-sm text-amber-800 bg-amber-100 rounded px-3 py-1">
            <span className="font-medium">{c.category}</span> · {c.date} · {c.timeSlot} —
            행 {c.rows.join(', ')}
          </li>
        ))}
      </ul>
    </div>
  );
}
