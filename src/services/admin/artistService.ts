import {
  ArtistWithLinkedUser,
  CreateArtistData,
  TemplateArtistInput,
  TemplateArtistWithArtist,
  UpdateArtistData,
} from "@/types/admin";

export class AdminArtistService {
  private static baseUrl = "/api/admin";

  static async getArtists(params?: {
    search?: string;
    isActive?: boolean;
  }): Promise<ArtistWithLinkedUser[]> {
    const searchParams = new URLSearchParams();

    if (params?.search) searchParams.set("search", params.search);
    if (params?.isActive !== undefined) {
      searchParams.set("is_active", String(params.isActive));
    }

    const url = `${this.baseUrl}/artists${
      searchParams.toString() ? `?${searchParams.toString()}` : ""
    }`;

    const response = await fetch(url);
    if (!response.ok) {
      throw new Error("작가 목록을 가져오는데 실패했습니다.");
    }

    const result = await response.json();
    return result.artists || [];
  }

  static async createArtist(data: CreateArtistData): Promise<ArtistWithLinkedUser> {
    const response = await fetch(`${this.baseUrl}/artists`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || "작가 생성에 실패했습니다.");
    }

    const result = await response.json();
    return result.artist;
  }

  static async updateArtist(
    artistId: string,
    data: UpdateArtistData
  ): Promise<ArtistWithLinkedUser> {
    const response = await fetch(`${this.baseUrl}/artists/${artistId}`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || "작가 수정에 실패했습니다.");
    }

    const result = await response.json();
    return result.artist;
  }

  static async deleteArtist(artistId: string): Promise<void> {
    const response = await fetch(`${this.baseUrl}/artists/${artistId}`, {
      method: "DELETE",
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || "작가 삭제에 실패했습니다.");
    }
  }

  static async getTemplateArtists(
    templateId: string
  ): Promise<TemplateArtistWithArtist[]> {
    const response = await fetch(
      `${this.baseUrl}/template-artists?template_id=${templateId}`
    );

    if (!response.ok) {
      throw new Error("템플릿 작가 정보를 가져오는데 실패했습니다.");
    }

    const result = await response.json();
    return result.templateArtists || [];
  }

  static async updateTemplateArtists(
    templateId: string,
    relations: TemplateArtistInput[]
  ): Promise<TemplateArtistWithArtist[]> {
    const response = await fetch(`${this.baseUrl}/template-artists`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        template_id: templateId,
        relations,
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || "템플릿 작가 저장에 실패했습니다.");
    }

    const result = await response.json();
    return result.templateArtists || [];
  }
}
