import type {
  Portfolio,
  CreatePortfolioRequest,
  UpdatePortfolioRequest,
  CreatePortfolioMetadataRequest,
  UpdatePortfolioMetadataRequest,
  PortfolioResponse,
  PortfoliosResponse,
  DeletePortfolioResponse,
} from "@/types/portfolio";
import { validatePortfolioUploadFiles } from "@/lib/portfolio-upload";

interface PresignPortfolioUploadResponse {
  uploads: {
    uploadUrl: string;
    token: string;
    headers: Record<string, string>;
  }[];
}

interface PortfolioUploadedFile {
  fileKey: string;
  url: string;
  name: string;
  size: number;
  type: string;
}

interface CompletePortfolioUploadResponse {
  files: PortfolioUploadedFile[];
}

export class AdminPortfolioService {
  private static baseUrl = "/api/admin/portfolios";
  private static uploadBaseUrl = "/api/admin/portfolios/upload";

  private static async getErrorMessage(
    response: Response,
    fallbackMessage: string
  ): Promise<string> {
    const contentType = response.headers.get("content-type") || "";

    if (contentType.includes("application/json")) {
      try {
        const error = await response.json();
        return error.error || fallbackMessage;
      } catch {
        return fallbackMessage;
      }
    }

    return (await response.text().catch(() => "")) || fallbackMessage;
  }

  private static validatePortfolioFields(
    category: string,
    title: string,
    description: string
  ): void {
    if (!category || category.trim().length === 0) {
      throw new Error("카테고리는 필수입니다.");
    }

    if (!title || title.trim().length === 0) {
      throw new Error("제목은 필수입니다.");
    }

    if (!description || description.trim().length === 0) {
      throw new Error("설명은 필수입니다.");
    }
  }

  private static validatePortfolioFiles(files: File[]): void {
    const validation = validatePortfolioUploadFiles(
      files.map((file) => ({
        name: file.name,
        size: file.size,
        type: file.type,
      }))
    );

    if (!validation.isValid) {
      throw new Error(validation.error || "이미지 검증에 실패했습니다.");
    }
  }

  private static async completePortfolioUpload(
    uploads: PresignPortfolioUploadResponse["uploads"]
  ): Promise<PortfolioUploadedFile[]> {
    const completeResponse = await fetch(`${this.uploadBaseUrl}/complete`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      credentials: "include",
      body: JSON.stringify({
        uploads: uploads.map((upload) => ({
          token: upload.token,
        })),
      }),
    });

    if (!completeResponse.ok) {
      throw new Error(
        await this.getErrorMessage(
          completeResponse,
          "이미지 업로드 완료 처리에 실패했습니다."
        )
      );
    }

