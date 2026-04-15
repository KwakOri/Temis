import { useTemplateRuntimeUIContext } from "@/contexts/v2/template-runtime-ui-context";
import { v2_clampPreviewScale } from "../shared/preview-scale";
import V2TimeTableContent from "../scene/preview-scene";

const V2RuntimePreview = () => {
  const { state, actions } = useTemplateRuntimeUIContext();
  const { scale, captureSize, isMobile } = state;
  const { updateScale } = actions;

  const templateWidth = captureSize?.width || 1280;
  const templateHeight = captureSize?.height || 720;
  const viewportWidth = templateWidth * scale;
  const viewportHeight = templateHeight * scale;

  return (
    <section
      className="relative flex-1 overflow-auto"
      style={{
        backgroundColor: "#0f141c",
        backgroundImage:
          "linear-gradient(45deg, #1c2330 25%, transparent 25%), linear-gradient(-45deg, #1c2330 25%, transparent 25%), linear-gradient(45deg, transparent 75%, #1c2330 75%), linear-gradient(-45deg, transparent 75%, #1c2330 75%)",
        backgroundSize: "24px 24px",
        backgroundPosition: "0 0, 0 12px, 12px -12px, -12px 0",
      }}
    >
      <div className="sticky left-0 top-0 z-10 flex justify-end p-3">
        <label className="inline-flex items-center gap-2 rounded border border-slate-600/80 bg-slate-900/90 px-3 py-2 text-xs text-slate-100">
          <span>배율 {scale.toFixed(2)}x</span>
          <input
            type="range"
            min={0.1}
            max={1.2}
            step={0.01}
            value={scale}
            onChange={(event) => {
              const nextScale = Number(event.target.value);
              updateScale(
                v2_clampPreviewScale({ value: nextScale, isMobile })
              );
            }}
          />
        </label>
      </div>
      <div className="flex min-h-full items-center justify-center p-6">
        <div
          className="relative shadow-lg"
          style={{
            width: viewportWidth,
            height: viewportHeight,
          }}
        >
          <V2TimeTableContent />
        </div>
      </div>
    </section>
  );
};

export default V2RuntimePreview;
