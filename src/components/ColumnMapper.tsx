'use client';

import { useState, useMemo } from 'react';
import {
  ColumnMapping,
  FIELD_META,
  MappableField,
  RawCSVData,
} from '@/lib/types';
import { autoDetectMapping } from '@/lib/csv-parser';

interface ColumnMapperProps {
  rawData: RawCSVData;
  onConfirm: (mapping: ColumnMapping) => void;
  onBack: () => void;
}

const FIELD_ORDER: MappableField[] = [
  'topic', 'date', 'time',
  'category', 'speakerName', 'speakerEmail',
  'teacherName', 'targetAudience', 'lectureTheme',
];

export default function ColumnMapper({ rawData, onConfirm, onBack }: ColumnMapperProps) {
  const [mapping, setMapping] = useState<ColumnMapping>(() =>
    autoDetectMapping(rawData.headers)
  );

  // Sample rows for preview (up to 3)
  const sampleRows = useMemo(() => rawData.rows.slice(0, 3), [rawData.rows]);

  const updateField = (field: MappableField, value: number | null) => {
    setMapping((prev) => ({ ...prev, [field]: value }));
  };

  // Check if all required fields are mapped
  const requiredFields = FIELD_ORDER.filter((f) => FIELD_META[f].required);
  const allRequiredMapped = requiredFields.every((f) => mapping[f] !== null);

  // Count how many fields were auto-detected
  const autoDetectedCount = useMemo(() => {
    const auto = autoDetectMapping(rawData.headers);
    return Object.values(auto).filter((v) => v !== null).length;
  }, [rawData.headers]);

  return (
    <div className="max-w-3xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <h2 className="text-lg font-bold tracking-tight text-gray-900 mb-1">
          컬럼 매핑
        </h2>
        <p className="text-sm text-gray-500">
          CSV 컬럼을 각 필드에 연결하세요.
          {autoDetectedCount > 0 && (
            <span className="text-[#D2886F] font-medium">
              {' '}{autoDetectedCount}개 자동 감지됨
            </span>
          )}
        </p>
      </div>

      {/* Mapping table */}
      <div className="bg-white rounded-2xl shadow-[0_4px_24px_rgba(0,0,0,0.06)] overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-100">
              <th className="px-4 py-3 text-left font-medium text-gray-500 w-36">필드</th>
              <th className="px-4 py-3 text-left font-medium text-gray-500 w-56">CSV 컬럼</th>
              <th className="px-4 py-3 text-left font-medium text-gray-500">미리보기</th>
            </tr>
          </thead>
          <tbody>
            {FIELD_ORDER.map((field) => {
              const meta = FIELD_META[field];
              const selectedIdx = mapping[field];

              return (
                <tr key={field} className="border-b border-gray-50 last:border-0">
                  {/* Field label */}
                  <td className="px-4 py-3">
                    <span className="font-medium text-gray-800">
                      {meta.label}
                    </span>
                    {meta.required && (
                      <span className="text-red-400 ml-0.5">*</span>
                    )}
                  </td>

                  {/* Dropdown */}
                  <td className="px-4 py-3">
                    <select
                      value={selectedIdx ?? '__none__'}
                      onChange={(e) => {
                        const v = e.target.value;
                        updateField(field, v === '__none__' ? null : Number(v));
                      }}
                      className={`w-full rounded-lg border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#D2886F] focus:border-transparent ${
                        selectedIdx !== null
                          ? 'border-gray-200 bg-white text-gray-900'
                          : meta.required
                          ? 'border-red-200 bg-red-50 text-red-400'
                          : 'border-gray-200 bg-gray-50 text-gray-400'
                      }`}
                    >
                      <option value="__none__">
                        {meta.required ? '— 선택 필수 —' : '— 매핑 안 함 —'}
                      </option>
                      {rawData.headers.map((header, idx) => (
                        <option key={idx} value={idx}>
                          {header || `(열 ${idx + 1})`}
                        </option>
                      ))}
                    </select>
                  </td>

                  {/* Sample data preview */}
                  <td className="px-4 py-3">
                    {selectedIdx !== null ? (
                      <div className="flex flex-wrap gap-1.5">
                        {sampleRows.map((row, ri) => {
                          const val = row[selectedIdx]?.trim();
                          if (!val) return null;
                          return (
                            <span
                              key={ri}
                              className="inline-block bg-gray-100 text-gray-600 text-xs px-2 py-0.5 rounded"
                            >
                              {val.length > 20 ? val.slice(0, 20) + '…' : val}
                            </span>
                          );
                        })}
                      </div>
                    ) : (
                      <span className="text-xs text-gray-300">—</span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Info */}
      <p className="text-xs text-gray-400 mt-3 px-1">
        총 {rawData.rows.length}행 · {rawData.headers.length}열 감지됨.
        <span className="text-red-400"> *</span> 표시 필드는 필수입니다.
      </p>

      {/* Actions */}
      <div className="flex items-center justify-between mt-6">
        <button
          onClick={onBack}
          className="px-4 py-2 text-sm text-gray-500 hover:text-gray-700"
        >
          ← 다시 업로드
        </button>
        <button
          onClick={() => onConfirm(mapping)}
          disabled={!allRequiredMapped}
          className={`px-6 py-2.5 text-sm font-medium rounded-xl transition-colors ${
            allRequiredMapped
              ? 'bg-[#D2886F] text-white hover:bg-[#C0735A]'
              : 'bg-gray-200 text-gray-400 cursor-not-allowed'
          }`}
        >
          매핑 확인 → 미리보기
        </button>
      </div>
    </div>
  );
}
