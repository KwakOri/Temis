"use client";

import { supabase } from "@/lib/supabase";
import { Template } from "@/types/supabase-types";
import Image from "next/image";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";

interface TemplateProduct {
  id: string;
  template_id: string;
  title: string;
  detailed_description: string | null;
  price: number;
  features: string[] | null;
  requirements: string | null;
  delivery_time: number | null;
  sample_images: string[] | null;
  is_available: boolean;
  is_custom_order: boolean;
  purchase_instructions: string | null;
  bank_account_info: string | null;
  created_at: string;
  updated_at: string;
}

interface TemplateWithProduct extends Template {
  template_product?: TemplateProduct;
}

export default function TemplateDetailPage() {
  const params = useParams();
  const router = useRouter();
  const [template, setTemplate] = useState<TemplateWithProduct | null>(null);
  const [loading, setLoading] = useState(true);
  const [showPurchaseForm, setShowPurchaseForm] = useState(false);

  useEffect(() => {
    if (params?.id) {
      fetchTemplateDetail(params.id as string);
    }
  }, [params?.id]);

  const fetchTemplateDetail = async (templateId: string) => {
    try {
      // 템플릿 기본 정보 조회
      const { data: templateData, error: templateError } = await supabase
        .from("templates")
        .select("*")
        .eq("id", templateId)
        .eq("is_public", true)
        .single();

      if (templateError) throw templateError;

      // 템플릿 상품 정보 조회 (template_products 테이블이 존재하지 않으므로 임시로 기본 정보만 사용)
      // TODO: template_products 테이블 생성 후 조인 쿼리 사용
      setTemplate(templateData);
    } catch (error) {
      console.error("Error fetching template detail:", error);
      router.push("/shop");
    } finally {
      setLoading(false);
    }
  };

  const handlePurchaseRequest = async (formData: {
    name: string;
    email: string;
    phone: string;
    message: string;
  }) => {
    try {
      const response = await fetch("/api/shop/purchase-request", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          template_id: template?.id,
          customer_name: formData.name,
          customer_email: formData.email,
          customer_phone: formData.phone,
          message: formData.message,
        }),
      });

      const result = await response.json();

      if (response.ok) {
        alert("구매 신청이 접수되었습니다. 곧 연락드리겠습니다.");
        setShowPurchaseForm(false);
      } else {
        alert(result.error || "구매 신청 중 오류가 발생했습니다.");
      }
    } catch (error) {
      console.error("Purchase request error:", error);
      alert("구매 신청 중 오류가 발생했습니다.");
    }
  };

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="text-center">로딩 중...</div>
      </div>
    );
  }

  if (!template) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="text-center">
          <p className="text-gray-500 mb-4">템플릿을 찾을 수 없습니다.</p>
          <button
            onClick={() => router.push("/shop")}
            className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
          >
            상점으로 돌아가기
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      {/* 뒤로가기 버튼 */}
      <button
        onClick={() => router.push("/shop")}
        className="mb-6 text-blue-600 hover:text-blue-800 flex items-center gap-2"
      >
        ← 상점으로 돌아가기
      </button>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* 이미지 섹션 */}
        <div className="space-y-4">
          <div className="aspect-video bg-gray-100 rounded-lg overflow-hidden">
            <Image
              src={`/thumbnail/${template.id}.png`}
              alt={template.name}
              width={600}
              height={338}
              className="w-full h-full object-cover"
              onError={(e) => {
                const target = e.target as HTMLImageElement;
                target.style.display = 'none';
                const parent = target.parentElement;
                if (parent) {
                  parent.innerHTML = '<div class="w-full h-full flex items-center justify-center text-gray-400">썸네일 이미지 없음</div>';
                }
              }}
            />
          </div>
        </div>

        {/* 상품 정보 섹션 */}
        <div className="space-y-6">
          <div>
            <h1 className="text-3xl font-bold mb-2">{template.name}</h1>
            <p className="text-gray-600">{template.description}</p>
          </div>

          {/* 임시 상품 정보 (template_products 테이블 생성 후 실제 데이터로 교체) */}
          <div className="border-t pt-6">
            <div className="mb-4">
              <span className="text-2xl font-bold text-blue-600">₩15,000</span>
              <span className="text-gray-500 ml-2">구매 후 즉시 사용 가능</span>
            </div>

            <div className="space-y-4">
              <div>
                <h3 className="font-semibold mb-2">포함 사항</h3>
                <ul className="list-disc list-inside text-gray-600 space-y-1">
                  <li>고화질 시간표 템플릿</li>
                  <li>커스터마이징 가능한 소스 파일</li>
                  <li>사용 가이드</li>
                </ul>
              </div>

              <div>
                <h3 className="font-semibold mb-2">요구사항</h3>
                <p className="text-gray-600">웹 브라우저만 있으면 사용 가능</p>
              </div>

              <div>
                <h3 className="font-semibold mb-2">배송 시간</h3>
                <p className="text-gray-600">결제 확인 후 1-2일 이내</p>
              </div>
            </div>
          </div>

          {/* 구매 버튼 */}
          <div className="border-t pt-6">
            <button
              onClick={() => setShowPurchaseForm(true)}
              className="w-full bg-blue-600 text-white py-3 rounded-lg hover:bg-blue-700 transition-colors font-semibold"
            >
              구매 신청하기
            </button>
            <p className="text-sm text-gray-500 mt-2 text-center">
              계좌 송금으로 결제가 진행됩니다
            </p>
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
  template: Template;
  onClose: () => void;
  onSubmit: (formData: {
    name: string;
    email: string;
    phone: string;
    message: string;
  }) => Promise<void>;
}

