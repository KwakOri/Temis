export interface AdminOption {
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

export interface CreateAdminOptionInput {
  category: string;
  label: string;
  value: string;
  description?: string;
  price?: number;
  is_discount?: boolean;
  is_enabled?: boolean;
}

export interface UpdateAdminOptionInput {
  label?: string;
  value?: string;
  description?: string;
  price?: number;
  is_discount?: boolean;
  is_enabled?: boolean;
}
