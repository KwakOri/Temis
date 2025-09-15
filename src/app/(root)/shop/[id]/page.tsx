"use client";

import BackButton from "@/components/BackButton";
import { useAuth } from "@/contexts/AuthContext";
import {
  useSubmitPurchaseRequest,
  useTemplateDetail,
} from "@/hooks/query/useTemplateDetail";
import { useUserTemplateAccess } from "@/hooks/query/useShop";
import { usePurchaseHistory } from "@/hooks/query/usePurchaseHistory";
import { TemplateWithProducts } from "@/types/templateDetail";
import { AlertTriangle, CreditCard } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useState } from "react";

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
  const pendingPurchaseRequest = user && purchaseHistoryData?.purchaseRequests.find(
    (request) =>
      request.template_id === templateId &&
      request.status === "pending"
  );

  const handlePurchaseRequest = async (formData: {
    depositorName: string;
    message: string;
  }) => {
    if (!template) return;

    try {
      await submitPurchaseRequest.mutateAsync({
        template_id: template.id,
        depositor_name: formData.depositorName,
        message: formData.message,
      });

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
                  src={`/thumbnail/${template.id}.png`}
                  alt={template.name}
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
                  {template.name}
                </h1>
                <p className="text-slate-600">{template.description}</p>
              </div>

              {/* 임시 상품 정보 (template_products 테이블 생성 후 실제 데이터로 교체) */}
              <div className="border-t border-slate-200 pt-6">
                <div className="mb-4">
                  <span className="text-2xl font-bold text-[#1e3a8a]">
                    ₩{template.template_products[0].price.toLocaleString()}
                  </span>
                </div>

                <div className="space-y-4">
                  <div>
                    <h3 className="font-semibold mb-2 text-slate-900">
                      포함 사항
                    </h3>
                    <ul className="list-disc list-inside text-slate-600 space-y-1">
                      {template.template_products[0].features?.map(
                        (feature: string) => (
                          <li key={feature}>{feature}</li>
                        )
                      )}
                    </ul>
                  </div>

                  <div>
                    <h3 className="font-semibold mb-2 text-slate-900">
                      요구사항
                    </h3>
                    <p className="text-slate-600">
                      {template.template_products[0].requirements}
                    </p>
                  </div>

                  <div>
                    <h3 className="font-semibold mb-2 text-slate-900">
                      배송 시간
                    </h3>
                    <p className="text-slate-600">
                      결제 후 {template.template_products[0].delivery_time}일
                      이내
                    </p>
                  </div>
                </div>
              </div>

              {/* 상품 상세 설명 */}
              {template.template_products[0].purchase_instructions && (
                <div className="border-t border-slate-200 pt-6">
                  <h3 className="font-semibold mb-3 text-slate-900">
                    상품 상세 설명
                  </h3>
                  <div className="prose prose-sm max-w-none">
                    <div className="text-slate-600 whitespace-pre-wrap leading-relaxed">
                      {template.template_products[0].purchase_instructions}
                    </div>
                  </div>
                </div>
              )}

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
                          이미 구매하신 템플릿입니다. 시간표 편집기에서 사용하실 수 있습니다.
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
                          신청일: {new Date(pendingPurchaseRequest.created_at!).toLocaleDateString("ko-KR")}
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
                <div className="pl-2">
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
  template: TemplateWithProducts;
  onClose: () => void;
  onSubmit: (formData: {
    depositorName: string;
    message: string;
  }) => Promise<void>;
}

function PurchaseModal({ template, onClose, onSubmit }: PurchaseModalProps) {
  const { user } = useAuth();
  const [formData, setFormData] = useState({
    depositorName: "",
    message: "",
  });
  const [submitting, setSubmitting] = useState(false);

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
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg max-w-md w-full p-6 flex flex-col gap-4">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-bold text-slate-900">구매 신청</h2>
          <button
            onClick={onClose}
            className="text-slate-500 hover:text-slate-700"
          >
            ✕
          </button>
        </div>

        <div className=" p-3 bg-slate-50 rounded">
          <p className="font-medium text-slate-900">{template.name}</p>
          <p className="text-sm text-slate-600">{template.description}</p>
          <p className="text-lg font-bold text-[#1e3a8a] mt-2">
            ₩{template.template_products[0].price.toLocaleString()}
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
                <p>• 입금 확인 후 1-2일 이내에 템플릿 권한이 부여됩니다</p>
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
                계좌로 구매 금액을 이체한 후에 구매 신청 버튼을 눌러주세요
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
  );
}
