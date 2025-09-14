import { FilePreviewItem } from "@/components/FilePreview"

export interface CustomOrderFormData {
  youtubeSnsAddress: string
  emailDiscord: string
  orderRequirements: string
  hasCharacterImages: boolean
  characterImageFiles: FilePreviewItem[]
  characterImageFileIds: string[]
  wantsOmakase: boolean
  designKeywords: string
  referenceFiles: FilePreviewItem[]
  referenceFileIds: string[]
  fastDelivery: boolean
  portfolioPrivate: boolean
  reviewEvent: boolean
  priceQuoted: number
  depositorName: string
  orderId?: string // 수정 모드를 위한 필드
}

// 주문 생성/수정 시 사용하는 기본 데이터 (상태 정보 없음)
export interface CustomOrderData {
  id: string
  youtube_sns_address: string
  email_discord: string
  order_requirements: string
  has_character_images: boolean
  wants_omakase: boolean
  design_keywords: string
  selected_options: string[]
  price_quoted: number
  depositor_name: string
}

// 주문 이력 조회 시 사용하는 완전한 데이터 (상태 정보 포함)
export interface CustomOrderWithStatus {
  id: string
  youtube_sns_address: string
  email_discord: string
  order_requirements: string
  has_character_images: boolean
  wants_omakase: boolean
  design_keywords: string
  selected_options: string[]
  status: "pending" | "accepted" | "in_progress" | "completed" | "cancelled"
  price_quoted?: number
  depositor_name?: string
  admin_notes?: string
  created_at: string
  updated_at: string
}

export type TabType = "order" | "history"

// API 응답 타입들
export interface SubmitCustomOrderResponse {
  success: boolean
  error?: string
  orderId?: string
}

export interface CancelCustomOrderResponse {
  success: boolean
  error?: string
}

export interface CustomOrderHistoryResponse {
  orders: CustomOrderWithStatus[]
}