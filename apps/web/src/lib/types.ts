export type UserRole = "customer" | "company" | "admin";

export interface User {
  id: number;
  email: string;
  name: string;
  phone: string | null;
  role: UserRole;
  is_active: boolean;
  created_at: string;
}

export interface TokenResponse {
  access_token: string;
  token_type: string;
  user: User;
}

export type CompanyType = "real_estate" | "interior" | "mover" | "cleaner";

export interface Company {
  id: number;
  owner_user_id: number;
  company_type: CompanyType;
  business_name: string;
  business_registration_number: string;
  representative_name: string;
  address: string;
  phone: string;
  is_verified: boolean;
  is_active: boolean;
  created_at: string;
  service_regions: string[];
}
