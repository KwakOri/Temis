"use client";

import { useUpdateArtistProfile } from "@/hooks/query/useArtistProfile";
import { Tables } from "@/types/supabase";
import { useEffect, useState } from "react";

interface ArtistProfileManagementProps {
  artist: Tables<"artists">;
}

interface ArtistProfileForm {
  name: string;
  bio: string;
  profile_image_url: string;
  contact_email: string;
  instagram_url: string;
  youtube_url: string;
  website_url: string;
}

function toForm(artist: Tables<"artists">): ArtistProfileForm {
  return {
    name: artist.name || "",
    bio: artist.bio || "",
    profile_image_url: artist.profile_image_url || "",
    contact_email: artist.contact_email || "",
    instagram_url: artist.instagram_url || "",
    youtube_url: artist.youtube_url || "",
    website_url: artist.website_url || "",
  };
}

export default function ArtistProfileManagement({
  artist,
}: ArtistProfileManagementProps) {
  const [form, setForm] = useState<ArtistProfileForm>(toForm(artist));
  const updateMutation = useUpdateArtistProfile();

  useEffect(() => {
    setForm(toForm(artist));
  }, [artist]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      await updateMutation.mutateAsync({
        name: form.name.trim(),
        bio: form.bio.trim() || null,
        profile_image_url: form.profile_image_url.trim() || null,
        contact_email: form.contact_email.trim() || null,
        instagram_url: form.instagram_url.trim() || null,
        youtube_url: form.youtube_url.trim() || null,
        website_url: form.website_url.trim() || null,
      });

      alert("작가 프로필이 저장되었습니다.");
    } catch (error) {
      console.error("Artist profile save error:", error);
      alert(
        error instanceof Error
          ? error.message
          : "작가 프로필 저장 중 오류가 발생했습니다."
      );
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg md:text-xl font-semibold text-dark-gray">작가 계정 관리</h2>
        <p className="text-sm text-dark-gray/70 mt-1">
          프로필 사진, 소개, SNS 링크를 수정할 수 있습니다.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <input
            required
            value={form.name}
            onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value }))}
            placeholder="작가명"
            className="px-3 py-2 border border-tertiary rounded-md bg-white focus:outline-none focus:ring-2 focus:ring-primary"
          />
          <input
            value={form.contact_email}
            onChange={(e) =>
              setForm((prev) => ({ ...prev, contact_email: e.target.value }))
            }
            placeholder="연락용 이메일"
            className="px-3 py-2 border border-tertiary rounded-md bg-white focus:outline-none focus:ring-2 focus:ring-primary"
          />
          <input
            value={form.profile_image_url}
            onChange={(e) =>
              setForm((prev) => ({ ...prev, profile_image_url: e.target.value }))
            }
            placeholder="프로필 이미지 URL"
            className="md:col-span-2 px-3 py-2 border border-tertiary rounded-md bg-white focus:outline-none focus:ring-2 focus:ring-primary"
          />
          <input
            value={form.instagram_url}
            onChange={(e) =>
              setForm((prev) => ({ ...prev, instagram_url: e.target.value }))
            }
            placeholder="인스타그램 URL"
            className="px-3 py-2 border border-tertiary rounded-md bg-white focus:outline-none focus:ring-2 focus:ring-primary"
          />
          <input
            value={form.youtube_url}
            onChange={(e) =>
              setForm((prev) => ({ ...prev, youtube_url: e.target.value }))
            }
            placeholder="유튜브 URL"
            className="px-3 py-2 border border-tertiary rounded-md bg-white focus:outline-none focus:ring-2 focus:ring-primary"
          />
          <input
            value={form.website_url}
            onChange={(e) =>
              setForm((prev) => ({ ...prev, website_url: e.target.value }))
            }
            placeholder="웹사이트 URL"
            className="md:col-span-2 px-3 py-2 border border-tertiary rounded-md bg-white focus:outline-none focus:ring-2 focus:ring-primary"
          />
        </div>

        <textarea
          value={form.bio}
          onChange={(e) => setForm((prev) => ({ ...prev, bio: e.target.value }))}
          placeholder="작가 소개"
          rows={5}
          className="w-full px-3 py-2 border border-tertiary rounded-md bg-white focus:outline-none focus:ring-2 focus:ring-primary"
        />

        <div className="flex justify-end">
          <button
            type="submit"
            disabled={updateMutation.isPending}
            className="px-4 py-2 bg-primary text-white rounded-md hover:bg-secondary disabled:opacity-50"
          >
            {updateMutation.isPending ? "저장 중..." : "작가 프로필 저장"}
          </button>
        </div>
      </form>
    </div>
  );
}
