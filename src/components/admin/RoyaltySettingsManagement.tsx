"use client";

import AdminTabHeader from "@/components/admin/AdminTabHeader";
import {
  useRoyaltySettingsArtists,
  useRoyaltySettingsArtistTemplates,
  useUpdateArtistRoyaltyRule,
  useUpdateTemplateRoyaltyRule,
} from "@/hooks/query/useAdminRoyalties";
import {
  ArtistRoyaltyRule,
  RoyaltyRuleInput,
  RoyaltyRuleType,
  TemplateRoyaltySettingsItem,
} from "@/types/admin";
import { AlertTriangle, ArrowLeft, HandCoins } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

function formatRule(rule: ArtistRoyaltyRule | null): string {
  if (!rule) {
    return "미설정";
  }

  if (rule.royalty_type === "fixed") {
    return `₩${Math.round(rule.royalty_value).toLocaleString("ko-KR")}`;
  }

  return `${rule.royalty_value}%`;
}

function getRuleTone(rule: ArtistRoyaltyRule | null) {
  return rule
    ? "bg-green-50 text-green-700 border-green-200"
    : "bg-red-50 text-red-700 border-red-200";
}

interface RuleEditorProps {
  rule: ArtistRoyaltyRule | null;
  onSave: (data: RoyaltyRuleInput) => Promise<void>;
  disabled?: boolean;
}

function RuleEditor({ rule, onSave, disabled }: RuleEditorProps) {
  const [royaltyType, setRoyaltyType] = useState<RoyaltyRuleType>("percentage");
  const [royaltyValue, setRoyaltyValue] = useState("");

  useEffect(() => {
    if (rule?.royalty_type === "fixed" || rule?.royalty_type === "percentage") {
      setRoyaltyType(rule.royalty_type);
      setRoyaltyValue(String(rule.royalty_value));
      return;
    }

    setRoyaltyType("percentage");
    setRoyaltyValue("");
  }, [rule]);

  const save = async () => {
    const value = Number(royaltyValue);

    if (!Number.isFinite(value) || value < 0) {
      alert("로열티 값은 0 이상의 숫자로 입력해주세요.");
      return;
    }

    if (royaltyType === "percentage" && value > 100) {
      alert("비율 로열티는 100%를 초과할 수 없습니다.");
      return;
    }

    await onSave({
      royaltyType,
      royaltyValue: value,
    });
  };

  const remove = async () => {
    if (!rule) {
      return;
    }

    if (!confirm("이 로열티 설정을 삭제하시겠습니까?")) {
      return;
    }

    await onSave({
      royaltyType: null,
      royaltyValue: null,
    });
  };

  return (
    <div className="flex flex-wrap items-center gap-2">
      <select
        value={royaltyType}
        onChange={(event) => setRoyaltyType(event.target.value as RoyaltyRuleType)}
        className="px-2 py-1.5 border border-gray-300 rounded-md text-sm"
        disabled={disabled}
      >
        <option value="percentage">비율</option>
        <option value="fixed">고정 금액</option>
      </select>
      <input
        type="number"
        min={0}
        max={royaltyType === "percentage" ? 100 : undefined}
        step={royaltyType === "percentage" ? 0.1 : 1}
        value={royaltyValue}
        onChange={(event) => setRoyaltyValue(event.target.value)}
        className="w-28 px-2 py-1.5 border border-gray-300 rounded-md text-sm text-right"
        placeholder={royaltyType === "percentage" ? "30" : "10000"}
        disabled={disabled}
      />
      <span className="text-sm text-gray-500">
        {royaltyType === "percentage" ? "%" : "원"}
      </span>
      <button
        type="button"
        onClick={save}
        disabled={disabled}
        className="px-3 py-1.5 bg-primary text-white rounded-md text-sm hover:bg-secondary disabled:opacity-50"
      >
        저장
      </button>
      <button
        type="button"
        onClick={remove}
        disabled={disabled || !rule}
        className="px-3 py-1.5 border border-gray-300 rounded-md text-sm text-gray-700 hover:bg-gray-50 disabled:opacity-50"
      >
        삭제
      </button>
    </div>
  );
}

