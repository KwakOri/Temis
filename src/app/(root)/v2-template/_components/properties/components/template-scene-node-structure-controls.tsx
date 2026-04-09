"use client";

import React from "react";

type TemplateSceneNodeInsertKind =
  | "text"
  | "flexibleText"
  | "asset"
  | "group"
  | "cardCollection";

interface TemplateSceneNodeStructureControlsProps {
  nodeId: string;
  allowChildren: boolean;
  canDelete: boolean;
  onMoveUp: () => void;
  onMoveDown: () => void;
  onDelete: () => void;
  onAddSibling: (kind: TemplateSceneNodeInsertKind) => void;
  onAddChild: (kind: TemplateSceneNodeInsertKind) => void;
}

const TemplateSceneNodeStructureControls: React.FC<
  TemplateSceneNodeStructureControlsProps
> = ({
  nodeId,
  allowChildren,
  canDelete,
  onMoveUp,
  onMoveDown,
  onDelete,
  onAddSibling,
  onAddChild,
}) => {
  const addButtons: Array<{ label: string; kind: TemplateSceneNodeInsertKind }> = [
    { label: "+ Text", kind: "text" },
    { label: "+ Flexible", kind: "flexibleText" },
    { label: "+ Asset", kind: "asset" },
    { label: "+ Group", kind: "group" },
    { label: "+ Cards", kind: "cardCollection" },
  ];

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
      <div className="space-y-1.5">
        <p className="text-[11px] text-gray-500">동일 레벨 추가</p>
        <div className="grid grid-cols-3 gap-2">
          {addButtons.map((button) => (
            <button
              key={`${nodeId}-sibling-${button.kind}`}
              type="button"
              onClick={() => onAddSibling(button.kind)}
              className="rounded border border-[#3a3d44] bg-[#2a2d33] px-2 py-1.5 text-[11px] font-semibold text-gray-100 hover:bg-[#323640]"
            >
              {button.label}
            </button>
          ))}
        </div>
      </div>
      {allowChildren ? (
        <div className="space-y-1.5">
          <p className="text-[11px] text-gray-500">하위 추가</p>
          <div className="grid grid-cols-3 gap-2">
            {addButtons.map((button) => (
              <button
                key={`${nodeId}-child-${button.kind}`}
                type="button"
                onClick={() => onAddChild(button.kind)}
                className="rounded border border-[#3a3d44] bg-[#2a2d33] px-2 py-1.5 text-[11px] font-semibold text-gray-100 hover:bg-[#323640]"
              >
                {button.label}
              </button>
            ))}
          </div>
        </div>
      ) : null}
    </div>
  );
};

export default TemplateSceneNodeStructureControls;
