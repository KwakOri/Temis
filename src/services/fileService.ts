import {
  DeleteFilesResponse,
  FileApiResponse,
  UploadResponse,
} from "@/types/file";

type UploadType = "character-images" | "reference-files";

interface PresignUploadResponse {
  uploads: {
    uploadUrl: string;
    token: string;
    headers: Record<string, string>;
  }[];
}

const UPLOAD_LIMITS: Record<
  UploadType,
  {
    maxSize: number;
    maxCount: number;
    allowedTypes: string[];
  }
> = {
  "character-images": {
    maxSize: 10 * 1024 * 1024,
    maxCount: 5,
    allowedTypes: ["image/jpeg", "image/png", "image/webp"],
  },
  "reference-files": {
    maxSize: 100 * 1024 * 1024,
    maxCount: 10,
    allowedTypes: [
      "image/jpeg",
      "image/png",
      "image/webp",
      "image/gif",
      "application/pdf",
    ],
  },
};

export class FileService {
  private static baseUrl = "/api";

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

    const text = await response.text().catch(() => "");
    if (response.status === 413) {
      return "파일 용량이 너무 큽니다. 업로드 가능한 크기를 확인해주세요.";
    }

    return text || fallbackMessage;
  }

  private static validateFiles(files: File[], type: UploadType): void {
    const limits = UPLOAD_LIMITS[type];

    if (files.length > limits.maxCount) {
      throw new Error(`파일은 최대 ${limits.maxCount}개까지 업로드 가능합니다.`);
    }

    for (const file of files) {
      if (file.size > limits.maxSize) {
        throw new Error(
          `파일 크기는 ${Math.round(limits.maxSize / 1024 / 1024)}MB 이하여야 합니다.`
        );
      }

      if (!limits.allowedTypes.includes(file.type)) {
        throw new Error("지원되지 않는 파일 형식입니다.");
      }
    }
  }

  static async getFilesByOrderId(
    orderId: string
  ): Promise<{ files: FileApiResponse[] }> {
    const response = await fetch(`${this.baseUrl}/files/by-order/${orderId}`, {
      method: "GET",
      credentials: "include",
    });

    if (!response.ok) {
      throw new Error("파일 목록을 가져오는데 실패했습니다.");
    }

    return response.json();
  }

  static async uploadFiles(
    files: File[],
    type: UploadType
  ): Promise<UploadResponse> {
    this.validateFiles(files, type);

    const presignResponse = await fetch(`${this.baseUrl}/upload/presign`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      credentials: "include",
      body: JSON.stringify({
        type,
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
          "업로드 URL 생성에 실패했습니다."
        )
      );
    }

    const { uploads }: PresignUploadResponse = await presignResponse.json();

    if (uploads.length !== files.length) {
      throw new Error("업로드 URL 개수가 파일 개수와 일치하지 않습니다.");
    }

    await Promise.all(
      files.map(async (file, index) => {
        const upload = uploads[index];
        const response = await fetch(upload.uploadUrl, {
          method: "PUT",
          headers: upload.headers,
          body: file,
        });

        if (!response.ok) {
          const message = await response.text().catch(() => "");
          throw new Error(message || "파일 업로드에 실패했습니다.");
        }
      })
    );

    const completeResponse = await fetch(`${this.baseUrl}/upload/complete`, {
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
          "파일 업로드 완료 처리에 실패했습니다."
        )
      );
    }

    return completeResponse.json();
  }

  static async deleteFiles(fileIds: string[]): Promise<DeleteFilesResponse> {
    const response = await fetch(`${this.baseUrl}/upload`, {
      method: "DELETE",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ fileIds }),
    });

    if (!response.ok) {
      throw new Error(
        await this.getErrorMessage(response, "파일 삭제에 실패했습니다.")
      );
    }

    return response.json();
  }
}