function PurchaseModal({ template, onClose, onSubmit }: PurchaseModalProps) {
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    message: "",
  });
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
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
      <div className="bg-white rounded-lg max-w-md w-full p-6">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-bold">구매 신청</h2>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700"
          >
            ✕
          </button>
        </div>

        <div className="mb-4 p-3 bg-gray-50 rounded">
          <p className="font-medium">{template.name}</p>
          <p className="text-sm text-gray-600">{template.description}</p>
          <p className="text-lg font-bold text-blue-600 mt-2">₩15,000</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">이름 *</label>
            <input
              type="text"
              required
              value={formData.name}
              onChange={(e) =>
                setFormData((prev) => ({ ...prev, name: e.target.value }))
              }
              className="w-full border border-gray-300 rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">이메일 *</label>
            <input
              type="email"
              required
              value={formData.email}
              onChange={(e) =>
                setFormData((prev) => ({ ...prev, email: e.target.value }))
              }
              className="w-full border border-gray-300 rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">연락처 *</label>
            <input
              type="tel"
              required
              value={formData.phone}
              onChange={(e) =>
                setFormData((prev) => ({ ...prev, phone: e.target.value }))
              }
              className="w-full border border-gray-300 rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">요청사항</label>
            <textarea
              value={formData.message}
              onChange={(e) =>
                setFormData((prev) => ({ ...prev, message: e.target.value }))
              }
              className="w-full border border-gray-300 rounded px-3 py-2 h-20 resize-none focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="추가 요청사항이 있으시면 적어주세요"
            />
          </div>

          <div className="bg-blue-50 p-3 rounded">
            <h4 className="font-medium text-blue-800 mb-1">결제 안내</h4>
            <p className="text-sm text-blue-700">
              구매 신청 후 계좌 정보를 안내해드립니다.
              <br />
              입금 확인 후 1-2일 이내에 템플릿을 전달받으실 수 있습니다.
            </p>
          </div>

          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 border border-gray-300 py-2 rounded hover:bg-gray-50"
            >
              취소
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="flex-1 bg-blue-600 text-white py-2 rounded hover:bg-blue-700 disabled:opacity-50"
            >
              {submitting ? "신청 중..." : "구매 신청"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
