import { Tables, TablesUpdate } from "@/types/supabase";

export interface GetArtistProfileResponse {
  success: boolean;
  artist: Tables<"artists"> | null;
}

export class ArtistProfileService {
  private static baseUrl = "/api/user/artist-profile";

  static async getMyArtistProfile(): Promise<GetArtistProfileResponse> {
    const response = await fetch(this.baseUrl, {
      credentials: "include",
    });

    if (!response.ok) {
      throw new Error("작가 프로필을 가져올 수 없습니다.");
    }

    return response.json();
  }

  static async updateMyArtistProfile(
    data: TablesUpdate<"artists">
  ): Promise<Tables<"artists">> {
    const response = await fetch(this.baseUrl, {
      method: "PATCH",
      credentials: "include",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || "작가 프로필 저장에 실패했습니다.");
    }

    const result = await response.json();
    return result.artist;
  }
}
