import type { PropsWithChildren } from "react";
import { LegacyTemplateAssetsRoute } from "@/contexts/LegacyTemplateAssetsContext";
export default function Layout({ children }: PropsWithChildren) {
  return (
    <LegacyTemplateAssetsRoute ownerKind="thumbnail">
      {children}
    </LegacyTemplateAssetsRoute>
  );
}
