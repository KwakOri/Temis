"use client";

import {
  useAdminOptionsList,
  useToggleAdminOption,
} from "@/hooks/query/useAdminOptions";
import {
  useCreatePriceOption,
  useDeletePriceOption,
  usePriceOptions,
  useTogglePriceOption,
  useUpdatePriceOption,
} from "@/hooks/query/usePriceOptions";
import { CreatePriceOptionInput, PriceOption } from "@/types/priceOption";
import {
  AlertTriangle,
  Check,
  Edit2,
  Loader2,
  Plus,
  Settings,
  Trash2,
  X,
} from "lucide-react";
import { useState } from "react";

interface PriceOptionFormData {
  label: string;
  value: string;
  description: string;
  price: number;
  is_discount: boolean;
  is_enabled: boolean;
}

const initialFormData: PriceOptionFormData = {
  label: "",
  value: "",
  description: "",
  price: 0,
  is_discount: false,
  is_enabled: true,
};

export default function SettingsManagement() {
  const [isAddingOption, setIsAddingOption] = useState(false);
  const [editingOptionId, setEditingOptionId] = useState<string | null>(null);
  const [formData, setFormData] = useState<PriceOptionFormData>(initialFormData);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  // React Query hooks - 가격 옵션
  const { data: timetableOptions, isLoading } = usePriceOptions("timetable");
  const createMutation = useCreatePriceOption();
  const updateMutation = useUpdatePriceOption();
  const deleteMutation = useDeletePriceOption();
  const toggleMutation = useTogglePriceOption("timetable");

  // React Query hooks - 관리자 옵션 (일반 설정)
  const { data: generalOptions, isLoading: isLoadingGeneral } =
    useAdminOptionsList("general");
  const toggleAdminOptionMutation = useToggleAdminOption("general");

  // 맞춤 시간표 접수 옵션 찾기
  const customTimetableOrdersOption = generalOptions?.find(
    (opt) => opt.value === "custom_timetable_orders"
  );

  // 빠른 마감 옵션 찾기
  const workFastOption = generalOptions?.find(
    (opt) => opt.value === "work_fast"
  );

  const handleAddOption = () => {
    setIsAddingOption(true);
    setFormData(initialFormData);
    setEditingOptionId(null);
  };

  const handleEditOption = (option: PriceOption) => {
    setEditingOptionId(option.id);
    setFormData({
      label: option.label,
      value: option.value,
      description: option.description || "",
      price: option.price,
      is_discount: option.is_discount,
      is_enabled: option.is_enabled,
    });
    setIsAddingOption(false);
  };

  const handleCancelEdit = () => {
    setIsAddingOption(false);
    setEditingOptionId(null);
    setFormData(initialFormData);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.label.trim() || !formData.value.trim()) {
      alert("옵션 이름과 값은 필수입니다.");
      return;
    }

    try {
      if (editingOptionId) {
        await updateMutation.mutateAsync({
          id: editingOptionId,
          input: {
            ...formData,
            category: "timetable",
          },
        });
        alert("옵션이 수정되었습니다.");
      } else {
        const input: CreatePriceOptionInput = {
          ...formData,
          category: "timetable",
        };
        await createMutation.mutateAsync(input);
        alert("옵션이 추가되었습니다.");
      }
      handleCancelEdit();
    } catch (error) {
      alert(
        error instanceof Error ? error.message : "작업 중 오류가 발생했습니다."
      );
    }
  };

  const handleDelete = async (option: PriceOption) => {
    try {
      await deleteMutation.mutateAsync({
        id: option.id,
        category: option.category,
      });
      setDeleteConfirmId(null);
      alert("옵션이 삭제되었습니다.");
    } catch (error) {
      alert(
        error instanceof Error ? error.message : "삭제 중 오류가 발생했습니다."
      );
    }
  };

  const handleToggleEnabled = async (option: PriceOption) => {
    try {
      await toggleMutation.mutateAsync({
        id: option.id,
        is_enabled: !option.is_enabled,
      });
    } catch (error) {
      alert(
        error instanceof Error
          ? error.message
          : "상태 변경 중 오류가 발생했습니다."
      );
    }
  };

  return (
    <div className="space-y-6 sm:space-y-8">
      {/* 헤더 */}
      <div className="flex items-center space-x-3">
        <Settings className="h-5 w-5 sm:h-6 sm:w-6 text-primary" />
        <h2 className="text-lg sm:text-xl font-bold text-primary">설정 관리</h2>
      </div>

      {/* ===== 일반 설정 섹션 ===== */}
      <section className="space-y-4">
        <div className="border-b border-gray-200 pb-2">
          <h3 className="text-base sm:text-lg font-semibold text-gray-900">
            일반 설정
          </h3>
          <p className="text-xs sm:text-sm text-gray-500 mt-1">
            사이트 전반적인 기능의 활성화/비활성화를 관리합니다.
          </p>
        </div>

        {isLoadingGeneral ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
          </div>
        ) : customTimetableOrdersOption || workFastOption ? (
          <div className="bg-white border border-gray-200 rounded-lg divide-y divide-gray-200">
            {/* 맞춤 시간표 접수 옵션 */}
            {customTimetableOrdersOption && (
              <div className="flex items-center gap-3 p-4">
                <button
                  onClick={() =>
                    toggleAdminOptionMutation.mutate({
                      id: customTimetableOrdersOption.id,
                      isEnabled: !customTimetableOrdersOption.is_enabled,
                    })
                  }
                  disabled={toggleAdminOptionMutation.isPending}
                  className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 ${
                    customTimetableOrdersOption.is_enabled
                      ? "bg-primary"
                      : "bg-gray-200"
                  }`}
                  role="switch"
                  aria-checked={customTimetableOrdersOption.is_enabled}
                >
                  <span
                    className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                      customTimetableOrdersOption.is_enabled
                        ? "translate-x-5"
                        : "translate-x-0"
                    }`}
                  />
                </button>
                <div className="flex-1 min-w-0">
                  <div className="font-medium text-gray-900 text-sm sm:text-base">
                    {customTimetableOrdersOption.label}
                  </div>
                  {customTimetableOrdersOption.description && (
                    <div className="text-xs sm:text-sm text-gray-500 mt-0.5">
                      {customTimetableOrdersOption.description}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* 빠른 마감 옵션 */}
            {workFastOption && (
              <div className="flex items-center gap-3 p-4">
                <button
                  onClick={() =>
                    toggleAdminOptionMutation.mutate({
                      id: workFastOption.id,
                      isEnabled: !workFastOption.is_enabled,
                    })
                  }
                  disabled={toggleAdminOptionMutation.isPending}
                  className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 ${
                    workFastOption.is_enabled
                      ? "bg-primary"
                      : "bg-gray-200"
                  }`}
                  role="switch"
                  aria-checked={workFastOption.is_enabled}
                >
                  <span
                    className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                      workFastOption.is_enabled
                        ? "translate-x-5"
                        : "translate-x-0"
                    }`}
                  />
                </button>
                <div className="flex-1 min-w-0">
                  <div className="font-medium text-gray-900 text-sm sm:text-base">
                    {workFastOption.label}
                  </div>
                  {workFastOption.description && (
                    <div className="text-xs sm:text-sm text-gray-500 mt-0.5">
                      {workFastOption.description}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 flex items-start gap-3">
            <AlertTriangle className="h-5 w-5 text-amber-500 flex-shrink-0 mt-0.5" />
            <p className="text-sm text-amber-700">
              일반 설정 옵션이 없습니다. 데이터베이스에 초기 데이터를
              추가해주세요.
            </p>
          </div>
        )}
      </section>

      {/* ===== 맞춤 시간표 가격 옵션 섹션 ===== */}
      <section className="space-y-4">
        <div className="border-b border-gray-200 pb-2">
          <h3 className="text-base sm:text-lg font-semibold text-gray-900">
            맞춤 시간표 가격 옵션
          </h3>
          <p className="text-xs sm:text-sm text-gray-500 mt-1">
            맞춤형 시간표 주문 시 표시되는 가격 옵션을 관리합니다.
          </p>
        </div>

        {/* 옵션 추가 버튼 */}
        <button
          onClick={handleAddOption}
          className="inline-flex items-center px-3 py-2 sm:px-4 sm:py-2 bg-primary text-white text-sm rounded-lg hover:bg-secondary transition-colors"
        >
          <Plus className="h-4 w-4 mr-1.5 sm:mr-2" />
          옵션 추가
        </button>

        {/* 옵션 추가/수정 모달 */}
        {(isAddingOption || editingOptionId) && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            {/* 오버레이 */}
            <div
              className="absolute inset-0 bg-black/50"
              onClick={handleCancelEdit}
            />
            {/* 모달 내용 */}
            <div className="relative w-full max-w-lg bg-white rounded-xl shadow-xl">
              <form onSubmit={handleSubmit} className="p-4 sm:p-6 space-y-4">
                <div className="flex items-center justify-between">
                  <h4 className="font-semibold text-gray-900 text-base sm:text-lg">
                    {editingOptionId ? "옵션 수정" : "새 옵션 추가"}
                  </h4>
                  <button
                    type="button"
                    onClick={handleCancelEdit}
                    className="p-1 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100 transition-colors"
                  >
                    <X className="h-5 w-5" />
                  </button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1">
                      옵션 이름 *
                    </label>
                    <input
                      type="text"
                      value={formData.label}
                      onChange={(e) =>
                        setFormData((prev) => ({
                          ...prev,
                          label: e.target.value,
                        }))
                      }
                      placeholder="예: 빠른 마감"
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1">
                      옵션 값 (영문) *
                    </label>
                    <input
                      type="text"
                      value={formData.value}
                      onChange={(e) =>
                        setFormData((prev) => ({
                          ...prev,
                          value: e.target.value,
                        }))
                      }
                      placeholder="예: fast_delivery"
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary"
                      required
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1">
                    설명
                  </label>
                  <textarea
                    value={formData.description}
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        description: e.target.value,
                      }))
                    }
                    placeholder="옵션에 대한 설명을 입력하세요"
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary h-20 resize-none"
                  />
                </div>

                <div>
                  <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1">
                    가격 (원)
                  </label>
                  <input
                    type="text"
                    value={formData.price.toLocaleString()}
                    onChange={(e) => {
                      const numericValue = e.target.value.replace(/[^0-9]/g, "");
                      setFormData((prev) => ({
                        ...prev,
                        price: numericValue ? parseInt(numericValue, 10) : 0,
                      }));
                    }}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  {/* 할인 옵션 버튼 그룹 */}
                  <div>
                    <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-2">
                      가격 타입
                    </label>
                    <div className="flex w-full rounded-lg border border-gray-300 overflow-hidden">
                      <button
                        type="button"
                        onClick={() =>
                          setFormData((prev) => ({
                            ...prev,
                            is_discount: false,
                          }))
                        }
                        className={`flex-1 px-4 py-2 text-sm font-medium transition-colors ${
                          !formData.is_discount
                            ? "bg-primary text-white"
                            : "bg-white text-gray-700 hover:bg-gray-50"
                        }`}
                      >
                        추가
                      </button>
                      <button
                        type="button"
                        onClick={() =>
                          setFormData((prev) => ({
                            ...prev,
                            is_discount: true,
                          }))
                        }
                        className={`flex-1 px-4 py-2 text-sm font-medium transition-colors border-l border-gray-300 ${
                          formData.is_discount
                            ? "bg-primary text-white"
                            : "bg-white text-gray-700 hover:bg-gray-50"
                        }`}
                      >
                        할인
                      </button>
                    </div>
                  </div>

                  {/* 활성화 버튼 그룹 */}
                  <div>
                    <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-2">
                      활성화
                    </label>
                    <div className="flex w-full rounded-lg border border-gray-300 overflow-hidden">
                      <button
                        type="button"
                        onClick={() =>
                          setFormData((prev) => ({
                            ...prev,
                            is_enabled: true,
                          }))
                        }
                        className={`flex-1 px-4 py-2 text-sm font-medium transition-colors ${
                          formData.is_enabled
                            ? "bg-primary text-white"
                            : "bg-white text-gray-700 hover:bg-gray-50"
                        }`}
                      >
                        ON
                      </button>
                      <button
                        type="button"
                        onClick={() =>
                          setFormData((prev) => ({
                            ...prev,
                            is_enabled: false,
                          }))
                        }
                        className={`flex-1 px-4 py-2 text-sm font-medium transition-colors border-l border-gray-300 ${
                          !formData.is_enabled
                            ? "bg-gray-500 text-white"
                            : "bg-white text-gray-700 hover:bg-gray-50"
                        }`}
                      >
                        OFF
                      </button>
                    </div>
                  </div>
                </div>

                <div className="flex justify-end space-x-2 sm:space-x-3 pt-4 border-t border-gray-100">
                  <button
                    type="button"
                    onClick={handleCancelEdit}
                    className="px-3 py-2 sm:px-4 sm:py-2 border border-gray-300 rounded-lg text-gray-700 text-sm hover:bg-gray-50 transition-colors"
                  >
                    취소
                  </button>
                  <button
                    type="submit"
                    disabled={
                      createMutation.isPending || updateMutation.isPending
                    }
                    className="px-3 py-2 sm:px-4 sm:py-2 bg-primary text-white text-sm rounded-lg hover:bg-secondary transition-colors disabled:opacity-50"
                  >
                    {createMutation.isPending || updateMutation.isPending ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : editingOptionId ? (
                      "수정"
                    ) : (
                      "추가"
                    )}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* 옵션 목록 */}
        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
          </div>
        ) : timetableOptions && timetableOptions.length > 0 ? (
          <>
            {/* 데스크탑 테이블 (md 이상) */}
            <div className="hidden md:block bg-white border border-gray-200 rounded-lg overflow-hidden">
              <table className="w-full">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider w-16">
                      활성
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      옵션 이름
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      값
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      가격
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      타입
                    </th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      작업
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {timetableOptions.map((option) => (
                    <tr
                      key={option.id}
                      className={`hover:bg-gray-50 ${
                        !option.is_enabled ? "opacity-50" : ""
                      }`}
                    >
                      <td className="px-4 py-4">
                        <div className="flex justify-center">
                          <button
                            onClick={() => handleToggleEnabled(option)}
                            disabled={toggleMutation.isPending}
                            className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 ${
                              option.is_enabled ? "bg-primary" : "bg-gray-200"
                            }`}
                            role="switch"
                            aria-checked={option.is_enabled}
                          >
                            <span
                              className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                                option.is_enabled
                                  ? "translate-x-5"
                                  : "translate-x-0"
                              }`}
                            />
                          </button>
                        </div>
                      </td>
                      <td className="px-4 py-4">
                        <div>
                          <div className="font-medium text-gray-900">
                            {option.label}
                          </div>
                          {option.description && (
                            <div className="text-sm text-gray-500">
                              {option.description}
                            </div>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-4 text-sm text-gray-600">
                        {option.value}
                      </td>
                      <td className="px-4 py-4">
                        <span
                          className={`font-medium ${
                            option.is_discount
                              ? "text-green-600"
                              : "text-gray-900"
                          }`}
                        >
                          {option.is_discount ? "-" : ""}
                          {option.price.toLocaleString()}원
                        </span>
                      </td>
                      <td className="px-4 py-4">
                        <span
                          className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                            option.is_discount
                              ? "bg-green-100 text-green-800"
                              : "bg-blue-100 text-blue-800"
                          }`}
                        >
                          {option.is_discount ? "할인" : "추가"}
                        </span>
                      </td>
                      <td className="px-4 py-4 text-right">
                        <div className="flex items-center justify-end space-x-2">
                          <button
                            onClick={() => handleEditOption(option)}
                            className="p-2 text-gray-600 hover:text-primary hover:bg-gray-100 rounded-lg transition-colors"
                            title="수정"
                          >
                            <Edit2 className="h-4 w-4" />
                          </button>
                          {deleteConfirmId === option.id ? (
                            <div className="flex items-center space-x-1">
                              <button
                                onClick={() => handleDelete(option)}
                                disabled={deleteMutation.isPending}
                                className="p-2 text-white bg-red-500 hover:bg-red-600 rounded-lg transition-colors"
                                title="삭제 확인"
                              >
                                {deleteMutation.isPending ? (
                                  <Loader2 className="h-4 w-4 animate-spin" />
                                ) : (
                                  <Check className="h-4 w-4" />
                                )}
                              </button>
                              <button
                                onClick={() => setDeleteConfirmId(null)}
                                className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                                title="취소"
                              >
                                <X className="h-4 w-4" />
                              </button>
                            </div>
                          ) : (
                            <button
                              onClick={() => setDeleteConfirmId(option.id)}
                              className="p-2 text-gray-600 hover:text-red-500 hover:bg-gray-100 rounded-lg transition-colors"
                              title="삭제"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* 모바일 카드 리스트 (md 미만) */}
            <div className="md:hidden space-y-3">
              {timetableOptions.map((option) => (
                <div
                  key={option.id}
                  className={`bg-white border border-gray-200 rounded-lg p-4 ${
                    !option.is_enabled ? "opacity-50" : ""
                  }`}
                >
                  {/* 상단: 토글 + 이름 + 타입 */}
                  <div className="flex items-start justify-between gap-3 mb-3">
                    <div className="flex items-start gap-3 flex-1 min-w-0">
                      <button
                        onClick={() => handleToggleEnabled(option)}
                        disabled={toggleMutation.isPending}
                        className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 ${
                          option.is_enabled ? "bg-primary" : "bg-gray-200"
                        }`}
                        role="switch"
                        aria-checked={option.is_enabled}
                      >
                        <span
                          className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                            option.is_enabled
                              ? "translate-x-5"
                              : "translate-x-0"
                          }`}
                        />
                      </button>
                      <div className="flex-1 min-w-0">
                        <div className="font-medium text-gray-900 text-sm">
                          {option.label}
                        </div>
                        <div className="text-xs text-gray-500 mt-0.5">
                          {option.value}
                        </div>
                      </div>
                    </div>
                    <span
                      className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium flex-shrink-0 ${
                        option.is_discount
                          ? "bg-green-100 text-green-800"
                          : "bg-blue-100 text-blue-800"
                      }`}
                    >
                      {option.is_discount ? "할인" : "추가"}
                    </span>
                  </div>

                  {/* 설명 */}
                  {option.description && (
                    <p className="text-xs text-gray-500 mb-3 line-clamp-2">
                      {option.description}
                    </p>
                  )}

                  {/* 하단: 가격 + 액션 버튼 */}
                  <div className="flex items-center justify-between pt-2 border-t border-gray-100">
                    <span
                      className={`font-semibold text-sm ${
                        option.is_discount ? "text-green-600" : "text-gray-900"
                      }`}
                    >
                      {option.is_discount ? "-" : "+"}
                      {option.price.toLocaleString()}원
                    </span>
                    <div className="flex items-center space-x-1">
                      <button
                        onClick={() => handleEditOption(option)}
                        className="p-2 text-gray-600 hover:text-primary hover:bg-gray-100 rounded-lg transition-colors"
                        title="수정"
                      >
                        <Edit2 className="h-4 w-4" />
                      </button>
                      {deleteConfirmId === option.id ? (
                        <div className="flex items-center space-x-1">
                          <button
                            onClick={() => handleDelete(option)}
                            disabled={deleteMutation.isPending}
                            className="p-2 text-white bg-red-500 hover:bg-red-600 rounded-lg transition-colors"
                            title="삭제 확인"
                          >
                            {deleteMutation.isPending ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              <Check className="h-4 w-4" />
                            )}
                          </button>
                          <button
                            onClick={() => setDeleteConfirmId(null)}
                            className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                            title="취소"
                          >
                            <X className="h-4 w-4" />
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => setDeleteConfirmId(option.id)}
                          className="p-2 text-gray-600 hover:text-red-500 hover:bg-gray-100 rounded-lg transition-colors"
                          title="삭제"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </>
        ) : (
          <div className="bg-gray-50 rounded-lg p-6 sm:p-8 text-center">
            <AlertTriangle className="h-10 w-10 sm:h-12 sm:w-12 text-gray-300 mx-auto mb-3 sm:mb-4" />
            <p className="text-gray-500 text-sm sm:text-base">
              등록된 옵션이 없습니다.
            </p>
            <button
              onClick={handleAddOption}
              className="mt-3 sm:mt-4 inline-flex items-center px-3 py-2 sm:px-4 sm:py-2 bg-primary text-white text-sm rounded-lg hover:bg-secondary transition-colors"
            >
              <Plus className="h-4 w-4 mr-1.5 sm:mr-2" />
              첫 옵션 추가하기
            </button>
          </div>
        )}
      </section>
    </div>
  );
}
