"use client";

import BackButton from "@/components/BackButton";
import CustomOrderForm from "@/components/shop/CustomOrderForm";
import { useAuth } from "@/contexts/AuthContext";
import { useSubmitCustomOrder } from "@/hooks/query/useCustomOrder";
import { CustomOrderFormData } from "@/types/customOrder";
import { Palette } from "lucide-react";
import Link from "next/link";
import { useState } from "react";

export default function CustomOrderPage() {
  const { user } = useAuth();
  const [showOrderForm, setShowOrderForm] = useState(false);

  const submitOrderMutation = useSubmitCustomOrder();

  const handleOrderSubmit = async (formData: CustomOrderFormData) => {
    try {
      await submitOrderMutation.mutateAsync(formData);

      alert("맞춤형 시간표 제작 신청이 완료되었습니다!");

      // form 닫기
      setShowOrderForm(false);
    } catch (error) {
      console.error("Order submission error:", error);
      alert(
        error instanceof Error ? error.message : "신청 중 오류가 발생했습니다."
      );
    }
  };

  if (!user) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 py-6 md:py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <BackButton className="mb-6" />

          <div className="bg-white rounded-2xl shadow-xl p-6 md:p-8 backdrop-blur-sm border border-white/20">
            <div className="text-center py-12">
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-full mb-6 bg-[#1e3a8a]">
                <Palette className="w-8 h-8 text-white" />
              </div>
              <h1 className="text-2xl font-bold text-slate-900 mb-4">
                맞춤형 시간표 제작
              </h1>
              <p className="text-slate-600 mb-6">로그인이 필요합니다.</p>
              <Link
                href="/auth"
                className="inline-block bg-[#1e3a8a] text-white px-6 py-3 rounded-lg hover:bg-blue-800 transition-colors font-semibold"
              >
                로그인하기
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <>
      {showOrderForm || (
        <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 py-6 md:py-12 px-4 sm:px-6 lg:px-8">
          <div className="max-w-7xl mx-auto">
            <BackButton className="mb-6" />

            <div className="bg-white rounded-2xl shadow-xl p-6 md:p-8 border border-white/20 mb-8">
              <div className="text-center mb-6 md:mb-8">
                <div className="inline-flex items-center justify-center w-16 h-16 rounded-full mb-6 bg-[#1e3a8a]">
                  <Palette className="w-8 h-8 text-white" />
                </div>
                <h1 className="text-2xl md:text-3xl font-bold text-slate-900 mb-2">
                  맞춤형 시간표 제작
                </h1>
                <p className="text-slate-600">
                  나만의 특별한 시간표를 제작해보세요
                </p>
              </div>

              {/* 컨텐츠 영역 */}
              <div className="text-center">
                <div className="mb-8">
                  <h2 className="text-xl font-semibold text-slate-900 mb-2">
                    맞춤형 시간표 제작 서비스
                  </h2>
                  <p className="text-slate-600 mb-6">
                    버튜버를 위한 개성 있는 시간표를 전문가가 직접
                    제작해드립니다.
                  </p>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                    <div className="bg-slate-50 rounded-lg p-6">
                      <div className="text-2xl font-bold text-[#1e3a8a] mb-2">
                        8만원
                      </div>
                      <div className="text-sm text-slate-600">
                        기본 제작 비용
                      </div>
                    </div>
                    <div className="bg-slate-50 rounded-lg p-6">
                      <div className="text-2xl font-bold text-[#1e3a8a] mb-2">
                        2-4주
                      </div>
                      <div className="text-sm text-slate-600">제작 기간</div>
                    </div>
                    <div className="bg-slate-50 rounded-lg p-6">
                      <div className="text-2xl font-bold text-[#1e3a8a] mb-2">
                        1만원 할인
                      </div>
                      <div className="text-sm text-slate-600">
                        후기 이벤트 시
                      </div>
                    </div>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
                    <div className="bg-slate-50 rounded-lg p-6">
                      <div className="text-2xl font-bold text-[#1e3a8a] mb-2">
                        기본 구성
                      </div>
                      <div className="text-sm text-slate-600">
                        <p>기본적인 시간표 디자인과</p>
                        <p>프로필 이미지 영역, 아티스트 이름 영역,</p>
                        <p>그리고 요일별 방송 정보 카드를</p>
                        <p>PC와 모바일에서 편집, 저장하실 수 있습니다</p>
                      </div>
                    </div>
                    <div className="bg-slate-50 rounded-lg p-6">
                      <div className="text-2xl font-bold text-[#1e3a8a] mb-2">
                        추가 구성
                      </div>
                      <div className="text-sm text-slate-600">
                        <p>하루 내에 여러 번의 방송 시간대가 있는 경우,</p>
                        <p>휴방 부분에 메모를 따로 적거나</p>
                        <p>주간 메모를 따로 적으시고 싶은 경우</p>
                        <p>옵션을 추가하실 수 있습니다</p>
                      </div>
                    </div>
                  </div>
                </div>
                <div className="grid grid-cols-1 gap-6 mb-8">
                  <div className="bg-slate-50 rounded-lg p-6">
                    <div className="text-2xl font-bold text-[#1e3a8a] mb-2">
                      별도 문의
                    </div>
                    <div className="text-sm text-slate-600">
                      <p>
                        그 외에 배경 전환이나 스티커처럼 별도의 요청사항이
                        있으신 경우에는
                      </p>{" "}
                      <p>
                        공식 트위터{" "}
                        <a href="https://x.com/TEMISforyou">@TEMISforyou</a>로
                        문의주시면 안내해드립니다
                      </p>
                    </div>
                  </div>
                </div>

                <button
                  onClick={() => setShowOrderForm(true)}
                  className="bg-[#1e3a8a] text-white px-8 py-3 rounded-lg hover:bg-blue-800 transition-colors font-semibold text-lg"
                >
                  제작 신청하기
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      {/* 신규 주문 폼 모달 */}
      {showOrderForm && (
        <CustomOrderForm
          onClose={() => setShowOrderForm(false)}
          onSubmit={handleOrderSubmit}
        />
      )}
    </>
  );
}
