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

export interface CompanyAdmin extends Company {
  owner_email: string;
  owner_name: string;
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
  distance_km: number | null;
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

export interface ZipteriorCompanyMapMarker {
  id: number;
  name: string;
  latitude: number;
  longitude: number;
  phone: string | null;
}

export interface ZipteriorCompanyMapMarkerListOut {
  items: ZipteriorCompanyMapMarker[];
  total: number;
  available: boolean;
}

export interface ZipteriorViewportItem {
  item_type: "cluster" | "marker";
  marker_type: "complex" | "company";
  id: number | null;
  name: string | null;
  latitude: number;
  longitude: number;
  count: number;
  portfolio_count: number;
  apartment_type_count: number | null;
  logo_path: string | null;
}

export interface ZipteriorViewportOut {
  zoom: number;
  clustered: boolean;
  items: ZipteriorViewportItem[];
  total_items: number;
  source_marker_count: number;
  available: boolean;
}

export interface ZipteriorApartmentType {
  id: number;
  area: string;
  type: string;
  count: number;
  supply_area_m2: number | null;
  exclusive_area_m2: number | null;
  room_count: number | null;
  bathroom_count: number | null;
  rate: string | null;
  floor_plan_path: string | null;
}

export interface ZipteriorComplexDetailOut {
  id: number;
  name: string;
  latitude: number;
  longitude: number;
  address: string;
  year: string;
  households: string;
  buildings: string;
  parking: string;
  heating: string;
  builder: string;
  portfolio_count: number;
  apartment_types: ZipteriorApartmentType[];
  images: string[];
  available: boolean;
}

export interface ZipteriorPortfolioSummary {
  id: number;
  company_id: number | null;
  company_name: string;
  complex_name: string;
  title: string;
  scope: string;
  budget: string;
  duration: string;
  date: string;
  area: string;
  type: string;
  image: string | null;
}

export interface ZipteriorComplexPortfolioListOut {
  items: ZipteriorPortfolioSummary[];
  total: number;
  available: boolean;
}

export interface ZipteriorPortfolioImage {
  src: string;
  caption: string | null;
  space_id: string | null;
  room_label: string | null;
}

export interface ZipteriorPortfolioSpace {
  id: string;
  name: string;
  description: string | null;
}

/** 집테리어 app.js의 renderContentBlock()과 짝을 이루는 원본 문서 블록 —
 * 렌더링 규칙은 apps/web/src/lib/content-blocks.tsx의 renderContentBlock에서
 * 동일하게 재현한다. */
export interface ZipteriorContentBlock {
  block_type: string;
  document_order: number;
  image_url: string | null;
  text_content: string | null;
  raw_node: Record<string, unknown> | null;
}

export interface ZipteriorSearchItem {
  kind: "complex" | "company" | "place";
  id: string;
  title: string;
  sub: string;
  tail: string;
  latitude: number | null;
  longitude: number | null;
}

export interface ZipteriorSearchOut {
  items: ZipteriorSearchItem[];
  available: boolean;
}

export interface ZipteriorPortfolioDetailOut {
  id: number;
  company_id: number | null;
  company_name: string;
  company_logo: string | null;
  company_phone: string | null;
  complex_id: number | null;
  complex_name: string;
  title: string;
  scope: string;
  budget: string;
  duration: string;
  date: string;
  area: string;
  type: string;
  intro: string;
  hero_image: string | null;
  images: ZipteriorPortfolioImage[];
  spaces: ZipteriorPortfolioSpace[];
  content_blocks: ZipteriorContentBlock[];
  available: boolean;
}
