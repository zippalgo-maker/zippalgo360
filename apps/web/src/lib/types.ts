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
  latitude: number | null;
  longitude: number | null;
  is_verified: boolean;
  is_active: boolean;
  created_at: string;
  service_regions: string[];
}

export interface ApartmentComplex {
  id: number;
  name: string;
  sido: string;
  sigungu: string | null;
  eupmyeondong: string;
  road_address: string;
  jibun_address: string | null;
  latitude: number | null;
  longitude: number | null;
  completion_year: number | null;
  household_count: number | null;
  building_count: number | null;
  parking_count: number | null;
  heating_type: string | null;
  builder_name: string | null;
  complex_type: string | null;
  representative_image_path: string | null;
  representative_thumbnail_path: string | null;
  apartment_type_count: number;
}

export interface ApartmentType {
  id: number;
  complex_id: number;
  type_name: string;
  exclusive_area_m2: number;
  supply_area_m2: number | null;
  pyeong_label: string | null;
  room_count: number | null;
  bathroom_count: number | null;
}

export type ListingStatus = "active" | "reserved" | "sold" | "cancelled";

export interface Listing {
  id: number;
  seller_id: number;
  complex_id: number;
  apartment_type_id: number;
  dong: string | null;
  ho: string | null;
  asking_price: number;
  description: string;
  move_in_date: string | null;
  view_price: number;
  status: ListingStatus;
  created_at: string;
  updated_at: string;
  images: string[];
}

export interface ListingSummary {
  id: number;
  complex_id: number;
  apartment_type_id: number;
  asking_price: number;
  description: string;
  view_price: number;
  status: ListingStatus;
  created_at: string;
  is_unlocked: boolean;
}

export interface ListingMapMarker {
  id: number;
  complex_id: number;
  apartment_type_id: number;
  complex_name: string;
  latitude: number;
  longitude: number;
  sido: string;
  sigungu: string | null;
  asking_price: number;
  view_price: number;
  status: ListingStatus;
}

export interface CompanyMapMarker {
  id: number;
  company_type: CompanyType;
  business_name: string;
  latitude: number;
  longitude: number;
}

export interface ListingPurchase {
  id: number;
  listing_id: number;
  agent_company_id: number;
  amount: number;
  status: "paid" | "refunded";
  paid_at: string;
}

export interface ListingPurchaseResult {
  purchase: ListingPurchase;
  listing: Listing;
}

export type SaleProofStatus = "submitted" | "verified" | "rejected";

export interface SaleProof {
  id: number;
  listing_id: number;
  listing_purchase_id: number;
  uploaded_by: number;
  document_path: string;
  sale_price: number;
  status: SaleProofStatus;
  created_at: string;
  verified_at: string | null;
}

export type PayoutStatus = "pending" | "paid" | "cancelled";

export interface DoubleBenefitPayout {
  id: number;
  listing_id: number;
  sale_proof_id: number;
  agent_company_id: number;
  seller_id: number;
  amount: number;
  status: PayoutStatus;
  paid_at: string | null;
  created_at: string;
}

export type PurchaseRequestStatus = "submitted" | "in_progress" | "matched" | "closed";

export interface PurchaseRequest {
  id: number;
  customer_id: number;
  title: string;
  sido: string;
  sigungu: string;
  complex_id: number | null;
  apartment_type_id: number | null;
  desired_budget_min: number | null;
  desired_budget_max: number | null;
  desired_move_in_date: string | null;
  room_count_min: number | null;
  description: string;
  contact_method: string;
  status: PurchaseRequestStatus;
  created_at: string;
}

export type AssignmentStatus = "unread" | "read" | "responded" | "declined" | "expired";

export interface PurchaseRequestAssignment {
  id: number;
  purchase_request_id: number;
  agent_company_id: number;
  assignment_order: number;
  status: AssignmentStatus;
  responded_at: string | null;
  created_at: string;
}

export interface ZipteriorCompanySummary {
  id: number;
  name: string;
  logo_path: string | null;
  phone: string | null;
}

export interface ZipteriorPortfolioCard {
  id: number;
  title: string;
  summary: string | null;
  company: ZipteriorCompanySummary;
  complex_id: number | null;
  complex_name: string | null;
  apartment_type_id: number | null;
  apartment_type_name: string | null;
  pyeong_label: string | null;
  thumbnail_url: string | null;
  view_count: number;
  like_count: number;
  published_at: string;
  detail_url: string;
}

export interface ZipteriorPortfolioListOut {
  items: ZipteriorPortfolioCard[];
  total: number;
  available: boolean;
}

export interface ZipteriorMapMarker {
  id: number;
  name: string;
  latitude: number;
  longitude: number;
  sido: string | null;
  sigungu: string | null;
  portfolio_count: number;
}

export interface ZipteriorMapMarkerListOut {
  items: ZipteriorMapMarker[];
  total: number;
  available: boolean;
}
