"use client";

import React from "react";

export type V2BuilderTabId =
  | "canvas"
  | "schema"
  | "properties"
  | "style"
  | "assets"
  | "data"
  | "export";

interface TemplateBuilderTabContentRouterProps {
  activeTab: V2BuilderTabId;
  renderCanvasTab: () => React.ReactNode;
  renderSchemaTab: () => React.ReactNode;
  renderPropertiesTab: () => React.ReactNode;
  renderStyleTab: () => React.ReactNode;
  renderAssetsTab: () => React.ReactNode;
  renderDataTab: () => React.ReactNode;
  renderExportTab: () => React.ReactNode;
}

const TemplateBuilderTabContentRouter: React.FC<
  TemplateBuilderTabContentRouterProps
> = ({
  activeTab,
  renderCanvasTab,
  renderSchemaTab,
  renderPropertiesTab,
  renderStyleTab,
  renderAssetsTab,
  renderDataTab,
  renderExportTab,
}) => {
  if (activeTab === "canvas") return <>{renderCanvasTab()}</>;
  if (activeTab === "schema") return <>{renderSchemaTab()}</>;
  if (activeTab === "properties") return <>{renderPropertiesTab()}</>;
  if (activeTab === "style") return <>{renderStyleTab()}</>;
  if (activeTab === "assets") return <>{renderAssetsTab()}</>;
  if (activeTab === "data") return <>{renderDataTab()}</>;
  return <>{renderExportTab()}</>;
};

export default TemplateBuilderTabContentRouter;
