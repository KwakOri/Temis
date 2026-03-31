"use client";

import ProtectedRoute from "@/components/auth/ProtectedRoute";
import TemplateDetailContent from "@/components/shop/TemplateDetailContent";
import { useAuth } from "@/contexts/AuthContext";
import {
  useAdminArtists,
  useUpdateTemplateArtists,
} from "@/hooks/query/useAdminArtists";
import {
  useAdminTemplate,
  useCreateShopTemplate,
  useCreateTemplatePlan,
  useUpdateAdminTemplate,
  useUpdateShopTemplate,
  useUpdateTemplatePlan,
} from "@/hooks/query/useAdminTemplates";
import { AdminTemplateService } from "@/services/admin/templateService";
import type { Artist, TemplateWithShopTemplateAndPlans } from "@/types/admin";
import type { ShopTemplateWithPlans as ShopTemplateDetailData } from "@/types/templateDetail";
import { ArrowLeft, Loader2 } from "lucide-react";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

interface PlanOptions {
  is_artist: boolean;
  is_memo: boolean;
  is_multi_schedule: boolean;
  is_guerrilla: boolean;
  is_offline_memo: boolean;
}

interface ProductForm {
  templateName: string;
  templateDescription: string;
  title: string;
  detailed_description: string;
  proPrice: number;
  features: string[];
  requirements: string;
  purchase_instructions: string;
  templateOptions: PlanOptions;
}

const defaultPlanOptions: PlanOptions = {
  is_artist: false,
  is_memo: false,
  is_multi_schedule: false,
  is_guerrilla: false,
  is_offline_memo: false,
};

const optionLabels: Record<keyof PlanOptions, string> = {
  is_artist: "아티스트",
  is_memo: "메모",
  is_multi_schedule: "다중 스케줄",
  is_guerrilla: "게릴라",
  is_offline_memo: "오프라인 메모",
};

