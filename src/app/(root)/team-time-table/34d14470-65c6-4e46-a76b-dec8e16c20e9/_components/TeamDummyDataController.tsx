import React from 'react';

interface TeamDummyDataControllerProps {
  enabled: boolean;
  onToggle: () => void;
}

const TeamDummyDataController: React.FC<TeamDummyDataControllerProps> = ({
  enabled,
  onToggle,
}) => {
  return (
    <div className="bg-white border border-gray-200 rounded-lg p-4 shadow-sm">
      <h3 className="text-sm font-medium text-gray-900 mb-3">데이터</h3>

      <div className="flex items-center justify-between gap-3">
        <div>
          <label className="text-sm text-gray-700">더미 데이터</label>
          <p className="mt-1 text-xs text-gray-500">
            {enabled ? '더미 데이터 표시 중' : '실제 데이터 표시 중'}
          </p>
        </div>

        <button
          type="button"
          aria-pressed={enabled}
          onClick={onToggle}
          className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors ${
            enabled ? 'bg-indigo-600' : 'bg-gray-200'
          }`}
        >
          <span
            className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
              enabled ? 'translate-x-6' : 'translate-x-1'
            }`}
          />
        </button>
      </div>
    </div>
  );
};

export default TeamDummyDataController;
