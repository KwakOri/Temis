"use client";

import {
  useAdminTemplates,
  useCreateAdminTemplate,
  useCreateTemplateProduct,
  useUpdateAdminTemplate,
  useUpdateTemplateProduct,
} from "@/hooks/query/useAdminTemplates";
import type {
  CreateTemplateData,
  CreateTemplateProductData,
  TemplateWithProducts,
} from "@/types/admin";
import { useMemo, useState } from "react";

interface CreateTemplateForm {
  name: string;
  description: string;
  detailed_description: string;
  thumbnail_url: string;
  is_public: boolean;
}

interface ProductForm {
  title: string;
  price: number;
  features: string[];
  requirements: string;
  // delivery_time: number; // DEPRECATED: No longer used
  purchase_instructions: string;
  // sample_images: string[]; // DEPRECATED: No longer used
}

type TemplateTab = "all" | "public" | "private";

export default function TemplateManagement() {
  const [activeTab, setActiveTab] = useState<TemplateTab>("all");
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [formData, setFormData] = useState<CreateTemplateForm>({
    name: "",
    description: "",
    detailed_description: "",
    thumbnail_url: "",
    is_public: false,
  });

  // React Query hooks
  const {
    data: templatesData,
    isLoading: loading,
    error: templatesError,
  } = useAdminTemplates();

  console.log("templatesData => ", templatesData);
  console.log("templatesError => ", templatesError);

  const templates = templatesData?.templates || [];

  const createTemplateMutation = useCreateAdminTemplate();
  const updateTemplateMutation = useUpdateAdminTemplate();
  const createProductMutation = useCreateTemplateProduct();
  const updateProductMutation = useUpdateTemplateProduct();

  const error = templatesError ? (templatesError as Error).message : "";
  const createLoading = createTemplateMutation.isPending;
  const createError = createTemplateMutation.error
    ? (createTemplateMutation.error as Error).message
    : "";

  // template_products 배열에서 첫 번째 상품 정보를 가져오는 함수 (1대1 관계)
  const getTemplateProduct = (template: TemplateWithProducts) => {
    return template.template_products && template.template_products.length > 0
      ? template.template_products[0]
      : null;
  };

  // 템플릿에 상품이 등록되어 있는지 확인하는 함수
  const hasProduct = (template: TemplateWithProducts): boolean => {
    return template.template_products && template.template_products.length > 0;
  };

  // 템플릿 ID 모달 및 검색 관련 상태
  const [showIdModal, setShowIdModal] = useState(false);
  const [selectedTemplateForId, setSelectedTemplateForId] =
    useState<TemplateWithProducts | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [copySuccess, setCopySuccess] = useState(false);

  // 상품 관리 관련 상태
  const [showProductModal, setShowProductModal] = useState(false);
  const [selectedTemplate, setSelectedTemplate] =
    useState<TemplateWithProducts | null>(null);
  const [productFormData, setProductFormData] = useState<ProductForm>({
    title: "",
    price: 15000,
    features: [
      "고화질 시간표 템플릿",
      "커스터마이징 가능한 소스 파일",
      "사용 가이드",
    ],
    requirements: "웹 브라우저만 있으면 사용 가능",
    // delivery_time: 2, // DEPRECATED: No longer used
    purchase_instructions: "결제 확인 후 1-2일 이내 권한 부여",
    // sample_images: [], // DEPRECATED: No longer used
  });
  const productLoading =
    createProductMutation.isPending || updateProductMutation.isPending;

  const togglePublicStatus = async (
    templateId: string,
    currentStatus: boolean
  ) => {
    try {
      await updateTemplateMutation.mutateAsync({
        templateId,
        data: { is_public: !currentStatus },
      });
    } catch (error) {
      console.error("Template update error:", error);
    }
  };

  const handleCreateTemplate = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      // 먼저 템플릿을 생성 (thumbnail_url은 임시로 빈 값)
      const templateData: CreateTemplateData = {
        ...formData,
        thumbnail_url: "", // 임시로 빈 값으로 설정
      };

      const createdTemplate = await createTemplateMutation.mutateAsync(
        templateData
      );

      // 생성된 템플릿의 ID를 사용하여 thumbnail_url 업데이트
      const thumbnailUrl = `/thumbnail/${createdTemplate.id}.png`;

      try {
        await updateTemplateMutation.mutateAsync({
          templateId: createdTemplate.id,
          data: { thumbnail_url: thumbnailUrl },
        });
      } catch (updateError) {
        console.warn("썸네일 URL 업데이트 실패, 하지만 템플릿은 생성됨");
      }

      // 성공 시 모달 닫기 및 폼 초기화
      resetModal();
    } catch (error) {
      // Error is handled by React Query mutation
    }
  };

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const { name, value, type } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]:
        type === "checkbox" ? (e.target as HTMLInputElement).checked : value,
    }));
  };

  const resetModal = () => {
    setShowCreateModal(false);
    createTemplateMutation.reset();
    setFormData({
      name: "",
      description: "",
      detailed_description: "",
      thumbnail_url: "",
      is_public: false,
    });
  };

  const handleShowTemplateId = (template: TemplateWithProducts) => {
    setSelectedTemplateForId(template);
    setShowIdModal(true);
  };

  const handleCopyTemplateId = async () => {
    if (selectedTemplateForId) {
      try {
        await navigator.clipboard.writeText(selectedTemplateForId.id);
        setCopySuccess(true);
        setTimeout(() => setCopySuccess(false), 2000);
      } catch (error) {
        console.error("복사 실패:", error);
      }
    }
  };

  const handleCloseIdModal = () => {
    setShowIdModal(false);
    setSelectedTemplateForId(null);
    setCopySuccess(false);
  };

  const handleGoToTemplate = (templateId: string) => {
    // 새 탭에서 템플릿 페이지 열기
    window.open(`/time-table/${templateId}`, "_blank");
  };

  // 탭별 템플릿 필터링
  const filteredTemplates = useMemo(() => {
    let filtered = templates;

    // 탭에 따른 필터링
    switch (activeTab) {
      case "public":
        filtered = templates.filter((template) => template.is_public);
        break;
      case "private":
        filtered = templates.filter((template) => !template.is_public);
        break;
      case "all":
      default:
        filtered = templates;
        break;
    }

    // 검색어 필터링
    if (searchTerm) {
      filtered = filtered.filter(
        (template) =>
          template.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
          (template.description &&
            template.description
              .toLowerCase()
              .includes(searchTerm.toLowerCase()))
      );
    }

    return filtered;
  }, [templates, activeTab, searchTerm]);

  // 탭별 통계
  const tabCounts = useMemo(() => {
    return {
      all: templates.length,
      public: templates.filter((template) => template.is_public).length,
      private: templates.filter((template) => !template.is_public).length,
    };
  }, [templates]);

  // 상품 등록 모달 열기
  const handleCreateProduct = (template: TemplateWithProducts) => {
    setSelectedTemplate(template);
    setProductFormData({
      title: template.name,
      price: 15000,
      features: [
        "고화질 시간표 템플릿",
        "커스터마이징 가능한 소스 파일",
        "사용 가이드",
      ],
      requirements: "웹 브라우저만 있으면 사용 가능",
      // delivery_time: 2, // DEPRECATED: No longer used
      purchase_instructions: "결제 확인 후 1-2일 이내 권한 부여",
      // sample_images: [], // DEPRECATED: No longer used
    });
    setShowProductModal(true);
  };

  // 상품 수정 모달 열기
  const handleEditProduct = (template: TemplateWithProducts) => {
    const templateProduct = getTemplateProduct(template);
    if (!templateProduct) return;

    setSelectedTemplate(template);
    setProductFormData({
      title: templateProduct.title || template.name,
      price: templateProduct.price,
      features: templateProduct.features || [],
      requirements: templateProduct.requirements || "",
      // delivery_time: templateProduct.delivery_time || 2, // DEPRECATED: No longer used
      purchase_instructions: templateProduct.purchase_instructions || "",
      // sample_images: templateProduct.sample_images || [], // DEPRECATED: No longer used
    });
    setShowProductModal(true);
  };

  // 상점 노출 여부 토글
  const toggleShopVisibility = async (template: TemplateWithProducts) => {
    if (!hasProduct(template)) return;

    try {
      await updateTemplateMutation.mutateAsync({
        templateId: template.id,
        data: { is_shop_visible: !template.is_shop_visible },
      });
    } catch (error) {
      console.error("Shop visibility toggle error:", error);
    }
  };

  // 상품 등록/수정 처리
  const handleProductSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTemplate) return;

    try {
      const templateProduct = getTemplateProduct(selectedTemplate);
      const isEditing = !!templateProduct;

      if (isEditing) {
        await updateProductMutation.mutateAsync({
          productId: templateProduct!.id,
          data: productFormData,
        });
      } else {
        const createData: CreateTemplateProductData = {
          ...productFormData,
          template_id: selectedTemplate.id,
        };
        await createProductMutation.mutateAsync(createData);
      }

      setShowProductModal(false);
      setSelectedTemplate(null);
    } catch (error) {
      console.error("Product submit error:", error);
      alert(error instanceof Error ? error.message : "오류가 발생했습니다.");
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center py-12">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-md p-4">
        <div className="text-red-800">{error}</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-primary">템플릿 관리</h2>
          <p className="text-secondary">전체 템플릿을 조회하고 관리하세요</p>
        </div>
        <div className="flex items-center gap-4">
          <div className="bg-quaternary px-4 py-2 rounded-lg border">
            <span className="text-[#F4FDFF] font-semibold">
              총 {templates.length}개
            </span>
          </div>
          <button
            onClick={() => setShowCreateModal(true)}
            className="bg-primary text-[#F4FDFF] px-4 py-2 rounded-md font-medium hover:bg-secondary transition-colors"
          >
            + 템플릿 추가
          </button>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="bg-white p-4 rounded-lg shadow-sm">
        <div className="mb-6">
          <div className="border-b border-slate-200">
            <nav className="-mb-px flex space-x-8 justify-center">
              <button
                onClick={() => setActiveTab("all")}
                className={`py-2 px-1 border-b-2 font-medium text-sm ${
                  activeTab === "all"
                    ? "border-[#1e3a8a] text-[#1e3a8a]"
                    : "border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300"
                }`}
              >
                전체 템플릿
                <span className="ml-2 py-0.5 px-2 rounded-full text-xs bg-slate-100 text-slate-600">
                  {tabCounts.all}
                </span>
              </button>
              <button
                onClick={() => setActiveTab("public")}
                className={`py-2 px-1 border-b-2 font-medium text-sm ${
                  activeTab === "public"
                    ? "border-[#1e3a8a] text-[#1e3a8a]"
                    : "border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300"
                }`}
              >
                공개 템플릿
                <span className="ml-2 py-0.5 px-2 rounded-full text-xs bg-green-100 text-green-600">
                  {tabCounts.public}
                </span>
              </button>
              <button
                onClick={() => setActiveTab("private")}
                className={`py-2 px-1 border-b-2 font-medium text-sm ${
                  activeTab === "private"
                    ? "border-[#1e3a8a] text-[#1e3a8a]"
                    : "border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300"
                }`}
              >
                비공개 템플릿
                <span className="ml-2 py-0.5 px-2 rounded-full text-xs bg-slate-100 text-slate-600">
                  {tabCounts.private}
                </span>
              </button>
            </nav>
          </div>
        </div>
      </div>

      {/* Search Bar */}
      {templates.length > 3 && (
        <div className="bg-white p-4 rounded-lg shadow-sm">
          <div className="relative">
            <input
              type="text"
              placeholder="템플릿 검색 (이름 또는 설명)..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="block w-full pl-10 pr-10 py-2 border border-gray-300 rounded-md leading-5 bg-white placeholder-gray-500 focus:outline-none focus:placeholder-gray-400 focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500"
            />
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <svg
                className="h-5 w-5 text-gray-400"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                />
              </svg>
            </div>
            {searchTerm && (
              <button
                onClick={() => setSearchTerm("")}
                className="absolute inset-y-0 right-0 pr-3 flex items-center"
              >
                <svg
                  className="h-5 w-5 text-gray-400 hover:text-gray-600"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </button>
            )}
          </div>
        </div>
      )}

      {/* Templates List */}
      <div className="bg-white shadow-sm rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  템플릿
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  상태
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  상품 상태
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  생성일
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-80">
                  작업
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {(() => {
                if (
                  filteredTemplates.length === 0 &&
                  (searchTerm || activeTab !== "all")
                ) {
                  return (
                    <tr>
                      <td colSpan={5} className="px-6 py-12 text-center">
                        <div className="text-gray-500">
                          <svg
                            className="mx-auto h-12 w-12 text-gray-400 mb-4"
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                            />
                          </svg>
                          <p>
                            {searchTerm ? (
                              <>
                                &apos;{searchTerm}&apos;에 대한 검색 결과가
                                없습니다.
                              </>
                            ) : activeTab === "public" ? (
                              "공개 템플릿이 없습니다."
                            ) : activeTab === "private" ? (
                              "비공개 템플릿이 없습니다."
                            ) : (
                              "템플릿이 없습니다."
                            )}
                          </p>
                        </div>
                      </td>
                    </tr>
                  );
                }

                return filteredTemplates.map((template) => (
                  <tr key={template.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div>
                        <div className="text-sm font-medium text-gray-900">
                          {template.name}
                        </div>
                        {template.description && (
                          <div className="text-sm text-gray-500 truncate max-w-xs">
                            {template.description}
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span
                        className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                          template.is_public
                            ? "bg-green-100 text-green-800"
                            : "bg-gray-100 text-gray-800"
                        }`}
                      >
                        {template.is_public ? "공개" : "비공개"}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {template.is_public ? (
                        hasProduct(template) ? (
                          <div className="flex flex-col items-start gap-1">
                            <span
                              className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                                template.is_shop_visible
                                  ? "bg-blue-100 text-blue-800"
                                  : "bg-orange-100 text-orange-800"
                              }`}
                            >
                              {template.is_shop_visible
                                ? "상점 노출됨"
                                : "상점 비노출"}
                            </span>
                            <span className="text-xs text-gray-500">
                              ₩
                              {getTemplateProduct(
                                template
                              )!.price.toLocaleString()}
                            </span>
                          </div>
                        ) : (
                          <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-gray-100 text-gray-800">
                            상품 미등록
                          </span>
                        )
                      ) : (
                        <span className="text-xs text-gray-400">-</span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {new Date(template.created_at).toLocaleDateString(
                        "ko-KR"
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      <div className="flex flex-wrap gap-2">
                        <button
                          onClick={() => handleGoToTemplate(template.id)}
                          className="px-3 py-1 rounded text-xs font-medium bg-indigo-100 text-indigo-700 hover:bg-indigo-200 transition-colors flex items-center gap-1"
                          title="새 탭에서 템플릿 열기"
                        >
                          <svg
                            className="w-3 h-3"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
                            />
                          </svg>
                          템플릿 열기
                        </button>
                        <button
                          onClick={() => handleShowTemplateId(template)}
                          className="px-3 py-1 rounded text-xs font-medium bg-blue-100 text-blue-700 hover:bg-blue-200 transition-colors"
                        >
                          ID 보기
                        </button>
                        <button
                          onClick={() =>
                            togglePublicStatus(template.id, template.is_public)
                          }
                          className={`px-3 py-1 rounded text-xs font-medium ${
                            template.is_public
                              ? "bg-gray-100 text-gray-700 hover:bg-gray-200"
                              : "bg-green-100 text-green-700 hover:bg-green-200"
                          } transition-colors`}
                        >
                          {template.is_public ? "비공개로 변경" : "공개로 변경"}
                        </button>

                        {/* 상품 관리 버튼들 - 공개 템플릿만 */}
                        {template.is_public && (
                          <>
                            {!hasProduct(template) ? (
                              <button
                                onClick={() => handleCreateProduct(template)}
                                className="px-3 py-1 rounded text-xs font-medium bg-emerald-100 text-emerald-700 hover:bg-emerald-200 transition-colors"
                              >
                                상품 등록하기
                              </button>
                            ) : (
                              <>
                                <button
                                  onClick={() => handleEditProduct(template)}
                                  className="px-3 py-1 rounded text-xs font-medium bg-purple-100 text-purple-700 hover:bg-purple-200 transition-colors"
                                >
                                  상품 수정하기
                                </button>
                                <button
                                  onClick={() => toggleShopVisibility(template)}
                                  className={`px-3 py-1 rounded text-xs font-medium ${
                                    template.is_shop_visible
                                      ? "bg-red-100 text-red-700 hover:bg-red-200"
                                      : "bg-green-100 text-green-700 hover:bg-green-200"
                                  } transition-colors`}
                                >
                                  {template.is_shop_visible
                                    ? "상점에서 내리기"
                                    : "상점에 노출하기"}
                                </button>
                              </>
                            )}
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ));
              })()}
            </tbody>
          </table>
        </div>

        {templates.length === 0 && !searchTerm && activeTab === "all" && (
          <div className="text-center py-12">
            <div className="text-gray-500">등록된 템플릿이 없습니다.</div>
          </div>
        )}
      </div>

      {/* Create Template Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md mx-4">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold">새 템플릿 추가</h3>
              <button
                onClick={resetModal}
                className="text-gray-400 hover:text-gray-600"
              >
                ✕
              </button>
            </div>

            {createError && (
              <div className="bg-red-50 border border-red-200 rounded-md p-3 mb-4">
                <div className="text-red-800 text-sm">{createError}</div>
              </div>
            )}

            <form onSubmit={handleCreateTemplate} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  템플릿 이름 *
                </label>
                <input
                  type="text"
                  name="name"
                  value={formData.name}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  placeholder="템플릿 이름을 입력하세요"
                  required
                  maxLength={100}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  간단 설명
                </label>
                <textarea
                  name="description"
                  value={formData.description}
                  onChange={handleInputChange}
                  rows={2}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  placeholder="템플릿 간단 설명을 입력하세요 (목록에 표시됨)"
                  maxLength={200}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  상세 설명
                </label>
                <textarea
                  name="detailed_description"
                  value={formData.detailed_description}
                  onChange={handleInputChange}
                  rows={6}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  placeholder="템플릿에 대한 자세한 설명을 입력하세요 (상세 페이지에 표시됨)"
                  maxLength={2000}
                />
                <div className="mt-1 text-xs text-gray-500">
                  줄바꿈은 자동으로 반영됩니다. 최대 2000자
                </div>
              </div>

              {/* 썸네일 정보 섹션 */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  썸네일 이미지
                </label>

                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <div className="flex items-start gap-3">
                    <svg
                      className="w-5 h-5 text-blue-500 mt-0.5 flex-shrink-0"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                      />
                    </svg>
                    <div className="text-sm">
                      <p className="text-blue-800 font-medium mb-1">
                        썸네일 자동 설정
                      </p>
                      <p className="text-blue-700">
                        템플릿 생성 후{" "}
                        <code className="bg-blue-100 px-1 rounded text-xs">
                          /public/thumbnail/[template_id].png
                        </code>{" "}
                        경로에 썸네일 이미지를 추가하면 자동으로 표시됩니다.
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              <div>
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    name="is_public"
                    checked={formData.is_public}
                    onChange={handleInputChange}
                    className="mr-2 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                  />
                  <span className="text-sm font-medium text-gray-700">
                    공개 템플릿으로 설정
                  </span>
                </label>
              </div>

              <div className="flex justify-end gap-3 mt-6">
                <button
                  type="button"
                  onClick={resetModal}
                  className="px-4 py-2 text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200 transition-colors"
                  disabled={createLoading}
                >
                  취소
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  disabled={createLoading}
                >
                  {createLoading ? "생성 중..." : "템플릿 생성"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Template ID Modal */}
      {showIdModal && selectedTemplateForId && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md mx-4">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold">템플릿 ID</h3>
              <button
                onClick={handleCloseIdModal}
                className="text-gray-400 hover:text-gray-600"
              >
                ✕
              </button>
            </div>

            <div className="space-y-4">
              {/* Template Info */}
              <div className="bg-gray-50 p-4 rounded-lg">
                <div className="text-sm text-gray-600 mb-1">템플릿 이름</div>
                <div className="font-medium text-gray-900">
                  {selectedTemplateForId.name}
                </div>
                {selectedTemplateForId.description && (
                  <>
                    <div className="text-sm text-gray-600 mt-3 mb-1">설명</div>
                    <div className="text-sm text-gray-700">
                      {selectedTemplateForId.description}
                    </div>
                  </>
                )}
              </div>

              {/* Template ID */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  템플릿 ID
                </label>
                <div className="relative">
                  <input
                    type="text"
                    value={selectedTemplateForId.id}
                    readOnly
                    className="block w-full pr-10 py-2 px-3 border border-gray-300 bg-gray-50 rounded-md text-sm font-mono"
                  />
                  <button
                    onClick={handleCopyTemplateId}
                    className="absolute inset-y-0 right-0 pr-3 flex items-center"
                  >
                    {copySuccess ? (
                      <svg
                        className="h-5 w-5 text-green-500"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M5 13l4 4L19 7"
                        />
                      </svg>
                    ) : (
                      <svg
                        className="h-5 w-5 text-gray-400 hover:text-gray-600"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"
                        />
                      </svg>
                    )}
                  </button>
                </div>
                {copySuccess && (
                  <div className="mt-2 text-sm text-green-600 flex items-center">
                    <svg
                      className="h-4 w-4 mr-1"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M5 13l4 4L19 7"
                      />
                    </svg>
                    클립보드에 복사되었습니다!
                  </div>
                )}
              </div>

              {/* Additional Info */}
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <div className="flex items-start gap-3">
                  <svg
                    className="w-5 h-5 text-blue-500 mt-0.5 flex-shrink-0"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                    />
                  </svg>
                  <div className="text-sm">
                    <p className="text-blue-800 font-medium mb-1">
                      템플릿 ID 사용법
                    </p>
                    <p className="text-blue-700">
                      이 ID를 사용하여 API 호출이나 직접 템플릿 참조가
                      가능합니다. 개발자에게 전달하거나 시스템 연동 시
                      사용하세요.
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-3 mt-6">
              <button
                onClick={() => handleGoToTemplate(selectedTemplateForId.id)}
                className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 transition-colors flex items-center gap-2"
              >
                <svg
                  className="h-4 w-4"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
                  />
                </svg>
                템플릿 열기
              </button>
              <button
                onClick={handleCopyTemplateId}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors flex items-center gap-2"
              >
                <svg
                  className="h-4 w-4"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"
                  />
                </svg>
                ID 복사
              </button>
              <button
                onClick={handleCloseIdModal}
                className="px-4 py-2 text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200 transition-colors"
              >
                닫기
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Product Management Modal */}
      {showProductModal && selectedTemplate && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-lg mx-4 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold">
                {hasProduct(selectedTemplate) ? "상품 정보 수정" : "상품 등록"}
              </h3>
              <button
                onClick={() => {
                  setShowProductModal(false);
                  setSelectedTemplate(null);
                }}
                className="text-gray-400 hover:text-gray-600"
              >
                ✕
              </button>
            </div>

            <div className="mb-4 p-3 bg-slate-50 rounded-lg">
              <h4 className="font-medium text-slate-900">
                {selectedTemplate.name}
              </h4>
              <p className="text-sm text-slate-600">
                {selectedTemplate.description}
              </p>
            </div>

            <form onSubmit={handleProductSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  상품명 *
                </label>
                <input
                  type="text"
                  required
                  value={productFormData.title}
                  onChange={(e) =>
                    setProductFormData((prev) => ({
                      ...prev,
                      title: e.target.value,
                    }))
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  placeholder="상품명을 입력하세요"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  가격 (원) *
                </label>
                <input
                  type="number"
                  required
                  min="0"
                  value={productFormData.price}
                  onChange={(e) =>
                    setProductFormData((prev) => ({
                      ...prev,
                      price: parseInt(e.target.value) || 0,
                    }))
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  포함 사항 (한 줄에 하나씩)
                </label>
                <textarea
                  value={productFormData.features.join("\n")}
                  onChange={(e) =>
                    setProductFormData((prev) => ({
                      ...prev,
                      features: e.target.value
                        .split("\n")
                        .filter((f) => f.trim()),
                    }))
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  rows={4}
                  placeholder="고화질 시간표 템플릿&#10;커스터마이징 가능한 소스 파일&#10;사용 가이드"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  요구사항
                </label>
                <input
                  type="text"
                  value={productFormData.requirements}
                  onChange={(e) =>
                    setProductFormData((prev) => ({
                      ...prev,
                      requirements: e.target.value,
                    }))
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  placeholder="웹 브라우저만 있으면 사용 가능"
                />
              </div>

              {/* DEPRECATED: delivery_time field is no longer used
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  배송 시간 (일)
                </label>
                <input
                  type="number"
                  min="1"
                  value={productFormData.delivery_time}
                  onChange={(e) =>
                    setProductFormData((prev) => ({
                      ...prev,
                      delivery_time: parseInt(e.target.value) || 1,
                    }))
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
              */}

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  구매 안내사항
                </label>
                <textarea
                  value={productFormData.purchase_instructions}
                  onChange={(e) =>
                    setProductFormData((prev) => ({
                      ...prev,
                      purchase_instructions: e.target.value,
                    }))
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  rows={3}
                  placeholder="결제 확인 후 1-2일 이내 권한 부여"
                />
              </div>

              {/* DEPRECATED: sample_images field is no longer used
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  샘플 이미지 URL (한 줄에 하나씩)
                </label>
                <textarea
                  value={productFormData.sample_images.join("\n")}
                  onChange={(e) =>
                    setProductFormData((prev) => ({
                      ...prev,
                      sample_images: e.target.value
                        .split("\n")
                        .filter((url) => url.trim()),
                    }))
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  rows={3}
                  placeholder="https://example.com/image1.png&#10;https://example.com/image2.png"
                />
                <div className="mt-1 text-xs text-gray-500">
                  샘플 이미지 URL을 한 줄에 하나씩 입력하세요
                </div>
              </div>
              */}

              <div className="flex justify-end gap-3 mt-6">
                <button
                  type="button"
                  onClick={() => {
                    setShowProductModal(false);
                    setSelectedTemplate(null);
                  }}
                  className="px-4 py-2 text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200 transition-colors"
                  disabled={productLoading}
                >
                  취소
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 transition-colors disabled:opacity-50"
                  disabled={productLoading}
                >
                  {productLoading
                    ? "처리 중..."
                    : hasProduct(selectedTemplate)
                    ? "상품 수정"
                    : "상품 등록"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
