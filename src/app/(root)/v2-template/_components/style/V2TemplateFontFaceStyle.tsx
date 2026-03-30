"use client";

import { useV2TemplateRenderConfigContext } from "@/contexts/v2/v2_TemplateRenderConfigContext";
import { v2_buildFontFaceStyleText } from "@/utils/time-table/v2_template_render_config";
import { useMemo } from "react";

const V2TemplateFontFaceStyle = () => {
  const { renderConfig, templateId } = useV2TemplateRenderConfigContext();

  const styleText = useMemo(() => {
    return v2_buildFontFaceStyleText(renderConfig);
  }, [renderConfig]);

  if (!styleText.trim()) {
    return null;
  }

  return (
    <style
      data-v2-template-font-faces={templateId ?? "default"}
      dangerouslySetInnerHTML={{ __html: styleText }}
    />
  );
};

export default V2TemplateFontFaceStyle;
