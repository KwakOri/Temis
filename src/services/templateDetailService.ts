import { supabase } from '@/lib/supabase'
import { TemplateWithProducts, PurchaseRequestData, PurchaseRequestResponse } from '@/types/templateDetail'

export class TemplateDetailService {
  static async getTemplateDetail(templateId: string): Promise<TemplateWithProducts> {
    const { data, error } = await supabase
      .from('templates')
      .select(`*, template_products (*)`)
      .eq('id', templateId)
      .eq('is_public', true)
      .eq('is_shop_visible', true)
      .single()

    if (error) {
      throw new Error(`템플릿을 찾을 수 없습니다: ${error.message}`)
    }

    if (!data) {
      throw new Error('템플릿을 찾을 수 없습니다.')
    }

    return data
  }

  static async submitPurchaseRequest(requestData: PurchaseRequestData): Promise<PurchaseRequestResponse> {
    const response = await fetch('/api/shop/purchase-request', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestData),
    })

    const result = await response.json()

    if (!response.ok) {
      throw new Error(result.error || '구매 신청 중 오류가 발생했습니다.')
    }

    return result
  }
}