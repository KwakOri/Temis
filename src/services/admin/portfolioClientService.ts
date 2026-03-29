import {
  Portfolio,
  CreatePortfolioRequest,
  UpdatePortfolioRequest,
  PortfolioResponse,
  PortfoliosResponse,
  DeletePortfolioResponse,
} from "@/types/portfolio";

export class AdminPortfolioService {
  private static baseUrl = "/api/admin/portfolios";

  /**
   * 모든 포트폴리오 조회
   */
  static async getPortfolios(): Promise<Portfolio[]> {
    const response = await fetch(this.baseUrl);

    if (!response.ok) {
      throw new Error("포트폴리오 목록을 가져오는데 실패했습니다.");
    }

    const data: PortfoliosResponse = await response.json();
    return data.portfolios;
  }

  /**
   * 포트폴리오 생성
   */
  static async createPortfolio(
    data: CreatePortfolioRequest
  ): Promise<Portfolio> {
    const formData = new FormData();
    formData.append("category", data.category);
    formData.append("title", data.title);
    formData.append("description", data.description);
    formData.append("thumbnail", data.thumbnail);

    // 여러 이미지 추가
    data.images.forEach((image) => {
      formData.append("images", image);
    });

    const response = await fetch(this.baseUrl, {
      method: "POST",
      body: formData,
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || "포트폴리오 생성에 실패했습니다.");
    }

    const result: PortfolioResponse = await response.json();
    return result.portfolio;
  }

  /**
   * 포트폴리오 수정
   */
  static async updatePortfolio(
    data: UpdatePortfolioRequest
  ): Promise<Portfolio> {
    const formData = new FormData();
    formData.append("category", data.category);
    formData.append("title", data.title);
    formData.append("description", data.description);

    // 썸네일 처리
    if (data.thumbnail) {
      formData.append("thumbnail", data.thumbnail);
    } else if (data.existingThumbnailUrl) {
      formData.append("existingThumbnailUrl", data.existingThumbnailUrl);
    }

    // 새 이미지 추가
    if (data.newImages && data.newImages.length > 0) {
      data.newImages.forEach((image) => {
        formData.append("newImages", image);
      });
    }

    // 기존 이미지 URL 추가
    if (data.existingImageUrls && data.existingImageUrls.length > 0) {
      formData.append(
        "existingImageUrls",
        JSON.stringify(data.existingImageUrls)
      );
    }

    const response = await fetch(`${this.baseUrl}/${data.id}`, {
      method: "PUT",
      body: formData,
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || "포트폴리오 수정에 실패했습니다.");
    }

    const result: PortfolioResponse = await response.json();
    return result.portfolio;
  }

  /**
   * 포트폴리오 삭제
   */
  static async deletePortfolio(id: string): Promise<void> {
    const response = await fetch(`${this.baseUrl}/${id}`, {
      method: "DELETE",
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || "포트폴리오 삭제에 실패했습니다.");
    }
  }
}
