"use client";

import BackButton from "@/components/BackButton";
import { useAuth } from "@/contexts/AuthContext";
import { usePurchaseHistory } from "@/hooks/query/usePurchaseHistory";
import { useUserTemplateAccess } from "@/hooks/query/useShop";
import {
  useSubmitPurchaseRequest,
  useTemplateDetail,
} from "@/hooks/query/useTemplateDetail";
import { ShopTemplateWithPlans } from "@/types/templateDetail";
import { AlertTriangle, CreditCard } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import React, { useState } from "react";

export default function TemplateDetailPage() {
  const { user } = useAuth();
  const params = useParams();
  const router = useRouter();
  const [showPurchaseForm, setShowPurchaseForm] = useState(false);

  const templateId = params?.id as string;
  const {
    data: template,
    isLoading: loading,
    error,
  } = useTemplateDetail(templateId);
  const { data: accessibleTemplateIds = [], isLoading: accessLoading } =
    useUserTemplateAccess(user?.id);
  const { data: purchaseHistoryData, isLoading: purchaseHistoryLoading } =
    usePurchaseHistory();
  const submitPurchaseRequest = useSubmitPurchaseRequest();

  // 현재 템플릿을 이미 구매했는지 확인
  const isPurchased = user && accessibleTemplateIds.includes(templateId);

  // 현재 템플릿에 대해 pending 상태의 구매 신청이 있는지 확인
  const pendingPurchaseRequest =
    user &&
    purchaseHistoryData?.purchaseRequests.find(
      (request) =>
        request.template_id === templateId && request.status === "pending"
    );

  const handlePurchaseRequest = async (formData: {
    plan: "lite" | "pro";
    depositorName: string;
    message: string;
  }) => {
    if (!template) return;

    try {
      const response = await fetch("/api/template-purchase-requests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          template_id: template.id,
          plan: formData.plan,
          customer_phone: formData.depositorName,
          message: formData.message,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "구매 요청 실패");
      }

      alert("구매 신청이 접수되었습니다. 곧 연락드리겠습니다.");
      setShowPurchaseForm(false);
    } catch (error) {
      console.error("Purchase request error:", error);
      alert(
        error instanceof Error
          ? error.message
          : "구매 신청 중 오류가 발생했습니다."
      );
    }
  };

  if (loading || (user && (accessLoading || purchaseHistoryLoading))) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#1e3a8a] mx-auto mb-4"></div>
          <p className="text-slate-600">로딩 중...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 py-6 md:py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <BackButton className="mb-6" />
          <div className="bg-white rounded-2xl shadow-xl p-6 md:p-8 backdrop-blur-sm border border-white/20">
            <div className="text-center">
              <p className="text-red-500 mb-4">템플릿을 불러올 수 없습니다.</p>
              <p className="text-slate-500 mb-4">
                {error instanceof Error
                  ? error.message
                  : "알 수 없는 오류가 발생했습니다."}
              </p>
              <button
                onClick={() => router.push("/shop")}
                className="bg-[#1e3a8a] text-white px-4 py-2 rounded hover:bg-blue-800 transition-colors"
              >
                상점으로 돌아가기
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!template) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 py-6 md:py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        {/* 뒤로가기 버튼 */}
        <BackButton className="mb-6" />

        <div className="bg-white rounded-2xl shadow-xl p-6 md:p-8 backdrop-blur-sm border border-white/20">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* 이미지 섹션 */}
            <div className="space-y-4">
              <div className="aspect-video bg-slate-100 rounded-lg overflow-hidden">
                <Image
                  src={template.templates.thumbnail_url || `/thumbnail/${template.template_id}.png`}
                  alt={template.templates.name || "템플릿"}
                  width={600}
                  height={338}
                  className="w-full h-full object-cover"
                  onError={(e) => {
                    const target = e.target as HTMLImageElement;
                    target.style.display = "none";
                    const parent = target.parentElement;
                    if (parent) {
                      parent.innerHTML =
                        '<div class="w-full h-full flex items-center justify-center text-slate-400">썸네일 이미지 없음</div>';
                    }
                  }}
                />
              </div>
            </div>

            {/* 상품 정보 섹션 */}
            <div className="space-y-6">
              <div>
                <h1 className="text-3xl font-bold mb-2 text-slate-900">
                  {template.templates.name}
                </h1>
                <p className="text-slate-600">{template.templates.description}</p>
              </div>

              {/* 플랜별 가격 정보 */}
              <div className="border-t border-slate-200 pt-6">
                <h3 className="font-semibold mb-3 text-slate-900">
                  플랜 선택
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {template.template_plans?.find((p) => p.plan === "lite") && (
                    <div className="p-4 rounded-lg border-2 border-slate-200 bg-slate-50">
                      <div className="text-xs text-slate-500 mb-1">LITE</div>
                      <div className="text-2xl font-bold text-slate-700">
                        ₩{template.template_plans?.find((p) => p.plan === "lite")?.price?.toLocaleString()}
                      </div>
                    </div>
                  )}
                  {template.template_plans?.find((p) => p.plan === "pro") && (
                    <div className="p-4 rounded-lg border-2 border-indigo-200 bg-indigo-50">
                      <div className="text-xs text-indigo-600 mb-1">PRO</div>
                      <div className="text-2xl font-bold text-indigo-700">
                        ₩{template.template_plans?.find((p) => p.plan === "pro")?.price?.toLocaleString()}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* 플랜별 지원 기능 */}
              {template.template_plans && template.template_plans.length > 0 && (
                <div className="border-t border-slate-200 pt-6">
                  <h3 className="font-semibold mb-3 text-slate-900">
                    플랜별 지원 기능
                  </h3>
                  <div className="space-y-4">
                    {template.template_plans
                      .sort((a, b) => (a.plan === "lite" ? -1 : 1))
                      .map((plan) => {
                        const features = [];
                        if (plan.is_artist) features.push("아티스트 이미지 지원");
                        if (plan.is_memo) features.push("메모 기능");
                        if (plan.is_multi_schedule) features.push("다중 일정 지원");
                        if (plan.is_guerrilla) features.push("게릴라 일정 지원");
                        if (plan.is_offline_memo) features.push("오프라인 메모");

                        return (
                          <div
                            key={plan.id}
                            className={`p-4 rounded-lg border ${
                              plan.plan === "pro"
                                ? "border-indigo-200 bg-indigo-50"
                                : "border-slate-200 bg-slate-50"
                            }`}
                          >
                            <div className="flex items-center gap-2 mb-2">
                              <span
                                className={`text-xs font-medium px-2 py-1 rounded ${
                                  plan.plan === "pro"
                                    ? "bg-indigo-600 text-white"
                                    : "bg-slate-600 text-white"
                                }`}
                              >
                                {plan.plan.toUpperCase()}
                              </span>
                              <span className="text-sm font-bold text-slate-700">
                                ₩{plan.price?.toLocaleString()}
                              </span>
                            </div>
                            {features.length > 0 && (
                              <ul className="list-disc list-inside text-slate-600 space-y-1 text-sm">
                                {features.map((feature, index) => (
                                  <li key={index}>{feature}</li>
                                ))}
                              </ul>
                            )}
                          </div>
                        );
                      })}
                  </div>
                </div>
              )}

              {/* 상품 상세 설명 */}
              {template.purchase_instructions && (
                <div className="border-t border-slate-200 pt-6">
                  <h3 className="font-semibold mb-3 text-slate-900">
                    상품 상세 설명
                  </h3>
                  <div className="prose prose-sm max-w-none">
                    <div className="text-slate-600 whitespace-pre-wrap leading-relaxed">
                      {template.purchase_instructions}
                    </div>
                  </div>
                </div>
              )}
              <div className="border-t border-slate-200 pt-4">
                <p className="text-sm text-slate-500 mt-2">
                  구매하신 템플릿은 본인만 사용 가능하며 타인과 공유하거나
                  타인에게 양도할 수 없습니다.
                </p>
                {!isPurchased && !pendingPurchaseRequest && (
                  <p className="text-sm text-slate-500 mt-2">
                    계좌 송금으로 결제가 진행됩니다
                  </p>
                )}
              </div>

              {/* 구매 버튼 */}
              <div className="border-t border-slate-200 pt-6">
                {user ? (
                  isPurchased ? (
                    <div className="text-center">
                      <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-4">
                        <div className="flex items-center justify-center mb-2">
                          <svg
                            className="h-6 w-6 text-green-600 mr-2"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M5 13l4 4L19 7"
                            />
                          </svg>
                          <span className="text-green-800 font-semibold">
                            구매 완료
                          </span>
                        </div>
                        <p className="text-green-700 text-sm">
                          이미 구매하신 템플릿입니다. 시간표 편집기에서 사용하실
                          수 있습니다.
                        </p>
                      </div>
                      <Link
                        href="/test"
                        className="w-full inline-block bg-green-600 text-white py-3 rounded-lg hover:bg-green-700 transition-colors font-semibold text-center"
                      >
                        시간표 편집기로 이동
                      </Link>
                    </div>
                  ) : pendingPurchaseRequest ? (
                    <div className="text-center">
                      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-4">
                        <div className="flex items-center justify-center mb-2">
                          <svg
                            className="h-6 w-6 text-yellow-600 mr-2"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                            />
                          </svg>
                          <span className="text-yellow-800 font-semibold">
                            구매 신청 대기중
                          </span>
                        </div>
                        <p className="text-yellow-700 text-sm mb-2">
                          이미 구매 신청을 하셨습니다. 입금 확인 후 처리됩니다.
                        </p>
                        <p className="text-yellow-600 text-xs">
                          신청일:{" "}
                          {new Date(
                            pendingPurchaseRequest.created_at!
                          ).toLocaleDateString("ko-KR")}
                        </p>
                      </div>
                      <Link
                        href="/shop"
                        className="w-full inline-block bg-yellow-600 text-white py-3 rounded-lg hover:bg-yellow-700 transition-colors font-semibold text-center"
                      >
                        구매 내역 확인하기
                      </Link>
                    </div>
                  ) : (
                    <button
                      onClick={() => setShowPurchaseForm(true)}
                      className="w-full bg-[#1e3a8a] text-white py-3 rounded-lg hover:bg-blue-800 transition-colors font-semibold"
                    >
                      구매 신청하기
                    </button>
                  )
                ) : (
                  <div className="text-center">
                    <p className="text-slate-600 mb-3">
                      구매하려면 로그인이 필요합니다
                    </p>
                    <Link
                      href="/auth"
                      className="inline-block bg-[#1e3a8a] text-white px-6 py-3 rounded-lg hover:bg-blue-800 transition-colors font-semibold"
                    >
                      로그인하기
                    </Link>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 구매 신청 모달 */}
      {showPurchaseForm && (
        <PurchaseModal
          template={template}
          onClose={() => setShowPurchaseForm(false)}
          onSubmit={handlePurchaseRequest}
        />
      )}
    </div>
  );
}

