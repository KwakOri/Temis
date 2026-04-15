"use client";

import { TemplateEditorRuntimeProvider } from "@/contexts/v2/template-editor-runtime-context";
import { TemplateEditorUIProvider } from "@/contexts/v2/template-editor-ui-context";
import {
  TemplateRenderConfigProvider,
  TemplateRenderConfigContextValue,
} from "@/contexts/v2/template-render-config-context";
import { useTemplateEditor } from "@/hooks/v2/useTemplateEditor";
import { V2TemplateHighlightTarget } from "@/types/time-table/template-editor-ui";
import { V2TemplateRenderConfig } from "@/types/time-table/template-render-config";
import { TTheme } from "@/types/time-table/theme";
import React from "react";
import V2Loading from "../shared/loading-screen";
import V2RuntimeForm from "./runtime-form";
import V2RuntimePreview from "./runtime-preview";
import V2RuntimeToolbar from "./runtime-toolbar";

interface V2RuntimeShellProps {
  templateId: string;
  source: "db" | "empty";
  renderConfig: V2TemplateRenderConfig;
}

const V2RuntimeShell = ({
  templateId,
  source,
  renderConfig,
}: V2RuntimeShellProps) => {
  const inputSchema = React.useMemo(
    () => renderConfig.formSchema,
    [renderConfig.formSchema]
  );
  const captureSize = renderConfig.templateSize;
  const defaultTheme = (renderConfig.defaultTheme || "first") as TTheme;

  const {
    state,
    actions,
    data,
    updateData,
    globalData,
    updateGlobalData,
    currentTheme,
    updateTheme,
    resetData,
    resetAll,
    isInitialized,
  } = useTemplateEditor({
    inputSchema,
    defaultTheme,
    captureSize,
  });

  const [hiddenLayerIds, setHiddenLayerIds] = React.useState<
    Record<string, boolean>
  >({});
  const [hoverHighlightTarget, setHoverHighlightTarget] =
    React.useState<V2TemplateHighlightTarget | null>(null);
  const [activeHighlightTarget, setActiveHighlightTarget] =
    React.useState<V2TemplateHighlightTarget | null>(null);

  const isLayerHidden = React.useCallback(
    (layerId: string): boolean => {
      return hiddenLayerIds[layerId] === true;
    },
    [hiddenLayerIds]
  );

  const setLayerHidden = React.useCallback((layerId: string, hidden: boolean) => {
    setHiddenLayerIds((prev) => {
      if (hidden) {
        return {
          ...prev,
          [layerId]: true,
        };
      }
      if (!prev[layerId]) return prev;
      const next = { ...prev };
      delete next[layerId];
      return next;
    });
  }, []);

  const toggleLayerHidden = React.useCallback((layerId: string) => {
    setHiddenLayerIds((prev) => {
      if (prev[layerId]) {
        const next = { ...prev };
        delete next[layerId];
        return next;
      }
      return {
        ...prev,
        [layerId]: true,
      };
    });
  }, []);

  const providerValue = React.useMemo<TemplateRenderConfigContextValue>(
    () => ({
      templateId,
      source,
      isLoading: false,
      renderConfig,
    }),
    [renderConfig, source, templateId]
  );

  const uiContextValue = React.useMemo(
    () => ({ state, actions }),
    [actions, state]
  );

  const runtimeValue = React.useMemo(
    () => ({
      data,
      updateData,
      globalData,
      updateGlobalData,
      currentTheme,
      updateTheme,
      resetData,
      hiddenLayerIds,
      isLayerHidden,
      toggleLayerHidden,
      setLayerHidden,
      hoverHighlightTarget,
      setHoverHighlightTarget,
      activeHighlightTarget,
      setActiveHighlightTarget,
    }),
    [
      activeHighlightTarget,
      currentTheme,
      data,
      globalData,
      hiddenLayerIds,
      hoverHighlightTarget,
      isLayerHidden,
      resetData,
      setLayerHidden,
      toggleLayerHidden,
      updateData,
      updateGlobalData,
      updateTheme,
    ]
  );

  const handleReset = React.useCallback(() => {
    resetAll();
    actions.updateProfileText("");
    actions.updateMemoText("");
    actions.updateImageSrc(null);
    actions.updatePreferProfileDummyImage(false);
    actions.handleOptionClick("none");
  }, [actions, resetAll]);

  return (
    <TemplateRenderConfigProvider value={providerValue}>
      <TemplateEditorUIProvider value={uiContextValue}>
        <TemplateEditorRuntimeProvider value={runtimeValue}>
          {!isInitialized || state.weekDates.length === 0 ? (
            <V2Loading />
          ) : (
            <div className="v2-template-theme flex h-screen w-full flex-col overflow-hidden bg-[#0d1117]">
              <V2RuntimeToolbar
                templateId={templateId}
                source={source}
                onReset={handleReset}
              />
              <main className="flex min-h-0 flex-1 flex-col md:flex-row">
                <V2RuntimePreview />
                <div className="h-[44vh] min-h-[300px] w-full md:h-full md:min-h-0 md:w-[420px] md:max-w-[40vw]">
                  <V2RuntimeForm />
                </div>
              </main>
            </div>
          )}
        </TemplateEditorRuntimeProvider>
      </TemplateEditorUIProvider>
    </TemplateRenderConfigProvider>
  );
};

export default V2RuntimeShell;
