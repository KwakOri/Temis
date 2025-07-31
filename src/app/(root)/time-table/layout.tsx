'use client';

import ProtectedRoute from "@/components/auth/ProtectedRoute";
import TemplateProtectedRoute from "@/components/auth/TemplateProtectedRoute";
import { PropsWithChildren } from "react";
import { usePathname } from "next/navigation";
import { extractTemplateIdFromPath, shouldValidateTemplateAccess } from "@/utils/routeUtils";

const TimeTableLayout = ({ children }: PropsWithChildren) => {
  const pathname = usePathname();
  
  // 템플릿 접근 검증이 필요한 경로인지 확인
  if (shouldValidateTemplateAccess(pathname)) {
    const templateId = extractTemplateIdFromPath(pathname);
    
    if (templateId) {
      return (
        <TemplateProtectedRoute templateId={templateId}>
          {children}
        </TemplateProtectedRoute>
      );
    }
  }
  
  // 기본 템플릿이나 검증이 불필요한 경우 기본 인증만 수행
  return <ProtectedRoute>{children}</ProtectedRoute>;
};

export default TimeTableLayout;