interface PurchaseModalProps {
  template: ShopTemplateWithPlans;
  onClose: () => void;
  onSubmit: (formData: {
    plan: "lite" | "pro";
    depositorName: string;
    message: string;
  }) => Promise<void>;
}

function PurchaseModal({ template, onClose, onSubmit }: PurchaseModalProps) {
  const { user } = useAuth();
  const [formData, setFormData] = useState({
    plan: "lite" as "lite" | "pro",
    depositorName: "",
    message: "",
  });
  const [submitting, setSubmitting] = useState(false);

  // 모달이 열릴 때 배경 스크롤 방지
  React.useEffect(() => {
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = "unset";
    };
  }, []);

  // 선택된 플랜의 가격 계산
  const selectedPlan = template.template_plans?.find(
    (p) => p.plan === formData.plan
  );
  const selectedPrice = selectedPlan?.price || 0;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // 구매 신청 전 확인
    const confirmMessage =
      "구매 신청을 진행하기 전에 확인해주세요:\n\n1. 입금이 완료되었는지 확인해주세요.\n2. 입금자명이 일치하는지 확인해주세요.\n\n구매 신청을 계속 진행하시겠습니까?";

    if (!confirm(confirmMessage)) {
      return;
    }

    setSubmitting(true);

    try {
      await onSubmit(formData);
    } catch (error) {
      console.error("Error submitting purchase request:", error);
      alert("구매 신청 중 오류가 발생했습니다.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50 overflow-y-auto">
      <div className="bg-white rounded-lg max-w-md w-full my-8 max-h-[90vh] flex flex-col">
        <div className="flex justify-between items-center p-6 pb-4 border-b border-slate-200 flex-shrink-0">
          <h2 className="text-xl font-bold text-slate-900">구매 신청</h2>
          <button
            onClick={onClose}
            className="text-slate-500 hover:text-slate-700"
          >
            ✕
          </button>
        </div>

        <div className="overflow-y-auto p-6 pt-4 flex-1">
          <div className="flex flex-col gap-4">

        {/* 플랜 선택 */}
        <div className="mb-4">
          <label className="block text-sm font-medium mb-2 text-slate-700">
            플랜 선택 *
          </label>
          <div className="flex gap-3">
            {template.template_plans?.find((p) => p.plan === "lite") && (
              <button
                type="button"
                onClick={() => setFormData((prev) => ({ ...prev, plan: "lite" }))}
                className={`flex-1 p-4 rounded-lg border-2 transition-all ${
                  formData.plan === "lite"
                    ? "border-slate-600 bg-slate-50"
                    : "border-slate-200 hover:border-slate-300"
                }`}
              >
                <div className="text-xs text-slate-500 mb-1">LITE</div>
                <div className="text-lg font-bold text-slate-700">
                  ₩{template.template_plans?.find((p) => p.plan === "lite")?.price?.toLocaleString()}
                </div>
              </button>
            )}
            {template.template_plans?.find((p) => p.plan === "pro") && (
              <button
                type="button"
                onClick={() => setFormData((prev) => ({ ...prev, plan: "pro" }))}
                className={`flex-1 p-4 rounded-lg border-2 transition-all ${
                  formData.plan === "pro"
                    ? "border-indigo-600 bg-indigo-50"
                    : "border-slate-200 hover:border-slate-300"
                }`}
              >
                <div className="text-xs text-indigo-600 mb-1">PRO</div>
                <div className="text-lg font-bold text-indigo-700">
                  ₩{template.template_plans?.find((p) => p.plan === "pro")?.price?.toLocaleString()}
                </div>
              </button>
            )}
          </div>

          {/* 선택된 플랜의 기능 표시 */}
          {selectedPlan && (
            <div className="mt-3 p-3 rounded-lg bg-slate-50 border border-slate-200">
              <h4 className="text-sm font-semibold text-slate-900 mb-2">
                {formData.plan.toUpperCase()} 플랜 기능
              </h4>
              <ul className="list-disc list-inside text-slate-600 space-y-1 text-sm">
                {selectedPlan.is_artist && <li>아티스트 이미지 지원</li>}
                {selectedPlan.is_memo && <li>메모 기능</li>}
                {selectedPlan.is_multi_schedule && <li>다중 일정 지원</li>}
                {selectedPlan.is_guerrilla && <li>게릴라 일정 지원</li>}
                {selectedPlan.is_offline_memo && <li>오프라인 메모</li>}
              </ul>
            </div>
          )}
        </div>

        <div className=" p-3 bg-slate-50 rounded">
          <p className="font-medium text-slate-900">{template.templates.name}</p>
          <p className="text-sm text-slate-600">{template.templates.description}</p>
          <p className="text-lg font-bold text-[#1e3a8a] mt-2">
            ₩{selectedPrice.toLocaleString()}
          </p>
        </div>
        <div className="bg-blue-50 p-3 rounded">
          <div className="flex items-start">
            <div className="flex-shrink-0">
              <CreditCard className="h-5 w-5 text-[#1e3a8a]" />
            </div>
            <div className="ml-3">
              <h4 className="text-sm font-medium text-[#1e3a8a]">
                송금 계좌 정보
              </h4>
              <div className="text-sm text-slate-700 mt-1 space-y-1">
                <p>• 은행: 토스뱅크</p>
                <p>• 계좌번호: 1000-7564-4995</p>
                <p>• 예금주: 이세영</p>
                <p>
                  • <strong>입금 확인 후 1-2일 이내</strong>에 템플릿 권한이
                  부여됩니다
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-yellow-50 border border-yellow-200 rounded p-3">
          <div className="flex items-start">
            <div className="flex-shrink-0">
              <AlertTriangle className="h-5 w-5 text-yellow-400" />
            </div>
            <div className="ml-3">
              <h4 className="text-sm font-medium text-yellow-800">중요 안내</h4>
              <p className="text-sm text-yellow-700 mt-1">
                입금자명과 위에 입력한 정보가 일치하지 않으면 결제 확인이
                어렵습니다.
              </p>
              <p className="text-sm text-yellow-700 mt-1">
                <strong>계좌로 구매 금액을 이체한 후</strong>에 구매 신청 버튼을
                눌러주세요
              </p>
              <p className="text-sm text-yellow-700 mt-1">
                문의사항은 @TEMISforyou 테미스 공식 트위터로 부탁드립니다
              </p>
            </div>
          </div>
        </div>

        {/* 사용자 정보 표시 */}
        <div className="mb-4 p-3 bg-slate-50 rounded">
          <h4 className="font-medium mb-2 text-slate-900">구매자 정보</h4>
          <div className="text-sm text-slate-600 space-y-1">
            <p>
              <span className="font-medium">이름:</span> {user?.name}
            </p>
            <p>
              <span className="font-medium">이메일:</span> {user?.email}
            </p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1 text-slate-700">
              입금자명 *
            </label>
            <input
              type="text"
              required
              value={formData.depositorName}
              onChange={(e) =>
                setFormData((prev) => ({
                  ...prev,
                  depositorName: e.target.value,
                }))
              }
              placeholder="계좌 이체 시 사용할 입금자명을 입력하세요"
              className="w-full border border-slate-300 rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#1e3a8a] focus:border-[#1e3a8a]"
            />
          </div>

          {/* <div>
            <label className="block text-sm font-medium mb-1 text-slate-700">요청사항</label>
            <textarea
              value={formData.message}
              onChange={(e) =>
                setFormData((prev) => ({ ...prev, message: e.target.value }))
              }
              className="w-full border border-slate-300 rounded px-3 py-2 h-20 resize-none focus:outline-none focus:ring-2 focus:ring-[#1e3a8a] focus:border-[#1e3a8a]"
              placeholder="추가 요청사항이 있으시면 적어주세요"
            />
          </div> */}

          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 border border-slate-300 py-2 rounded hover:bg-slate-50 text-slate-700"
            >
              취소
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="flex-1 bg-[#1e3a8a] text-white py-2 rounded hover:bg-blue-800 disabled:opacity-50"
            >
              {submitting ? "신청 중..." : "구매 신청"}
            </button>
          </div>
        </form>
          </div>
        </div>
      </div>
    </div>
  );
}
