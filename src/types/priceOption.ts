export interface PriceOption {
  id: string;
  category: string;
  label: string;
  value: string;
  description: string | null;
  price: number;
  is_discount: boolean;
  is_enabled: boolean;
  created_at: string;
  updated_at: string;
}

export interface CreatePriceOptionInput {
  category: string;
  label: string;
  value: string;
  description?: string;
  price: number;
  is_discount: boolean;
  is_enabled: boolean;
}

export interface UpdatePriceOptionInput {
  category?: string;
  label?: string;
  value?: string;
  description?: string;
  price?: number;
  is_discount?: boolean;
  is_enabled?: boolean;
}

export interface PriceOptionsResponse {
  options: PriceOption[];
}

export interface PriceOptionResponse {
  option: PriceOption;
}