function TemplateProductEditorContent() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const params = useParams();
  const templateId = params?.templateId as string;

  const {
    data: template,
    isLoading: templateLoading,
    error: templateError,
  } = useAdminTemplate(templateId);
  const { data: artists = [] } = useAdminArtists({ isActive: true });

  const createProductMutation = useCreateShopTemplate();
  const updateTemplateMutation = useUpdateAdminTemplate();
  const updateProductMutation = useUpdateShopTemplate();
  const createPlanMutation = useCreateTemplatePlan();
  const updatePlanMutation = useUpdateTemplatePlan();
  const updateTemplateArtistsMutation = useUpdateTemplateArtists();

  const [productFormData, setProductFormData] = useState<ProductForm>({
    templateName: "",
    templateDescription: "",
    title: "",
    detailed_description: "",
    proPrice: 25000,
    features: [
      "고화질 시간표 템플릿",
      "커스터마이징 가능한 소스 파일",
      "사용 가이드",
    ],
    requirements: "웹 브라우저만 있으면 사용 가능",
    purchase_instructions: "결제 확인 후 1-2일 이내 권한 부여",
    templateOptions: defaultPlanOptions,
  });
  const [selectedArtistIds, setSelectedArtistIds] = useState<string[]>([]);
  const [primaryArtistId, setPrimaryArtistId] = useState<string | null>(null);
  const [artistSearchTerm, setArtistSearchTerm] = useState("");
  const [formInitializing, setFormInitializing] = useState(true);

  const temisArtistOption = useMemo(
    () => artists.find((artist) => artist.slug === "temis"),
    [artists]
  );
  const artistById = useMemo(() => {
    const map = new Map<string, Artist>();

    for (const artist of artists) {
      map.set(artist.id, artist);
    }

    for (const relation of template?.template_artists || []) {
      if (relation.artist) {
        map.set(relation.artist_id, relation.artist);
      }
    }

    return map;
  }, [artists, template?.template_artists]);

  const searchedArtists = useMemo(() => {
    const term = artistSearchTerm.trim().toLowerCase();
    if (term.length < 2) {
      return [];
    }

    return artists.filter((artist) => {
      const name = artist.name?.toLowerCase() || "";
      const bio = artist.bio?.toLowerCase() || "";
      const slug = artist.slug?.toLowerCase() || "";
      return (
        name.includes(term) || bio.includes(term) || slug.includes(term)
      );
    });
  }, [artists, artistSearchTerm]);

  const selectedArtists = useMemo(
    () =>
      selectedArtistIds.map((artistId) => ({
        artistId,
        artist: artistById.get(artistId) || null,
      })),
    [artistById, selectedArtistIds]
  );

  const hasProduct = (item: TemplateWithShopTemplateAndPlans) =>
    item.shop_templates && item.shop_templates.length > 0;

  const getShopTemplate = (item: TemplateWithShopTemplateAndPlans) =>
    item.shop_templates?.[0] || null;

  const isSelling = (item: TemplateWithShopTemplateAndPlans) =>
    Boolean(getShopTemplate(item)?.is_shop_visible);

  const applyArtistSelectionFromTemplate = (
    item: TemplateWithShopTemplateAndPlans
  ) => {
    const relations = (item.template_artists || []).slice().sort((a, b) => {
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

  useEffect(() => {
    if (!template) {
      return;
    }

    let active = true;

    const initializeForm = async () => {
      setFormInitializing(true);
      setArtistSearchTerm("");

      applyArtistSelectionFromTemplate(template);

      const product = template.shop_templates?.[0];
      if (!product) {
        if (active) {
          setProductFormData({
            templateName: template.name || "",
            templateDescription: template.description || "",
            title: template.name,
            detailed_description: "",
            proPrice: 25000,
            features: [
              "고화질 시간표 템플릿",
              "커스터마이징 가능한 소스 파일",
              "사용 가이드",
            ],
            requirements: "웹 브라우저만 있으면 사용 가능",
            purchase_instructions: "결제 확인 후 1-2일 이내 권한 부여",
            templateOptions: defaultPlanOptions,
          });
          setFormInitializing(false);
        }
        return;
      }

      try {
        const { plans } = await AdminTemplateService.getTemplatePlans(product.id);
        const proPlan = plans.find((p) => p.plan === "pro");
        const litePlan = plans.find((p) => p.plan === "lite");

        if (!active) {
          return;
        }

        setProductFormData({
          templateName: template.name || "",
          templateDescription: template.description || "",
          title: product.title || template.name,
          detailed_description: product.detailed_description || "",
          proPrice: proPlan?.price || litePlan?.price || 25000,
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
        });
      } catch (error) {
        console.error("상품 편집 초기화 실패:", error);
      } finally {
        if (active) {
          setFormInitializing(false);
        }
      }
    };

    initializeForm();

    return () => {
      active = false;
    };
  }, [template]);

  const handleTemplateOptionToggle = (optionKey: keyof PlanOptions) => {
    setProductFormData((prev) => ({
      ...prev,
      templateOptions: {
        ...prev.templateOptions,
        [optionKey]: !prev.templateOptions[optionKey],
      },
    }));
  };

  const handleArtistToggle = (artistId: string, checked: boolean) => {
    setSelectedArtistIds((prev) => {
      if (checked) {
        const next = prev.includes(artistId) ? prev : [...prev, artistId];
        if (!primaryArtistId) {
          setPrimaryArtistId(artistId);
        }
        return next;
      }

      const next = prev.filter((id) => id !== artistId);
      if (primaryArtistId === artistId) {
        setPrimaryArtistId(next[0] || null);
      }
      return next;
    });
  };

  const handleAssignTemisArtist = () => {
    if (!temisArtistOption) {
      alert("'테미스' 시스템 작가를 찾을 수 없습니다.");
      return;
    }

    setSelectedArtistIds([temisArtistOption.id]);
    setPrimaryArtistId(temisArtistOption.id);
  };

  const previewTemplate = useMemo<ShopTemplateDetailData | null>(() => {
    if (!template) {
      return null;
    }

    const now = new Date().toISOString();
    const existingShopTemplate = template.shop_templates?.[0];
    const previewShopTemplateId =
      existingShopTemplate?.id || `preview-shop-${template.id}`;
    const normalizedPrimaryArtistId =
      selectedArtistIds.length === 0
        ? null
        : selectedArtistIds.includes(primaryArtistId || "")
        ? primaryArtistId
        : selectedArtistIds[0];

    const previewTemplateArtists: ShopTemplateDetailData["template_artists"] =
      selectedArtistIds.map((artistId, index) => ({
        id: `preview-template-artist-${artistId}`,
        template_id: template.id,
        artist_id: artistId,
        role: "creator",
        is_primary: normalizedPrimaryArtistId === artistId,
        display_order: index,
        created_at: now,
        artist: artistById.get(artistId) || null,
      }));

    const previewPlans: ShopTemplateDetailData["template_plans"] = [
      {
        id: `preview-plan-pro-${template.id}`,
        shop_template_id: previewShopTemplateId,
        plan: "pro",
        price: productFormData.proPrice,
        created_at: now,
        updated_at: now,
        ...productFormData.templateOptions,
      },
    ];

    return {
      id: previewShopTemplateId,
      template_id: template.id,
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
        id: template.id,
        created_at: template.created_at,
        updated_at: template.updated_at,
        name: productFormData.templateName || template.name,
        description: productFormData.templateDescription,
        detailed_description: template.detailed_description,
        thumbnail_url: template.thumbnail_url,
        is_public: template.is_public,
        is_shop_visible: template.is_shop_visible,
      },
      template_plans: previewPlans,
      template_artists: previewTemplateArtists,
    };
  }, [artistById, primaryArtistId, productFormData, selectedArtistIds, template]);

  const handleOpenShopPreview = () => {
    if (!previewTemplate || typeof window === "undefined") {
      return;
    }

    try {
      const previewKey = `shop-preview:${template?.id || "unknown"}:${Date.now()}`;
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

  const productLoading =
    updateTemplateMutation.isPending ||
    createProductMutation.isPending ||
    updateProductMutation.isPending ||
    createPlanMutation.isPending ||
    updatePlanMutation.isPending ||
    updateTemplateArtistsMutation.isPending;

  const handleProductSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!template) return;

    try {
      const product = template.shop_templates?.[0];
      const isEditing = !!product;

      await updateTemplateMutation.mutateAsync({
        templateId: template.id,
        data: {
          name: productFormData.templateName,
          description: productFormData.templateDescription,
        },
      });

      const productData = {
        title: productFormData.title,
        detailed_description: productFormData.detailed_description,
        features: productFormData.features,
        requirements: productFormData.requirements,
        purchase_instructions: productFormData.purchase_instructions,
        is_shop_visible: isEditing ? product.is_shop_visible : false,
        ...productFormData.templateOptions,
      };

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
          template_id: template.id,
        });
        shopTemplateId = createdShopTemplate.id;
      }

      const { plans } = await AdminTemplateService.getTemplatePlans(shopTemplateId);
      const proPlan = plans.find((p) => p.plan === "pro");

      if (proPlan) {
        await updatePlanMutation.mutateAsync({
          planId: proPlan.id,
          data: {
            price: productFormData.proPrice,
            ...productFormData.templateOptions,
          },
        });
      } else {
        await createPlanMutation.mutateAsync({
          shop_template_id: shopTemplateId,
          plan: "pro",
          price: productFormData.proPrice,
          ...productFormData.templateOptions,
        });
      }

      const normalizedPrimaryArtistId =
        selectedArtistIds.length === 0
          ? null
          : selectedArtistIds.includes(primaryArtistId || "")
          ? primaryArtistId
          : selectedArtistIds[0];

      await updateTemplateArtistsMutation.mutateAsync({
        templateId: template.id,
        relations: selectedArtistIds.map((artistId, index) => ({
          artist_id: artistId,
          role: "creator",
          is_primary: normalizedPrimaryArtistId === artistId,
          display_order: index,
        })),
      });

      alert("상품 정보가 저장되었습니다.");
      if (window.history.length > 1) {
        router.back();
      } else {
        router.push("/admin/templates");
      }
    } catch (error) {
      console.error("Product submit error:", error);
      alert(error instanceof Error ? error.message : "오류가 발생했습니다.");
    }
  };

  if (authLoading || templateLoading || formInitializing) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-timetable-form-bg">
        <div className="text-center">
          <Loader2 className="h-10 w-10 animate-spin text-primary mx-auto" />
          <p className="mt-3 text-dark-gray/70">상품 편집 화면을 준비하는 중...</p>
        </div>
      </div>
    );
  }

  if (!user?.isAdmin) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-timetable-form-bg">
        <div className="bg-white border border-[#E8D8CB] rounded-2xl p-8 text-center max-w-md">
          <h2 className="text-xl font-semibold text-[#3B3028]">접근 권한 없음</h2>
          <p className="text-sm text-[#6A5648] mt-2">
            관리자 권한이 필요한 페이지입니다.
          </p>
          <button
            type="button"
            onClick={() => router.push("/admin/templates")}
            className="mt-4 px-4 py-2 rounded-lg bg-[#D88A4A] text-white hover:bg-[#C97A3A] transition-colors"
          >
            관리자 페이지로 이동
          </button>
        </div>
      </div>
    );
  }

  if (templateError || !template) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-timetable-form-bg">
        <div className="bg-white border border-[#E8D8CB] rounded-2xl p-8 text-center max-w-md">
          <h2 className="text-xl font-semibold text-[#3B3028]">템플릿을 찾을 수 없습니다</h2>
          <p className="text-sm text-[#6A5648] mt-2">
            {templateError instanceof Error
              ? templateError.message
              : "템플릿 정보를 불러오지 못했습니다."}
          </p>
          <button
            type="button"
            onClick={() => router.push("/admin/templates")}
            className="mt-4 px-4 py-2 rounded-lg bg-[#D88A4A] text-white hover:bg-[#C97A3A] transition-colors"
          >
            관리자 페이지로 이동
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-timetable-form-bg py-5 px-4 sm:px-6 lg:px-8">
      <div className="mx-auto w-full max-w-[1680px]">
        <div className="mb-4 flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={() => {
              if (window.history.length > 1) {
                router.back();
              } else {
                router.push("/admin/templates");
              }
            }}
            className="inline-flex items-center gap-2 px-3 py-2 rounded-lg border border-[#DFCDBF] bg-[#F8EDE4] text-[#5A493E] hover:bg-[#F1E2D5] transition-colors text-sm font-medium"
          >
            <ArrowLeft className="w-4 h-4" />
            템플릿 관리로 돌아가기
          </button>
          <span className="hidden lg:inline text-xs text-[#7A685A]">
            데스크톱에서는 오른쪽에서 실시간 상세페이지 미리보기를 확인할 수 있습니다.
          </span>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1.02fr)_minmax(460px,0.98fr)] gap-6 items-start">
          <form
            onSubmit={handleProductSubmit}
            className="rounded-2xl border border-[#E8D8CB] bg-[#FFFDFB] shadow-[0_20px_60px_-28px_rgba(92,65,44,0.35)]"
          >
            <div className="flex items-start justify-between gap-4 border-b border-[#E8D8CB] bg-gradient-to-r from-[#FFF9F3] via-[#FBF1E8] to-[#F7E6D6] px-5 py-5 sm:px-8">
              <div>
                <h1 className="text-lg sm:text-xl font-semibold text-dark-gray">
                  {hasProduct(template) ? "상품 정보 수정" : "상품 등록"}
                </h1>
                <p className="text-sm text-[#6A5648] mt-1">
                  상점 상세 노출 정보와 판매 설정을 한 번에 관리합니다.
                </p>
                <div className="mt-2">
                  {isSelling(template) ? (
                    <span className="inline-flex px-2.5 py-1 text-xs font-semibold rounded-full bg-[#F5D9C2] text-[#8D4A20]">
                      판매 단계: 판매 중
                    </span>
                  ) : (
                    <span className="inline-flex px-2.5 py-1 text-xs font-semibold rounded-full bg-[#F2E4D5] text-[#935124]">
                      판매 단계: 판매 대기
                    </span>
                  )}
                </div>
              </div>
            </div>

            <div className="px-5 py-6 sm:px-8 space-y-6">
              <div className="rounded-xl border border-[#E7D7C9] bg-[#FAF2EA] px-4 py-3">
                <div className="text-xs font-medium text-[#8A725F] uppercase tracking-wide">
                  선택된 템플릿
                </div>
                <div className="mt-3 space-y-3">
                  <div>
                    <label className="block text-xs font-medium text-[#6E5A4D] mb-1">
                      템플릿 이름 *
                    </label>
                    <input
                      type="text"
                      required
                      value={productFormData.templateName}
                      onChange={(e) =>
                        setProductFormData((prev) => ({
                          ...prev,
                          templateName: e.target.value,
                        }))
                      }
                      className="w-full px-3 py-2 border border-[#DCC7B7] rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-[#E6AD82]/35 focus:border-[#D7925C]"
                      placeholder="템플릿 이름을 입력하세요"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-[#6E5A4D] mb-1">
                      템플릿 설명
                    </label>
                    <textarea
                      value={productFormData.templateDescription}
                      onChange={(e) =>
                        setProductFormData((prev) => ({
                          ...prev,
                          templateDescription: e.target.value,
                        }))
                      }
                      rows={2}
                      className="w-full px-3 py-2 border border-[#DCC7B7] rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-[#E6AD82]/35 focus:border-[#D7925C]"
                      placeholder="템플릿 설명을 입력하세요"
                      maxLength={200}
                    />
                  </div>
                </div>
                {selectedArtistIds.length === 0 && (
                  <div className="mt-2 text-xs text-red-600">
                    현재 작가 미연결 상태입니다. 이 상태에서는 판매 시작이 불가합니다.
                  </div>
                )}
              </div>

              <section className="rounded-xl border border-[#E8D8CB] bg-[#FFFAF6] p-4 sm:p-5">
                <h3 className="text-sm font-semibold text-[#3B3028] mb-4">상점 기본 정보</h3>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-[#5F4F44] mb-1.5">
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
                      className="w-full px-3 py-2.5 border border-[#DCC7B7] rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-[#E6AD82]/35 focus:border-[#D7925C]"
                      placeholder="상품명을 입력하세요"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-[#5F4F44] mb-1.5">
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
                      className="w-full px-3 py-2.5 border border-[#DCC7B7] rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-[#E6AD82]/35 focus:border-[#D7925C]"
                      rows={5}
                      placeholder="상점에 표시될 자세한 설명을 입력하세요"
                      maxLength={2000}
                    />
                    <div className="mt-1 text-xs text-[#7A685A]">
                      줄바꿈은 자동 반영됩니다. 최대 2000자
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-[#5F4F44] mb-1.5">
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
                      className="w-full px-3 py-2.5 border border-[#DCC7B7] rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-[#E6AD82]/35 focus:border-[#D7925C]"
                      rows={3}
                      placeholder="결제 확인 후 1-2일 이내 권한 부여"
                    />
                  </div>
                </div>
              </section>

              <section className="rounded-xl border border-[#E8D8CB] bg-[#FFFAF6] p-4 sm:p-5">
                <h3 className="text-sm font-semibold text-[#3B3028] mb-1">작가 연결</h3>
                <p className="text-xs text-[#7A685A] mb-4">
                  이 템플릿에 연결할 작가를 선택하고 대표 작가를 지정하세요.
                </p>

                {artists.length === 0 ? (
                  <div className="text-sm text-[#7A685A] bg-[#F9F1E8] border border-[#E7D7C9] rounded-lg p-3">
                    등록된 작가가 없습니다. 먼저 작가 관리 탭에서 작가를 등록해 주세요.
                  </div>
                ) : (
                  <div className="space-y-3">
                    <input
                      value={artistSearchTerm}
                      onChange={(e) => setArtistSearchTerm(e.target.value)}
                      placeholder="작가 검색 (이름/소개/슬러그, 2자 이상)"
                      className="w-full px-3 py-2 border border-[#DCC7B7] rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-[#E6AD82]/35 focus:border-[#D7925C]"
                    />

                    {artistSearchTerm.trim().length < 2 ? (
                      <p className="text-xs text-[#7A685A]">
                        검색어를 2자 이상 입력하면 작가 목록이 표시됩니다.
                      </p>
                    ) : searchedArtists.length === 0 ? (
                      <div className="text-sm text-[#7A685A] bg-[#F9F1E8] border border-[#E7D7C9] rounded-lg p-3">
                        검색 결과가 없습니다.
                      </div>
                    ) : (
                      <div className="max-h-64 overflow-y-auto space-y-2.5 pr-1">
                        {searchedArtists.map((artist) => {
                          const checked = selectedArtistIds.includes(artist.id);
                          return (
                            <div
                              key={artist.id}
                              className={`rounded-lg border p-3 flex items-center justify-between gap-3 ${
                                checked
                                  ? "border-[#E3B58D] bg-[#FDF2E8]"
                                  : "border-[#E8D8CB] bg-[#FFFDFB]"
                              }`}
                            >
                              <label className="flex items-center gap-2 min-w-0">
                                <input
                                  type="checkbox"
                                  checked={checked}
                                  onChange={(e) =>
                                    handleArtistToggle(artist.id, e.target.checked)
                                  }
                                  className="w-4 h-4 text-orange-600 border-[#CFB9A8] rounded focus:ring-[#E6AD82]"
                                />
                                <span className="text-sm text-[#3F342D] truncate">
                                  {artist.name}
                                </span>
                              </label>
                              <label className="flex items-center gap-1 text-xs text-[#7A685A]">
                                <input
                                  type="radio"
                                  name="primary-artist"
                                  disabled={!checked}
                                  checked={checked && primaryArtistId === artist.id}
                                  onChange={() => setPrimaryArtistId(artist.id)}
                                  className="w-4 h-4 text-orange-600 border-[#CFB9A8] focus:ring-[#E6AD82]"
                                />
                                대표
                              </label>
                            </div>
                          );
                        })}
                      </div>
                    )}

                    <div className="rounded-lg border border-[#E8D8CB] bg-[#FFFDFB] p-3">
                      <p className="text-xs font-medium text-[#6E5A4D] mb-2">
                        선택된 작가 {selectedArtists.length}명
                      </p>
                      {selectedArtists.length === 0 ? (
                        <p className="text-xs text-[#7A685A]">
                          아직 연결된 작가가 없습니다.
                        </p>
                      ) : (
                        <div className="space-y-2">
                          {selectedArtists.map(({ artistId, artist }) => (
                            <div
                              key={artistId}
                              className="rounded-md border border-[#E8D8CB] bg-white px-3 py-2 flex items-center justify-between gap-3"
                            >
                              <div className="min-w-0">
                                <p className="text-sm text-[#3F342D] truncate">
                                  {artist?.name || `알 수 없는 작가 (${artistId})`}
                                </p>
                                {artist?.slug && (
                                  <p className="text-xs text-[#7A685A] truncate">
                                    @{artist.slug}
                                  </p>
                                )}
                              </div>
                              <div className="flex items-center gap-3">
                                <label className="flex items-center gap-1 text-xs text-[#7A685A]">
                                  <input
                                    type="radio"
                                    name="selected-primary-artist"
                                    checked={primaryArtistId === artistId}
                                    onChange={() => setPrimaryArtistId(artistId)}
                                    className="w-4 h-4 text-orange-600 border-[#CFB9A8] focus:ring-[#E6AD82]"
                                  />
                                  대표
                                </label>
                                <button
                                  type="button"
                                  onClick={() => handleArtistToggle(artistId, false)}
                                  className="text-xs text-red-600 hover:text-red-700"
                                >
                                  해제
                                </button>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {selectedArtistIds.length === 0 && (
                  <div className="mt-3 rounded-lg border border-red-200 bg-red-50 p-3">
                    <p className="text-xs text-red-700">
                      미연결 상태는 판매 불가입니다. &apos;테미스&apos; 또는 실제 작가를 연결해
                      주세요.
                    </p>
                    <div className="mt-2">
                      <button
                        type="button"
                        onClick={handleAssignTemisArtist}
                        disabled={!temisArtistOption}
                        className="px-3 py-1.5 text-xs font-medium rounded-md bg-white border border-red-200 text-red-700 hover:bg-red-100 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {temisArtistOption
                          ? "'테미스'로 빠르게 연결"
                          : "'테미스' 시스템 작가를 찾을 수 없음"}
                      </button>
                    </div>
                  </div>
                )}
              </section>

              <section className="rounded-xl border border-[#E8D8CB] bg-[#FFFAF6] p-4 sm:p-5">
                <h3 className="text-sm font-semibold text-[#3B3028] mb-1">
                  템플릿 기본 기능
                </h3>
                <p className="text-xs text-[#7A685A] mb-4">
                  템플릿에 포함되는 기준 기능입니다. PRO 플랜에도 동일하게 적용됩니다.
                </p>

                <div className="mb-4">
                  <label className="block text-xs font-medium text-[#6E5A4D] mb-1">
                    판매 가격 (원) *
                  </label>
                  <input
                    type="number"
                    required
                    min="0"
                    value={productFormData.proPrice}
                    onChange={(e) =>
                      setProductFormData((prev) => ({
                        ...prev,
                        proPrice: parseInt(e.target.value, 10) || 0,
                      }))
                    }
                    className="w-full max-w-xs px-3 py-2 border border-[#DCC7B7] rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-[#E6AD82]/35 focus:border-[#D7925C]"
                  />
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                  {(Object.keys(optionLabels) as Array<keyof PlanOptions>).map(
                    (optionKey) => (
                      <button
                        key={optionKey}
                        type="button"
                        onClick={() => handleTemplateOptionToggle(optionKey)}
                        className={`px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                          productFormData.templateOptions[optionKey]
                            ? "bg-[#D2905A] text-white hover:bg-[#C98147]"
                            : "bg-[#F5ECE5] text-[#6D594D] hover:bg-[#EEDFD3]"
                        }`}
                      >
                        {optionLabels[optionKey]}
                      </button>
                    )
                  )}
                </div>
              </section>
            </div>

            <div className="border-t border-[#E8D8CB] bg-[#F8EFE7] px-5 py-4 sm:px-8">
              <div className="flex flex-wrap justify-end gap-3">
                <button
                  type="button"
                  onClick={handleOpenShopPreview}
                  className="hidden lg:inline-flex px-4 py-2 rounded-lg border border-[#D79A67] bg-[#E8B185] text-[#2D2D2D] hover:bg-[#DFA173] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  disabled={!previewTemplate}
                >
                  새 창 미리보기
                </button>
                <button
                  type="button"
                  onClick={() => {
                    if (window.history.length > 1) {
                      router.back();
                    } else {
                      router.push("/admin/templates");
                    }
                  }}
                  className="px-4 py-2 rounded-lg border border-[#DFCEBF] bg-[#F5ECE5] text-[#5F4F44] hover:bg-[#EDE0D3] transition-colors"
                  disabled={productLoading}
                >
                  취소
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-lg bg-[#D88A4A] text-white hover:bg-[#C97A3A] transition-colors disabled:opacity-50"
                  disabled={productLoading}
                >
                  {productLoading
                    ? "처리 중..."
                    : hasProduct(template)
                    ? "상품 수정"
                    : "상품 등록"}
                </button>
              </div>
            </div>
          </form>

          <aside className="hidden lg:block">
            <div className="sticky top-6 space-y-3">
              <div className="rounded-xl border border-[#E8D8CB] bg-[#FFF9F3] px-4 py-3">
                <h3 className="text-sm font-semibold text-[#3B3028]">
                  상세페이지 실시간 미리보기
                </h3>
                <p className="text-xs text-[#7A685A] mt-1">
                  왼쪽 입력값이 오른쪽 상세페이지에 즉시 반영됩니다.
                </p>
              </div>
              {previewTemplate && (
                <TemplateDetailContent
                  template={previewTemplate}
                  showTransferNotice
                  purchaseSection={
                    <div className="text-center">
                      <button
                        type="button"
                        disabled
                        className="w-full bg-primary text-white py-3 rounded-lg font-semibold opacity-70 cursor-not-allowed"
                      >
                        구매 신청하기
                      </button>
                      <p className="text-sm text-dark-gray/60 mt-3">
                        편집 화면에서는 구매가 진행되지 않습니다.
                      </p>
                    </div>
                  }
                />
              )}
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
}

export default function AdminTemplateProductEditorPage() {
  return (
    <ProtectedRoute>
      <TemplateProductEditorContent />
    </ProtectedRoute>
  );
}
