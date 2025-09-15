import {
  TemplateWithProducts,
  TemplateProduct,
  CreateTemplateData,
  UpdateTemplateData,
  CreateTemplateProductData,
  UpdateTemplateProductData,
} from '@/types/admin'

export class AdminTemplateService {
  private static baseUrl = '/api/admin'

  // Templates
  static async getTemplates(): Promise<{ templates: TemplateWithProducts[] }> {
    const response = await fetch(`${this.baseUrl}/templates`)

    if (!response.ok) {
      throw new Error('템플릿 목록을 가져오는데 실패했습니다.')
    }

    return response.json()
  }

  static async createTemplate(data: CreateTemplateData): Promise<TemplateWithProducts> {
    const response = await fetch(`${this.baseUrl}/templates`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    })

    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.error || '템플릿 생성에 실패했습니다.')
    }

    return response.json()
  }

  static async updateTemplate(
    templateId: string,
    data: UpdateTemplateData
  ): Promise<TemplateWithProducts> {
    const response = await fetch(`${this.baseUrl}/templates/${templateId}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    })

    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.error || '템플릿 업데이트에 실패했습니다.')
    }

    return response.json()
  }

  // Template Products
  static async createTemplateProduct(data: CreateTemplateProductData): Promise<TemplateProduct> {
    const response = await fetch(`${this.baseUrl}/template-products`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    })

    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.error || '템플릿 상품 생성에 실패했습니다.')
    }

    return response.json()
  }

  static async updateTemplateProduct(
    productId: string,
    data: UpdateTemplateProductData
  ): Promise<TemplateProduct> {
    const response = await fetch(`${this.baseUrl}/template-products/${productId}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    })

    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.error || '템플릿 상품 업데이트에 실패했습니다.')
    }

    return response.json()
  }
}