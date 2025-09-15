import {
  DeleteFilesResponse,
  FileApiResponse,
  UploadResponse,
} from "@/types/file";

export class FileService {
  private static baseUrl = "/api";

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
    type: "character-images" | "reference-files"
  ): Promise<UploadResponse> {
    const formData = new FormData();

    Array.from(files).forEach((file) => {
      formData.append("files", file);
    });
    formData.append("type", type);

    const response = await fetch(`${this.baseUrl}/upload`, {
      method: "POST",
      body: formData,
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || "업로드에 실패했습니다.");
    }

    return response.json();
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
      const error = await response.json();
      throw new Error(error.error || "파일 삭제에 실패했습니다.");
    }

    return response.json();
  }
}
