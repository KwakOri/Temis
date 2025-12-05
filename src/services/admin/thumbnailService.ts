import {
  CreateThumbnailData,
  Thumbnail,
  UpdateThumbnailData,
} from "@/types/admin";

export class AdminThumbnailService {
  private static baseUrl = "/api/admin";

  // Thumbnails
  static async getThumbnails(params?: { limit?: number; offset?: number }): Promise<{
    thumbnails: Thumbnail[];
    pagination: {
      limit: number;
      offset: number;
      total: number;
    };
  }> {
    const queryParams = new URLSearchParams();
    if (params?.limit) queryParams.append("limit", params.limit.toString());
    if (params?.offset) queryParams.append("offset", params.offset.toString());

    const url = `${this.baseUrl}/thumbnails${queryParams.toString() ? `?${queryParams.toString()}` : ''}`;

    const response = await fetch(url);

    if (!response.ok) {
      throw new Error("썸네일 목록을 가져오는데 실패했습니다.");
    }

    return response.json();
  }

  static async createThumbnail(
    data: CreateThumbnailData
  ): Promise<Thumbnail> {
    const response = await fetch(`${this.baseUrl}/thumbnails`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || "썸네일 생성에 실패했습니다.");
    }

    return response.json();
  }

  static async updateThumbnail(
    thumbnailId: string,
    data: UpdateThumbnailData
  ): Promise<Thumbnail> {
    const response = await fetch(`${this.baseUrl}/thumbnails/${thumbnailId}`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || "썸네일 업데이트에 실패했습니다.");
    }

    return response.json();
  }

  static async deleteThumbnail(thumbnailId: string): Promise<void> {
    const response = await fetch(`${this.baseUrl}/thumbnails/${thumbnailId}`, {
      method: "DELETE",
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || "썸네일 삭제에 실패했습니다.");
    }
  }
}
