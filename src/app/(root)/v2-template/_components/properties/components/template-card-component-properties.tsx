"use client";

import React from "react";

import { V2TemplateCardInstanceTransform } from "@/types/time-table/template-render-config";

interface TemplateCardComponentPropertiesProps {
  instanceMode: "component" | "detached";
  instanceTransforms: Record<string, V2TemplateCardInstanceTransform>;
  onChangeInstanceMode: (value: "component" | "detached") => void;
  onAppendTextNode: () => void;
  onAppendFlexibleTextNode: () => void;
  onUpdateInstanceTransform: (
    cardIndex: number,
    key: "offsetX" | "offsetY" | "rotateDeg" | "scale" | "opacity",
    value: number
  ) => void;
}

const TemplateCardComponentProperties: React.FC<TemplateCardComponentPropertiesProps> = ({
  instanceMode,
  instanceTransforms,
  onChangeInstanceMode,
  onAppendTextNode,
  onAppendFlexibleTextNode,
  onUpdateInstanceTransform,
}) => {
  return (
    <div className="rounded-xl border border-[#3a3d44] bg-[#1a1c20] p-3 space-y-3">
      <div className="flex items-center justify-between gap-2">
        <h5 className="text-xs font-semibold text-gray-200">Card Component</h5>
        <span className="rounded border border-[#3f6ad8] bg-[#1a2b57] px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-[#b9ccff]">
          Component
        </span>
      </div>

      <div className="grid grid-cols-2 gap-2 items-center">
        <label className="text-xs text-gray-400">인스턴스 모드</label>
        <select
          value={instanceMode}
          onChange={(event) =>
            onChangeInstanceMode(
              event.target.value === "detached" ? "detached" : "component"
            )
          }
          className="px-2 py-2 rounded border border-[#3a3d44] bg-[#2a2d33] text-sm text-gray-100"
        >
          <option value="component" disabled={instanceMode === "detached"}>
            공통 컴포넌트
          </option>
          <option value="detached">개별 인스턴스</option>
        </select>
      </div>
      {instanceMode === "detached" ? (
        <p className="text-[11px] text-amber-300">
          개별 인스턴스 분해 상태입니다. 이 모드는 되돌릴 수 없습니다.
        </p>
      ) : null}

      <div className="grid grid-cols-2 gap-2">
        <button
          type="button"
          onClick={onAppendTextNode}
          className="rounded border border-[#3a3d44] bg-[#2a2d33] px-2 py-1.5 text-xs font-semibold text-gray-100 hover:bg-[#323640]"
        >
          + 텍스트 오브젝트
        </button>
        <button
          type="button"
          onClick={onAppendFlexibleTextNode}
          className="rounded border border-[#3a3d44] bg-[#2a2d33] px-2 py-1.5 text-xs font-semibold text-gray-100 hover:bg-[#323640]"
        >
          + FlexibleText
        </button>
      </div>

      {instanceMode === "detached" ? (
        <div className="space-y-2">
          <p className="text-[11px] text-gray-400">
            카드 1~7 각각의 개별 보정값(X/Y/회전/스케일/불투명도)을 조정합니다.
          </p>
          <div className="grid grid-cols-[56px_1fr_1fr_1fr_1fr_1fr] gap-2 items-center text-[11px] text-gray-500">
            <span />
            <span>X</span>
            <span>Y</span>
            <span>R</span>
            <span>S</span>
            <span>O</span>
          </div>
          {Array.from({ length: 7 }).map((_, index) => {
            const key = String(index);
            const transform = instanceTransforms[key] ?? {};
            const offsetX =
              typeof transform.offsetX === "number" ? transform.offsetX : 0;
            const offsetY =
              typeof transform.offsetY === "number" ? transform.offsetY : 0;
            const rotateDeg =
              typeof transform.rotateDeg === "number" ? transform.rotateDeg : 0;
            const scale = typeof transform.scale === "number" ? transform.scale : 1;
            const opacity =
              typeof transform.opacity === "number" ? transform.opacity : 1;

            return (
              <div
                key={key}
                className="grid grid-cols-[56px_1fr_1fr_1fr_1fr_1fr] gap-2 items-center"
              >
                <span className="text-xs text-gray-300">Card {index + 1}</span>
                <input
                  type="number"
                  value={offsetX}
                  onChange={(event) =>
                    onUpdateInstanceTransform(
                      index,
                      "offsetX",
                      Number(event.target.value)
                    )
                  }
                  className="px-2 py-1.5 rounded border border-[#3a3d44] bg-[#2a2d33] text-xs text-gray-100"
                  placeholder="X"
                />
                <input
                  type="number"
                  value={offsetY}
                  onChange={(event) =>
                    onUpdateInstanceTransform(
                      index,
                      "offsetY",
                      Number(event.target.value)
                    )
                  }
                  className="px-2 py-1.5 rounded border border-[#3a3d44] bg-[#2a2d33] text-xs text-gray-100"
                  placeholder="Y"
                />
                <input
                  type="number"
                  step="0.1"
                  value={rotateDeg}
                  onChange={(event) =>
                    onUpdateInstanceTransform(
                      index,
                      "rotateDeg",
                      Number(event.target.value)
                    )
                  }
                  className="px-2 py-1.5 rounded border border-[#3a3d44] bg-[#2a2d33] text-xs text-gray-100"
                  placeholder="deg"
                />
                <input
                  type="number"
                  step="0.01"
                  min="0.1"
                  value={scale}
                  onChange={(event) =>
                    onUpdateInstanceTransform(
                      index,
                      "scale",
                      Number(event.target.value)
                    )
                  }
                  className="px-2 py-1.5 rounded border border-[#3a3d44] bg-[#2a2d33] text-xs text-gray-100"
                  placeholder="1"
                />
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  max="1"
                  value={opacity}
                  onChange={(event) =>
                    onUpdateInstanceTransform(
                      index,
                      "opacity",
                      Number(event.target.value)
                    )
                  }
                  className="px-2 py-1.5 rounded border border-[#3a3d44] bg-[#2a2d33] text-xs text-gray-100"
                  placeholder="1"
                />
              </div>
            );
          })}
        </div>
      ) : null}
    </div>
  );
};

export default TemplateCardComponentProperties;
