from pydantic import BaseModel


class ApartmentComplexCreate(BaseModel):
    name: str
    sido: str
    sigungu: str
    eupmyeondong: str
    road_address: str
    completion_year: int | None = None
    household_count: int | None = None
    builder_name: str | None = None


class ApartmentComplexOut(BaseModel):
    id: int
    name: str
    sido: str
    sigungu: str
    eupmyeondong: str
    road_address: str
    completion_year: int | None
    household_count: int | None
    builder_name: str | None


class ApartmentTypeCreate(BaseModel):
    complex_id: int
    type_name: str
    exclusive_area: float
    supply_area: float | None = None
    room_count: int | None = None
    bathroom_count: int | None = None


class ApartmentTypeOut(BaseModel):
    id: int
    complex_id: int
    type_name: str
    exclusive_area: float
    supply_area: float | None
    room_count: int | None
    bathroom_count: int | None
