"use client";

import AdminTabHeader from "@/components/admin/AdminTabHeader";
import { useTabOrders, useUpdateTabOrders } from "@/hooks/query/useTabOrder";
import { AdminTabOrder } from "@/types/tabOrder";
import {
  AlertTriangle,
  ArrowDown,
  ArrowUp,
  Eye,
  EyeOff,
  Layout,
  Loader2,
  Save,
} from "lucide-react";
import { useEffect, useState } from "react";

// 탭 이름 매핑
const TAB_NAMES: Record<string, string> = {
  workCalendar: "작업 캘린더",
  customOrders: "맞춤 제작 주문",
  purchases: "결제 대기",
  templates: "템플릿 관리",
  thumbnails: "썸네일 관리",
  portfolios: "포트폴리오 관리",
  users: "사용자 관리",
  teams: "팀 관리",
  teamTemplates: "팀 템플릿",
  emailPreview: "이메일 미리보기",
  access: "접근 권한 관리",
  settings: "설정",
};

export default function TabOrderManagement() {
  const { data: tabOrders, isLoading } = useTabOrders();
  const updateMutation = useUpdateTabOrders();
  const [localOrders, setLocalOrders] = useState<AdminTabOrder[]>([]);
  const [hasChanges, setHasChanges] = useState(false);

  // Initialize local state when data is loaded
  useEffect(() => {
    if (tabOrders) {
      setLocalOrders([...tabOrders]);
      setHasChanges(false);
    }
  }, [tabOrders]);

  const moveUp = (index: number) => {
    if (index === 0) return;

    const newOrders = [...localOrders];
    const temp = newOrders[index - 1];
    newOrders[index - 1] = newOrders[index];
    newOrders[index] = temp;

    // Update order_index
    newOrders[index - 1].order_index = index - 1;
    newOrders[index].order_index = index;

    setLocalOrders(newOrders);
    setHasChanges(true);
  };

  const moveDown = (index: number) => {
    if (index === localOrders.length - 1) return;

    const newOrders = [...localOrders];
    const temp = newOrders[index + 1];
    newOrders[index + 1] = newOrders[index];
    newOrders[index] = temp;

    // Update order_index
    newOrders[index + 1].order_index = index + 1;
    newOrders[index].order_index = index;

    setLocalOrders(newOrders);
    setHasChanges(true);
  };

  const toggleVisibility = (index: number) => {
    const newOrders = [...localOrders];
    newOrders[index] = {
      ...newOrders[index],
      is_visible: !newOrders[index].is_visible,
    };
    setLocalOrders(newOrders);
    setHasChanges(true);
  };

  const handleSave = async () => {
    try {
      await updateMutation.mutateAsync(
        localOrders.map((order) => ({
          tab_id: order.tab_id,
          order_index: order.order_index,
          is_visible: order.is_visible,
        }))
      );
      setHasChanges(false);
      alert("탭 순서가 저장되었습니다.");
    } catch (error) {
      alert(
        error instanceof Error
          ? error.message
          : "저장 중 오류가 발생했습니다."
      );
    }
  };

  const handleReset = () => {
    if (tabOrders) {
      setLocalOrders([...tabOrders]);
      setHasChanges(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  if (!localOrders || localOrders.length === 0) {
    return (
      <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 flex items-start gap-3">
        <AlertTriangle className="h-5 w-5 text-amber-500 flex-shrink-0 mt-0.5" />
        <div>
          <p className="text-sm text-amber-700 font-medium">
            탭 순서 데이터가 없습니다
          </p>
          <p className="text-xs text-amber-600 mt-1">
            데이터베이스 마이그레이션을 실행해주세요.
          </p>
        </div>
      </div>
    );
  }

  return (
    <section className="space-y-4">
      <AdminTabHeader
        title="탭 순서 관리"
        description="관리자 페이지의 탭 순서와 표시 여부를 설정합니다."
        icon={Layout}
      >
        {hasChanges && (
          <>
            <button
              onClick={handleReset}
              className="px-3 py-1.5 text-sm border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
            >
              취소
            </button>
            <button
              onClick={handleSave}
              disabled={updateMutation.isPending}
              className="px-3 py-1.5 text-sm bg-primary text-white rounded-lg hover:bg-secondary transition-colors disabled:opacity-50 flex items-center gap-1.5"
            >
              {updateMutation.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  저장 중...
                </>
              ) : (
                <>
                  <Save className="h-4 w-4" />
                  저장
                </>
              )}
            </button>
          </>
        )}
      </AdminTabHeader>

      {/* 데스크탑 테이블 (md 이상) */}
      <div className="hidden md:block bg-white border border-gray-200 rounded-lg overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider w-20">
                순서
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                탭 이름
              </th>
              <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider w-24">
                표시
              </th>
              <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider w-32">
                순서 변경
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {localOrders.map((order, index) => (
              <tr
                key={order.tab_id}
                className={`hover:bg-gray-50 ${
                  !order.is_visible ? "opacity-50" : ""
                }`}
              >
                <td className="px-4 py-4 text-center text-sm font-medium text-gray-900">
                  {index + 1}
                </td>
                <td className="px-4 py-4">
                  <div className="text-sm font-medium text-gray-900">
                    {TAB_NAMES[order.tab_id] || order.tab_id}
                  </div>
                  <div className="text-xs text-gray-500">{order.tab_id}</div>
                </td>
                <td className="px-4 py-4">
                  <div className="flex justify-center">
                    <button
                      onClick={() => toggleVisibility(index)}
                      className={`p-2 rounded-lg transition-colors ${
                        order.is_visible
                          ? "text-primary hover:bg-blue-50"
                          : "text-gray-400 hover:bg-gray-100"
                      }`}
                      title={
                        order.is_visible ? "표시됨 (클릭하여 숨김)" : "숨김 (클릭하여 표시)"
                      }
                    >
                      {order.is_visible ? (
                        <Eye className="h-5 w-5" />
                      ) : (
                        <EyeOff className="h-5 w-5" />
                      )}
                    </button>
                  </div>
                </td>
                <td className="px-4 py-4">
                  <div className="flex items-center justify-center gap-1">
                    <button
                      onClick={() => moveUp(index)}
                      disabled={index === 0}
                      className="p-2 text-gray-600 hover:text-primary hover:bg-gray-100 rounded-lg transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                      title="위로"
                    >
                      <ArrowUp className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => moveDown(index)}
                      disabled={index === localOrders.length - 1}
                      className="p-2 text-gray-600 hover:text-primary hover:bg-gray-100 rounded-lg transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                      title="아래로"
                    >
                      <ArrowDown className="h-4 w-4" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* 모바일 카드 리스트 (md 미만) */}
      <div className="md:hidden space-y-3">
        {localOrders.map((order, index) => (
          <div
            key={order.tab_id}
            className={`bg-white border border-gray-200 rounded-lg p-4 ${
              !order.is_visible ? "opacity-50" : ""
            }`}
          >
            <div className="flex items-start justify-between gap-3 mb-3">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-primary text-white text-xs font-bold">
                    {index + 1}
                  </span>
                  <span className="font-medium text-gray-900 text-sm">
                    {TAB_NAMES[order.tab_id] || order.tab_id}
                  </span>
                </div>
                <div className="text-xs text-gray-500 ml-8">{order.tab_id}</div>
              </div>
              <button
                onClick={() => toggleVisibility(index)}
                className={`p-2 rounded-lg transition-colors flex-shrink-0 ${
                  order.is_visible
                    ? "text-primary bg-blue-50"
                    : "text-gray-400 bg-gray-100"
                }`}
                title={order.is_visible ? "표시됨" : "숨김"}
              >
                {order.is_visible ? (
                  <Eye className="h-5 w-5" />
                ) : (
                  <EyeOff className="h-5 w-5" />
                )}
              </button>
            </div>
            <div className="flex items-center gap-2 pt-3 border-t border-gray-100">
              <button
                onClick={() => moveUp(index)}
                disabled={index === 0}
                className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 text-sm border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
              >
                <ArrowUp className="h-4 w-4" />
                위로
              </button>
              <button
                onClick={() => moveDown(index)}
                disabled={index === localOrders.length - 1}
                className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 text-sm border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
              >
                <ArrowDown className="h-4 w-4" />
                아래로
              </button>
            </div>
          </div>
        ))}
      </div>

      {hasChanges && (
        <div className="md:hidden flex items-center gap-2 sticky bottom-4">
          <button
            onClick={handleReset}
            className="flex-1 px-4 py-3 text-sm border border-gray-300 rounded-lg text-gray-700 bg-white hover:bg-gray-50 transition-colors shadow-lg"
          >
            취소
          </button>
          <button
            onClick={handleSave}
            disabled={updateMutation.isPending}
            className="flex-1 px-4 py-3 text-sm bg-primary text-white rounded-lg hover:bg-secondary transition-colors disabled:opacity-50 flex items-center justify-center gap-1.5 shadow-lg"
          >
            {updateMutation.isPending ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                저장 중...
              </>
            ) : (
              <>
                <Save className="h-4 w-4" />
                저장
              </>
            )}
          </button>
        </div>
      )}
    </section>
  );
}
