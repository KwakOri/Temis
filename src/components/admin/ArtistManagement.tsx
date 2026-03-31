"use client";

import {
  useAdminArtists,
  useCreateAdminArtist,
  useDeleteAdminArtist,
  useUpdateAdminArtist,
} from "@/hooks/query/useAdminArtists";
import { ArtistWithLinkedUser } from "@/types/admin";
import { useEffect, useMemo, useState } from "react";

interface AdminUserLite {
  id: number;
  email: string;
  name: string;
}

interface ArtistForm {
  name: string;
  bio: string;
  profile_image_url: string;
  instagram_url: string;
  youtube_url: string;
  website_url: string;
  user_id: string;
  is_active: boolean;
}

const initialForm: ArtistForm = {
  name: "",
  bio: "",
  profile_image_url: "",
  instagram_url: "",
  youtube_url: "",
  website_url: "",
  user_id: "",
  is_active: true,
};

export default function ArtistManagement() {
  const [search, setSearch] = useState("");
  const [form, setForm] = useState<ArtistForm>(initialForm);
  const [editingArtist, setEditingArtist] = useState<ArtistWithLinkedUser | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [users, setUsers] = useState<AdminUserLite[]>([]);
  const [usersLoading, setUsersLoading] = useState(false);

  const { data: artists = [], isLoading, error } = useAdminArtists({ search });
  const createMutation = useCreateAdminArtist();
  const updateMutation = useUpdateAdminArtist();
  const deleteMutation = useDeleteAdminArtist();

  const isSubmitting = createMutation.isPending || updateMutation.isPending;

  const activeCount = useMemo(
    () => artists.filter((artist) => artist.is_active).length,
    [artists]
  );

  useEffect(() => {
    if (!isModalOpen) {
      return;
    }

    const fetchUsers = async () => {
      try {
        setUsersLoading(true);
        const response = await fetch("/api/admin/users?limit=500&offset=0", {
          credentials: "include",
        });

        if (!response.ok) {
          return;
        }

        const result = await response.json();
        setUsers(result.users || []);
      } catch (fetchError) {
        console.error("Admin users fetch error:", fetchError);
      } finally {
        setUsersLoading(false);
      }
    };

    fetchUsers();
  }, [isModalOpen]);

  const resetForm = () => {
    setForm(initialForm);
    setEditingArtist(null);
  };

  const openCreateModal = () => {
    resetForm();
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    resetForm();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      const payload = {
        name: form.name,
        bio: form.bio || null,
        profile_image_url: form.profile_image_url || null,
        instagram_url: form.instagram_url || null,
        youtube_url: form.youtube_url || null,
        website_url: form.website_url || null,
        user_id: form.user_id ? Number(form.user_id) : null,
        is_active: form.is_active,
      };

      if (editingArtist) {
        await updateMutation.mutateAsync({
          artistId: editingArtist.id,
          data: payload,
        });
      } else {
        await createMutation.mutateAsync(payload);
      }

      closeModal();
    } catch (submitError) {
      console.error("Artist submit error:", submitError);
      alert(
        submitError instanceof Error
          ? submitError.message
          : "작가 저장 중 오류가 발생했습니다."
      );
    }
  };

  const handleEdit = (artist: ArtistWithLinkedUser) => {
    setEditingArtist(artist);
    setForm({
      name: artist.name,
      bio: artist.bio || "",
      profile_image_url: artist.profile_image_url || "",
      instagram_url: artist.instagram_url || "",
      youtube_url: artist.youtube_url || "",
      website_url: artist.website_url || "",
      user_id: artist.user_id ? String(artist.user_id) : "",
      is_active: artist.is_active,
    });
    setIsModalOpen(true);
  };

  const handleDelete = async (artistId: string) => {
    if (!confirm("작가를 삭제하시겠습니까? 템플릿에 연결된 경우 삭제할 수 없습니다.")) {
      return;
    }

    try {
      await deleteMutation.mutateAsync(artistId);
    } catch (deleteError) {
      console.error("Artist delete error:", deleteError);
      alert(
        deleteError instanceof Error
          ? deleteError.message
          : "작가 삭제 중 오류가 발생했습니다."
      );
    }
  };

  const toggleActive = async (artist: ArtistWithLinkedUser) => {
    try {
      await updateMutation.mutateAsync({
        artistId: artist.id,
        data: { is_active: !artist.is_active },
      });
    } catch (toggleError) {
      console.error("Artist active toggle error:", toggleError);
      alert("활성 상태 변경에 실패했습니다.");
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="bg-white border border-gray-200 rounded-lg p-4 sm:p-6">
        <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">작가 관리</h2>
            <p className="text-sm text-gray-600">
              등록 {artists.length}명 / 활성 {activeCount}명
            </p>
          </div>
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 w-full sm:w-auto">
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="작가 검색"
              className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
            />
            <button
              type="button"
              onClick={openCreateModal}
              className="px-4 py-2 bg-primary text-white rounded-md hover:bg-secondary transition-colors whitespace-nowrap"
            >
              작가 등록
            </button>
          </div>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-md p-4 text-red-700">
          데이터를 불러오지 못했습니다.
        </div>
      )}

      <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
        {artists.length === 0 ? (
          <div className="py-12 text-center text-gray-500">등록된 작가가 없습니다.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600">
                    이름
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600">
                    소개
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600">
                    연결 계정
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600">
                    상태
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-semibold text-gray-600">
                    액션
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {artists.map((artist) => (
                  <tr key={artist.id}>
                    <td className="px-4 py-3">
                      <div className="font-medium text-gray-900">{artist.name}</div>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600 max-w-md">
                      <div className="line-clamp-2">{artist.bio || "-"}</div>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600 max-w-xs">
                      {artist.linked_user ? (
                        <div className="space-y-0.5">
                          <div className="font-medium text-gray-800 truncate">
                            {artist.linked_user.name || "-"}
                          </div>
                          <div className="text-xs text-gray-500 truncate">
                            {artist.linked_user.email}
                          </div>
                        </div>
                      ) : (
                        "-"
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <button
                        onClick={() => toggleActive(artist)}
                        className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                          artist.is_active
                            ? "bg-green-100 text-green-800"
                            : "bg-gray-100 text-gray-600"
                        }`}
                      >
                        {artist.is_active ? "활성" : "비활성"}
                      </button>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="inline-flex items-center gap-2">
                        <button
                          onClick={() => handleEdit(artist)}
                          className="px-3 py-1.5 text-sm bg-indigo-50 text-indigo-700 rounded-md hover:bg-indigo-100"
                        >
                          수정
                        </button>
                        <button
                          onClick={() => handleDelete(artist.id)}
                          className="px-3 py-1.5 text-sm bg-red-50 text-red-700 rounded-md hover:bg-red-100"
                        >
                          삭제
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-black/50"
            onClick={closeModal}
          />
          <div className="relative w-full max-w-2xl bg-white rounded-xl shadow-xl">
            <form onSubmit={handleSubmit} className="p-4 sm:p-6 space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-gray-900">
                  {editingArtist ? "작가 수정" : "작가 등록"}
                </h3>
                <button
                  type="button"
                  onClick={closeModal}
                  className="text-sm text-gray-500 hover:text-gray-700"
                >
                  닫기
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <input
                  required
                  value={form.name}
                  onChange={(e) =>
                    setForm((prev) => ({ ...prev, name: e.target.value }))
                  }
                  placeholder="작가명 *"
                  className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
                />
                <select
                  value={form.user_id}
                  onChange={(e) =>
                    setForm((prev) => ({ ...prev, user_id: e.target.value }))
                  }
                  disabled={usersLoading}
                  className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary disabled:bg-gray-100"
                >
                  <option value="">회원 계정 미연결</option>
                  {users.map((user) => (
                    <option key={user.id} value={String(user.id)}>
                      {user.name} ({user.email})
                    </option>
                  ))}
                </select>
                <input
                  value={form.profile_image_url}
                  onChange={(e) =>
                    setForm((prev) => ({ ...prev, profile_image_url: e.target.value }))
                  }
                  placeholder="프로필 이미지 URL"
                  className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
                />
                <input
                  value={form.instagram_url}
                  onChange={(e) =>
                    setForm((prev) => ({ ...prev, instagram_url: e.target.value }))
                  }
                  placeholder="인스타그램 URL"
                  className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
                />
                <input
                  value={form.youtube_url}
                  onChange={(e) =>
                    setForm((prev) => ({ ...prev, youtube_url: e.target.value }))
                  }
                  placeholder="유튜브 URL"
                  className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
                />
                <input
                  value={form.website_url}
                  onChange={(e) =>
                    setForm((prev) => ({ ...prev, website_url: e.target.value }))
                  }
                  placeholder="웹사이트 URL"
                  className="sm:col-span-2 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>

              <p className="text-xs text-gray-500">
                계정을 연결하면 해당 회원의 마이페이지에 작가 계정 관리 탭이 노출됩니다.
              </p>

              <textarea
                value={form.bio}
                onChange={(e) => setForm((prev) => ({ ...prev, bio: e.target.value }))}
                placeholder="작가 소개"
                rows={4}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
              />

              <label className="inline-flex items-center gap-2 text-sm text-gray-700">
                <input
                  type="checkbox"
                  checked={form.is_active}
                  onChange={(e) =>
                    setForm((prev) => ({ ...prev, is_active: e.target.checked }))
                  }
                  className="w-4 h-4"
                />
                활성 작가
              </label>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={closeModal}
                  className="px-4 py-2 bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200"
                >
                  취소
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-4 py-2 bg-primary text-white rounded-md hover:bg-secondary disabled:opacity-50"
                >
                  {isSubmitting
                    ? "저장 중..."
                    : editingArtist
                    ? "작가 수정"
                    : "작가 등록"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