export default function RoyaltySettingsManagement() {
  const router = useRouter();
  const [selectedArtistId, setSelectedArtistId] = useState<string>("");

  const {
    data: artistSettings,
    isLoading: isArtistsLoading,
    error: artistsError,
  } = useRoyaltySettingsArtists();
  const {
    data: templateSettings,
    isLoading: isTemplatesLoading,
    error: templatesError,
  } =
    useRoyaltySettingsArtistTemplates(selectedArtistId);
  const updateArtistRuleMutation = useUpdateArtistRoyaltyRule();
  const updateTemplateRuleMutation = useUpdateTemplateRoyaltyRule();

  const artists = useMemo(
    () => artistSettings?.artists || [],
    [artistSettings?.artists]
  );
  const selectedArtist = useMemo(
    () => artists.find((artist) => artist.artistId === selectedArtistId),
    [artists, selectedArtistId]
  );

  useEffect(() => {
    if (!selectedArtistId && artists.length > 0) {
      setSelectedArtistId(artists[0].artistId);
    }
  }, [artists, selectedArtistId]);

  const saveArtistRule = async (data: RoyaltyRuleInput) => {
    if (!selectedArtistId) {
      return;
    }

    try {
      await updateArtistRuleMutation.mutateAsync({
        artistId: selectedArtistId,
        data,
      });
    } catch (error) {
      alert(error instanceof Error ? error.message : "저장 중 오류가 발생했습니다.");
    }
  };

  const saveTemplateRule = async (
    item: TemplateRoyaltySettingsItem,
    data: RoyaltyRuleInput
  ) => {
    if (!selectedArtistId) {
      return;
    }

    try {
      await updateTemplateRuleMutation.mutateAsync({
        templateId: item.templateId,
        artistId: selectedArtistId,
        data,
      });
    } catch (error) {
      alert(error instanceof Error ? error.message : "저장 중 오류가 발생했습니다.");
    }
  };

  const isSaving =
    updateArtistRuleMutation.isPending || updateTemplateRuleMutation.isPending;

  return (
    <div className="space-y-6">
      <AdminTabHeader
        title="로열티 설정"
        description="작가 기본 로열티와 템플릿별 override를 관리합니다"
        icon={HandCoins}
      >
        <button
          type="button"
          onClick={() => router.push("/admin/settlements")}
          className="inline-flex items-center gap-2 px-3 py-2 border border-gray-300 rounded-md text-sm text-gray-700 hover:bg-gray-50"
        >
          <ArrowLeft className="h-4 w-4" />
          정산으로 돌아가기
        </button>
      </AdminTabHeader>

      <div className="grid grid-cols-1 xl:grid-cols-[360px_minmax(0,1fr)] gap-6">
        <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
          <div className="px-4 py-3 border-b border-gray-200">
            <h3 className="font-semibold text-gray-900">작가 목록</h3>
            <p className="text-xs text-gray-500 mt-1">
              작가를 선택하면 연결된 공개 템플릿이 표시됩니다.
            </p>
          </div>
          <div className="max-h-[720px] overflow-y-auto divide-y divide-gray-100">
            {isArtistsLoading && (
              <div className="px-4 py-8 text-center text-sm text-gray-500">
                작가 목록을 불러오는 중입니다.
              </div>
            )}
            {!isArtistsLoading && artistsError && (
              <div className="px-4 py-8 text-sm text-red-700">
                <div className="flex items-start gap-2">
                  <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                  <div>
                    <div className="font-medium">
                      작가 목록을 불러오지 못했습니다.
                    </div>
                    <div className="mt-1 text-xs text-red-600">
                      {artistsError instanceof Error
                        ? artistsError.message
                        : "잠시 후 다시 시도해주세요."}
                    </div>
                  </div>
                </div>
              </div>
            )}
            {!isArtistsLoading && !artistsError && artists.length === 0 && (
              <div className="px-4 py-8 text-center text-sm text-gray-500">
                등록된 작가가 없습니다.
              </div>
            )}
            {artists.map((artist) => (
              <button
                key={artist.artistId}
                type="button"
                onClick={() => setSelectedArtistId(artist.artistId)}
                className={`w-full px-4 py-3 text-left hover:bg-gray-50 ${
                  selectedArtistId === artist.artistId ? "bg-blue-50" : "bg-white"
                }`}
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="min-w-0">
                    <div className="font-medium text-gray-900 truncate">
                      {artist.artistName}
                    </div>
                    <div className="text-xs text-gray-500">
                      공개 템플릿 {artist.publicTemplateCount}개
                    </div>
                  </div>
                  <span
                    className={`shrink-0 px-2 py-1 text-xs rounded-full border ${getRuleTone(
                      artist.defaultRule
                    )}`}
                  >
                    {formatRule(artist.defaultRule)}
                  </span>
                </div>
                <div className="mt-2 flex flex-wrap gap-2 text-xs text-gray-500">
                  <span>override {artist.templateOverrideCount}개</span>
                  {artist.missingTemplateCount > 0 && (
                    <span className="text-red-600">
                      미설정 {artist.missingTemplateCount}개
                    </span>
                  )}
                </div>
              </button>
            ))}
          </div>
        </div>

        <div className="space-y-6">
          <div className="bg-white border border-gray-200 rounded-lg p-4 sm:p-5">
            <div className="flex flex-col gap-3">
              <div>
                <h3 className="font-semibold text-gray-900">
                  {selectedArtist?.artistName || "작가 선택"}
                </h3>
                <p className="text-sm text-gray-500 mt-1">
                  작가 기본 로열티는 템플릿별 설정이 없을 때 적용됩니다.
                </p>
              </div>
              {selectedArtist && (
                <RuleEditor
                  rule={selectedArtist.defaultRule}
                  onSave={saveArtistRule}
                  disabled={isSaving}
                />
              )}
            </div>
          </div>

          <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
            <div className="px-4 py-3 border-b border-gray-200">
              <h3 className="font-semibold text-gray-900">템플릿별 로열티</h3>
              <p className="text-xs text-gray-500 mt-1">
                템플릿 로열티가 있으면 작가 기본 로열티보다 우선 적용됩니다.
              </p>
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-2 text-left text-xs text-gray-600">
                      템플릿
                    </th>
                    <th className="px-4 py-2 text-left text-xs text-gray-600">
                      적용 규칙
                    </th>
                    <th className="px-4 py-2 text-left text-xs text-gray-600">
                      템플릿 override
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {isTemplatesLoading && (
                    <tr>
                      <td
                        colSpan={3}
                        className="px-4 py-8 text-center text-sm text-gray-500"
                      >
                        템플릿 목록을 불러오는 중입니다.
                      </td>
                    </tr>
                  )}
                  {!isTemplatesLoading && templatesError && (
                    <tr>
                      <td
                        colSpan={3}
                        className="px-4 py-8 text-sm text-red-700"
                      >
                        <div className="flex items-start gap-2">
                          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                          <div>
                            <div className="font-medium">
                              템플릿 목록을 불러오지 못했습니다.
                            </div>
                            <div className="mt-1 text-xs text-red-600">
                              {templatesError instanceof Error
                                ? templatesError.message
                                : "잠시 후 다시 시도해주세요."}
                            </div>
                          </div>
                        </div>
                      </td>
                    </tr>
                  )}
                  {!isTemplatesLoading &&
                    !templatesError &&
                    (templateSettings?.templates.length || 0) === 0 && (
                      <tr>
                        <td
                          colSpan={3}
                          className="px-4 py-8 text-center text-sm text-gray-500"
                        >
                          연결된 공개 템플릿이 없습니다.
                        </td>
                      </tr>
                    )}
                  {templateSettings?.templates.map((item) => (
                    <tr key={item.templateId}>
                      <td className="px-4 py-3 text-sm text-gray-900 min-w-56">
                        <div className="font-medium">{item.templateName}</div>
                        <div className="text-xs text-gray-500">
                          {item.isShopVisible ? "상점 노출 중" : "상점 미노출"}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-sm">
                        <span
                          className={`inline-flex px-2 py-1 rounded-full border text-xs ${getRuleTone(
                            item.appliedRule
                          )}`}
                        >
                          {item.appliedSource === "template"
                            ? "템플릿"
                            : item.appliedSource === "artist"
                            ? "작가 기본"
                            : "미설정"}
                          : {formatRule(item.appliedRule)}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <RuleEditor
                          rule={item.templateRule}
                          onSave={(data) => saveTemplateRule(item, data)}
                          disabled={isSaving}
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
