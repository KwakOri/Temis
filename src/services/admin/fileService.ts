import { DownloadZipData, GetFilesData, GetFilesResponse } from "@/types/admin";

export class AdminFileService {
  private static baseUrl = "/api/admin/files";

  static async getFiles(data: GetFilesData): Promise<GetFilesResponse> {
    const response = await fetch(this.baseUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      throw new Error("파일 정보를 가져오는데 실패했습니다.");
    }

    return response.json();
  }

  static async downloadFile(fileId: string): Promise<Blob> {
    const response = await fetch(`${this.baseUrl}/${fileId}/download`);

    if (!response.ok) {
      throw new Error("파일 다운로드에 실패했습니다.");
    }

    return response.blob();
  }

  static async downloadZip(data: DownloadZipData): Promise<Blob> {
    const response = await fetch(`${this.baseUrl}/download-zip`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      throw new Error("ZIP 파일 다운로드에 실패했습니다.");
    }

    return response.blob();
  }
}
