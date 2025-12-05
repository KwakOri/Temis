"use client";

import { useState, useRef } from "react";
import {
  useAdminPortfolios,
  useCreatePortfolio,
  useUpdatePortfolio,
  useDeletePortfolio,
} from "@/hooks/query/useAdminPortfolios";
import { Portfolio } from "@/types/portfolio";
import {
  Plus,
  Edit,
  Trash2,
  Loader2,
  X,
  Image as ImageIcon,
  Upload,
  Grid,
  List,
} from "lucide-react";

type Category = "structured" | "unstructured" | "team";
type ViewMode = "grid" | "list";

const CATEGORIES: { value: Category; label: string }[] = [
  { value: "structured", label: "정형" },
  { value: "unstructured", label: "비정형" },
  { value: "team", label: "팀" },
];

export default function PortfolioManagement() {
  const { data: portfolios, isLoading } = useAdminPortfolios();
  const createMutation = useCreatePortfolio();
  const updateMutation = useUpdatePortfolio();
  const deleteMutation = useDeletePortfolio();

  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [selectedPortfolio, setSelectedPortfolio] = useState<Portfolio | null>(
    null
  );

  // 필터 및 뷰 상태
  const [selectedCategory, setSelectedCategory] = useState<Category | "all">("all");
  const [viewMode, setViewMode] = useState<ViewMode>("grid");

  // 파일 input refs
  const createThumbnailInputRef = useRef<HTMLInputElement>(null);
  const createImagesInputRef = useRef<HTMLInputElement>(null);
  const editThumbnailInputRef = useRef<HTMLInputElement>(null);
  const editImagesInputRef = useRef<HTMLInputElement>(null);

  // 생성 폼 상태
  const [createForm, setCreateForm] = useState({
    category: "" as Category | "",
    title: "",
    description: "",
    thumbnail: null as File | null,
    images: [] as File[],
  });

  // 수정 폼 상태
  const [editForm, setEditForm] = useState({
    category: "" as Category | "",
    title: "",
    description: "",
    thumbnail: null as File | null,
    existingThumbnailUrl: "",
    newImages: [] as File[],
    existingImageUrls: [] as string[],
  });

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!createForm.thumbnail || createForm.images.length === 0) {
      alert("썸네일과 최소 1개 이상의 이미지를 추가해주세요.");
      return;
    }

    try {
      await createMutation.mutateAsync({
        category: createForm.category,
        title: createForm.title,
        description: createForm.description,
        thumbnail: createForm.thumbnail,
        images: createForm.images,
      });

      setIsCreateModalOpen(false);
      setCreateForm({
        category: "" as Category | "",
        title: "",
        description: "",
        thumbnail: null,
        images: [],
      });
      // Reset file inputs
      if (createThumbnailInputRef.current) createThumbnailInputRef.current.value = "";
      if (createImagesInputRef.current) createImagesInputRef.current.value = "";
    } catch (error) {
      console.error("Portfolio creation error:", error);
      alert("포트폴리오 생성에 실패했습니다.");
    }
  };

  const handleEdit = (portfolio: Portfolio) => {
    setSelectedPortfolio(portfolio);
    setEditForm({
      category: portfolio.category as Category,
      title: portfolio.title,
      description: portfolio.description,
      thumbnail: null,
      existingThumbnailUrl: portfolio.thumbnail_url,
      newImages: [],
      existingImageUrls: [...portfolio.image_urls],
    });
    setIsEditModalOpen(true);
  };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!selectedPortfolio) return;

    if (
      !editForm.thumbnail &&
      !editForm.existingThumbnailUrl
    ) {
      alert("썸네일을 선택해주세요.");
      return;
    }

    if (
      editForm.existingImageUrls.length === 0 &&
      editForm.newImages.length === 0
    ) {
      alert("최소 1개 이상의 이미지가 필요합니다.");
      return;
    }

    try {
      await updateMutation.mutateAsync({
        id: selectedPortfolio.id,
        category: editForm.category,
        title: editForm.title,
        description: editForm.description,
        thumbnail: editForm.thumbnail || undefined,
        existingThumbnailUrl: editForm.thumbnail
          ? undefined
          : editForm.existingThumbnailUrl,
        newImages: editForm.newImages,
        existingImageUrls: editForm.existingImageUrls,
      });

      setIsEditModalOpen(false);
      setSelectedPortfolio(null);
    } catch (error) {
      console.error("Portfolio update error:", error);
      alert("포트폴리오 수정에 실패했습니다.");
    }
  };

  const handleDelete = async (portfolio: Portfolio) => {
    if (!confirm(`"${portfolio.title}" 포트폴리오를 삭제하시겠습니까?`)) {
      return;
    }

    try {
      await deleteMutation.mutateAsync(portfolio.id);
    } catch (error) {
      console.error("Portfolio deletion error:", error);
      alert("포트폴리오 삭제에 실패했습니다.");
    }
  };

  const removeExistingImage = (url: string) => {
    setEditForm({
      ...editForm,
      existingImageUrls: editForm.existingImageUrls.filter((u) => u !== url),
    });
  };

  // 필터링된 포트폴리오 목록
  const filteredPortfolios = portfolios?.filter((portfolio) => {
    if (selectedCategory === "all") return true;
    return portfolio.category === selectedCategory;
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <h2 className="text-2xl font-bold text-gray-900">포트폴리오 관리</h2>
        <button
          onClick={() => setIsCreateModalOpen(true)}
          className="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-md hover:bg-primary/90 transition-colors"
        >
          <Plus className="h-4 w-4" />
          새 포트폴리오
        </button>
      </div>

      {/* Filters and View Toggle */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-4 rounded-lg border border-gray-200">
        {/* Category Filter */}
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => setSelectedCategory("all")}
            className={`px-4 py-2 rounded-md border transition-colors ${
              selectedCategory === "all"
                ? "bg-primary text-white border-primary"
                : "bg-white text-gray-700 border-gray-300 hover:bg-gray-50"
            }`}
          >
            전체
          </button>
          {CATEGORIES.map((cat) => (
            <button
              key={cat.value}
              onClick={() => setSelectedCategory(cat.value)}
              className={`px-4 py-2 rounded-md border transition-colors ${
                selectedCategory === cat.value
                  ? "bg-primary text-white border-primary"
                  : "bg-white text-gray-700 border-gray-300 hover:bg-gray-50"
              }`}
            >
              {cat.label}
            </button>
          ))}
        </div>

        {/* View Toggle */}
        <div className="flex gap-2 bg-gray-100 p-1 rounded-md">
          <button
            onClick={() => setViewMode("grid")}
            className={`p-2 rounded transition-colors ${
              viewMode === "grid"
                ? "bg-white text-primary shadow-sm"
                : "text-gray-600 hover:text-gray-900"
            }`}
            title="카드 뷰"
          >
            <Grid className="h-5 w-5" />
          </button>
          <button
            onClick={() => setViewMode("list")}
            className={`p-2 rounded transition-colors ${
              viewMode === "list"
                ? "bg-white text-primary shadow-sm"
                : "text-gray-600 hover:text-gray-900"
            }`}
            title="리스트 뷰"
          >
            <List className="h-5 w-5" />
          </button>
        </div>
      </div>

      {/* Portfolio Grid View */}
      {viewMode === "grid" && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredPortfolios?.map((portfolio) => {
            const categoryLabel = CATEGORIES.find(c => c.value === portfolio.category)?.label || portfolio.category;
            return (
              <div
                key={portfolio.id}
                className="bg-white rounded-lg shadow-md overflow-hidden border border-gray-200"
              >
                {/* Thumbnail */}
                <div className="aspect-video bg-gray-100 relative">
                  <img
                    src={portfolio.thumbnail_url}
                    alt={portfolio.title}
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute top-2 right-2 bg-black/50 text-white px-2 py-1 rounded text-xs">
                    {categoryLabel}
                  </div>
                </div>

            {/* Content */}
            <div className="p-4">
              <h3 className="font-bold text-lg mb-2">{portfolio.title}</h3>
              <p className="text-sm text-gray-600 mb-4 line-clamp-2">
                {portfolio.description}
              </p>
              <div className="text-xs text-gray-500 mb-4">
                이미지 {portfolio.image_urls.length}개
              </div>

              {/* Actions */}
              <div className="flex gap-2">
                <button
                  onClick={() => handleEdit(portfolio)}
                  className="flex-1 flex items-center justify-center gap-1 px-3 py-2 bg-blue-50 text-blue-600 rounded hover:bg-blue-100 transition-colors"
                >
                  <Edit className="h-4 w-4" />
                  수정
                </button>
                <button
                  onClick={() => handleDelete(portfolio)}
                  disabled={deleteMutation.isPending}
                  className="flex-1 flex items-center justify-center gap-1 px-3 py-2 bg-red-50 text-red-600 rounded hover:bg-red-100 transition-colors disabled:opacity-50"
                >
                  <Trash2 className="h-4 w-4" />
                  삭제
                </button>
              </div>
            </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Portfolio List View */}
      {viewMode === "list" && (
        <div className="space-y-3">
          {filteredPortfolios?.map((portfolio) => {
            const categoryLabel = CATEGORIES.find(c => c.value === portfolio.category)?.label || portfolio.category;
            return (
              <div
                key={portfolio.id}
                className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 hover:shadow-md transition-shadow"
              >
                <div className="flex gap-4">
                  {/* Thumbnail */}
                  <div className="w-32 h-24 flex-shrink-0 bg-gray-100 rounded overflow-hidden">
                    <img
                      src={portfolio.thumbnail_url}
                      alt={portfolio.title}
                      className="w-full h-full object-cover"
                    />
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <h3 className="font-bold text-lg truncate">{portfolio.title}</h3>
                          <span className="px-2 py-0.5 bg-blue-100 text-blue-700 text-xs rounded-full whitespace-nowrap">
                            {categoryLabel}
                          </span>
                        </div>
                        <p className="text-sm text-gray-600 line-clamp-2 mb-2">
                          {portfolio.description}
                        </p>
                        <div className="flex items-center gap-4 text-xs text-gray-500">
                          <span>이미지 {portfolio.image_urls.length}개</span>
                          <span>생성일: {new Date(portfolio.created_at).toLocaleDateString()}</span>
                        </div>
                      </div>

                      {/* Actions */}
                      <div className="flex gap-2 flex-shrink-0">
                        <button
                          onClick={() => handleEdit(portfolio)}
                          className="flex items-center gap-1 px-3 py-2 bg-blue-50 text-blue-600 rounded hover:bg-blue-100 transition-colors"
                        >
                          <Edit className="h-4 w-4" />
                          수정
                        </button>
                        <button
                          onClick={() => handleDelete(portfolio)}
                          disabled={deleteMutation.isPending}
                          className="flex items-center gap-1 px-3 py-2 bg-red-50 text-red-600 rounded hover:bg-red-100 transition-colors disabled:opacity-50"
                        >
                          <Trash2 className="h-4 w-4" />
                          삭제
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Empty State */}
      {filteredPortfolios?.length === 0 && (
        <div className="text-center py-12">
          <ImageIcon className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-500">
            {selectedCategory === "all"
              ? "포트폴리오가 없습니다."
              : `${CATEGORIES.find(c => c.value === selectedCategory)?.label} 카테고리에 포트폴리오가 없습니다.`}
          </p>
          <p className="text-sm text-gray-400 mt-1">
            새 포트폴리오 버튼을 눌러 생성해보세요.
          </p>
        </div>
      )}

      {/* Create Modal */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-xl font-bold">새 포트폴리오 생성</h3>
                <button
                  onClick={() => setIsCreateModalOpen(false)}
                  className="p-2 hover:bg-gray-100 rounded"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              <form onSubmit={handleCreate} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-2">
                    카테고리
                  </label>
                  <div className="flex gap-2">
                    {CATEGORIES.map((cat) => (
                      <button
                        key={cat.value}
                        type="button"
                        onClick={() =>
                          setCreateForm({ ...createForm, category: cat.value })
                        }
                        className={`flex-1 px-4 py-2 rounded-md border transition-colors ${
                          createForm.category === cat.value
                            ? "bg-primary text-white border-primary"
                            : "bg-white text-gray-700 border-gray-300 hover:bg-gray-50"
                        }`}
                      >
                        {cat.label}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">제목</label>
                  <input
                    type="text"
                    value={createForm.title}
                    onChange={(e) =>
                      setCreateForm({ ...createForm, title: e.target.value })
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-primary focus:border-transparent"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">설명</label>
                  <textarea
                    value={createForm.description}
                    onChange={(e) =>
                      setCreateForm({
                        ...createForm,
                        description: e.target.value,
                      })
                    }
                    rows={4}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-primary focus:border-transparent"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">
                    썸네일 (1개)
                  </label>
                  <input
                    ref={createThumbnailInputRef}
                    type="file"
                    accept="image/*"
                    onChange={(e) =>
                      setCreateForm({
                        ...createForm,
                        thumbnail: e.target.files?.[0] || null,
                      })
                    }
                    className="hidden"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => createThumbnailInputRef.current?.click()}
                    className="w-full px-4 py-3 border-2 border-dashed border-gray-300 rounded-md hover:border-primary hover:bg-blue-50 transition-colors flex items-center justify-center gap-2 text-gray-600"
                  >
                    <Upload className="h-5 w-5" />
                    {createForm.thumbnail
                      ? createForm.thumbnail.name
                      : "썸네일 이미지 선택"}
                  </button>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">
                    이미지들 (여러 개)
                  </label>
                  <input
                    ref={createImagesInputRef}
                    type="file"
                    accept="image/*"
                    multiple
                    onChange={(e) =>
                      setCreateForm({
                        ...createForm,
                        images: Array.from(e.target.files || []),
                      })
                    }
                    className="hidden"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => createImagesInputRef.current?.click()}
                    className="w-full px-4 py-3 border-2 border-dashed border-gray-300 rounded-md hover:border-primary hover:bg-blue-50 transition-colors flex items-center justify-center gap-2 text-gray-600"
                  >
                    <ImageIcon className="h-5 w-5" />
                    {createForm.images.length > 0
                      ? `${createForm.images.length}개 이미지 선택됨`
                      : "이미지 선택 (여러 개 가능)"}
                  </button>
                </div>

                <div className="flex gap-3 pt-4">
                  <button
                    type="button"
                    onClick={() => setIsCreateModalOpen(false)}
                    className="flex-1 px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-50"
                  >
                    취소
                  </button>
                  <button
                    type="submit"
                    disabled={createMutation.isPending}
                    className="flex-1 px-4 py-2 bg-primary text-white rounded-md hover:bg-primary/90 disabled:opacity-50"
                  >
                    {createMutation.isPending ? "생성 중..." : "생성"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Edit Modal */}
      {isEditModalOpen && selectedPortfolio && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-xl font-bold">포트폴리오 수정</h3>
                <button
                  onClick={() => setIsEditModalOpen(false)}
                  className="p-2 hover:bg-gray-100 rounded"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              <form onSubmit={handleUpdate} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-2">
                    카테고리
                  </label>
                  <div className="flex gap-2">
                    {CATEGORIES.map((cat) => (
                      <button
                        key={cat.value}
                        type="button"
                        onClick={() =>
                          setEditForm({ ...editForm, category: cat.value })
                        }
                        className={`flex-1 px-4 py-2 rounded-md border transition-colors ${
                          editForm.category === cat.value
                            ? "bg-primary text-white border-primary"
                            : "bg-white text-gray-700 border-gray-300 hover:bg-gray-50"
                        }`}
                      >
                        {cat.label}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">제목</label>
                  <input
                    type="text"
                    value={editForm.title}
                    onChange={(e) =>
                      setEditForm({ ...editForm, title: e.target.value })
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-primary focus:border-transparent"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">설명</label>
                  <textarea
                    value={editForm.description}
                    onChange={(e) =>
                      setEditForm({ ...editForm, description: e.target.value })
                    }
                    rows={4}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-primary focus:border-transparent"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">
                    썸네일 (1개)
                  </label>
                  {editForm.existingThumbnailUrl && !editForm.thumbnail && (
                    <div className="mb-2">
                      <img
                        src={editForm.existingThumbnailUrl}
                        alt="Current thumbnail"
                        className="w-32 h-32 object-cover rounded border border-gray-200"
                      />
                    </div>
                  )}
                  <input
                    ref={editThumbnailInputRef}
                    type="file"
                    accept="image/*"
                    onChange={(e) =>
                      setEditForm({
                        ...editForm,
                        thumbnail: e.target.files?.[0] || null,
                      })
                    }
                    className="hidden"
                  />
                  <button
                    type="button"
                    onClick={() => editThumbnailInputRef.current?.click()}
                    className="w-full px-4 py-3 border-2 border-dashed border-gray-300 rounded-md hover:border-primary hover:bg-blue-50 transition-colors flex items-center justify-center gap-2 text-gray-600"
                  >
                    <Upload className="h-5 w-5" />
                    {editForm.thumbnail
                      ? editForm.thumbnail.name
                      : "새 썸네일 선택 (선택사항)"}
                  </button>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">
                    기존 이미지
                  </label>
                  <div className="grid grid-cols-4 gap-2 mb-2">
                    {editForm.existingImageUrls.map((url, index) => (
                      <div key={index} className="relative group">
                        <img
                          src={url}
                          alt={`Image ${index + 1}`}
                          className="w-full aspect-square object-cover rounded"
                        />
                        <button
                          type="button"
                          onClick={() => removeExistingImage(url)}
                          className="absolute top-1 right-1 p-1 bg-red-500 text-white rounded opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">
                    새 이미지 추가 (여러 개)
                  </label>
                  <input
                    ref={editImagesInputRef}
                    type="file"
                    accept="image/*"
                    multiple
                    onChange={(e) =>
                      setEditForm({
                        ...editForm,
                        newImages: Array.from(e.target.files || []),
                      })
                    }
                    className="hidden"
                  />
                  <button
                    type="button"
                    onClick={() => editImagesInputRef.current?.click()}
                    className="w-full px-4 py-3 border-2 border-dashed border-gray-300 rounded-md hover:border-primary hover:bg-blue-50 transition-colors flex items-center justify-center gap-2 text-gray-600"
                  >
                    <ImageIcon className="h-5 w-5" />
                    {editForm.newImages.length > 0
                      ? `${editForm.newImages.length}개 새 이미지 선택됨`
                      : "새 이미지 선택 (선택사항)"}
                  </button>
                </div>

                <div className="flex gap-3 pt-4">
                  <button
                    type="button"
                    onClick={() => setIsEditModalOpen(false)}
                    className="flex-1 px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-50"
                  >
                    취소
                  </button>
                  <button
                    type="submit"
                    disabled={updateMutation.isPending}
                    className="flex-1 px-4 py-2 bg-primary text-white rounded-md hover:bg-primary/90 disabled:opacity-50"
                  >
                    {updateMutation.isPending ? "수정 중..." : "수정"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
