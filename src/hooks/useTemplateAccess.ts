"use client";

import { useAuth } from "@/contexts/AuthContext";
import { useEffect, useState } from "react";

interface UseTemplateAccessProps {
  templateId: string;
}

interface UseTemplateAccessResult {
  hasAccess: boolean | null; // null = loading
  loading: boolean;
  error: string | null;
  isAdmin: boolean;
  reason: "admin_access" | "template_access" | "no_access" | null;
}

console.log("hello");

export function useTemplateAccess({
  templateId,
}: UseTemplateAccessProps): UseTemplateAccessResult {
  const { user } = useAuth();
  const [hasAccess, setHasAccess] = useState<boolean | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [reason, setReason] = useState<
    "admin_access" | "template_access" | "no_access" | null
  >(null);

  useEffect(() => {
    async function checkAccess() {
      // 클라이언트 사이드에서만 실행
      if (typeof window === "undefined") {
        return;
      }

      if (!user || !templateId) {
        // 사용자나 templateId가 없을 때는 로딩 상태 유지
        setLoading(true);
        return;
      }

      try {
        setLoading(true);
        setError(null);

        // 서버 사이드에서 안전하게 검증

        const response = await fetch(
          `/api/template-access?templateId=${encodeURIComponent(templateId)}`,
          {
            method: "GET",
            credentials: "include",
            headers: {
              "Content-Type": "application/json",
            },
          }
        );

        if (!response.ok) {
          const errorText = await response.text();

          throw new Error(
            `HTTP error! status: ${response.status} - ${errorText}`
          );
        }

        const data = await response.json();

        setHasAccess(data.hasAccess);
        setIsAdmin(data.isAdmin);
        setReason(data.reason);
      } catch (err) {
        console.error("Error checking template access:", err);
        setError(
          err instanceof Error ? err.message : "Failed to check template access"
        );
        setHasAccess(false);
        setIsAdmin(false);
        setReason("no_access");
      } finally {
        setLoading(false);
      }
    }

    checkAccess();
  }, [user, templateId]);

  return {
    hasAccess,
    loading,
    error,
    isAdmin,
    reason,
  };
}
