from pydantic import BaseModel


class ApartmentComplexCreate(BaseModel):
    name: str
    sido: str
    sigungu: str | None = None
    eupmyeondong: str
    road_address: str
    jibun_address: str | None = None
    latitude: float | None = None
    longitude: float | None = None
    completion_year: int | None = None
    household_count: int | None = None
    building_count: int | None = None
    parking_count: int | None = None
    heating_type: str | None = None
    builder_name: str | None = None
    complex_type: str | None = None


class ApartmentComplexOut(BaseModel):
    id: int
    name: str
    sido: str
    sigungu: str | None
    eupmyeondong: str
    road_address: str
    jibun_address: str | None = None
    latitude: float | None
    longitude: float | None
    completion_year: int | None
    household_count: int | None
    building_count: int | None = None
    parking_count: int | None = None
    heating_type: str | None = None
    builder_name: str | None
    complex_type: str | None = None
    representative_image_path: str | None = None
    representative_thumbnail_path: str | None = None
    apartment_type_count: int = 0


class ApartmentTypeCreate(BaseModel):
    complex_id: int
    type_name: str
    exclusive_area_m2: float
    supply_area_m2: float | None = None
    pyeong_label: str | None = None
    room_count: int | None = None
    bathroom_count: int | None = None


class ApartmentTypeOut(BaseModel):
    id: int
    complex_id: int
    type_name: str
    exclusive_area_m2: float
    supply_area_m2: float | None
    pyeong_label: str | None = None
    room_count: int | None
    bathroom_count: int | None
    floor_plan_path: str | None = None
    has_basic_layout: bool | None = None
    has_expanded_layout: bool | None = None
    sort_order: int = 0


class MapMarker(BaseModel):
    id: int
    name: str
    latitude: float
    longitude: float
    sido: str | None
    sigungu: str | None
    apartment_type_count: int


class MapMarkerListOut(BaseModel):
    items: list[MapMarker]
    total: int
