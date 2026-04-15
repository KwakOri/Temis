"use client";

import React, { useEffect, useMemo, useState } from "react";

interface TemplateSceneNodeStructureControlsProps {
  nodeId: string;
  canDelete: boolean;
  currentParentId?: string | null;
  parentOptions?: Array<{ value: string | null; label: string }>;
  onMoveUp: () => void;
  onMoveDown: () => void;
  onDelete: () => void;
  onRelocate?: (parentId: string | null) => void;
}

const v2_ROOT_PARENT_OPTION_VALUE = "__root__";

const TemplateSceneNodeStructureControls: React.FC<
  TemplateSceneNodeStructureControlsProps
> = ({
  nodeId,
  canDelete,
  currentParentId = null,
  parentOptions = [],
  onMoveUp,
  onMoveDown,
  onDelete,
  onRelocate,
}) => {
  const [selectedParentValue, setSelectedParentValue] = useState<string>(
    currentParentId ?? v2_ROOT_PARENT_OPTION_VALUE
  );

  useEffect(() => {
    setSelectedParentValue(currentParentId ?? v2_ROOT_PARENT_OPTION_VALUE);
  }, [currentParentId]);

  const normalizedParentOptions = useMemo(() => {
    const seen = new Set<string>();
    const options: Array<{ value: string; label: string }> = [];

    parentOptions.forEach((option) => {
      const value = option.value ?? v2_ROOT_PARENT_OPTION_VALUE;
      if (seen.has(value)) return;
      seen.add(value);
      options.push({
        value,
        label: option.label,
      });
    });

    if (!seen.has(v2_ROOT_PARENT_OPTION_VALUE)) {
      options.unshift({
        value: v2_ROOT_PARENT_OPTION_VALUE,
        label: "(루트)",
      });
    }

    return options;
  }, [parentOptions]);

  const canRelocate = Boolean(onRelocate) && normalizedParentOptions.length > 0;
  const isRelocateTargetCurrent =
    selectedParentValue === (currentParentId ?? v2_ROOT_PARENT_OPTION_VALUE);

  return (
    <div className="rounded border border-[#3a3d44] bg-[#141821] p-2 space-y-2">
      <p className="text-[11px] font-semibold uppercase tracking-wide text-gray-400">
        Structure
      </p>
      <div className="grid grid-cols-3 gap-2">
        <button
          type="button"
          onClick={onMoveUp}
          className="rounded border border-[#3a3d44] bg-[#2a2d33] px-2 py-1.5 text-xs text-gray-100 hover:bg-[#323640]"
        >
          위로
        </button>
        <button
          type="button"
          onClick={onMoveDown}
          className="rounded border border-[#3a3d44] bg-[#2a2d33] px-2 py-1.5 text-xs text-gray-100 hover:bg-[#323640]"
        >
          아래로
        </button>
        <button
          type="button"
          onClick={onDelete}
          disabled={!canDelete}
          className={`rounded border px-2 py-1.5 text-xs ${
            canDelete
              ? "border-red-400/40 text-red-300 hover:bg-red-500/10"
              : "border-[#3a3d44] text-gray-500 cursor-not-allowed"
          }`}
        >
          삭제
        </button>
      </div>
      {canRelocate ? (
        <div className="space-y-1.5">
          <p className="text-[11px] text-gray-500">부모 이동</p>
          <div className="flex gap-2">
            <select
              value={selectedParentValue}
              onChange={(event) => setSelectedParentValue(event.target.value)}
              className="min-w-0 flex-1 rounded border border-[#3a3d44] bg-[#20263a] px-2 py-1.5 text-xs text-gray-100 focus:border-[#4f8cff] focus:outline-none"
            >
              {normalizedParentOptions.map((option) => (
                <option key={`${nodeId}-parent-${option.value}`} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
            <button
              type="button"
              onClick={() =>
                onRelocate?.(
                  selectedParentValue === v2_ROOT_PARENT_OPTION_VALUE
                    ? null
                    : selectedParentValue
                )
              }
              disabled={isRelocateTargetCurrent}
              className={`shrink-0 rounded border px-2 py-1.5 text-xs font-semibold ${
                isRelocateTargetCurrent
                  ? "cursor-not-allowed border-[#3a3d44] text-gray-500"
                  : "border-[#3a3d44] bg-[#2a2d33] text-gray-100 hover:bg-[#323640]"
              }`}
            >
              이동
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
};

export default TemplateSceneNodeStructureControls;
