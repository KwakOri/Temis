import {
  CustomOrderFormData,
  SubmitCustomOrderResponse,
  CancelCustomOrderResponse,
  CustomOrderHistoryResponse,
} from '@/types/customOrder'

export class CustomOrderService {
  private static baseUrl = '/api/shop/custom-order'

  static async getCustomOrderHistory(): Promise<CustomOrderHistoryResponse> {
    const response = await fetch(this.baseUrl, {
      credentials: 'include',
    })

    if (!response.ok) {
      throw new Error('커스텀 주문 내역을 가져오는데 실패했습니다.')
    }

    return response.json()
  }

  static async submitCustomOrder(
    formData: CustomOrderFormData
  ): Promise<SubmitCustomOrderResponse> {
    const isEditMode = !!formData.orderId
    const method = isEditMode ? 'PUT' : 'POST'

    const response = await fetch(this.baseUrl, {
      method,
      headers: {
        'Content-Type': 'application/json',
      },
      credentials: 'include',
      body: JSON.stringify(formData),
    })

    const result = await response.json()

    if (!response.ok) {
      throw new Error(
        result.error ||
          (isEditMode
            ? '수정 중 오류가 발생했습니다.'
            : '신청 중 오류가 발생했습니다.')
      )
    }

    return result
  }

  static async cancelCustomOrder(
    orderId: string
  ): Promise<CancelCustomOrderResponse> {
    const response = await fetch(`${this.baseUrl}?orderId=${orderId}`, {
      method: 'DELETE',
      credentials: 'include',
    })

    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.error || '취소 중 오류가 발생했습니다.')
    }

    return response.json()
  }
}