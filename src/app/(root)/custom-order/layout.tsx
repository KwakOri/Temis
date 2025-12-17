"use client";

import { useAdminOptions } from "@/hooks/query/useAdminOptions";
import { Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";

export default function CustomOrderLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const { data: adminOptions, isLoading } = useAdminOptions("general");

  // 맞춤 시간표 접수 설정 확인
  const isCustomOrderEnabled = adminOptions?.some(
    (opt) => opt.value === "custom_timetable_orders" && opt.is_enabled
  );

  // useEffect(() => {
  //   // 로딩이 완료되고 설정이 비활성화되어 있으면 메인 페이지로 리다이렉트
  //   if (!isLoading && !isCustomOrderEnabled) {
  //     router.replace("/");
  //   }
  // }, [isLoading, isCustomOrderEnabled, router]);

  // 로딩 중일 때 로딩 화면 표시
  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-12 w-12 animate-spin text-[#1e3a8a] mx-auto mb-4" />
          <p className="text-slate-600">페이지를 불러오는 중...</p>
        </div>
      </div>
    );
  }

  // 설정이 비활성화되어 있으면 (리다이렉트 전) 아무것도 렌더링하지 않음
  // if (!isCustomOrderEnabled) {
  //   return (
  //     <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 flex items-center justify-center">
  //       <div className="text-center">
  //         <Loader2 className="h-12 w-12 animate-spin text-[#1e3a8a] mx-auto mb-4" />
  //         <p className="text-slate-600">리다이렉트 중...</p>
  //       </div>
  //     </div>
  //   );
  // }

  return <>{children}</>;
}
