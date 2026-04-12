"use client";

import React from "react";

export type V2BuilderTabId =
  | "properties"
  | "settings";

interface TemplateBuilderTabContentRouterProps {
  activeTab: V2BuilderTabId;
  renderPropertiesTab: () => React.ReactNode;
  renderSettingsTab: () => React.ReactNode;
}

const TemplateBuilderTabContentRouter: React.FC<
  TemplateBuilderTabContentRouterProps
> = ({
  activeTab,
  renderPropertiesTab,
  renderSettingsTab,
}) => {
  if (activeTab === "properties") return <>{renderPropertiesTab()}</>;
  return <>{renderSettingsTab()}</>;
};

export default TemplateBuilderTabContentRouter;