    const result: CompletePortfolioUploadResponse =
      await completeResponse.json();
    return result.files;
  }

  private static async uploadPortfolioFiles(
    files: File[]
  ): Promise<PortfolioUploadedFile[]> {
    if (files.length === 0) {
      return [];
    }

    this.validatePortfolioFiles(files);

    const presignResponse = await fetch(`${this.uploadBaseUrl}/presign`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      credentials: "include",
      body: JSON.stringify({
        files: files.map((file) => ({
          name: file.name,
          size: file.size,
          type: file.type,
        })),
      }),
    });

    if (!presignResponse.ok) {
      throw new Error(
        await this.getErrorMessage(
          presignResponse,
          "이미지 업로드 URL 생성에 실패했습니다."
        )
      );
    }

    const { uploads }: PresignPortfolioUploadResponse =
      await presignResponse.json();

    if (uploads.length !== files.length) {
      throw new Error("업로드 URL 개수가 이미지 개수와 일치하지 않습니다.");
    }

    let shouldCompleteForCleanup = true;
    try {
      const uploadResults = await Promise.allSettled(
        files.map(async (file, index) => {
          const upload = uploads[index];
          const response = await fetch(upload.uploadUrl, {
            method: "PUT",
            headers: upload.headers,
            body: file,
          });

          if (!response.ok) {
            const message = await response.text().catch(() => "");
            throw new Error(message || "이미지 업로드에 실패했습니다.");
          }
        })
      );

      const failedUpload = uploadResults.find(
        (result) => result.status === "rejected"
      );
      if (failedUpload) {
        throw failedUpload.reason instanceof Error
          ? failedUpload.reason
          : new Error("이미지 업로드에 실패했습니다.");
      }

      shouldCompleteForCleanup = false;
      const uploadedFiles = await this.completePortfolioUpload(uploads);

      if (uploadedFiles.length !== files.length) {
        await this.cleanupUploadedPortfolioFiles(uploadedFiles);
        throw new Error("업로드된 이미지 개수가 요청과 일치하지 않습니다.");
      }

      return uploadedFiles;
    } catch (error) {
      if (shouldCompleteForCleanup) {
        await this.completePortfolioUpload(uploads).catch(() => null);
      }

      throw error;
    }
  }

  private static async cleanupUploadedPortfolioFiles(
    files: PortfolioUploadedFile[]
  ): Promise<void> {
    const fileKeys = files.map((file) => file.fileKey);

    if (fileKeys.length === 0) {
      return;
    }

    await fetch(this.uploadBaseUrl, {
      method: "DELETE",
      headers: {
        "Content-Type": "application/json",
      },
      credentials: "include",
      body: JSON.stringify({ fileKeys }),
    }).catch((error) => {
      console.error("Portfolio upload cleanup failed:", error);
    });
  }

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
    this.validatePortfolioFields(data.category, data.title, data.description);

    if (!data.thumbnail) {
      throw new Error("썸네일 이미지는 필수입니다.");
    }

    if (!data.images || data.images.length === 0) {
      throw new Error("최소 1개 이상의 이미지가 필요합니다.");
    }

    const uploadedFiles = await this.uploadPortfolioFiles([
      data.thumbnail,
      ...data.images,
    ]);
    const [thumbnailUpload, ...imageUploads] = uploadedFiles;

    const body: CreatePortfolioMetadataRequest = {
      category: data.category,
      title: data.title,
      description: data.description,
      thumbnailUrl: thumbnailUpload.url,
      imageUrls: imageUploads.map((image) => image.url),
    };

    try {
      const response = await fetch(this.baseUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify(body),
      });

      if (!response.ok) {
        throw new Error(
          await this.getErrorMessage(
            response,
            "포트폴리오 생성에 실패했습니다."
          )
        );
      }

      const result: PortfolioResponse = await response.json();
      return result.portfolio;
    } catch (error) {
      await this.cleanupUploadedPortfolioFiles(uploadedFiles);
      throw error;
    }
  }

  /**
   * 포트폴리오 수정
   */
  static async updatePortfolio(
    data: UpdatePortfolioRequest
  ): Promise<Portfolio> {
    this.validatePortfolioFields(data.category, data.title, data.description);

    const uploadedFiles: PortfolioUploadedFile[] = [];
    const existingImageUrls = data.existingImageUrls || [];

    try {
      const [thumbnailUpload] = data.thumbnail
        ? await this.uploadPortfolioFiles([data.thumbnail])
        : [];

      if (thumbnailUpload) {
        uploadedFiles.push(thumbnailUpload);
      }

      const newImageUploads = data.newImages?.length
        ? await this.uploadPortfolioFiles(data.newImages)
        : [];
      uploadedFiles.push(...newImageUploads);

      const thumbnailUrl = thumbnailUpload?.url || data.existingThumbnailUrl;
      if (!thumbnailUrl) {
        throw new Error("썸네일 이미지는 필수입니다.");
      }

      const imageUrls = [
        ...existingImageUrls,
        ...newImageUploads.map((image) => image.url),
      ];
      if (imageUrls.length === 0) {
        throw new Error("최소 1개 이상의 이미지가 필요합니다.");
      }

      const body: UpdatePortfolioMetadataRequest = {
        category: data.category,
        title: data.title,
        description: data.description,
        thumbnailUrl,
        imageUrls,
        uploadedImageUrls: uploadedFiles.map((file) => file.url),
      };

      const response = await fetch(`${this.baseUrl}/${data.id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify(body),
      });

      if (!response.ok) {
        throw new Error(
          await this.getErrorMessage(
            response,
            "포트폴리오 수정에 실패했습니다."
          )
        );
      }

      const result: PortfolioResponse = await response.json();
      return result.portfolio;
    } catch (error) {
      await this.cleanupUploadedPortfolioFiles(uploadedFiles);
      throw error;
    }
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
