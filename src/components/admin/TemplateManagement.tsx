"use client";

import AdminTabHeader from "@/components/admin/AdminTabHeader";
import {
  useAdminArtists,
  useUpdateTemplateArtists,
} from "@/hooks/query/useAdminArtists";
import {
  useAdminTemplates,
  useCreateAdminTemplate,
  useCreateTemplatePlan,
  useCreateShopTemplate,
  useUpdateAdminTemplate,
  useUpdateTemplatePlan,
  useUpdateShopTemplate,
} from "@/hooks/query/useAdminTemplates";
import { AdminTemplateService } from "@/services/admin/templateService";
import type {
  Artist,
  CreateTemplateData,
  TemplatePlan,
  TemplateWithShopTemplateAndPlans,
} from "@/types/admin";
import type { ShopTemplateWithPlans as ShopTemplateDetailData } from "@/types/templateDetail";
import { FileText } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

interface CreateTemplateForm {
  name: string;
  description: string;
  thumbnail_url: string;
  is_public: boolean;
}

interface PlanOptions {
  is_artist: boolean;
  is_memo: boolean;
  is_multi_schedule: boolean;
  is_guerrilla: boolean;
  is_offline_memo: boolean;
}

interface ProductForm {
  title: string;
  detailed_description: string; // 상점 전용 상세 설명
  enableLite: boolean; // LITE 플랜 등록 여부
  litePrice: number;
  enablePro: boolean; // PRO 플랜 등록 여부
  proPrice: number;
  features: string[];
  requirements: string;
  purchase_instructions: string;
  templateOptions: PlanOptions; // 템플릿 기본 기능
  liteOptions: PlanOptions; // LITE 플랜 사용 가능 기능
  proOptions: PlanOptions; // PRO 플랜 사용 가능 기능
}

type TemplateTab = "public" | "private";

const ITEMS_PER_PAGE = 20;

