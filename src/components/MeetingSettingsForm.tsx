'use client';

import { MeetingSettings } from '@/lib/types';

interface Props {
  settings: MeetingSettings;
  onChange: (settings: MeetingSettings) => void;
  selectedCount: number;
  onBack: () => void;
  onStart: () => void;
}

function Toggle({
  label,
  value,
  onChange,
  description,
}: {
  label: string;
  value: boolean;
  onChange: (v: boolean) => void;
  description?: string;
}) {
  return (
    <div className="flex items-center justify-between py-2">
      <div>
        <span className="text-sm font-medium text-gray-700">{label}</span>
        {description && <p className="text-xs text-gray-500">{description}</p>}
      </div>
      <button
        type="button"
        onClick={() => onChange(!value)}
        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none ${
          value ? 'bg-[#D2886F]' : 'bg-gray-300'
        }`}
      >
        <span
          className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
            value ? 'translate-x-6' : 'translate-x-1'
          }`}
        />
      </button>
    </div>
  );
}

export default function MeetingSettingsForm({
  settings,
  onChange,
  selectedCount,
  onBack,
  onStart,
}: Props) {
  const update = (key: keyof MeetingSettings, value: MeetingSettings[keyof MeetingSettings]) => {
    onChange({ ...settings, [key]: value });
  };

  return (
    <div className="max-w-2xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-bold text-gray-900">회의 설정</h2>
        <span className="text-sm text-gray-500">모든 회의에 공통 적용됩니다</span>
      </div>

      {/* 기본 설정 */}
      <div className="bg-white rounded-2xl shadow-[0_4px_24px_rgba(0,0,0,0.06)] p-5 mb-4">
        <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">
          기본 설정
        </h3>

        <div className="divide-y divide-gray-100 mb-4">
          <Toggle
            label="개인 회의 ID (PMI) 사용"
            value={settings.use_pmi}
            onChange={(v) => update('use_pmi', v)}
            description="개인 회의 ID로 회의를 생성합니다"
          />
        </div>

        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-1">
            비밀번호
          </label>
          <input
            type="text"
            value={settings.password}
            onChange={(e) => update('password', e.target.value)}
            placeholder="빈칸이면 Zoom이 자동 생성"
            maxLength={10}
            className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#D2886F]"
          />
          <p className="text-xs text-gray-500 mt-1">최대 10자 (영문, 숫자, @, -, _, * 사용 가능)</p>
        </div>

        <div className="divide-y divide-gray-100">
          <Toggle
            label="호스트 비디오"
            value={settings.host_video}
            onChange={(v) => update('host_video', v)}
            description="회의 시작 시 호스트 카메라 자동 켜기"
          />
          <Toggle
            label="참가자 비디오"
            value={settings.participant_video}
            onChange={(v) => update('participant_video', v)}
            description="참가자 입장 시 카메라 자동 켜기"
          />
          <Toggle
            label="호스트 전 입장 허용"
            value={settings.join_before_host}
            onChange={(v) => update('join_before_host', v)}
            description="호스트 입장 전에 참가자가 먼저 입장 가능"
          />
        </div>
      </div>

      {/* 보안 */}
      <div className="bg-white rounded-2xl shadow-[0_4px_24px_rgba(0,0,0,0.06)] p-5 mb-4">
        <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">
          보안
        </h3>
        <Toggle
          label="대기실"
          value={settings.waiting_room}
          onChange={(v) => update('waiting_room', v)}
          description="참가자가 대기실에서 대기 후 호스트 승인으로 입장"
        />
      </div>

      {/* 고급 설정 */}
      <div className="bg-white rounded-2xl shadow-[0_4px_24px_rgba(0,0,0,0.06)] p-5 mb-6">
        <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">
          고급 설정
        </h3>

        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-1">오디오 타입</label>
          <select
            value={settings.audio}
            onChange={(e) => update('audio', e.target.value as MeetingSettings['audio'])}
            className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#D2886F]"
          >
            <option value="both">전화 + VoIP (Both)</option>
            <option value="voip">VoIP만 (인터넷)</option>
            <option value="telephony">전화만 (PSTN)</option>
          </select>
        </div>

        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-1">자동 녹화</label>
          <select
            value={settings.auto_recording}
            onChange={(e) =>
              update('auto_recording', e.target.value as MeetingSettings['auto_recording'])
            }
            className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#D2886F]"
          >
            <option value="none">녹화 안 함</option>
            <option value="cloud">클라우드 녹화</option>
            <option value="local">로컬 녹화</option>
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">대체 호스트</label>
          <input
            type="text"
            value={settings.alternative_hosts}
            onChange={(e) => update('alternative_hosts', e.target.value)}
            placeholder="이메일 주소 (쉼표로 구분)"
            className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#D2886F]"
          />
          <p className="text-xs text-gray-500 mt-1">예: teacher1@school.kr, teacher2@school.kr</p>
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
        <button
          onClick={onStart}
          className="px-6 py-2 text-sm font-semibold text-white bg-[#D2886F] rounded-lg hover:bg-[#C0735A] disabled:opacity-50"
          disabled={selectedCount === 0}
        >
          회의 생성 시작 ({selectedCount}건) →
        </button>
      </div>
    </div>
  );
}