export default function TemplateManagement() {
  const [activeTab, setActiveTab] = useState<TemplateTab>("public");
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [searchTerm, setSearchTerm] = useState("");
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState("");
  const [formData, setFormData] = useState<CreateTemplateForm>({
    name: "",
    description: "",
    thumbnail_url: "",
    is_public: false,
  });

  // React Query hooks
  const {
    data: templatesData,
    isLoading: loading,
    error: templatesError,
  } = useAdminTemplates({
    limit: ITEMS_PER_PAGE,
    offset: (currentPage - 1) * ITEMS_PER_PAGE,
    visibility: activeTab,
    search: debouncedSearchTerm || undefined,
  });

  const templates = useMemo(
    () => templatesData?.templates ?? [],
    [templatesData?.templates]
  );
  const pagination = templatesData?.pagination;

  const createTemplateMutation = useCreateAdminTemplate();
  const updateTemplateMutation = useUpdateAdminTemplate();
  const createProductMutation = useCreateShopTemplate();
  const updateProductMutation = useUpdateShopTemplate();
  const createPlanMutation = useCreateTemplatePlan();
  const updatePlanMutation = useUpdateTemplatePlan();
  const updateTemplateArtistsMutation = useUpdateTemplateArtists();
  const { data: artists = [] } = useAdminArtists({ isActive: true });

  const error = templatesError ? (templatesError as Error).message : "";
  const createLoading = createTemplateMutation.isPending;
  const createError = createTemplateMutation.error
    ? (createTemplateMutation.error as Error).message
    : "";

  // 템플릿에 상품이 등록되어 있는지 확인하는 함수
  const hasProduct = (template: TemplateWithShopTemplateAndPlans): boolean => {
    return template.shop_templates && template.shop_templates.length > 0;
  };

  const getShopTemplate = (template: TemplateWithShopTemplateAndPlans) => {
    return template.shop_templates?.[0] || null;
  };

  const hasLinkedArtist = (template: TemplateWithShopTemplateAndPlans) => {
    return (template.template_artists?.length || 0) > 0;
  };

  const isSelling = (template: TemplateWithShopTemplateAndPlans) => {
    return Boolean(getShopTemplate(template)?.is_shop_visible);
  };

  const getTemplateArtistLabel = (template: TemplateWithShopTemplateAndPlans) => {
    const relations = (template.template_artists || [])
      .slice()
      .sort((a, b) => {
        if (a.is_primary !== b.is_primary) {
          return a.is_primary ? -1 : 1;
        }
        if (a.display_order !== b.display_order) {
          return a.display_order - b.display_order;
        }
        return 0;
      });

    const names = relations
      .map((relation) => relation.artist?.name?.trim())
      .filter((name): name is string => Boolean(name));

    if (names.length === 0) {
      return "미연결";
    }

    if (names.length === 1) {
      return names[0];
    }

    return `${names[0]} 외 ${names.length - 1}명`;
  };

  const noArtistOption = useMemo(
    () => artists.find((artist) => artist.slug === "no-artist"),
    [artists]
  );

  // 옵션 레이블 매핑
  const optionLabels: Record<keyof PlanOptions, string> = {
    is_artist: "아티스트",
    is_memo: "메모",
    is_multi_schedule: "다중 스케줄",
    is_guerrilla: "게릴라",
    is_offline_memo: "오프라인 메모",
  };

  // 템플릿 ID 모달 및 검색 관련 상태
  const [showIdModal, setShowIdModal] = useState(false);
  const [selectedTemplateForId, setSelectedTemplateForId] =
    useState<TemplateWithShopTemplateAndPlans | null>(null);
  const [copySuccess, setCopySuccess] = useState(false);

  // 상품 관리 관련 상태
  const [showProductModal, setShowProductModal] = useState(false);
  const [selectedTemplate, setSelectedTemplate] =
    useState<TemplateWithShopTemplateAndPlans | null>(null);
  const [productFormData, setProductFormData] = useState<ProductForm>({
    title: "",
    detailed_description: "",
    enableLite: true,
    litePrice: 15000,
    enablePro: true,
    proPrice: 25000,
    features: [
      "고화질 시간표 템플릿",
      "커스터마이징 가능한 소스 파일",
      "사용 가이드",
    ],
    requirements: "웹 브라우저만 있으면 사용 가능",
    purchase_instructions: "결제 확인 후 1-2일 이내 권한 부여",
    templateOptions: {
      is_artist: false,
      is_memo: false,
      is_multi_schedule: false,
      is_guerrilla: false,
      is_offline_memo: false,
    },
    liteOptions: {
      is_artist: false,
      is_memo: false,
      is_multi_schedule: false,
      is_guerrilla: false,
      is_offline_memo: false,
    },
    proOptions: {
      is_artist: false,
      is_memo: false,
      is_multi_schedule: false,
      is_guerrilla: false,
      is_offline_memo: false,
    },
  });
  const [selectedArtistIds, setSelectedArtistIds] = useState<string[]>([]);
  const [primaryArtistId, setPrimaryArtistId] = useState<string | null>(null);
  const productLoading =
    createProductMutation.isPending ||
    updateProductMutation.isPending ||
    updateTemplateArtistsMutation.isPending;

  const closeProductModal = () => {
    setShowProductModal(false);
    setSelectedTemplate(null);
    setSelectedArtistIds([]);
    setPrimaryArtistId(null);
  };

  const previewTemplate = useMemo<ShopTemplateDetailData | null>(() => {
    if (!selectedTemplate) {
      return null;
    }

    const now = new Date().toISOString();
    const existingShopTemplate = selectedTemplate.shop_templates?.[0];
    const previewShopTemplateId =
      existingShopTemplate?.id || `preview-shop-${selectedTemplate.id}`;
    const normalizedPrimaryArtistId =
      selectedArtistIds.length === 0
        ? null
        : selectedArtistIds.includes(primaryArtistId || "")
        ? primaryArtistId
        : selectedArtistIds[0];

    const artistById = new Map<string, Artist>();
    for (const artist of artists) {
      artistById.set(artist.id, artist);
    }
    for (const relation of selectedTemplate.template_artists || []) {
      if (relation.artist) {
        artistById.set(relation.artist_id, relation.artist);
      }
    }

    const previewTemplateArtists: ShopTemplateDetailData["template_artists"] =
      selectedArtistIds.map((artistId, index) => ({
        id: `preview-template-artist-${artistId}`,
        template_id: selectedTemplate.id,
        artist_id: artistId,
        role: "creator",
        is_primary: normalizedPrimaryArtistId === artistId,
        display_order: index,
        created_at: now,
        artist: artistById.get(artistId) || null,
      }));

    const previewPlans: ShopTemplateDetailData["template_plans"] = [];

    if (productFormData.enableLite) {
      previewPlans.push({
        id: `preview-plan-lite-${selectedTemplate.id}`,
        shop_template_id: previewShopTemplateId,
        plan: "lite",
        price: productFormData.litePrice,
        created_at: now,
        updated_at: now,
        ...productFormData.liteOptions,
      });
    }

    if (productFormData.enablePro) {
      previewPlans.push({
        id: `preview-plan-pro-${selectedTemplate.id}`,
        shop_template_id: previewShopTemplateId,
        plan: "pro",
        price: productFormData.proPrice,
        created_at: now,
        updated_at: now,
        ...productFormData.proOptions,
      });
    }

    return {
      id: previewShopTemplateId,
      template_id: selectedTemplate.id,
      title: productFormData.title,
      detailed_description: productFormData.detailed_description,
      features: productFormData.features,
      requirements: productFormData.requirements,
      purchase_instructions: productFormData.purchase_instructions,
      is_shop_visible: true,
      created_at: existingShopTemplate?.created_at || now,
      updated_at: now,
      ...productFormData.templateOptions,
      templates: {
        id: selectedTemplate.id,
        created_at: selectedTemplate.created_at,
        updated_at: selectedTemplate.updated_at,
        name: productFormData.title || selectedTemplate.name,
        description: selectedTemplate.description,
        detailed_description: selectedTemplate.detailed_description,
        thumbnail_url: selectedTemplate.thumbnail_url,
        is_public: selectedTemplate.is_public,
        is_shop_visible: selectedTemplate.is_shop_visible,
      },
      template_plans: previewPlans,
      template_artists: previewTemplateArtists,
    };
  }, [
    artists,
    primaryArtistId,
    productFormData,
    selectedArtistIds,
    selectedTemplate,
  ]);

  const handleOpenShopPreview = () => {
    if (!previewTemplate || typeof window === "undefined") {
      return;
    }

    try {
      const previewKey = `shop-preview:${selectedTemplate?.id || "unknown"}:${Date.now()}`;
      localStorage.setItem(
        previewKey,
        JSON.stringify({
          template: previewTemplate,
          createdAt: Date.now(),
        })
      );

      window.open(
        `/shop/preview?previewKey=${encodeURIComponent(previewKey)}`,
        "_blank",
        "noopener,noreferrer"
      );
    } catch (error) {
      console.error("상점 미리보기 열기 실패:", error);
      alert("상점 미리보기 창을 열 수 없습니다.");
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
      } catch {
        console.warn("썸네일 URL 업데이트 실패, 하지만 템플릿은 생성됨");
      }

      // 성공 시 모달 닫기 및 폼 초기화
      resetModal();
    } catch {
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
      thumbnail_url: "",
      is_public: false,
    });
  };

  const handleShowTemplateId = (template: TemplateWithShopTemplateAndPlans) => {
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

  const filteredTemplates = templates;

  // 탭별 통계 (전체 개수 기준)
  const tabCounts = useMemo(() => {
    // 서버사이드 페이지네이션이므로 전체 개수는 pagination에서 가져옴
    return {
      public: pagination?.publicCount || 0,
      private: pagination?.privateCount || 0,
    };
  }, [pagination]);

  // 총 페이지 수 계산
  const totalPages = pagination ? Math.ceil(pagination.total / ITEMS_PER_PAGE) : 0;

  // 검색 입력값을 디바운스하여 서버 검색 요청 횟수 최적화
  useEffect(() => {
    const timer = window.setTimeout(() => {
      setCurrentPage(1);
      setDebouncedSearchTerm(searchTerm.trim());
    }, 300);

    return () => {
      window.clearTimeout(timer);
    };
  }, [searchTerm]);

  // 페이지 변경 핸들러
  const handlePageChange = (page: number) => {
    setCurrentPage(page);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  // 탭 변경 시 페이지 초기화
  const handleTabChange = (tab: TemplateTab) => {
    setActiveTab(tab);
    setCurrentPage(1);
  };

  // 템플릿 옵션 토글 핸들러
  const handleTemplateOptionToggle = (optionKey: keyof PlanOptions) => {
    setProductFormData((prev) => ({
      ...prev,
      templateOptions: {
        ...prev.templateOptions,
        [optionKey]: !prev.templateOptions[optionKey],
      },
    }));
  };

  // 플랜 옵션 토글 핸들러 (cascade 규칙 적용)
  const handleOptionToggle = (
    plan: "lite" | "pro",
    optionKey: keyof PlanOptions
  ) => {
    setProductFormData((prev) => {
      // 템플릿 기본 옵션에 포함되지 않은 기능은 토글 불가
      if (!prev.templateOptions[optionKey]) {
        return prev;
      }

      const newLiteOptions = { ...prev.liteOptions };
      const newProOptions = { ...prev.proOptions };

      if (plan === "lite") {
        // LITE 옵션 토글
        newLiteOptions[optionKey] = !newLiteOptions[optionKey];

        // LITE에서 활성화하면 PRO도 자동 활성화
        if (newLiteOptions[optionKey]) {
          newProOptions[optionKey] = true;
        }
      } else {
        // PRO 옵션 토글
        newProOptions[optionKey] = !newProOptions[optionKey];

        // PRO에서 비활성화하면 LITE도 자동 비활성화
        if (!newProOptions[optionKey]) {
          newLiteOptions[optionKey] = false;
        }
      }

      return {
        ...prev,
        liteOptions: newLiteOptions,
        proOptions: newProOptions,
      };
    });
  };

  const applyArtistSelectionFromTemplate = (
    template: TemplateWithShopTemplateAndPlans
  ) => {
    const relations = (template.template_artists || []).slice().sort((a, b) => {
      if (a.is_primary === b.is_primary) {
        return (a.display_order || 0) - (b.display_order || 0);
      }
      return a.is_primary ? -1 : 1;
    });

    const artistIds = relations.map((relation) => relation.artist_id);
    const primary = relations.find((relation) => relation.is_primary)?.artist_id;

    setSelectedArtistIds(artistIds);
    setPrimaryArtistId(primary || artistIds[0] || null);
  };

  const handleArtistToggle = (artist: Artist, checked: boolean) => {
    setSelectedArtistIds((prev) => {
      if (checked) {
        const next = prev.includes(artist.id) ? prev : [...prev, artist.id];
        if (!primaryArtistId) {
          setPrimaryArtistId(artist.id);
        }
        return next;
      }

      const next = prev.filter((id) => id !== artist.id);
      if (primaryArtistId === artist.id) {
        setPrimaryArtistId(next[0] || null);
      }
      return next;
    });
  };

  const handleAssignNoArtist = () => {
    if (!noArtistOption) {
      alert("'작가 없음' 시스템 작가를 찾을 수 없습니다.");
      return;
    }

    setSelectedArtistIds([noArtistOption.id]);
    setPrimaryArtistId(noArtistOption.id);
  };

  // 상품 등록 모달 열기
  const handleCreateProduct = (template: TemplateWithShopTemplateAndPlans) => {
    setSelectedTemplate(template);
    applyArtistSelectionFromTemplate(template);
    setProductFormData({
      title: template.name,
      detailed_description: "",
      enableLite: true,
      litePrice: 15000,
      enablePro: true,
      proPrice: 25000,
      features: [
        "고화질 시간표 템플릿",
        "커스터마이징 가능한 소스 파일",
        "사용 가이드",
      ],
      requirements: "웹 브라우저만 있으면 사용 가능",
      purchase_instructions: "결제 확인 후 1-2일 이내 권한 부여",
      templateOptions: {
        is_artist: false,
        is_memo: false,
        is_multi_schedule: false,
        is_guerrilla: false,
        is_offline_memo: false,
      },
      liteOptions: {
        is_artist: false,
        is_memo: false,
        is_multi_schedule: false,
        is_guerrilla: false,
        is_offline_memo: false,
      },
      proOptions: {
        is_artist: false,
        is_memo: false,
        is_multi_schedule: false,
        is_guerrilla: false,
        is_offline_memo: false,
      },
    });
    setShowProductModal(true);
  };

  // 상품 수정 모달 열기
  const handleEditProduct = async (template: TemplateWithShopTemplateAndPlans) => {
    const product = template.shop_templates?.[0];

    if (!product) return;

    // template_plans 테이블에서 플랜 옵션 및 가격 정보 가져오기
    const { plans } = await AdminTemplateService.getTemplatePlans(product.id);
    const litePlan = plans.find((p) => p.plan === "lite");
    const proPlan = plans.find((p) => p.plan === "pro");

    setSelectedTemplate(template);
    applyArtistSelectionFromTemplate(template);
    setProductFormData({
      title: product.title || template.name,
      detailed_description: product.detailed_description || "",
      enableLite: !!litePlan,
      litePrice: litePlan?.price || 15000,
      enablePro: !!proPlan,
      proPrice: proPlan?.price || 25000,
      features: product.features || [],
      requirements: product.requirements || "",
      purchase_instructions: product.purchase_instructions || "",
      templateOptions: {
        is_artist: product.is_artist || false,
        is_memo: product.is_memo || false,
        is_multi_schedule: product.is_multi_schedule || false,
        is_guerrilla: product.is_guerrilla || false,
        is_offline_memo: product.is_offline_memo || false,
      },
      liteOptions: {
        is_artist: litePlan?.is_artist || false,
        is_memo: litePlan?.is_memo || false,
        is_multi_schedule: litePlan?.is_multi_schedule || false,
        is_guerrilla: litePlan?.is_guerrilla || false,
        is_offline_memo: litePlan?.is_offline_memo || false,
      },
      proOptions: {
        is_artist: proPlan?.is_artist || false,
        is_memo: proPlan?.is_memo || false,
        is_multi_schedule: proPlan?.is_multi_schedule || false,
        is_guerrilla: proPlan?.is_guerrilla || false,
        is_offline_memo: proPlan?.is_offline_memo || false,
      },
    });
    setShowProductModal(true);
  };

  // 상점 노출 여부 토글
  const toggleShopVisibility = async (template: TemplateWithShopTemplateAndPlans) => {
    if (!hasProduct(template)) return;

    const shopTemplate = getShopTemplate(template);
    if (!shopTemplate) return;
    const nextVisible = !shopTemplate.is_shop_visible;

    if (nextVisible && !hasLinkedArtist(template)) {
      alert(
        "작가 미연결 상태에서는 판매를 시작할 수 없습니다. '작가 없음' 또는 실제 작가를 연결해 주세요."
      );
      return;
    }

    try {
      await updateProductMutation.mutateAsync({
        productId: shopTemplate.id,
        data: { is_shop_visible: nextVisible },
      });
    } catch (error) {
      console.error("Shop visibility toggle error:", error);
      alert(
        error instanceof Error
          ? error.message
          : "판매 상태 변경 중 오류가 발생했습니다."
      );
    }
  };

  // 상품 등록/수정 처리
  const handleProductSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTemplate) return;

    // 최소 하나의 플랜은 활성화되어야 함
    if (!productFormData.enableLite && !productFormData.enablePro) {
      alert("최소 하나의 플랜을 활성화해야 합니다.");
      return;
    }

    try {
      const product = selectedTemplate.shop_templates?.[0];
      const isEditing = !!product;

      // shop_templates 데이터 (템플릿당 하나)
      const productData = {
        title: productFormData.title,
        detailed_description: productFormData.detailed_description,
        features: productFormData.features,
        requirements: productFormData.requirements,
        purchase_instructions: productFormData.purchase_instructions,
        is_shop_visible: isEditing ? product.is_shop_visible : false,
        ...productFormData.templateOptions,
      };

      // shop_templates 저장/업데이트
      let shopTemplateId: string;

      if (isEditing) {
        await updateProductMutation.mutateAsync({
          productId: product.id,
          data: productData,
        });
        shopTemplateId = product.id;
      } else {
        const createdShopTemplate = await createProductMutation.mutateAsync({
          ...productData,
          template_id: selectedTemplate.id,
        });
        shopTemplateId = createdShopTemplate.id;
      }

      // template_plans 저장/업데이트 (가격 포함)
      const { plans } = await AdminTemplateService.getTemplatePlans(
        shopTemplateId
      );
      const litePlan = plans?.find((p: TemplatePlan) => p.plan === "lite");
      const proPlan = plans?.find((p: TemplatePlan) => p.plan === "pro");

      // LITE 플랜 - enableLite가 true일 때만 처리
      if (productFormData.enableLite) {
        if (litePlan) {
          await updatePlanMutation.mutateAsync({
            planId: litePlan.id,
            data: {
              price: productFormData.litePrice,
              ...productFormData.liteOptions,
            },
          });
        } else {
          await createPlanMutation.mutateAsync({
            shop_template_id: shopTemplateId,
            plan: "lite",
            price: productFormData.litePrice,
            ...productFormData.liteOptions,
          });
        }
      }

      // PRO 플랜 - enablePro가 true일 때만 처리
      if (productFormData.enablePro) {
        if (proPlan) {
          await updatePlanMutation.mutateAsync({
            planId: proPlan.id,
            data: {
              price: productFormData.proPrice,
              ...productFormData.proOptions,
            },
          });
        } else {
          await createPlanMutation.mutateAsync({
            shop_template_id: shopTemplateId,
            plan: "pro",
            price: productFormData.proPrice,
            ...productFormData.proOptions,
          });
        }
      }

      const normalizedPrimaryArtistId =
        selectedArtistIds.length === 0
          ? null
          : selectedArtistIds.includes(primaryArtistId || "")
          ? primaryArtistId
          : selectedArtistIds[0];

      await updateTemplateArtistsMutation.mutateAsync({
        templateId: selectedTemplate.id,
        relations: selectedArtistIds.map((artistId, index) => ({
          artist_id: artistId,
          role: "creator",
          is_primary: normalizedPrimaryArtistId === artistId,
          display_order: index,
        })),
      });

      closeProductModal();
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
    <div className="space-y-4 sm:space-y-6">
      <AdminTabHeader
        title="템플릿 관리"
        description="공개/비공개 템플릿을 조회하고 관리하세요"
        icon={FileText}
      >
        <div className="bg-quaternary px-3 sm:px-4 py-1.5 sm:py-2 rounded-lg border">
          <span className="text-[#F4FDFF] font-semibold text-sm sm:text-base">
            총 {pagination?.total || 0}개
          </span>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="bg-primary text-[#F4FDFF] px-3 sm:px-4 py-1.5 sm:py-2 rounded-md font-medium text-sm sm:text-base hover:bg-secondary transition-colors whitespace-nowrap"
        >
          + 템플릿 추가
        </button>
      </AdminTabHeader>

      {/* Tab Navigation */}
      <div className="bg-white p-3 sm:p-4 rounded-lg shadow-sm">
        <div className="mb-4 sm:mb-6">
          <div className="border-b border-slate-200">
            <nav className="-mb-px flex space-x-4 sm:space-x-8 sm:justify-center overflow-x-auto">
              <button
                onClick={() => handleTabChange("public")}
                className={`py-2 px-1 border-b-2 font-medium text-xs sm:text-sm whitespace-nowrap ${
                  activeTab === "public"
                    ? "border-[#1e3a8a] text-[#1e3a8a]"
                    : "border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300"
                }`}
              >
                공개 템플릿
                <span className="ml-1 sm:ml-2 py-0.5 px-1.5 sm:px-2 rounded-full text-xs bg-green-100 text-green-600">
                  {tabCounts.public}
                </span>
              </button>
              <button
                onClick={() => handleTabChange("private")}
                className={`py-2 px-1 border-b-2 font-medium text-xs sm:text-sm whitespace-nowrap ${
                  activeTab === "private"
                    ? "border-[#1e3a8a] text-[#1e3a8a]"
                    : "border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300"
                }`}
              >
                비공개 템플릿
                <span className="ml-1 sm:ml-2 py-0.5 px-1.5 sm:px-2 rounded-full text-xs bg-slate-100 text-slate-600">
                  {tabCounts.private}
                </span>
              </button>
            </nav>
          </div>
        </div>
      </div>

      {/* Search Bar */}
      {(activeTab === "public" ? tabCounts.public : tabCounts.private) > 3 ||
      Boolean(searchTerm) ? (
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
      ) : null}

      {/* Templates List */}
      <div className="bg-white shadow-sm rounded-lg overflow-hidden">
        {/* 데스크톱 테이블 뷰 */}
        <div className="hidden lg:block overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-56">
                  템플릿
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-44">
                  작가명
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-48">
                  상품 상태
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-36">
                  생성일
                </th>
                <th
                  className={`px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider ${
                    activeTab === "public" ? "w-[32rem]" : "w-[24rem]"
                  }`}
                >
                  작업
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {(() => {
                if (filteredTemplates.length === 0) {
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
                            ) : (
                              "비공개 템플릿이 없습니다."
                            )}
                          </p>
                        </div>
                      </td>
                    </tr>
                  );
                }

                return filteredTemplates.map((template) => (
                  <tr key={template.id} className="hover:bg-gray-50">
                    <td className="px-4 py-4 align-top">
                      <div className="max-w-[220px]">
                        <div className="text-sm font-medium text-gray-900 truncate">
                          {template.name}
                        </div>
                        {template.description && (
                          <div className="text-xs text-gray-500 truncate mt-1">
                            {template.description}
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-4 align-top">
                      <div
                        className={`max-w-[180px] text-sm truncate ${
                          hasLinkedArtist(template) ? "text-gray-700" : "text-gray-400"
                        }`}
                      >
                        {getTemplateArtistLabel(template)}
                      </div>
                    </td>
                    <td className="px-4 py-4 align-top">
                      {template.is_public ? (
                        (() => {
                          if (!hasProduct(template)) {
                            return (
                              <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-gray-100 text-gray-800">
                                상품 미등록
                              </span>
                            );
                          }

                          if (isSelling(template)) {
                            return (
                              <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-blue-100 text-blue-800">
                                판매 중
                              </span>
                            );
                          }

                          return (
                            <div className="flex flex-col items-start gap-1">
                              <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-orange-100 text-orange-800">
                                판매 대기
                              </span>
                              {!hasLinkedArtist(template) && (
                                <span className="text-xs text-red-600">
                                  작가 미연결로 판매 불가
                                </span>
                              )}
                            </div>
                          );
                        })()
                      ) : (
                        <span className="text-xs text-gray-400">-</span>
                      )}
                    </td>
                    <td className="px-4 py-4 align-top text-sm text-gray-500">
                      {new Date(template.created_at).toLocaleDateString(
                        "ko-KR"
                      )}
                    </td>
                    <td className="px-4 py-4 align-top text-sm">
                      <div className="w-full flex items-center gap-2">
                        <button
                          onClick={() => handleGoToTemplate(template.id)}
                          className="px-3 py-1.5 rounded text-xs font-medium bg-[#F5F0ED] text-[#2d2d2d] border border-[#E6DBD4] hover:bg-[#EDE5E0] transition-colors flex items-center justify-center gap-1 flex-1"
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
                          className="px-3 py-1.5 rounded text-xs font-medium bg-[#F5F0ED] text-[#2d2d2d] border border-[#E6DBD4] hover:bg-[#EDE5E0] transition-colors flex-1"
                        >
                          ID 보기
                        </button>

                        {/* 상품 관리 버튼들 - 공개 템플릿만 */}
                        {template.is_public && (
                          <>
                            {!hasProduct(template) ? (
                              <button
                                onClick={() => handleCreateProduct(template)}
                                className="px-3 py-1.5 rounded text-xs font-medium bg-[#F5F0ED] text-[#2d2d2d] border border-[#E6DBD4] hover:bg-[#EDE5E0] transition-colors flex-1"
                              >
                                상품 등록
                              </button>
                            ) : (
                              <>
                                <button
                                  onClick={() => handleEditProduct(template)}
                                  className="px-3 py-1.5 rounded text-xs font-medium bg-[#EFE2D9] text-[#2d2d2d] border border-[#DDC8B9] hover:bg-[#E6D4C8] transition-colors flex-1"
                                >
                                  상품 수정
                                </button>
                                {(() => {
                                  const canStartSale = hasLinkedArtist(template);
                                  const selling = isSelling(template);

                                  return (
                                    <button
                                      onClick={() => toggleShopVisibility(template)}
                                      disabled={!selling && !canStartSale}
                                      className={`px-3 py-1.5 rounded text-xs font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex-1 ${
                                        selling
                                          ? "bg-[#8C5A5A] text-white hover:bg-[#7A4D4D]"
                                          : canStartSale
                                          ? "bg-[#E6D2C3] text-[#2d2d2d] border border-[#D4B8A5] hover:bg-[#DBBEAC]"
                                          : "bg-gray-100 text-gray-500"
                                      }`}
                                    >
                                      {selling
                                        ? "판매 중지"
                                        : canStartSale
                                        ? "판매 시작"
                                        : "판매 불가(작가 필요)"}
                                    </button>
                                  );
                                })()}
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

        {/* 모바일 카드 뷰 */}
        <div className="lg:hidden divide-y divide-gray-200">
          {(() => {
            if (filteredTemplates.length === 0) {
              return (
                <div className="px-4 py-12 text-center">
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
                  <p className="text-gray-500 text-sm">
                    {searchTerm ? (
                      <>&apos;{searchTerm}&apos;에 대한 검색 결과가 없습니다.</>
                    ) : activeTab === "public" ? (
                      "공개 템플릿이 없습니다."
                    ) : (
                      "비공개 템플릿이 없습니다."
                    )}
                  </p>
                </div>
              );
            }

            return filteredTemplates.map((template) => (
              <div key={template.id} className="p-4">
                <div className="space-y-3">
                  {/* 템플릿 이름 */}
                  <div>
                    <div className="text-sm font-medium text-gray-900 truncate">
                      {template.name}
                    </div>
                    {template.description && (
                      <div className="text-xs text-gray-500 mt-1 truncate">
                        {template.description}
                      </div>
                    )}
                    <div className="text-xs text-gray-500 mt-1 truncate">
                      작가: {getTemplateArtistLabel(template)}
                    </div>
                  </div>

                  {/* 상품 상태 및 생성일 */}
                  <div className="flex justify-between items-center text-xs">
                    <div>
                      {template.is_public ? (
                        (() => {
                          if (!hasProduct(template)) {
                            return (
                              <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-gray-100 text-gray-800">
                                상품 미등록
                              </span>
                            );
                          }

                          if (isSelling(template)) {
                            return (
                              <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-blue-100 text-blue-800">
                                판매 중
                              </span>
                            );
                          }

                          return (
                            <div className="flex flex-col gap-1">
                              <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-orange-100 text-orange-800">
                                판매 대기
                              </span>
                              {!hasLinkedArtist(template) && (
                                <span className="text-[11px] text-red-600">
                                  작가 미연결로 판매 불가
                                </span>
                              )}
                            </div>
                          );
                        })()
                      ) : (
                        <span className="text-xs text-gray-400">-</span>
                      )}
                    </div>
                    <div className="text-gray-500">
                      {new Date(template.created_at).toLocaleDateString("ko-KR")}
                    </div>
                  </div>

                  {/* 버튼들 */}
                  <div className="space-y-2">
                    {template.is_public && (
                      <div className="grid grid-cols-2 gap-2 rounded-lg border border-tertiary bg-primary/40 p-2">
                        {!hasProduct(template) ? (
                          <button
                            onClick={() => handleCreateProduct(template)}
                            className="px-3 py-1.5 rounded text-xs font-medium bg-[#F5F0ED] text-[#2d2d2d] border border-[#E6DBD4] hover:bg-[#EDE5E0] transition-colors"
                          >
                            상품 등록
                          </button>
                        ) : (
                          <>
                            <button
                              onClick={() => handleEditProduct(template)}
                              className="px-3 py-1.5 rounded text-xs font-medium bg-[#EFE2D9] text-[#2d2d2d] border border-[#DDC8B9] hover:bg-[#E6D4C8] transition-colors"
                            >
                              상품 수정
                            </button>
                            {(() => {
                              const canStartSale = hasLinkedArtist(template);
                              const selling = isSelling(template);

                              return (
                                <button
                                  onClick={() => toggleShopVisibility(template)}
                                  disabled={!selling && !canStartSale}
                                  className={`px-3 py-1.5 rounded text-xs font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${
                                    selling
                                      ? "bg-[#8C5A5A] text-white hover:bg-[#7A4D4D]"
                                    : canStartSale
                                      ? "bg-[#E6D2C3] text-[#2d2d2d] border border-[#D4B8A5] hover:bg-[#DBBEAC]"
                                      : "bg-gray-100 text-gray-500"
                                  }`}
                                >
                                  {selling
                                    ? "판매 중지"
                                    : canStartSale
                                    ? "판매 시작"
                                    : "판매 불가(작가 필요)"}
                                </button>
                              );
                            })()}
                          </>
                        )}
                      </div>
                    )}

                    <div className="flex flex-wrap gap-2">
                      <button
                        onClick={() => handleGoToTemplate(template.id)}
                        className="px-3 py-1.5 rounded text-xs font-medium bg-[#F5F0ED] text-[#2d2d2d] border border-[#E6DBD4] hover:bg-[#EDE5E0] transition-colors"
                      >
                        템플릿 열기
                      </button>
                      <button
                        onClick={() => handleShowTemplateId(template)}
                        className="px-3 py-1.5 rounded text-xs font-medium bg-[#F5F0ED] text-[#2d2d2d] border border-[#E6DBD4] hover:bg-[#EDE5E0] transition-colors"
                      >
                        ID 보기
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ));
          })()}
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="px-6 py-4 border-t border-gray-200">
            <div className="flex items-center justify-between">
              <div className="flex-1 flex justify-between sm:hidden">
                <button
                  onClick={() => handlePageChange(currentPage - 1)}
                  disabled={currentPage === 1}
                  className="relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  이전
                </button>
                <button
                  onClick={() => handlePageChange(currentPage + 1)}
                  disabled={currentPage === totalPages}
                  className="ml-3 relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  다음
                </button>
              </div>
              <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
                <div>
                  <p className="text-sm text-gray-700">
                    전체 <span className="font-medium">{pagination?.total || 0}</span>개 중{" "}
                    <span className="font-medium">
                      {Math.min((currentPage - 1) * ITEMS_PER_PAGE + 1, pagination?.total || 0)}
                    </span>{" "}
                    -{" "}
                    <span className="font-medium">
                      {Math.min(currentPage * ITEMS_PER_PAGE, pagination?.total || 0)}
                    </span>{" "}
                    표시
                  </p>
                </div>
                <div>
                  <nav className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px" aria-label="Pagination">
                    <button
                      onClick={() => handlePageChange(currentPage - 1)}
                      disabled={currentPage === 1}
                      className="relative inline-flex items-center px-2 py-2 rounded-l-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <span className="sr-only">이전</span>
                      <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M12.707 5.293a1 1 0 010 1.414L9.414 10l3.293 3.293a1 1 0 01-1.414 1.414l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 0z" clipRule="evenodd" />
                      </svg>
                    </button>

                    {/* 페이지 번호 버튼들 */}
                    {Array.from({ length: totalPages }, (_, i) => i + 1)
                      .filter(page => {
                        // 첫 페이지, 마지막 페이지, 현재 페이지 주변만 표시
                        return (
                          page === 1 ||
                          page === totalPages ||
                          (page >= currentPage - 2 && page <= currentPage + 2)
                        );
                      })
                      .map((page, index, array) => {
                        // 생략 부호(...) 표시
                        if (index > 0 && page - array[index - 1] > 1) {
                          return (
                            <span key={`ellipsis-${page}`} className="relative inline-flex items-center px-4 py-2 border border-gray-300 bg-white text-sm font-medium text-gray-700">
                              ...
                            </span>
                          );
                        }
                        return null;
                      })
                      .filter(Boolean)}

                    {Array.from({ length: totalPages }, (_, i) => i + 1)
                      .filter(page => {
                        return (
                          page === 1 ||
                          page === totalPages ||
                          (page >= currentPage - 2 && page <= currentPage + 2)
                        );
                      })
                      .map(page => (
                        <button
                          key={page}
                          onClick={() => handlePageChange(page)}
                          className={`relative inline-flex items-center px-4 py-2 border text-sm font-medium ${
                            currentPage === page
                              ? "z-10 bg-indigo-50 border-indigo-500 text-indigo-600"
                              : "bg-white border-gray-300 text-gray-500 hover:bg-gray-50"
                          }`}
                        >
                          {page}
                        </button>
                      ))}

                    <button
                      onClick={() => handlePageChange(currentPage + 1)}
                      disabled={currentPage === totalPages}
                      className="relative inline-flex items-center px-2 py-2 rounded-r-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <span className="sr-only">다음</span>
                      <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" />
                      </svg>
                    </button>
                  </nav>
                </div>
              </div>
            </div>
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
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm overflow-y-auto">
          <div className="min-h-screen p-3 sm:p-6 lg:p-8">
            <div className="mx-auto w-full max-w-6xl rounded-2xl border border-slate-200 bg-white shadow-[0_24px_80px_-24px_rgba(15,23,42,0.45)]">
              <div className="flex items-start justify-between gap-4 border-b border-slate-200 bg-gradient-to-r from-white via-slate-50 to-indigo-50/80 px-5 py-5 sm:px-8">
                <div>
                  <h3 className="text-lg sm:text-xl font-semibold text-dark-gray">
                    {hasProduct(selectedTemplate) ? "상품 정보 수정" : "상품 등록"}
                  </h3>
                  <p className="text-sm text-slate-600 mt-1">
                    상점 상세 노출 정보와 플랜 구성을 한 번에 관리합니다.
                  </p>
                  <div className="mt-2">
                    {isSelling(selectedTemplate) ? (
                      <span className="inline-flex px-2.5 py-1 text-xs font-semibold rounded-full bg-blue-100 text-blue-800">
                        판매 단계: 판매 중
                      </span>
                    ) : (
                      <span className="inline-flex px-2.5 py-1 text-xs font-semibold rounded-full bg-orange-100 text-orange-800">
                        판매 단계: 상품 등록(판매 전)
                      </span>
                    )}
                  </div>
                </div>
                <button
                  type="button"
                  onClick={closeProductModal}
                  className="shrink-0 h-9 w-9 rounded-lg border border-slate-200 bg-white text-slate-500 hover:text-slate-700 hover:bg-slate-100 transition-colors"
                  aria-label="모달 닫기"
                >
                  ✕
                </button>
              </div>

              <form onSubmit={handleProductSubmit} className="flex flex-col">
                <div className="max-h-[calc(100vh-220px)] overflow-y-auto px-5 py-6 sm:px-8">
                  <div className="mb-6 rounded-xl border border-slate-200 bg-slate-50/90 px-4 py-3">
                    <div className="text-xs font-medium text-slate-500 uppercase tracking-wide">
                      선택된 템플릿
                    </div>
                    <h4 className="font-semibold text-slate-900 mt-1">
                      {selectedTemplate.name}
                    </h4>
                    <p className="text-sm text-slate-600 mt-1">
                      {selectedTemplate.description}
                    </p>
                    {selectedArtistIds.length === 0 && (
                      <div className="mt-2 text-xs text-red-600">
                        현재 작가 미연결 상태입니다. 이 상태에서는 판매 시작이 불가합니다.
                      </div>
                    )}
                  </div>

                  <div className="grid grid-cols-1 xl:grid-cols-12 gap-6">
                    <div className="xl:col-span-5 space-y-6">
                      <section className="rounded-xl border border-slate-200 bg-white p-4 sm:p-5">
                        <h4 className="text-sm font-semibold text-slate-900 mb-4">
                          상점 기본 정보
                        </h4>

                        <div className="space-y-4">
                          <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1.5">
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
                              className="w-full px-3 py-2.5 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
                              placeholder="상품명을 입력하세요"
                            />
                          </div>

                          <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1.5">
                              상점 전용 상세 설명
                            </label>
                            <textarea
                              value={productFormData.detailed_description}
                              onChange={(e) =>
                                setProductFormData((prev) => ({
                                  ...prev,
                                  detailed_description: e.target.value,
                                }))
                              }
                              className="w-full px-3 py-2.5 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
                              rows={5}
                              placeholder="상점에 표시될 자세한 설명을 입력하세요"
                              maxLength={2000}
                            />
                            <div className="mt-1 text-xs text-slate-500">
                              줄바꿈은 자동 반영됩니다. 최대 2000자
                            </div>
                          </div>

                          <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1.5">
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
                              className="w-full px-3 py-2.5 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
                              rows={4}
                              placeholder="고화질 시간표 템플릿&#10;커스터마이징 가능한 소스 파일&#10;사용 가이드"
                            />
                          </div>

                          <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1.5">
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
                              className="w-full px-3 py-2.5 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
                              placeholder="웹 브라우저만 있으면 사용 가능"
                            />
                          </div>

                          <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1.5">
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
                              className="w-full px-3 py-2.5 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
                              rows={3}
                              placeholder="결제 확인 후 1-2일 이내 권한 부여"
                            />
                          </div>
                        </div>
                      </section>

                      <section className="rounded-xl border border-slate-200 bg-white p-4 sm:p-5">
                        <h4 className="text-sm font-semibold text-slate-900 mb-1">
                          작가 연결
                        </h4>
                        <p className="text-xs text-slate-500 mb-4">
                          이 템플릿에 연결할 작가를 선택하고 대표 작가를 지정하세요.
                        </p>

                        {artists.length === 0 ? (
                          <div className="text-sm text-slate-500 bg-slate-50 border border-slate-200 rounded-lg p-3">
                            등록된 작가가 없습니다. 먼저 작가 관리 탭에서 작가를 등록해 주세요.
                          </div>
                        ) : (
                          <div className="space-y-2.5">
                            {artists.map((artist) => {
                              const checked = selectedArtistIds.includes(artist.id);
                              return (
                                <div
                                  key={artist.id}
                                  className={`rounded-lg border p-3 flex items-center justify-between gap-3 ${
                                    checked
                                      ? "border-indigo-200 bg-indigo-50/40"
                                      : "border-slate-200 bg-white"
                                  }`}
                                >
                                  <label className="flex items-center gap-2 min-w-0">
                                    <input
                                      type="checkbox"
                                      checked={checked}
                                      onChange={(e) =>
                                        handleArtistToggle(artist, e.target.checked)
                                      }
                                      className="w-4 h-4 text-indigo-600 border-slate-300 rounded"
                                    />
                                    <span className="text-sm text-slate-800 truncate">
                                      {artist.name}
                                    </span>
                                  </label>
                                  <label className="flex items-center gap-1 text-xs text-slate-600">
                                    <input
                                      type="radio"
                                      name="primary-artist"
                                      disabled={!checked}
                                      checked={checked && primaryArtistId === artist.id}
                                      onChange={() => setPrimaryArtistId(artist.id)}
                                      className="w-4 h-4 text-indigo-600 border-slate-300"
                                    />
                                    대표
                                  </label>
                                </div>
                              );
                            })}
                          </div>
                        )}

                        {selectedArtistIds.length === 0 && (
                          <div className="mt-3 rounded-lg border border-red-200 bg-red-50 p-3">
                            <p className="text-xs text-red-700">
                              미연결 상태는 판매 불가입니다. &apos;작가 없음&apos; 또는 실제 작가를 연결해 주세요.
                            </p>
                            <div className="mt-2">
                              <button
                                type="button"
                                onClick={handleAssignNoArtist}
                                disabled={!noArtistOption}
                                className="px-3 py-1.5 text-xs font-medium rounded-md bg-white border border-red-200 text-red-700 hover:bg-red-100 disabled:opacity-50 disabled:cursor-not-allowed"
                              >
                                {noArtistOption
                                  ? "'작가 없음'으로 빠르게 연결"
                                  : "'작가 없음' 시스템 작가를 찾을 수 없음"}
                              </button>
                            </div>
                          </div>
                        )}
                      </section>
                    </div>

                    <div className="xl:col-span-7 space-y-6">
                      <section className="rounded-xl border border-slate-200 bg-white p-4 sm:p-5">
                        <h4 className="text-sm font-semibold text-slate-900 mb-1">
                          템플릿 기본 기능
                        </h4>
                        <p className="text-xs text-slate-500 mb-4">
                          템플릿에 포함되는 기준 기능입니다.
                        </p>

                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                          {(
                            Object.keys(optionLabels) as Array<keyof PlanOptions>
                          ).map((optionKey) => (
                            <button
                              key={optionKey}
                              type="button"
                              onClick={() => handleTemplateOptionToggle(optionKey)}
                              className={`px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                                productFormData.templateOptions[optionKey]
                                  ? "bg-indigo-600 text-white hover:bg-indigo-700"
                                  : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                              }`}
                            >
                              {optionLabels[optionKey]}
                            </button>
                          ))}
                        </div>
                      </section>

                      <section className="rounded-xl border border-slate-200 bg-white p-4 sm:p-5">
                        <h4 className="text-sm font-semibold text-slate-900 mb-1">
                          플랜별 사용 가능 기능
                        </h4>
                        <p className="text-xs text-slate-500 mb-4">
                          각 플랜에서 허용할 기능과 가격을 설정하세요.
                        </p>

                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                          <div className="border border-slate-200 rounded-xl p-4 bg-slate-50/70">
                            <div className="flex items-center mb-3">
                              <input
                                type="checkbox"
                                id="enableLite"
                                checked={productFormData.enableLite}
                                onChange={(e) =>
                                  setProductFormData((prev) => ({
                                    ...prev,
                                    enableLite: e.target.checked,
                                  }))
                                }
                                className="w-4 h-4 text-indigo-600 border-slate-300 rounded focus:ring-indigo-500"
                              />
                              <label
                                htmlFor="enableLite"
                                className="ml-2 text-sm font-semibold text-slate-700 cursor-pointer"
                              >
                                LITE PLAN
                              </label>
                            </div>

                            <div className="mb-3">
                              <label className="block text-xs font-medium text-slate-600 mb-1">
                                가격 (원) {productFormData.enableLite && "*"}
                              </label>
                              <input
                                type="number"
                                required={productFormData.enableLite}
                                disabled={!productFormData.enableLite}
                                min="0"
                                value={productFormData.litePrice}
                                onChange={(e) =>
                                  setProductFormData((prev) => ({
                                    ...prev,
                                    litePrice: parseInt(e.target.value) || 0,
                                  }))
                                }
                                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:bg-slate-100 disabled:cursor-not-allowed"
                              />
                            </div>

                            <div className="space-y-2">
                              {(
                                Object.keys(optionLabels) as Array<keyof PlanOptions>
                              ).map((optionKey) => (
                                <button
                                  key={optionKey}
                                  type="button"
                                  onClick={() => handleOptionToggle("lite", optionKey)}
                                  disabled={
                                    !productFormData.templateOptions[optionKey] ||
                                    !productFormData.enableLite
                                  }
                                  className={`w-full px-3 py-2 rounded-lg text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${
                                    productFormData.liteOptions[optionKey]
                                      ? "bg-indigo-600 text-white hover:bg-indigo-700"
                                      : "bg-slate-200 text-slate-600 hover:bg-slate-300"
                                  }`}
                                >
                                  {optionLabels[optionKey]}
                                </button>
                              ))}
                            </div>
                          </div>

                          <div className="border border-purple-200 rounded-xl p-4 bg-purple-50/60">
                            <div className="flex items-center mb-3">
                              <input
                                type="checkbox"
                                id="enablePro"
                                checked={productFormData.enablePro}
                                onChange={(e) =>
                                  setProductFormData((prev) => ({
                                    ...prev,
                                    enablePro: e.target.checked,
                                  }))
                                }
                                className="w-4 h-4 text-purple-600 border-slate-300 rounded focus:ring-purple-500"
                              />
                              <label
                                htmlFor="enablePro"
                                className="ml-2 text-sm font-semibold text-purple-700 cursor-pointer"
                              >
                                PRO PLAN
                              </label>
                            </div>

                            <div className="mb-3">
                              <label className="block text-xs font-medium text-slate-600 mb-1">
                                가격 (원) {productFormData.enablePro && "*"}
                              </label>
                              <input
                                type="number"
                                required={productFormData.enablePro}
                                disabled={!productFormData.enablePro}
                                min="0"
                                value={productFormData.proPrice}
                                onChange={(e) =>
                                  setProductFormData((prev) => ({
                                    ...prev,
                                    proPrice: parseInt(e.target.value) || 0,
                                  }))
                                }
                                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 disabled:bg-slate-100 disabled:cursor-not-allowed"
                              />
                            </div>

                            <div className="space-y-2">
                              {(
                                Object.keys(optionLabels) as Array<keyof PlanOptions>
                              ).map((optionKey) => (
                                <button
                                  key={optionKey}
                                  type="button"
                                  onClick={() => handleOptionToggle("pro", optionKey)}
                                  disabled={
                                    !productFormData.templateOptions[optionKey] ||
                                    !productFormData.enablePro
                                  }
                                  className={`w-full px-3 py-2 rounded-lg text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${
                                    productFormData.proOptions[optionKey]
                                      ? "bg-purple-600 text-white hover:bg-purple-700"
                                      : "bg-slate-200 text-slate-600 hover:bg-slate-300"
                                  }`}
                                >
                                  {optionLabels[optionKey]}
                                </button>
                              ))}
                            </div>
                          </div>
                        </div>

                        <div className="mt-4 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-600">
                          LITE에서 옵션 활성화 시 PRO도 자동 활성화됩니다. PRO에서 비활성화 시 LITE도 자동 비활성화됩니다.
                        </div>
                      </section>
                    </div>
                  </div>
                </div>

                <div className="border-t border-slate-200 bg-slate-50/80 px-5 py-4 sm:px-8">
                  <div className="flex flex-wrap justify-end gap-3">
                    <button
                      type="button"
                      onClick={handleOpenShopPreview}
                      className="px-4 py-2 bg-sky-600 text-white rounded-lg hover:bg-sky-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                      disabled={!previewTemplate}
                    >
                      상점에서 미리보기
                    </button>
                    <button
                      type="button"
                      onClick={closeProductModal}
                      className="px-4 py-2 text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-100 transition-colors"
                      disabled={productLoading}
                    >
                      취소
                    </button>
                    <button
                      type="submit"
                      className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-secondary transition-colors disabled:opacity-50"
                      disabled={productLoading}
                    >
                      {productLoading
                        ? "처리 중..."
                        : hasProduct(selectedTemplate)
                        ? "상품 수정"
                        : "상품 등록"}
                    </button>
                  </div>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
